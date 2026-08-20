// A DOM-based cursor (not a native `cursor: url(...)` image) specifically
// so it can be CSS-animated - native cursor images are static, but this is
// just a positioned SVG that can pick up a class and run a real @keyframes
// animation. Positioned every mousemove; toggles an "active" class via a
// single delegated mouseover/mouseout pair (mouseenter/mouseleave don't
// bubble, so they can't be delegated from one document-level listener)
// whenever the pointer is over anything matching `interactiveSelector`.
const INTERACTIVE_SELECTOR = '.poi__hit--clickable, #back-button';

export function initCustomCursor() {
  const el = document.createElement('div');
  el.className = 'cursor-reticle cursor-reticle--hidden';
  el.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <g class="cursor-reticle__halo">
        <line x1="12" y1="1" x2="12" y2="8"></line>
        <line x1="12" y1="16" x2="12" y2="23"></line>
        <line x1="1" y1="12" x2="8" y2="12"></line>
        <line x1="16" y1="12" x2="23" y2="12"></line>
      </g>
      <g class="cursor-reticle__line">
        <line x1="12" y1="1" x2="12" y2="8"></line>
        <line x1="12" y1="16" x2="12" y2="23"></line>
        <line x1="1" y1="12" x2="8" y2="12"></line>
        <line x1="16" y1="12" x2="23" y2="12"></line>
      </g>
    </svg>
  `;
  document.body.appendChild(el);

  window.addEventListener('mousemove', (event) => {
    el.classList.remove('cursor-reticle--hidden');
    el.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
  });
  window.addEventListener('mouseleave', () => el.classList.add('cursor-reticle--hidden'));

  document.addEventListener('mouseover', (event) => {
    if (event.target.closest(INTERACTIVE_SELECTOR)) el.classList.add('cursor-reticle--active');
  });
  document.addEventListener('mouseout', (event) => {
    const stillInside = event.relatedTarget?.closest?.(INTERACTIVE_SELECTOR);
    if (event.target.closest(INTERACTIVE_SELECTOR) && !stillInside) el.classList.remove('cursor-reticle--active');
  });
}
