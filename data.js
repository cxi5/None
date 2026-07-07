/* ===================================================================
   ROTA — data.js (edição Supabase)
   Camada única de dados. Antes vivia em localStorage; agora fala direto
   com o Supabase. A API pública (RotaDB.x) continua a mesma — a
   diferença é que TODA função que toca o banco agora é assíncrona
   (retorna Promise), então quem chama precisa usar await.

   Isolamento multi-agência: cada linha das tabelas de negócio tem
   agency_id, e o RLS no Supabase garante que uma agência nunca lê os
   dados de outra. Aqui no client a gente só descobre o agency_id do
   usuário logado (via profiles) e usa nos inserts — quem bloqueia
   de verdade é o RLS, não este arquivo.

   Requer que supabase-config.js (que cria `supabaseClient`) já tenha
   sido carregado antes deste script.
   =================================================================== */

const CATALOGO_MOEDAS_PT = {
  AOA: 'Kwanza angolano', USD: 'Dólar americano', EUR: 'Euro',
  BRL: 'Real brasileiro', GBP: 'Libra esterlina', ZAR: 'Rand sul-africano',
  MZN: 'Metical moçambicano', CVE: 'Escudo cabo-verdiano',
  XOF: 'Franco CFA (BCEAO)', XAF: 'Franco CFA (BEAC)', NGN: 'Naira nigeriana',
  GHS: 'Cedi ganês', KES: 'Xelim queniano', EGP: 'Libra egípcia',
  CNY: 'Yuan chinês', JPY: 'Iene japonês', INR: 'Rupia indiana',
  AED: 'Dirham dos Emirados', SAR: 'Rial saudita', CHF: 'Franco suíço',
  CAD: 'Dólar canadense', AUD: 'Dólar australiano', RUB: 'Rublo russo',
  TRY: 'Lira turca', MXN: 'Peso mexicano', ARS: 'Peso argentino',
  CLP: 'Peso chileno', COP: 'Peso colombiano', PLN: 'Zloty polonês',
  SEK: 'Coroa sueca', NOK: 'Coroa norueguesa', DKK: 'Coroa dinamarquesa',
  HKD: 'Dólar de Hong Kong', SGD: 'Dólar de Singapura', KRW: 'Won sul-coreano',
  THB: 'Baht tailandês',
};

const CATALOGO_MOEDAS_EN = {
  AOA: 'Angolan kwanza', USD: 'US dollar', EUR: 'Euro',
  BRL: 'Brazilian real', GBP: 'British pound', ZAR: 'South African rand',
  MZN: 'Mozambican metical', CVE: 'Cape Verdean escudo',
  XOF: 'CFA franc (BCEAO)', XAF: 'CFA franc (BEAC)', NGN: 'Nigerian naira',
  GHS: 'Ghanaian cedi', KES: 'Kenyan shilling', EGP: 'Egyptian pound',
  CNY: 'Chinese yuan', JPY: 'Japanese yen', INR: 'Indian rupee',
  AED: 'UAE dirham', SAR: 'Saudi riyal', CHF: 'Swiss franc',
  CAD: 'Canadian dollar', AUD: 'Australian dollar', RUB: 'Russian ruble',
  TRY: 'Turkish lira', MXN: 'Mexican peso', ARS: 'Argentine peso',
  CLP: 'Chilean peso', COP: 'Colombian peso', PLN: 'Polish zloty',
  SEK: 'Swedish krona', NOK: 'Norwegian krone', DKK: 'Danish krone',
  HKD: 'Hong Kong dollar', SGD: 'Singapore dollar', KRW: 'South Korean won',
  THB: 'Thai baht',
};

const CATALOGO_MOEDAS = CATALOGO_MOEDAS_PT;
const LIMITE_MOEDAS_ATIVAS = 4;
const CICLO_CORES_MOEDA = ['petrol', 'amber', 'clay', 'ink'];

// ---------------------------------------------------------------------
// Sessão / Perfil — vem do Supabase Auth + tabela `profiles`, nunca mais
// de um valor inventado. Se não tiver sessão, manda pro login.
// ---------------------------------------------------------------------

let _cachedProfile = null;

