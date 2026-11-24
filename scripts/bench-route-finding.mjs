import { findRoute, buildRouteIndex, causesFanOut } from '../src/lib/routeFinding.mjs'

const GRAPH_SIZES = [50, 200, 1000, 5000]
const PAIRS_PER_SIZE = 300
const EXTRA_EDGES_PER_TABLE = 1.5
const CARDINALITIES = ['many-to-one', 'many-to-one', 'many-to-one', 'one-to-many', 'many-to-many']

function seededRandom(seed) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function buildGraph(tableCount, random) {
  const joinRules = []
  const addRule = (from, to) => {
    joinRules.push({
      id: `r${joinRules.length}`,
      from: `t${from}`,
      to: `t${to}`,
      cost: 1 + Math.floor(random() * 3),
      cardinality: CARDINALITIES[Math.floor(random() * CARDINALITIES.length)],
      enabled: true,
    })
  }
  for (let table = 1; table < tableCount; table++) addRule(Math.floor(random() * table), table)
  for (let extra = 0; extra < tableCount * EXTRA_EDGES_PER_TABLE; extra++) {
    const from = Math.floor(random() * tableCount)
    const to = Math.floor(random() * tableCount)
    if (from !== to) addRule(from, to)
  }
  return joinRules
}

function fewestJoinsRoute(index, from, to, hopLimit) {
  const queue = [{ table: from, hops: [] }]
  const seen = new Set([from])
  for (let head = 0; head < queue.length; head++) {
    const { table, hops } = queue[head]
    if (table === to) return hops
    if (hops.length >= hopLimit) continue
    for (const step of index.get(table) ?? []) {
      if (seen.has(step.table)) continue
      seen.add(step.table)
      queue.push({ table: step.table, hops: [...hops, step] })
    }
  }
  return null
}

function measure(work) {
  const started = process.hrtime.bigint()
  const value = work()
  return { value, micros: Number(process.hrtime.bigint() - started) / 1000 }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]
}

const hopLimit = 8
const rows = []
for (const tableCount of GRAPH_SIZES) {
  const random = seededRandom(tableCount)
  const joinRules = buildGraph(tableCount, random)
  const index = buildRouteIndex(joinRules)
  const indexBuild = measure(() => buildRouteIndex(joinRules)).micros
  const bfsMicros = []
  const costMicros = []
  const coldMicros = []
  let answered = 0
  let differentRoute = 0
  let bfsFansOutMore = 0
  for (let pair = 0; pair < PAIRS_PER_SIZE; pair++) {
    const from = `t${Math.floor(random() * tableCount)}`
    const to = `t${Math.floor(random() * tableCount)}`
    if (from === to) continue
    const bfs = measure(() => fewestJoinsRoute(index, from, to, hopLimit))
    const cost = measure(() => findRoute({ index, from, to, hopLimit }))
    const cold = measure(() => findRoute({ joinRules, from, to, hopLimit }))
    bfsMicros.push(bfs.micros)
    costMicros.push(cost.micros)
    coldMicros.push(cold.micros)
    if (!bfs.value || !cost.value) continue
    answered++
    const bfsFanOuts = bfs.value.filter((step) => causesFanOut(step.rule, step.direction)).length
    if (bfs.value.map((step) => step.rule.id).join() !== cost.value.route.map((hop) => hop.rule).join()) differentRoute++
    if (bfsFanOuts > cost.value.fanOutCount) bfsFansOutMore++
  }
  rows.push({
    tables: tableCount,
    rules: joinRules.length,
    'index build us': Math.round(indexBuild),
    'bfs median us': Math.round(median(bfsMicros)),
    'cost median us': Math.round(median(costMicros)),
    'cost p99 us': Math.round(percentile(costMicros, 0.99)),
    'cost with index build median us': Math.round(median(coldMicros)),
    'answered': answered,
    'cost route differs from bfs': differentRoute,
    'bfs route fans out more': bfsFansOutMore,
  })
}
console.table(rows)
