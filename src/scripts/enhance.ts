interface PageInfo {
  title: string;
  kind: 'doc' | 'blog';
  minutes: number;
  related: { url: string; title: string; kind: 'doc' | 'blog'; score: number }[];
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const article = document.querySelector<HTMLElement>('.sl-markdown-content, .prose');
const path = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`;

function progress() {
  const bar = document.createElement('div');
  bar.className = 'progress';
  document.body.append(bar);
  let frame = 0;
  const update = () => {
    frame = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  };
  window.addEventListener('scroll', () => (frame ||= requestAnimationFrame(update)), { passive: true });
  update();
}

function toc() {
  const mount = document.querySelector<HTMLElement>('[data-toc]');
  if (!mount || !article) return;
  const headings = [...article.querySelectorAll<HTMLElement>('h2[id], h3[id]')];
  if (headings.length < 2) {
    mount.remove();
    return;
  }
  const list = document.createElement('ul');
  const links = new Map<string, HTMLAnchorElement>();
  for (const heading of headings) {
    const item = document.createElement('li');
    item.className = heading.tagName === 'H3' ? 'sub' : '';
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent?.replace('#', '').trim() ?? '';
    item.append(link);
    list.append(item);
    links.set(heading.id, link);
  }
  mount.append(list);
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          links.forEach((l) => l.classList.remove('current'));
          links.get(entry.target.id)?.classList.add('current');
        }
      }
    },
    { rootMargin: '-10% 0px -75% 0px' },
  );
  headings.forEach((h) => observer.observe(h));
}

function anchors() {
  if (!article || !article.classList.contains('prose')) return;
  article.querySelectorAll<HTMLElement>('h2[id], h3[id]').forEach((heading) => {
    const link = document.createElement('a');
    link.className = 'heading-anchor';
    link.href = `#${heading.id}`;
    link.textContent = '#';
    link.setAttribute('aria-label', 'Link to this section');
    heading.append(link);
  });
}

function copyButtons() {
  if (!article || !article.classList.contains('prose')) return;
  article.querySelectorAll<HTMLPreElement>('pre:not(.mermaid)').forEach((pre) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(pre.textContent ?? '');
      button.textContent = 'Copied';
      setTimeout(() => (button.textContent = 'Copy'), 1400);
    });
    pre.style.position = 'relative';
    pre.append(button);
  });
}

function shareRow() {
  const row = document.createElement('div');
  row.className = 'share';
  const url = window.location.href.split('#')[0];
  const title = document.title;
  const label = document.createElement('span');
  label.textContent = 'Share';
  row.append(label);
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = 'Copy link';
  copy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(url);
    copy.textContent = 'Copied';
    setTimeout(() => (copy.textContent = 'Copy link'), 1400);
  });
  row.append(copy);
  const targets: [string, string][] = [
    ['X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`],
    ['Email', `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`],
  ];
  for (const [name, href] of targets) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = name;
    a.rel = 'noopener noreferrer';
    a.target = '_blank';
    row.append(a);
  }
  if (typeof navigator.share === 'function') {
    const native = document.createElement('button');
    native.type = 'button';
    native.textContent = 'More…';
    native.addEventListener('click', () => navigator.share({ title, url }).catch(() => undefined));
    row.append(native);
  }
  return row;
}

function relatedBlock(info: PageInfo) {
  if (!info.related.length) return null;
  const section = document.createElement('section');
  section.className = 'related';
  const heading = document.createElement('h2');
  heading.textContent = 'Related';
  const grid = document.createElement('div');
  grid.className = 'related-grid';
  for (const item of info.related.slice(0, 3)) {
    const a = document.createElement('a');
    a.href = item.url;
    const kind = document.createElement('span');
    kind.textContent = item.kind === 'blog' ? 'Blog' : 'Docs';
    const title = document.createElement('strong');
    title.textContent = item.title;
    a.append(kind, title);
    grid.append(a);
  }
  section.append(heading, grid);
  return section;
}

function readingTime(info: PageInfo) {
  if (document.querySelector('[data-reading]')) {
    document.querySelectorAll('[data-reading]').forEach((el) => (el.textContent = `${info.minutes} min read`));
    return;
  }
  const title = document.querySelector('main h1');
  if (!title || !article?.classList.contains('sl-markdown-content')) return;
  const meta = document.createElement('p');
  meta.className = 'reading-meta';
  meta.textContent = `${info.minutes} min read`;
  title.closest('.content-panel')?.append(meta);
}

async function pagesInfo() {
  try {
    const response = await fetch(`${base}/search/pages.json`);
    if (!response.ok) return null;
    const pages = (await response.json()) as Record<string, PageInfo>;
    return pages[path] ?? null;
  } catch {
    return null;
  }
}

if (article) progress();
toc();
anchors();
copyButtons();

if (article) {
  const holder = document.createElement('div');
  holder.className = 'after-article';
  holder.append(shareRow());
  article.after(holder);
  pagesInfo().then((info) => {
    if (!info) return;
    readingTime(info);
    const block = relatedBlock(info);
    if (block) holder.append(block);
  });
}
