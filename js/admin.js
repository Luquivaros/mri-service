let categoriesCache = [];
let photoItems = []; // { kind: 'existing'|'new', id?, file?, url, isPrimary, dbId? }
let removedExistingPhotos = [];
let editingPartId = null;

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeFilename(name) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
}

function extractStoragePath(publicUrl) {
  const marker = '/storage/v1/object/public/part-images/';
  const idx = publicUrl.indexOf(marker);
  return idx === -1 ? null : publicUrl.slice(idx + marker.length);
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function openModal(id) {
  document.getElementById(id).classList.add('is-open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('is-open');
}

/* ---------- Tabs ---------- */

function initTabs() {
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('is-active'));
      document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('is-active');
    });
  });
}

/* ---------- Categorias ---------- */

async function loadCategories() {
  const { data, error } = await supabaseClient.from('categories').select('*').order('name');
  if (error) {
    console.error(error);
    return;
  }
  categoriesCache = data;
  const select = document.getElementById('part-category');
  select.innerHTML = data.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
}

/* ---------- Peças ---------- */

async function loadParts() {
  const { data, error } = await supabaseClient
    .from('parts')
    .select('*, categories(name), part_images(id, url, is_primary)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  renderPartsTable(data);
}

function renderPartsTable(parts) {
  const tbody = document.getElementById('partsTableBody');
  const empty = document.getElementById('partsEmpty');

  if (!parts.length) {
    tbody.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = parts.map((part) => {
    const primaryImg = part.part_images.find((i) => i.is_primary) || part.part_images[0];
    const thumb = primaryImg
      ? `<img class="admin-table__thumb" src="${primaryImg.url}" alt="">`
      : `<div class="admin-table__thumb"></div>`;

    return `
      <tr>
        <td>${thumb}</td>
        <td>${part.name}</td>
        <td>${part.categories?.name || '—'}</td>
        <td>${part.is_featured ? '<span class="admin-badge">Destaque</span>' : ''}</td>
        <td class="admin-table__actions">
          <div class="admin-table__actions-inner">
            <button type="button" class="admin-btn admin-btn--ghost admin-btn--small" data-edit-part="${part.id}">Editar</button>
            <button type="button" class="admin-btn admin-btn--danger admin-btn--small" data-delete-part="${part.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-edit-part]').forEach((btn) => {
    btn.addEventListener('click', () => editPart(btn.dataset.editPart, parts));
  });
  tbody.querySelectorAll('[data-delete-part]').forEach((btn) => {
    btn.addEventListener('click', () => deletePart(btn.dataset.deletePart));
  });
}

function resetPartForm() {
  editingPartId = null;
  photoItems = [];
  removedExistingPhotos = [];
  document.getElementById('partForm').reset();
  document.getElementById('part-id').value = '';
  document.getElementById('partModalTitle').textContent = 'Nova Peça';
  document.getElementById('partFormError').hidden = true;
  renderPhotoManager();
}

async function updateFeaturedAvailability() {
  const checkbox = document.getElementById('part-is-featured');
  const hint = document.getElementById('featuredLimitHint');

  let query = supabaseClient.from('parts').select('id', { count: 'exact', head: true }).eq('is_featured', true);
  if (editingPartId) query = query.neq('id', editingPartId);
  const { count } = await query;

  const atLimit = (count || 0) >= 5;
  hint.hidden = !atLimit || checkbox.checked;
  checkbox.disabled = atLimit && !checkbox.checked;
}

function openNewPartModal() {
  resetPartForm();
  openModal('partModalOverlay');
  updateFeaturedAvailability();
}

function editPart(id, parts) {
  const part = parts.find((p) => p.id === id);
  if (!part) return;

  resetPartForm();
  editingPartId = id;
  document.getElementById('partModalTitle').textContent = 'Editar Peça';
  document.getElementById('part-id').value = id;
  document.getElementById('part-name').value = part.name;
  document.getElementById('part-category').value = part.category_id;
  document.getElementById('part-short-description').value = part.short_description || '';
  document.getElementById('part-about').value = part.about_description || '';
  document.getElementById('part-model').value = part.model || '';
  document.getElementById('part-manufacturer').value = part.manufacturer || '';
  document.getElementById('part-weight').value = part.weight || '';
  document.getElementById('part-warranty').value = part.warranty || '';
  document.getElementById('part-is-featured').checked = part.is_featured;

  photoItems = part.part_images.map((img) => ({
    kind: 'existing',
    id: img.id,
    url: img.url,
    isPrimary: img.is_primary,
  }));
  renderPhotoManager();

  openModal('partModalOverlay');
  updateFeaturedAvailability();
}

async function deletePart(id) {
  if (!confirm('Tem certeza que deseja excluir esta peça? Essa ação não pode ser desfeita.')) return;

  const { data: images } = await supabaseClient.from('part_images').select('url').eq('part_id', id);
  const paths = (images || []).map((i) => extractStoragePath(i.url)).filter(Boolean);
  if (paths.length) {
    await supabaseClient.storage.from('part-images').remove(paths);
  }

  const { error } = await supabaseClient.from('parts').delete().eq('id', id);
  if (error) {
    alert('Erro ao excluir a peça: ' + error.message);
    return;
  }
  loadParts();
}

/* ---------- Gerenciador de fotos ---------- */

function renderPhotoManager() {
  const container = document.getElementById('partPhotos');
  if (!photoItems.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = photoItems.map((item, index) => `
    <div class="admin-photo ${item.isPrimary ? 'is-primary' : ''}" data-photo-index="${index}">
      <img src="${item.url}" alt="">
      <button type="button" class="admin-photo__remove" data-remove-photo="${index}" title="Remover">&times;</button>
      <button type="button" class="admin-photo__primary-toggle" data-set-primary="${index}">${item.isPrimary ? 'Capa' : 'Definir capa'}</button>
    </div>
  `).join('');

  container.querySelectorAll('[data-remove-photo]').forEach((btn) => {
    btn.addEventListener('click', () => removePhoto(Number(btn.dataset.removePhoto)));
  });
  container.querySelectorAll('[data-set-primary]').forEach((btn) => {
    btn.addEventListener('click', () => setPrimaryPhoto(Number(btn.dataset.setPrimary)));
  });
}

function removePhoto(index) {
  const [removed] = photoItems.splice(index, 1);
  if (removed.kind === 'existing') {
    removedExistingPhotos.push(removed);
  }
  if (removed.isPrimary && photoItems.length) {
    photoItems[0].isPrimary = true;
  }
  renderPhotoManager();
}

function setPrimaryPhoto(index) {
  photoItems.forEach((item, i) => { item.isPrimary = i === index; });
  renderPhotoManager();
}

function handlePhotoInputChange(e) {
  const files = Array.from(e.target.files || []);
  files.forEach((file) => {
    photoItems.push({
      kind: 'new',
      file,
      url: URL.createObjectURL(file),
      isPrimary: photoItems.length === 0,
    });
  });
  e.target.value = '';
  renderPhotoManager();
}

/* ---------- Salvar peça ---------- */

async function savePartForm(e) {
  e.preventDefault();
  const errorEl = document.getElementById('partFormError');
  errorEl.hidden = true;
  const submitBtn = document.getElementById('partFormSubmit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    const name = document.getElementById('part-name').value.trim();
    const payload = {
      name,
      slug: slugify(name),
      category_id: document.getElementById('part-category').value,
      short_description: document.getElementById('part-short-description').value.trim(),
      about_description: document.getElementById('part-about').value.trim(),
      model: document.getElementById('part-model').value.trim() || null,
      manufacturer: document.getElementById('part-manufacturer').value.trim() || null,
      weight: document.getElementById('part-weight').value.trim() || null,
      warranty: document.getElementById('part-warranty').value.trim() || null,
      is_featured: document.getElementById('part-is-featured').checked,
    };

    let partId = editingPartId;
    if (partId) {
      const { error } = await supabaseClient.from('parts').update(payload).eq('id', partId);
      if (error) throw error;
    } else {
      const { data, error } = await supabaseClient.from('parts').insert(payload).select().single();
      if (error) throw error;
      partId = data.id;
    }

    // Limpa a flag de capa de todas as fotos existentes desta peça antes de redefinir
    await supabaseClient.from('part_images').update({ is_primary: false }).eq('part_id', partId);

    // Remove fotos excluídas pelo usuário (storage + banco)
    for (const photo of removedExistingPhotos) {
      const path = extractStoragePath(photo.url);
      if (path) await supabaseClient.storage.from('part-images').remove([path]);
      await supabaseClient.from('part_images').delete().eq('id', photo.id);
    }

    // Envia fotos novas
    for (let i = 0; i < photoItems.length; i++) {
      const item = photoItems[i];
      if (item.kind !== 'new') continue;
      const path = `${partId}/${Date.now()}-${sanitizeFilename(item.file.name)}`;
      const { error: uploadError } = await supabaseClient.storage.from('part-images').upload(path, item.file);
      if (uploadError) throw uploadError;
      const { data: pub } = supabaseClient.storage.from('part-images').getPublicUrl(path);
      const { data: inserted, error: insertError } = await supabaseClient
        .from('part_images')
        .insert({ part_id: partId, url: pub.publicUrl, is_primary: false, sort_order: i })
        .select()
        .single();
      if (insertError) throw insertError;
      item.dbId = inserted.id;
    }

    // Define a foto de capa escolhida
    const primaryItem = photoItems.find((p) => p.isPrimary);
    const primaryId = primaryItem ? (primaryItem.kind === 'existing' ? primaryItem.id : primaryItem.dbId) : null;
    if (primaryId) {
      await supabaseClient.from('part_images').update({ is_primary: true }).eq('id', primaryId);
    }

    closeModal('partModalOverlay');
    loadParts();
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Erro ao salvar a peça: ' + err.message;
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvar Peça';
  }
}

/* ---------- Contatos ---------- */

async function loadContacts() {
  const { data, error } = await supabaseClient
    .from('contact_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }
  renderContactsTable(data);
}

function renderContactsTable(contacts) {
  const tbody = document.getElementById('contactsTableBody');
  const empty = document.getElementById('contactsEmpty');

  if (!contacts.length) {
    tbody.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = contacts.map((c) => `
    <tr>
      <td>${c.nome || '—'}</td>
      <td>${c.empresa || '—'}</td>
      <td>${c.telefone || '—'}</td>
      <td>${c.equipamento || '—'}</td>
      <td>${c.urgencia || '—'}</td>
      <td>${formatDate(c.created_at)}</td>
      <td class="admin-table__actions">
        <div class="admin-table__actions-inner">
          <button type="button" class="admin-btn admin-btn--ghost admin-btn--small" data-view-contact="${c.id}">Ver</button>
          <div class="admin-menu" data-admin-menu>
            <button type="button" class="admin-menu__trigger" data-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="Mais ações">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><circle cx="10" cy="4" r="1.6"></circle><circle cx="10" cy="10" r="1.6"></circle><circle cx="10" cy="16" r="1.6"></circle></svg>
            </button>
            <div class="admin-menu__panel" role="menu">
              <button type="button" class="admin-menu__item" role="menuitem" data-edit-contact="${c.id}">Editar</button>
              <button type="button" class="admin-menu__item admin-menu__item--danger" role="menuitem" data-delete-contact="${c.id}">Excluir</button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-view-contact]').forEach((btn) => {
    btn.addEventListener('click', () => viewContact(btn.dataset.viewContact, contacts));
  });
  tbody.querySelectorAll('[data-edit-contact]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeAllAdminMenus();
      editContact(btn.dataset.editContact, contacts);
    });
  });
  tbody.querySelectorAll('[data-delete-contact]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeAllAdminMenus();
      deleteContact(btn.dataset.deleteContact);
    });
  });
  initAdminMenus(tbody);
}

