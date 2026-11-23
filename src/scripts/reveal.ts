import { animate, inView, stagger } from 'motion';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const targets = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
const showAll = () => targets.forEach((el) => (el.style.opacity = '1'));

if (reduced) {
  showAll();
} else {
  window.setTimeout(showAll, 6000);
  const groups = new Map<Element, HTMLElement[]>();
  for (const el of targets) {
    const parent = el.parentElement ?? document.body;
    groups.set(parent, [...(groups.get(parent) ?? []), el]);
  }
  groups.forEach((items, parent) => {
    inView(
      parent,
      () => {
        items.forEach((el) => el.style.removeProperty('opacity'));
        animate(items, { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0px)'] }, { duration: 0.6, delay: stagger(0.07), ease: [0.2, 0.8, 0.2, 1] });
      },
      { amount: 0.15 },
    );
  });
}
