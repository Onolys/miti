const ROOT = '[data-tabs]';
const initialized = new WeakSet<HTMLElement>();

function initializeRoot(root: HTMLElement): void {
  if (initialized.has(root)) return;
  const local = <T extends HTMLElement>(selector: string): T[] =>
    Array.from(root.querySelectorAll<T>(selector)).filter((element) => element.closest(ROOT) === root);
  const tablist = local<HTMLElement>('[role="tablist"]')[0];
  const tabs = local<HTMLButtonElement>('[role="tab"]');
  const panels = local<HTMLElement>('[role="tabpanel"]');
  if (!tablist || !tabs.length) return;
  // Resolve IDs within this component, never through a page-wide selector.
  const controlledPanels = tabs.map((tab) => panels.find((panel) => panel.id === tab.getAttribute('aria-controls')));
  if (controlledPanels.some((panel) => !panel)) return;
  initialized.add(root);

  function activate(index: number, focus: boolean): void {
    for (const [i, tab] of tabs.entries()) {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = controlledPanels[i]!;
      panel.hidden = !selected;
      panel.toggleAttribute('inert', !selected);
    }
    root.dataset.active = String(index);
    if (focus) tabs[index].focus();
  }

  // Orientation comes from data attributes, not a hard-coded viewport width:
  // data-orientation, plus an optional narrow variant below data-narrow-width px of root width.
  const narrowOrientation = root.dataset.orientationNarrow;
  const narrowWidth = Number(root.dataset.narrowWidth ?? 0);
  const updateOrientation = () => {
    const narrow = Boolean(narrowOrientation) && narrowWidth > 0 && root.clientWidth > 0 && root.clientWidth <= narrowWidth;
    const value = narrow ? narrowOrientation : root.dataset.orientation;
    tablist.setAttribute('aria-orientation', value === 'vertical' ? 'vertical' : 'horizontal');
  };
  updateOrientation();
  if (narrowOrientation && typeof ResizeObserver !== 'undefined') new ResizeObserver(updateOrientation).observe(root);

  tablist.addEventListener('click', (event) => {
    const tab = (event.target as Element | null)?.closest<HTMLButtonElement>('[role="tab"]');
    if (!tab || !tabs.includes(tab)) return;
    activate(tabs.indexOf(tab), true);
  });
  tablist.addEventListener('keydown', (event) => {
    const tab = (event.target as Element | null)?.closest<HTMLButtonElement>('[role="tab"]');
    if (!tab || !tabs.includes(tab)) return;
    const current = tabs.indexOf(tab);
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight': next = (current + 1) % tabs.length; break;
      case 'ArrowUp':
      case 'ArrowLeft': next = (current + tabs.length - 1) % tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    activate(next, true);
  });

  const initial = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
  activate(initial < 0 ? 0 : initial, false);
  root.dataset.enhanced = 'true';
}

/** Enhance independent tab sets, including a supplied root; repeat calls are safe. */
export function initTabs(scope: ParentNode = document): void {
  if ('matches' in scope && typeof scope.matches === 'function' && scope.matches(ROOT)) {
    initializeRoot(scope as HTMLElement);
  }
  for (const root of scope.querySelectorAll<HTMLElement>(ROOT)) initializeRoot(root);
}
