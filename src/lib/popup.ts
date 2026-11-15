// Base loads this module once. Delegation includes CTAs inserted after page load.
if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    const target = event.target;
    const cta = target instanceof Element
      ? target.closest<HTMLElement>('[data-open-popup]')
      : null;
    if (!cta) return;

    document.dispatchEvent(new CustomEvent('miti:open-popup', {
      detail: { trigger: cta.dataset.trigger ?? '', email: '' },
    }));
  });
}

export {};