async function getSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

// Usa isso no topo de páginas protegidas (dashboard, clientes, etc).
// Redireciona pro login e devolve null se não houver sessão válida.
async function requireSession() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

async function getProfile(forceRefresh = false) {
  if (_cachedProfile && !forceRefresh) return _cachedProfile;
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, agency_id, nome, papel, avatar_color, telefone, cargo, data_nascimento, whatsapp, idiomas, especialidade, rede_social, bio, foto_url, agencies(nome, moedas_ativas)')
    .eq('id', session.user.id)
    .single();

  if (error) { console.error('[RotaDB] getProfile:', error.message); return null; }
  _cachedProfile = data;
  return data;
}

async function getCurrentUser() {
  const profile = await getProfile();
  if (!profile) {
    return {
      nome: '', papel: 'agente', avatarColor: 'petrol', agencyId: null,
      telefone: '', cargo: '', dataNascimento: '', whatsapp: '',
      idiomas: '', especialidade: '', redeSocial: '', bio: '', fotoUrl: '',
    };
  }
  return {
    nome: profile.nome,
    papel: profile.papel,
    avatarColor: profile.avatar_color,
    agencyId: profile.agency_id,
    agenciaNome: profile.agencies?.nome || '',
    telefone: profile.telefone || '',
    cargo: profile.cargo || '',
    dataNascimento: profile.data_nascimento || '',
    whatsapp: profile.whatsapp || '',
    idiomas: profile.idiomas || '',
    especialidade: profile.especialidade || '',
    redeSocial: profile.rede_social || '',
    bio: profile.bio || '',
    fotoUrl: profile.foto_url || '',
  };
}

async function setCurrentUser(dadosParciais) {
  const profile = await getProfile();
  if (!profile) return null;

  const patch = {};
  if (dadosParciais.nome !== undefined) patch.nome = dadosParciais.nome;
  if (dadosParciais.avatarColor !== undefined) patch.avatar_color = dadosParciais.avatarColor;
  if (dadosParciais.telefone !== undefined) patch.telefone = dadosParciais.telefone;
  if (dadosParciais.cargo !== undefined) patch.cargo = dadosParciais.cargo;
  if (dadosParciais.dataNascimento !== undefined) patch.data_nascimento = dadosParciais.dataNascimento || null;
  if (dadosParciais.whatsapp !== undefined) patch.whatsapp = dadosParciais.whatsapp;
  if (dadosParciais.idiomas !== undefined) patch.idiomas = dadosParciais.idiomas;
  if (dadosParciais.especialidade !== undefined) patch.especialidade = dadosParciais.especialidade;
  if (dadosParciais.redeSocial !== undefined) patch.rede_social = dadosParciais.redeSocial;
  if (dadosParciais.bio !== undefined) patch.bio = dadosParciais.bio;
  if (dadosParciais.fotoUrl !== undefined) patch.foto_url = dadosParciais.fotoUrl;

  const { data, error } = await supabaseClient
    .from('profiles')
    .update(patch)
    .eq('id', profile.id)
    .select('id, agency_id, nome, papel, avatar_color, telefone, cargo, data_nascimento, whatsapp, idiomas, especialidade, rede_social, bio, foto_url, agencies(nome, moedas_ativas)')
    .single();

  if (error) { console.error('[RotaDB] setCurrentUser:', error.message); return null; }
  _cachedProfile = data;
  return data;
}

async function logout() {
  await supabaseClient.auth.signOut();
  _cachedProfile = null;
}

// Sobe a foto de perfil pro bucket "avatars", dentro da "pasta" do próprio
// usuário (é o que a policy de Storage exige), e já grava a URL pública
// resultante em profiles.foto_url. Aceita um File/Blob vindo de <input type="file">.
async function uploadAvatar(arquivo) {
  const profile = await getProfile();
  if (!profile) return { ok: false, erro: 'sem_sessao' };

  const extensao = (arquivo.name?.split('.').pop() || 'jpg').toLowerCase();
  const caminho = `${profile.id}/avatar.${extensao}`;

  const { error: erroUpload } = await supabaseClient.storage
    .from('avatars')
    .upload(caminho, arquivo, { upsert: true, cacheControl: '3600' });

  if (erroUpload) {
    console.error('[RotaDB] uploadAvatar:', erroUpload.message);
    return { ok: false, erro: erroUpload.message };
  }

  const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(caminho);
  // adiciona um "cache buster" pra a mesma URL não ficar presa no cache do
  // navegador quando a pessoa troca de foto (o caminho não muda, só o conteúdo)
  const urlComVersao = `${publicUrl}?v=${Date.now()}`;

  await setCurrentUser({ fotoUrl: urlComVersao });
  return { ok: true, url: urlComVersao };
}

