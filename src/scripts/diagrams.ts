import Panzoom from '@panzoom/panzoom';

const icons = {
  expand: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>',
};

function icon(name: keyof typeof icons) {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

function button(name: keyof typeof icons, label: string, text = '') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'diagram-btn';
  el.setAttribute('aria-label', label);
  el.title = label;
  el.innerHTML = `${icon(name)}${text ? `<span>${text}</span>` : ''}`;
  return el;
}

function captionFor(pre: HTMLElement) {
  let node: Element | null = pre.closest('figure, pre') ?? pre;
  while (node) {
    let sibling: Element | null = node.previousElementSibling;
    while (sibling) {
      const heading = sibling.matches('h1,h2,h3,h4') ? sibling : sibling.querySelector('h1,h2,h3,h4');
      if (heading) return heading.textContent?.replace('#', '').replace(/^Section titled.*$/, '').trim() || 'Diagram';
      sibling = sibling.previousElementSibling;
    }
    node = node.parentElement;
    if (node?.matches('main, article, .sl-markdown-content, .prose')) break;
  }
  return 'Diagram';
}

function wrap(pre: HTMLElement) {
  if (pre.closest('figure.diagram') || !pre.querySelector('svg')) return;
  const figure = document.createElement('figure');
  figure.className = 'diagram';
  const header = document.createElement('header');
  const label = document.createElement('span');
  label.className = 'diagram-label';
  const caption = captionFor(pre);
  label.textContent = caption;
  const actions = document.createElement('div');
  actions.className = 'diagram-actions';
  const copy = button('copy', 'Copy Mermaid source');
  const expand = button('expand', 'Expand diagram', 'Expand');
  actions.append(copy, expand);
  header.append(label, actions);
  pre.replaceWith(figure);
  figure.append(header, pre);
  pre.tabIndex = 0;
  pre.setAttribute('role', 'button');
  pre.setAttribute('aria-label', `Expand diagram: ${caption}`);
  const openIt = () => open(pre, caption);
  expand.addEventListener('click', openIt);
  pre.addEventListener('click', openIt);
  pre.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openIt();
    }
  });
  copy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(pre.dataset.diagram ?? '');
    copy.title = 'Copied';
    copy.classList.add('done');
    setTimeout(() => copy.classList.remove('done'), 1400);
  });
}

function open(pre: HTMLElement, caption: string) {
  const svg = pre.querySelector('svg');
  if (!svg) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'diagram-modal';
  const header = document.createElement('header');
  const title = document.createElement('span');
  title.className = 'diagram-label';
  title.textContent = caption;
  const controls = document.createElement('div');
  controls.className = 'diagram-actions';
  const zoomOut = button('minus', 'Zoom out');
  const level = document.createElement('span');
  level.className = 'diagram-zoom';
  const zoomIn = button('plus', 'Zoom in');
  const fit = button('fit', 'Fit to screen', 'Fit');
  const close = button('close', 'Close', 'Close');
  controls.append(zoomOut, level, zoomIn, fit, close);
  header.append(title, controls);
  const stage = document.createElement('div');
  stage.className = 'diagram-stage';
  const inner = document.createElement('div');
  inner.className = 'diagram-inner';
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const box = svg.viewBox.baseVal;
  const natural = { width: box?.width || svg.getBoundingClientRect().width, height: box?.height || svg.getBoundingClientRect().height };
  copy.removeAttribute('style');
  copy.removeAttribute('width');
  copy.removeAttribute('height');
  copy.style.width = `${natural.width}px`;
  copy.style.height = `${natural.height}px`;
  copy.style.maxWidth = 'none';
  inner.append(copy);
  stage.append(inner);
  dialog.append(header, stage);
  document.body.append(dialog);
  dialog.showModal();

  const panzoom = Panzoom(inner, { maxScale: 8, minScale: 0.15, canvas: true, cursor: 'grab', origin: '50% 50%' });
  const small = window.matchMedia('(max-width: 720px)').matches;
  const fitScale = () => {
    const available = stage.getBoundingClientRect();
    const fitted = Math.min(available.width / natural.width, available.height / natural.height, 2.2) * 0.92;
    return small ? Math.max(fitted, 0.5) : fitted;
  };
  const refit = () => {
    const scale = fitScale();
    const available = stage.getBoundingClientRect();
    const overflowX = Math.max(0, (natural.width * scale - available.width) / 2);
    panzoom.zoom(scale, { animate: false, force: true });
    window.requestAnimationFrame(() => {
      panzoom.pan(overflowX / scale, 0, { animate: false, force: true });
      readout();
    });
  };
  const readout = () => (level.textContent = `${Math.round(panzoom.getScale() * 100)}%`);
  requestAnimationFrame(refit);
  inner.addEventListener('panzoomchange', readout);
  stage.addEventListener('wheel', panzoom.zoomWithWheel, { passive: false });
  zoomIn.addEventListener('click', () => panzoom.zoomIn());
  zoomOut.addEventListener('click', () => panzoom.zoomOut());
  fit.addEventListener('click', refit);
  stage.addEventListener('dblclick', refit);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key === '+' || event.key === '=') panzoom.zoomIn();
    else if (event.key === '-') panzoom.zoomOut();
    else if (event.key === '0') refit();
  });
  window.addEventListener('resize', refit);
  dialog.addEventListener('close', () => {
    window.removeEventListener('resize', refit);
    panzoom.destroy();
    dialog.remove();
  });
}

function scan() {
  document.querySelectorAll<HTMLElement>('pre.mermaid').forEach(wrap);
}

new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-processed'] });
scan();
