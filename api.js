/* ===================================================================
   ROTA — api.js (edição Supabase)
   Ponto único de comunicação com o Supabase Auth — login, cadastro,
   login social, confirmação de e-mail e recuperação de senha.

   Por que isso é separado de data.js? data.js pressupõe uma sessão já
   ativa (getCurrentUser, getSession, requireSession...). Este arquivo
   é usado justamente ANTES de existir sessão — em index.html (login),
   register.html (cadastro) e forgot-password.html (recuperação) —
   então fica isolado pra não misturar os dois papéis num arquivo só.

   Padrão de retorno: toda função aqui devolve { ok: true, ... } em
   caso de sucesso ou { ok: false, erro } em caso de falha — nunca
   lança exceção. Isso deixa quem chama livre de try/catch e mantém o
   mesmo estilo já usado em RotaDB (ex: removeTeamMember devolvendo
   { erro: 'ultimo_admin' }).

   Sobre mensagens de erro: este arquivo NÃO traduz o erro do Supabase
   — só devolve error.message cru em `erro`. Quem decide o texto que a
   pessoa vê é a própria página, via RotaI18n (ex: login.errorAuth),
   porque as páginas já sabem qual mensagem bilíngue mostrar pra cada
   caso esperado. `erro` aqui existe só de fallback/log pros casos que
   a página não previu.

   Requer que supabase-config.js (que cria `supabaseClient`) já tenha
   sido carregado antes deste script.
   =================================================================== */

// ---------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------

/**
 * Login por e-mail e senha.
 * @returns {Promise<{ok: true, session: object, user: object} | {ok: false, erro: string}>}
 */
async function login(email, senha) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: (email || '').trim(),
    password: senha,
  });
  if (error) {
    console.error('[RotaAuth] login:', error.message);
    return { ok: false, erro: error.message };
  }
  return { ok: true, session: data.session, user: data.user };
}

/**
 * Login social (Google). O próprio navegador é redirecionado pro
 * provedor — não há "dado de retorno" aqui, só sucesso em disparar
 * o redirecionamento ou erro antes disso acontecer.
 * @param {string} redirectTo URL de volta após autenticar (ex: `${location.origin}/dashboard.html`)
 */
async function loginComGoogle(redirectTo) {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) {
    console.error('[RotaAuth] loginComGoogle:', error.message);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------
// Cadastro
// ---------------------------------------------------------------------

/**
 * Cria a conta no Supabase Auth. agencyName/fullName/birthDate vão como
 * metadata (agency_name, full_name, birth_date) — quem lê isso e cria
 * de fato as linhas em `agencies` e `profiles` é um trigger no banco
 * (on auth.users insert), não este arquivo.
 * @param {{agencyName: string, fullName: string, birthDate: string, email: string, senha: string}} dados
 * @returns {Promise<{ok: true, user: object, precisaConfirmarEmail: boolean} | {ok: false, erro: string}>}
 */
async function cadastrar({ agencyName, fullName, birthDate, email, senha }) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: (email || '').trim(),
    password: senha,
    options: {
      data: {
        agency_name: (agencyName || '').trim(),
        full_name: (fullName || '').trim(),
        birth_date: birthDate || null,
      },
    },
  });
  if (error) {
    console.error('[RotaAuth] cadastrar:', error.message);
    return { ok: false, erro: error.message };
  }
  // Se o projeto exige confirmação de e-mail, o Supabase cria o usuário
  // mas não devolve sessão ainda — é assim que a página sabe se deve
  // mandar pra tela de "confirme seu e-mail" ou já pro login/dashboard.
  return { ok: true, user: data.user, precisaConfirmarEmail: !data.session };
}

/** Reenvia o e-mail de confirmação de cadastro. */
async function reenviarConfirmacao(email) {
  const { error } = await supabaseClient.auth.resend({
    type: 'signup',
    email: (email || '').trim(),
  });
  if (error) {
    console.error('[RotaAuth] reenviarConfirmacao:', error.message);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------
// Recuperação de senha
// ---------------------------------------------------------------------

/**
 * Dispara o e-mail de recuperação. redirectTo deve apontar pra uma
 * página que trate a sessão de recuperação e chame redefinirSenha().
 * Por design do Supabase, não revela se o e-mail existe ou não — a
 * página deve mostrar sempre a mesma mensagem genérica de sucesso.
 */
async function solicitarRecuperacaoSenha(email, redirectTo) {
  const { error } = await supabaseClient.auth.resetPasswordForEmail(
    (email || '').trim(),
    { redirectTo },
  );
  if (error) {
    console.error('[RotaAuth] solicitarRecuperacaoSenha:', error.message);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

/**
 * Define a nova senha. Só funciona dentro da sessão temporária que o
 * Supabase cria quando a pessoa clica no link do e-mail de recuperação.
 */
async function redefinirSenha(novaSenha) {
  const { error } = await supabaseClient.auth.updateUser({ password: novaSenha });
  if (error) {
    console.error('[RotaAuth] redefinirSenha:', error.message);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------

window.RotaAuth = {
  login, loginComGoogle,
  cadastrar, reenviarConfirmacao,
  solicitarRecuperacaoSenha, redefinirSenha,
};
