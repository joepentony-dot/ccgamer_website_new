export function setMessage(element, text, kind = '') {
  if (!element) return;

  element.textContent = text || '';
  element.classList.remove('is-success', 'is-error', 'is-info');

  if (kind) {
    element.classList.add(`is-${kind}`);
  }
}

export function attachPasswordToggle(button, input) {
  if (!button || !input) return;

  const render = () => {
    const showing = input.type === 'text';
    button.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
    button.setAttribute('aria-pressed', showing ? 'true' : 'false');
    button.textContent = showing ? '🙈' : '👁️';
  };

  button.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
    render();
  });

  render();
}

export function byId(id) {
  return document.getElementById(id);
}
