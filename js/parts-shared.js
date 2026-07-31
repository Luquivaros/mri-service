function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function skeletonMediaHTML(label = 'Imagem em breve') {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2"></rect>
      <circle cx="8.5" cy="9.5" r="1.5"></circle>
      <path d="M21 16l-5.5-5.5a2 2 0 0 0-2.8 0L3 20"></path>
    </svg>
    <span>${escapeHtml(label)}</span>
  `;
}

function skeletonAudienceMediaHTML(label = 'Imagem em breve') {
  return `
    <div class="audience__media-skeleton">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2"></rect>
        <circle cx="8.5" cy="9.5" r="1.5"></circle>
        <path d="M21 16l-5.5-5.5a2 2 0 0 0-2.8 0L3 20"></path>
      </svg>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function primaryImageUrl(part) {
  const images = part.part_images || [];
  const primary = images.find((i) => i.is_primary) || images[0];
  return primary ? primary.url : null;
}

// Roda fn imediatamente se o documento já terminou de carregar, em vez de
// esperar por um DOMContentLoaded que pode nunca disparar (evento perdido
// por timing/cache em alguns navegadores).
function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}