/* ---------- Kebab menu (row actions) ---------- */

function closeAllAdminMenus() {
  document.querySelectorAll('.admin-menu.is-open').forEach((menu) => {
    menu.classList.remove('is-open');
    menu.querySelector('.admin-menu__trigger').setAttribute('aria-expanded', 'false');
  });
}

function initAdminMenus(scope) {
  scope.querySelectorAll('[data-admin-menu]').forEach((menu) => {
    const trigger = menu.querySelector('[data-menu-trigger]');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('is-open');
      closeAllAdminMenus();
      if (!isOpen) {
        menu.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  if (!document.body.dataset.adminMenuGlobalBound) {
    document.body.dataset.adminMenuGlobalBound = 'true';
    document.addEventListener('click', closeAllAdminMenus);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllAdminMenus();
    });
  }
}

function viewContact(id, contacts) {
  const c = contacts.find((item) => item.id === id);
  if (!c) return;

  const rows = [
    ['Nome', c.nome],
    ['Cargo', c.cargo],
    ['E-mail', c.email],
    ['Telefone', c.telefone],
    ['Empresa', c.empresa],
    ['CNPJ', c.cnpj],
    ['Cidade/Estado', `${c.cidade || '—'}/${c.estado || '—'}`],
    ['Equipamento', c.equipamento],
    ['Urgência', c.urgencia],
    ['Recebido em', formatDate(c.created_at)],
  ];

  const body = document.getElementById('contactModalBody');
  body.innerHTML = rows.map(([label, value]) => `
    <div class="admin-modal__detail-row">
      <span class="admin-modal__detail-label">${label}</span>
      <span>${value || '—'}</span>
    </div>
  `).join('') + `
    <p class="admin-modal__detail-label" style="margin-top:20px; margin-bottom:8px;">Descrição do Problema</p>
    <p class="admin-modal__message">${c.mensagem || 'Sem descrição.'}</p>
  `;

  openModal('contactModalOverlay');
}

function editContact(id, contacts) {
  const c = contacts.find((item) => item.id === id);
  if (!c) return;

  document.getElementById('contactEditFormError').hidden = true;
  document.getElementById('contact-edit-id').value = c.id;
  document.getElementById('contact-edit-nome').value = c.nome || '';
  document.getElementById('contact-edit-cargo').value = c.cargo || '';
  document.getElementById('contact-edit-email').value = c.email || '';
  document.getElementById('contact-edit-telefone').value = c.telefone || '';
  document.getElementById('contact-edit-empresa').value = c.empresa || '';
  document.getElementById('contact-edit-cnpj').value = c.cnpj || '';
  document.getElementById('contact-edit-cidade').value = c.cidade || '';
  document.getElementById('contact-edit-estado').value = c.estado || '';
  document.getElementById('contact-edit-equipamento').value = c.equipamento || '';
  document.getElementById('contact-edit-urgencia').value = c.urgencia || '';
  document.getElementById('contact-edit-mensagem').value = c.mensagem || '';

  openModal('contactEditModalOverlay');
}

async function saveContactEdit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('contactEditFormError');
  errorEl.hidden = true;
  const submitBtn = document.getElementById('contactEditFormSubmit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    const id = document.getElementById('contact-edit-id').value;
    const payload = {
      nome: document.getElementById('contact-edit-nome').value.trim() || null,
      cargo: document.getElementById('contact-edit-cargo').value.trim() || null,
      email: document.getElementById('contact-edit-email').value.trim() || null,
      telefone: document.getElementById('contact-edit-telefone').value.trim() || null,
      empresa: document.getElementById('contact-edit-empresa').value.trim() || null,
      cnpj: document.getElementById('contact-edit-cnpj').value.trim() || null,
      cidade: document.getElementById('contact-edit-cidade').value.trim() || null,
      estado: document.getElementById('contact-edit-estado').value.trim() || null,
      equipamento: document.getElementById('contact-edit-equipamento').value.trim() || null,
      urgencia: document.getElementById('contact-edit-urgencia').value.trim() || null,
      mensagem: document.getElementById('contact-edit-mensagem').value.trim() || null,
    };

    const { error } = await supabaseClient.from('contact_submissions').update(payload).eq('id', id);
    if (error) throw error;

    closeModal('contactEditModalOverlay');
    loadContacts();
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Erro ao salvar alterações: ' + err.message;
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvar Alterações';
  }
}

async function deleteContact(id) {
  if (!confirm('Tem certeza que deseja excluir esta mensagem de contato? Essa ação não pode ser desfeita.')) return;

  const { error } = await supabaseClient.from('contact_submissions').delete().eq('id', id);
  if (error) {
    alert('Erro ao excluir a mensagem: ' + error.message);
    return;
  }
  loadContacts();
}

/* ---------- Init ---------- */

function runWhenReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

runWhenReady(async () => {
  const session = await requireAuthOrRedirect();
  if (!session) return;

  initTabs();
  await loadCategories();
  await loadParts();
  await loadContacts();

  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('newPartBtn').addEventListener('click', openNewPartModal);
  document.getElementById('partForm').addEventListener('submit', savePartForm);
  document.getElementById('part-photos-input').addEventListener('change', handlePhotoInputChange);
  document.getElementById('part-is-featured').addEventListener('change', updateFeaturedAvailability);
  document.getElementById('contactEditForm').addEventListener('submit', saveContactEdit);

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  document.querySelectorAll('.admin-modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('is-open');
    });
  });
});
