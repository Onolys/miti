// Replaces a submit button's label with an accessible spinner and back.
export function setSubmitting(button: HTMLButtonElement, submitting: boolean): void {
  button.disabled = submitting;
  if (submitting) {
    if (button.dataset.label === undefined) button.dataset.label = button.textContent ?? '';
    const width = button.offsetWidth;
    if (width) button.style.minWidth = `${width}px`;
    const spinner = document.createElement('span');
    spinner.className = 'signup-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 'signup-visually-hidden';
    text.textContent = 'Submitting';
    button.replaceChildren(spinner, text);
  } else if (button.dataset.label !== undefined) {
    button.textContent = button.dataset.label;
    delete button.dataset.label;
    button.style.minWidth = '';
  }
}