// ---------------------------------------------------------------------
// Clientes + itens adquiridos
// ---------------------------------------------------------------------

async function getClients() {
  const { data, error } = await supabaseClient
    .from('clients')
    .select('*, client_items(*)')
    .order('criado_em', { ascending: false });
  if (error) { console.error('[RotaDB] getClients:', error.message); return []; }
  return data.map(c => ({ ...c, itens: c.client_items || [] }));
}

async function getClientById(id) {
  const { data, error } = await supabaseClient
    .from('clients')
    .select('*, client_items(*)')
    .eq('id', id)
    .single();
  if (error) { console.error('[RotaDB] getClientById:', error.message); return null; }
  return { ...data, itens: data.client_items || [] };
}

async function saveClient(dadosCliente) {
  const profile = await getProfile();
  if (!profile) return null;

  const payload = {
    nome: '', contato: '', documento: '', origem_lead: '', notas: '',
    agente_id: profile.id,
    agency_id: profile.agency_id,
    ...dadosCliente,
  };
  const { data, error } = await supabaseClient.from('clients').insert(payload).select().single();
  if (error) { console.error('[RotaDB] saveClient:', error.message); return null; }
  return { ...data, itens: [] };
}

async function updateClient(id, dadosParciais) {
  const { data, error } = await supabaseClient
    .from('clients').update(dadosParciais).eq('id', id).select('*, client_items(*)').single();
  if (error) { console.error('[RotaDB] updateClient:', error.message); return null; }
  return { ...data, itens: data.client_items || [] };
}

async function deleteClient(id) {
  const { error } = await supabaseClient.from('clients').delete().eq('id', id);
  if (error) console.error('[RotaDB] deleteClient:', error.message);
}

async function addItemToClient(clientId, dadosItem) {
  const payload = {
    client_id: clientId,
    tipo: 'outro', descricao: '', status: 'pendente',
    valor: 0, moeda: 'AOA', data_servico: null, fornecedor: '',
    ...dadosItem,
  };
  const { data, error } = await supabaseClient.from('client_items').insert(payload).select().single();
  if (error) { console.error('[RotaDB] addItemToClient:', error.message); return null; }
  return data;
}

async function updateItemStatus(clientId, itemId, novoStatus) {
  const { data, error } = await supabaseClient
    .from('client_items').update({ status: novoStatus }).eq('id', itemId).eq('client_id', clientId).select().single();
  if (error) { console.error('[RotaDB] updateItemStatus:', error.message); return null; }
  return data;
}

async function updateClientItem(clientId, itemId, dadosParciais) {
  const { data, error } = await supabaseClient
    .from('client_items').update(dadosParciais).eq('id', itemId).eq('client_id', clientId).select().single();
  if (error) { console.error('[RotaDB] updateClientItem:', error.message); return null; }
  return data;
}

async function deleteClientItem(clientId, itemId) {
  const { error } = await supabaseClient.from('client_items').delete().eq('id', itemId).eq('client_id', clientId);
  if (error) console.error('[RotaDB] deleteClientItem:', error.message);
}

// ---------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------

async function getTransactions() {
  const { data, error } = await supabaseClient.from('transactions').select('*').order('data', { ascending: false });
  if (error) { console.error('[RotaDB] getTransactions:', error.message); return []; }
  return data;
}

async function saveTransaction(dadosTransacao) {
  const profile = await getProfile();
  if (!profile) return null;
  const payload = { agency_id: profile.agency_id, data: new Date().toISOString().slice(0, 10), ...dadosTransacao };
  const { data, error } = await supabaseClient.from('transactions').insert(payload).select().single();
  if (error) { console.error('[RotaDB] saveTransaction:', error.message); return null; }
  return data;
}

