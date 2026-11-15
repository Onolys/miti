const ROOT = '[data-feature-tabs]';
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
      controlledPanels[i]!.hidden = !selected;
    }
    if (focus) tabs[index].focus();
  }

  const view = root.ownerDocument.defaultView;
  const desktop = view?.matchMedia?.('(min-width: 768px)');
  const updateOrientation = () => {
    const vertical = desktop ? desktop.matches : (view?.innerWidth ?? 0) >= 768;
    tablist.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');
  };
  updateOrientation();
  if (desktop) desktop.addEventListener('change', updateOrientation);
  else view?.addEventListener('resize', updateOrientation);

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
