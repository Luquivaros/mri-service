async function fetchPart() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const slug = params.get('slug');
  const categorySlug = params.get('category');

  const selectQuery = '*, categories(name), part_images(id, url, is_primary, sort_order)';

  if (slug) {
    const { data, error } = await supabaseClient
      .from('parts')
      .select(selectQuery)
      .eq('slug', slug)
      .maybeSingle();
    if (error) console.error(error);
    return data;
  }

  if (categorySlug) {
    const { data: category } = await supabaseClient
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle();
    if (!category) return null;

    const { data, error } = await supabaseClient
      .from('parts')
      .select(selectQuery)
      .eq('category_id', category.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.error(error);
    return data;
  }

  // Sem parâmetros na URL: não há peça específica para mostrar
  return null;
}

function renderSpecs(part) {
  const grid = document.getElementById('specsGrid');
  const section = document.getElementById('especificacoes');
  if (!grid || !section) return;

  const fields = [
    ['Modelo', part.model],
    ['Fabricante', part.manufacturer],
    ['Peso', part.weight],
    ['Garantia', part.warranty],
  ].filter(([, value]) => value);

  if (!fields.length) {
    section.hidden = true;
    return;
  }

  grid.innerHTML = fields.map(([label, value]) => `
    <div class="numbers__stat">
      <span class="numbers__stat-value">${escapeHtml(value)}</span>
      <span class="numbers__stat-label">${escapeHtml(label)}</span>
    </div>
  `).join('');
}

function renderGallery(part) {
  const grid = document.getElementById('galleryGrid');
  const section = document.getElementById('mais-fotos');
  const images = (part.part_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);

  if (!images.length) {
    section.hidden = true;
    return;
  }

  grid.innerHTML = images.map((img, index) => {
    const isWide = index % 7 === 6;
    return `
      <div class="audience__media ${isWide ? 'audience__media--wide' : ''}">
        <img src="${escapeHtml(img.url)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">
      </div>
    `;
  }).join('');
}

function renderPart(part) {
  document.title = `${part.name} — MRI Service`;

  // Update banner-hero info overlay
  const partTitle = document.getElementById('partTitle');
  const partDesc = document.getElementById('partDescription');
  if (partTitle) partTitle.textContent = part.name;
  if (partDesc) partDesc.textContent = part.short_description || '';

  // Populate stat cards
  const statWeight = document.getElementById('statWeight');
  const statWarranty = document.getElementById('statWarranty');
  const statManufacturer = document.getElementById('statManufacturer');
  if (statWeight) statWeight.textContent = part.weight || '—';
  if (statWarranty) statWarranty.textContent = part.warranty || '—';
  if (statManufacturer) statManufacturer.textContent = part.manufacturer || '—';

  // Update the hero image card
  const heroCard = document.getElementById('partHeroImage');
  const imageUrl = primaryImageUrl(part);
  if (imageUrl && heroCard) {
    // Remove skeleton if present
    const skeleton = heroCard.querySelector('.banner-hero__card-skeleton');
    if (skeleton) skeleton.style.display = 'none';

    // Insert real image (before the overlay)
    const overlay = heroCard.querySelector('.banner-hero__card-overlay');
    const img = document.createElement('img');
    img.src = escapeHtml(imageUrl);
    img.alt = escapeHtml(part.name);
    img.className = 'banner-hero__card-img';
    if (overlay) {
      heroCard.insertBefore(img, overlay);
    } else {
      heroCard.prepend(img);
    }
  }

  document.getElementById('partAboutText').textContent = part.about_description || '';

  renderSpecs(part);
  renderGallery(part);
}

function showEmptyState() {
  document.getElementById('partContent').hidden = true;
  document.getElementById('emptyState').hidden = false;
  const partTitle = document.getElementById('partTitle');
  const partDesc = document.getElementById('partDescription');
  if (partTitle) partTitle.textContent = 'Peça não encontrada';
  if (partDesc) partDesc.textContent = '';
}

onReady(async () => {
  const part = await fetchPart();
  if (!part) {
    showEmptyState();
    return;
  }
  renderPart(part);
});