async function updateTransaction(id, dadosParciais) {
  const { data, error } = await supabaseClient.from('transactions').update(dadosParciais).eq('id', id).select().single();
  if (error) { console.error('[RotaDB] updateTransaction:', error.message); return null; }
  return data;
}

async function deleteTransaction(id) {
  const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
  if (error) console.error('[RotaDB] deleteTransaction:', error.message);
}

async function getSaldoPorMoeda() {
  const transacoes = await getTransactions();
  const saldo = {};
  transacoes.forEach(t => {
    const sinal = t.tipo === 'receita' ? 1 : -1;
    saldo[t.moeda] = (saldo[t.moeda] || 0) + sinal * Number(t.valor || 0);
  });
  return saldo;
}

// ---------------------------------------------------------------------
// Marketing
// ---------------------------------------------------------------------

async function getPosts() {
  const { data, error } = await supabaseClient.from('marketing_posts').select('*').order('data_agendada', { ascending: true });
  if (error) { console.error('[RotaDB] getPosts:', error.message); return []; }
  return data;
}

async function savePost(dadosPost) {
  const profile = await getProfile();
  if (!profile) return null;
  const payload = { agency_id: profile.agency_id, status: 'rascunho', ...dadosPost };
  const { data, error } = await supabaseClient.from('marketing_posts').insert(payload).select().single();
  if (error) { console.error('[RotaDB] savePost:', error.message); return null; }
  return data;
}

async function updatePost(id, dadosParciais) {
  const { data, error } = await supabaseClient.from('marketing_posts').update(dadosParciais).eq('id', id).select().single();
  if (error) { console.error('[RotaDB] updatePost:', error.message); return null; }
  return data;
}

async function updatePostStatus(id, novoStatus) {
  return updatePost(id, { status: novoStatus });
}

async function deletePost(id) {
  const { error } = await supabaseClient.from('marketing_posts').delete().eq('id', id);
  if (error) console.error('[RotaDB] deletePost:', error.message);
}

// ---------------------------------------------------------------------
// Equipe — lê a partir de `profiles` da mesma agência. Criar/remover
// conta de outro agente exige a service_role key (nunca deve ficar no
// navegador), então isso tem que rodar numa Edge Function no servidor.
// Aqui só ficam os stubs avisando isso, e a atualização de quem já
// existe (nome/papel), que é segura de fazer client-side com RLS.
// ---------------------------------------------------------------------

async function getTeam() {
  const profile = await getProfile();
  if (!profile) return [];
  const { data, error } = await supabaseClient
    .from('profiles').select('id, nome, papel, avatar_color, criado_em')
    .eq('agency_id', profile.agency_id);
  if (error) { console.error('[RotaDB] getTeam:', error.message); return []; }
  return data;
}

async function addTeamMember() {
  console.warn('[RotaDB] addTeamMember: convite de novo agente precisa de uma Edge Function no servidor (a anon key não pode criar contas de outras pessoas).');
  return { ok: false, error: 'requires_server_invite' };
}

async function updateTeamMember(id, dadosParciais) {
  const patch = {};
  if (dadosParciais.nome !== undefined) patch.nome = dadosParciais.nome;
  if (dadosParciais.papel !== undefined) patch.papel = dadosParciais.papel;
  const { data, error } = await supabaseClient.from('profiles').update(patch).eq('id', id).select().single();
  if (error) { console.error('[RotaDB] updateTeamMember:', error.message); return null; }
  return data;
}

async function removeTeamMember() {
  console.warn('[RotaDB] removeTeamMember: remover conta de outro usuário exige service_role no servidor.');
  return { ok: false, error: 'requires_server_action' };
}

// ---------------------------------------------------------------------
// Moedas ativas — guardadas em agencies.moedas_ativas (jsonb)
// ---------------------------------------------------------------------

async function getMoedasAtivas() {
  const profile = await getProfile();
  return profile?.agencies?.moedas_ativas || [];
}

