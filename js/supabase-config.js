// Preencha com os dados do seu projeto Supabase (Project Settings > API).
// SUPABASE_ANON_KEY é a chave "anon public" — ela é feita para ser exposta
// no navegador. NUNCA coloque a "service_role key" aqui.
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_SUPABASE_ANON_KEY_AQUI';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
