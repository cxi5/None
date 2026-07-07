// Configuração central do Supabase.
// Reaproveite este mesmo arquivo em TODAS as páginas (login, cadastro,
// dashboard...) para ter uma única fonte de verdade.
//
// SEGURANÇA:
// - A "anon key" abaixo é pública por design. Ela é segura para ficar no
//   front-end DESDE QUE o Row Level Security (RLS) esteja ativado em todas
//   as tabelas do Supabase — é o RLS que garante que um usuário só acesse
//   os dados que pode ver.
// - NUNCA coloque a "service_role key" aqui. Ela ignora o RLS e dá acesso
//   total ao banco; deve existir só em ambiente de servidor (Edge Functions,
//   backend próprio, etc.), nunca em código enviado ao navegador.

const SUPABASE_URL = 'https://epsmbuippicdkmjdsbgm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwc21idWlwcGljZGttamRzYmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNDQzOTAsImV4cCI6MjA5ODkyMDM5MH0.pmuOUxeqVRXNMMF-nitxC_Fv1mtuReHrPHMiEkm-P7A';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
