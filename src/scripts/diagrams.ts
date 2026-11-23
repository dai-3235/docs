const expandLabel = 'Expand';

function wrap(pre: HTMLElement) {
  if (pre.closest('figure.diagram') || !pre.querySelector('svg')) return;
  const figure = document.createElement('figure');
  figure.className = 'diagram';
  const header = document.createElement('header');
  const label = document.createElement('span');
  label.textContent = 'Diagram';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = expandLabel;
  header.append(label, button);
  pre.replaceWith(figure);
  figure.append(header, pre);
  button.addEventListener('click', () => open(pre));
}

function open(pre: HTMLElement) {
  const svg = pre.querySelector('svg');
  if (!svg) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'diagram-modal';
  const header = document.createElement('header');
  const zoomOut = Object.assign(document.createElement('button'), { type: 'button', textContent: '−' });
  const zoomIn = Object.assign(document.createElement('button'), { type: 'button', textContent: '+' });
  const reset = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Reset' });
  const close = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Close' });
  header.append(zoomOut, zoomIn, reset, close);
  const stage = document.createElement('div');
  stage.className = 'diagram-stage';
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.removeAttribute('style');
  copy.style.width = '100%';
  copy.style.height = '100%';
  stage.append(copy);
  dialog.append(header, stage);
  document.body.append(dialog);

  let scale = 1;
  let x = 0;
  let y = 0;
  const apply = () => {
    copy.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };
  const zoom = (factor: number) => {
    scale = Math.min(6, Math.max(0.4, scale * factor));
    apply();
  };
  zoomIn.addEventListener('click', () => zoom(1.25));
  zoomOut.addEventListener('click', () => zoom(0.8));
  reset.addEventListener('click', () => {
    scale = 1;
    x = 0;
    y = 0;
    apply();
  });
  stage.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      zoom(event.deltaY < 0 ? 1.1 : 0.9);
    },
    { passive: false },
  );
  let drag: { px: number; py: number } | null = null;
  stage.addEventListener('pointerdown', (event) => {
    drag = { px: event.clientX - x, py: event.clientY - y };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', (event) => {
    if (!drag) return;
    x = event.clientX - drag.px;
    y = event.clientY - drag.py;
    apply();
  });
  stage.addEventListener('pointerup', () => (drag = null));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
}

function scan() {
  document.querySelectorAll<HTMLElement>('pre.mermaid').forEach(wrap);
}

new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-processed'] });
scan();
