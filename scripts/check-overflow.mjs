import { createServer } from 'node:http'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.resolve(ROOT, process.argv[2] ?? 'dist')
const BASE = '/docs'
const WINDOW_WIDTHS = [390, 320]
const WINDOW_HEIGHT = 800
const SCROLL_STEP = 600
const SCROLL_PAUSE_MS = 250
const HYDRATION_WAIT_MS = 1500
const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.xml': 'application/xml',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function findChrome() {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
  if (!found) {
    console.error('Overflow check failed: no Chrome binary found. Set CHROME_BIN.')
    process.exit(1)
  }
  return found
}

function pagesIn(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return pagesIn(full)
    return name === 'index.html' ? [full] : []
  })
}

function serve() {
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost')
    if (!url.pathname.startsWith(`${BASE}/`)) {
      response.writeHead(404).end()
      return
    }
    let file = path.join(DIST, decodeURIComponent(url.pathname.slice(BASE.length)))
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!file.startsWith(DIST) || !existsSync(file)) {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, { 'content-type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream' })
    response.end(readFileSync(file))
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

async function launchChrome(chrome) {
  const profile = mkdtempSync(path.join(tmpdir(), 'overflow-check-'))
  const child = spawn(
    chrome,
    ['--headless=new', '--disable-gpu', '--no-first-run', ...(process.env.CI ? ['--no-sandbox', '--disable-dev-shm-usage'] : []), '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    { stdio: process.env.CI ? ['ignore', 'inherit', 'inherit'] : 'ignore' },
  )
  const portFile = path.join(profile, 'DevToolsActivePort')
  for (let attempt = 0; attempt < 100 && !existsSync(portFile); attempt++) await sleep(100)
  if (!existsSync(portFile)) {
    child.kill('SIGKILL')
    throw new Error('Chrome did not expose a debugging port')
  }
  const port = Number(readFileSync(portFile, 'utf8').split('\n')[0])
  return { child, profile, port }
}

async function openSession(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const target = targets.find((candidate) => candidate.type === 'page')
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  let nextId = 0
  const pending = new Map()
  const listeners = new Map()
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id !== undefined) {
      const handler = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) handler.reject(new Error(message.error.message))
      else handler.resolve(message.result)
    } else {
      for (const callback of listeners.get(message.method) ?? []) callback(message.params)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId
      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })
  const once = (method) =>
    new Promise((resolve) => {
      const callbacks = listeners.get(method) ?? []
      const callback = (params) => {
        listeners.set(method, (listeners.get(method) ?? []).filter((candidate) => candidate !== callback))
        resolve(params)
      }
      listeners.set(method, [...callbacks, callback])
    })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }
  await send('Page.enable')
  await send('Runtime.enable')
  return { send, once, evaluate, close: () => socket.close() }
}

const SCROLL_THROUGH = `(async () => {
  const step = ${SCROLL_STEP}
  const pause = ${SCROLL_PAUSE_MS}
  const height = () => document.documentElement.scrollHeight
  for (let y = 0; y < height(); y += step) {
    window.scrollTo({ top: y, behavior: 'instant' })
    await new Promise((resolve) => setTimeout(resolve, pause))
  }
  await new Promise((resolve) => setTimeout(resolve, ${HYDRATION_WAIT_MS}))
  window.scrollTo({ top: 0, behavior: 'instant' })
})()`

const MEASURE = `(() => {
  const width = window.innerWidth
  const widest = [...document.querySelectorAll('body *')]
    .filter((el) => el.getBoundingClientRect().right > width + 1)
    .slice(0, 3)
    .map((el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''))
  return { innerWidth: width, scrollWidth: document.documentElement.scrollWidth, widest }
})()`

async function measure(session, port, pagePath, width) {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: WINDOW_HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  })
  const loaded = session.once('Page.loadEventFired')
  await session.send('Page.navigate', { url: `http://127.0.0.1:${port}${pagePath}` })
  await loaded
  await session.evaluate(SCROLL_THROUGH)
  return session.evaluate(MEASURE)
}

const pages = pagesIn(DIST)
  .map((file) => `${BASE}/${path.relative(DIST, path.dirname(file)).split(path.sep).join('/')}/`.replace(/\/+$/, '/'))
  .sort()

if (pages.length === 0) {
  console.error(`Overflow check failed: no pages in ${DIST}. Run npm run build first.`)
  process.exit(1)
}

const server = await serve()
const serverPort = server.address().port
const browser = await launchChrome(findChrome())
const session = await openSession(browser.port)
const failures = []

try {
  for (const pagePath of pages) {
    for (const width of WINDOW_WIDTHS) {
      const result = await measure(session, serverPort, pagePath, width)
      const fixedWindow = result.innerWidth === width
      const fits = result.scrollWidth <= width
      console.log(`${fits && fixedWindow ? 'ok  ' : 'FAIL'} ${String(width).padStart(3)} px  scrollWidth ${String(result.scrollWidth).padStart(4)}  ${pagePath}`)
      if (!fixedWindow) failures.push(`${pagePath} at ${width}: window was ${result.innerWidth}, not a fixed-width window`)
      else if (!fits) failures.push(`${pagePath} at ${width}: scrollWidth ${result.scrollWidth}, widest ${result.widest.join(', ') || 'unknown'}`)
    }
  }
} finally {
  session.close()
  browser.child.kill('SIGKILL')
  server.close()
  rmSync(browser.profile, { recursive: true, force: true })
}

if (failures.length) {
  console.error(`Overflow check failed:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`)
  process.exit(1)
}
console.log(`Overflow check passed on ${pages.length} pages at ${WINDOW_WIDTHS.join(' and ')} px.`)
