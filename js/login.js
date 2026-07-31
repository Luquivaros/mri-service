function runWhenReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

runWhenReady(() => {
  const form = document.getElementById('loginForm');
  const errorEl = document.getElementById('loginError');
  const submitBtn = form.querySelector('button[type="submit"]');

  (async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) window.location.href = 'admin.html';
  })();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const email = form.email.value.trim();
    const password = form.password.value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      errorEl.textContent = 'E-mail ou senha inválidos.';
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
      return;
    }

    window.location.href = 'admin.html';
  });
});
