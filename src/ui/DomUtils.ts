export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function createButton(label: string, onClick: () => void, className = 'button'): HTMLButtonElement {
  const button = createElement('button', className, label);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

export function createPanel(root: HTMLElement, className: string): HTMLElement {
  const panel = createElement('section', `ui-panel ${className}`);
  panel.setAttribute('aria-live', 'polite');
  root.append(panel);
  return panel;
}