async function saveMoedasAtivas(lista) {
  const profile = await getProfile();
  if (!profile) return null;
  const cortada = lista.slice(0, LIMITE_MOEDAS_ATIVAS);
  const { error } = await supabaseClient.from('agencies').update({ moedas_ativas: cortada }).eq('id', profile.agency_id);
  if (error) { console.error('[RotaDB] saveMoedasAtivas:', error.message); return null; }
  await getProfile(true); // refresca o cache
  return cortada;
}

function nomeMoeda(codigo) {
  const catalogo = (window.RotaI18n && RotaI18n.get() === 'en') ? CATALOGO_MOEDAS_EN : CATALOGO_MOEDAS_PT;
  return catalogo[codigo] || codigo;
}

function corMoeda(codigo, ativas) {
  const idx = ativas.indexOf(codigo);
  return CICLO_CORES_MOEDA[idx % CICLO_CORES_MOEDA.length] || 'ink';
}

async function getMoedasForaDaAtiva() {
  const ativas = await getMoedasAtivas();
  const catalogo = (window.RotaI18n && RotaI18n.get() === 'en') ? CATALOGO_MOEDAS_EN : CATALOGO_MOEDAS_PT;
  return Object.keys(catalogo).filter(c => !ativas.includes(c));
}

// ---------------------------------------------------------------------
// Métricas do Dashboard — calculadas a partir dos dados reais acima
// ---------------------------------------------------------------------

async function getDashboardMetrics() {
  const [clients, posts, saldoPorMoeda] = await Promise.all([
    getClients(), getPosts(), getSaldoPorMoeda(),
  ]);

  const itensPendentes = clients.flatMap(c => c.itens).filter(i => i.status === 'pendente').length;

  const proximoPost = posts
    .filter(p => p.data_agendada && new Date(p.data_agendada) >= new Date())
    .sort((a, b) => new Date(a.data_agendada) - new Date(b.data_agendada))[0] || null;

  return { clientesAtivos: clients.length, itensPendentes, saldoPorMoeda, proximoPost };
}

// ---------------------------------------------------------------------
// Formatação — usada por todas as páginas, pra não duplicar a lógica
// ---------------------------------------------------------------------

function localeAtivo() {
  return window.RotaI18n && RotaI18n.get() === 'en' ? 'en-US' : 'pt-PT';
}

if (window.RotaI18n) {
  RotaI18n.register({
    en: {
      'date.justNow': 'just now', 'date.minutesAgo': '{{n}} minute ago', 'date.minutesAgo_plural': '{{n}} minutes ago',
      'date.hoursAgo': '{{n}} hour ago', 'date.hoursAgo_plural': '{{n}} hours ago',
      'date.yesterday': 'yesterday', 'date.daysAgo': '{{n}} days ago',
      'activity.clientCreated': 'Client added: {{nome}}',
      'activity.transaction': 'Entry: {{sinal}} {{valor}}{{categoria}}',
      'activity.postCreated': 'Post created: {{texto}}', 'activity.postNoText': '(no text)',
      'activity.teamJoined': '{{nome}} joined the team as {{papel}}',
      'role.admin': 'Admin', 'role.agente': 'Agent',
    },
    pt: {
      'date.justNow': 'agora mesmo', 'date.minutesAgo': 'há {{n}} minuto', 'date.minutesAgo_plural': 'há {{n}} minutos',
      'date.hoursAgo': 'há {{n}} hora', 'date.hoursAgo_plural': 'há {{n}} horas',
      'date.yesterday': 'ontem', 'date.daysAgo': 'há {{n}} dias',
      'activity.clientCreated': 'Cliente cadastrado: {{nome}}',
      'activity.transaction': 'Lançamento: {{sinal}} {{valor}}{{categoria}}',
      'activity.postCreated': 'Post criado: {{texto}}', 'activity.postNoText': '(sem texto)',
      'activity.teamJoined': '{{nome}} entrou na equipe como {{papel}}',
      'role.admin': 'Admin', 'role.agente': 'Agente',
    },
  });
}

