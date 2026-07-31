// Preencha com os dados do seu projeto Supabase (Project Settings > API).
// SUPABASE_ANON_KEY é a chave "anon public" — ela é feita para ser exposta
// no navegador. NUNCA coloque a "service_role key" aqui.
const SUPABASE_URL = 'https://sxfslhuvjsguvuojayzn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZnNsaHV2anNndXZ1b2pheXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNTU5MDksImV4cCI6MjEwMDkzMTkwOX0.zikISA0NROEdXZ5WBDh9Gh54iD3Q8NS59Z_mpwzLQzE';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
