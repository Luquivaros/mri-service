function partsCardHTML({ title, imageUrl, href }) {
  const mediaInner = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="" class="parts-card__image">`
    : skeletonMediaHTML();
  const mediaClass = imageUrl ? 'parts-card__media' : 'parts-card__media parts-card__media--empty';

  return `
    <article class="parts-card">
      <div class="${mediaClass}">
        ${mediaInner}
      </div>
      <div class="parts-card__body">
        <h3 class="parts-card__title">${escapeHtml(title)}</h3>
        <a href="${href}" class="parts-card__link">
          Ver Componentes
          <svg class="parts-card__link-icon" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2.5 9.5l7-7M9.5 2.5h-6M9.5 2.5v6"></path></svg>
        </a>
      </div>
    </article>
  `;
}

function setEmptyMessage(text) {
  const emptyMsg = document.querySelector('.parts-search__empty');
  emptyMsg.textContent = text;
  emptyMsg.classList.add('is-visible');
}

function hideEmptyMessage() {
  document.querySelector('.parts-search__empty').classList.remove('is-visible');
}

async function loadFeaturedParts() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  const { data: parts, error } = await supabaseClient
    .from('parts')
    .select('id, name, slug, part_images(url, is_primary)')
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error(error);
    grid.innerHTML = '';
    setEmptyMessage(`Erro ao carregar peças: ${error.message}`);
    return;
  }

  if (!parts.length) {
    grid.innerHTML = '';
    setEmptyMessage('Nenhuma peça em destaque no momento. Use a busca acima para encontrar peças já cadastradas.');
    return;
  }

  hideEmptyMessage();
  grid.innerHTML = parts.map((part) => partsCardHTML({
    title: part.name,
    imageUrl: primaryImageUrl(part),
    href: `componente-detalhe.html#slug=${encodeURIComponent(part.slug)}`,
  })).join('');
}

async function searchParts(query) {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  if (!query) {
    loadFeaturedParts();
    return;
  }

  const { data: parts, error } = await supabaseClient
    .from('parts')
    .select('id, name, slug, part_images(url, is_primary)')
    .ilike('name', `%${query}%`)
    .order('name');

  if (error) {
    console.error(error);
    grid.innerHTML = '';
    setEmptyMessage(`Erro na busca: ${error.message}`);
    return;
  }

  if (!parts.length) {
    grid.innerHTML = '';
    setEmptyMessage('Nenhuma peça encontrada para essa busca. Fale conosco — provavelmente temos a peça no nosso inventário global.');
    return;
  }

  hideEmptyMessage();
  grid.innerHTML = parts.map((part) => partsCardHTML({
    title: part.name,
    imageUrl: primaryImageUrl(part),
    href: `componente-detalhe.html#slug=${encodeURIComponent(part.slug)}`,
  })).join('');
}

onReady(() => {
  loadFeaturedParts();

  const input = document.querySelector('.parts-search__input');
  if (input) {
    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const query = input.value.trim();
      debounceTimer = setTimeout(() => searchParts(query), 250);
    });
  }
});