function formatCurrency(valor, moeda) {
  const num = Number(valor) || 0;
  const formatado = num.toLocaleString(localeAtivo(), { minimumFractionDigits: num % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
  return `${moeda} ${formatado}`;
}

function formatDate(iso, style = 'short') {
  if (!iso) return null;
  const d = new Date(iso);
  const locale = localeAtivo();
  const t = window.RotaI18n ? RotaI18n.t : (k) => k;

  if (style === 'short') return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' }).replace('.', '');
  if (style === 'weekday') {
    const dia = d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
    const data = d.toLocaleDateString(locale, { day: '2-digit', month: 'short' }).replace('.', '');
    const hora = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${data} · ${hora}`;
  }
  if (style === 'datetime') {
    const data = d.toLocaleDateString(locale);
    const hora = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${data} ${hora}`;
  }
  if (style === 'relative') {
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return diffMin <= 1 ? t('date.justNow') : t('date.minutesAgo_plural', { n: diffMin });
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return diffH === 1 ? t('date.hoursAgo', { n: diffH }) : t('date.hoursAgo_plural', { n: diffH });
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return t('date.yesterday');
    return t('date.daysAgo', { n: diffD });
  }
  return d.toLocaleDateString(locale);
}

function initials(nome) {
  return (nome || '').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
}

// ---------------------------------------------------------------------
// Log de atividade — derivado dos dados reais (clientes, lançamentos,
// posts, equipe), sem tabela própria.
// ---------------------------------------------------------------------

async function getActivityLog(limite = 15) {
  const t = window.RotaI18n ? RotaI18n.t : (k, vars) => k;
  const [clients, transacoes, posts, team] = await Promise.all([
    getClients(), getTransactions(), getPosts(), getTeam(),
  ]);

  const eventos = [];

  clients.forEach(c => {
    if (c.criado_em) eventos.push({ tipo: 'cliente', quando: c.criado_em, texto: t('activity.clientCreated', { nome: c.nome }) });
  });

  transacoes.forEach(tr => {
    const quando = tr.criado_em || tr.data;
    if (quando) {
      const sinal = tr.tipo === 'receita' ? '+' : '−';
      eventos.push({
        tipo: 'financeiro', quando,
        texto: t('activity.transaction', { sinal, valor: formatCurrency(tr.valor, tr.moeda), categoria: tr.categoria ? ' · ' + tr.categoria : '' }),
      });
    }
  });

  posts.forEach(p => {
    const quando = p.criado_em || p.data_agendada;
    if (quando) {
      const bruto = p.texto || t('activity.postNoText');
      const cortado = `${bruto.slice(0, 40)}${bruto.length > 40 ? '…' : ''}`;
      eventos.push({ tipo: 'marketing', quando, texto: t('activity.postCreated', { texto: cortado }) });
    }
  });

  team.forEach(m => {
    if (m.criado_em) {
      eventos.push({ tipo: 'equipe', quando: m.criado_em, texto: t('activity.teamJoined', { nome: m.nome, papel: t(m.papel === 'admin' ? 'role.admin' : 'role.agente') }) });
    }
  });

  return eventos.sort((a, b) => new Date(b.quando) - new Date(a.quando)).slice(0, limite);
}

// ---------------------------------------------------------------------

window.RotaDB = {
  getSession, requireSession,
  getClients, getClientById, saveClient, updateClient, deleteClient,
  addItemToClient, updateItemStatus, updateClientItem, deleteClientItem,
  getTransactions, saveTransaction, updateTransaction, deleteTransaction, getSaldoPorMoeda,
  getPosts, savePost, updatePost, updatePostStatus, deletePost,
  getTeam, addTeamMember, updateTeamMember, removeTeamMember,
  getDashboardMetrics, getActivityLog,
  formatCurrency, formatDate, initials,
  getCurrentUser, setCurrentUser, logout, uploadAvatar,
  getMoedasAtivas, saveMoedasAtivas, nomeMoeda, corMoeda, getMoedasForaDaAtiva,
  CATALOGO_MOEDAS, CATALOGO_MOEDAS_EN, LIMITE_MOEDAS_ATIVAS,
  getCatalogoMoedas: () => (window.RotaI18n && RotaI18n.get() === 'en') ? CATALOGO_MOEDAS_EN : CATALOGO_MOEDAS_PT,
};
