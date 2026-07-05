/* ===================================================================
   ROTA — data.js
   Camada única de dados. HOJE guarda em localStorage; QUANDO o Supabase
   entrar, só o miolo de cada função muda (vira `await supabase...`) —
   as páginas que chamam essas funções não mudam uma linha.

   Nomes das funções e dos campos já seguem o schema do
   escopo-sistema-agencia-viagens.md, pra não ter que traduzir depois.

   USO: <script src="data.js"></script> em qualquer página, e chamar
   RotaDB.getClients(), RotaDB.saveTransaction({...}), etc.
   =================================================================== */

const DB_KEYS = {
  clients: 'rota_clients',
  transactions: 'rota_transactions',
  posts: 'rota_marketing_posts',
  team: 'rota_team',
  seeded: 'rota_seeded_v1',
  currentUser: 'rota_current_user',
  moedasAtivas: 'rota_moedas_ativas',
};

// Limite de moedas ativas ao mesmo tempo — mantém os cards de saldo e os
// chips de filtro legíveis. Pode subir no futuro, mas 4 é o combinado por ora.
const LIMITE_MOEDAS_ATIVAS = 4;

// Catálogo de moedas disponíveis pra escolher — não é a lista de moedas
// "ativas" (essa fica salva por conta do usuário), é só o cardápio de opções.
const CATALOGO_MOEDAS = {
  AOA: 'Kwanza angolano',
  USD: 'Dólar americano',
  EUR: 'Euro',
  BRL: 'Real brasileiro',
  GBP: 'Libra esterlina',
  ZAR: 'Rand sul-africano',
  MZN: 'Metical moçambicano',
  CVE: 'Escudo cabo-verdiano',
  XOF: 'Franco CFA (BCEAO)',
  XAF: 'Franco CFA (BEAC)',
  NGN: 'Naira nigeriana',
  GHS: 'Cedi ganês',
  KES: 'Xelim queniano',
  EGP: 'Libra egípcia',
  CNY: 'Yuan chinês',
  JPY: 'Iene japonês',
  INR: 'Rupia indiana',
  AED: 'Dirham dos Emirados',
  SAR: 'Rial saudita',
  CHF: 'Franco suíço',
  CAD: 'Dólar canadense',
  AUD: 'Dólar australiano',
  RUB: 'Rublo russo',
  TRY: 'Lira turca',
  MXN: 'Peso mexicano',
  ARS: 'Peso argentino',
  CLP: 'Peso chileno',
  COP: 'Peso colombiano',
  PLN: 'Zloty polonês',
  SEK: 'Coroa sueca',
  NOK: 'Coroa norueguesa',
  DKK: 'Coroa dinamarquesa',
  HKD: 'Dólar de Hong Kong',
  SGD: 'Dólar de Singapura',
  KRW: 'Won sul-coreano',
  THB: 'Baht tailandês',
};

// Cores que ciclam pelas moedas ativas, na ordem em que foram escolhidas —
// dá pra ter até LIMITE_MOEDAS_ATIVAS cores distintas do design system.
const CICLO_CORES_MOEDA = ['petrol', 'amber', 'clay', 'ink'];

// Gera um id simples (suficiente pro localStorage; troca por uuid do
// Postgres quando o Supabase entrar — o resto do código nem percebe).
function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function readAll(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function writeAll(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

// ---------------------------------------------------------------------
// Seed — inicializa as chaves vazias na primeira vez (sem dados de
// exemplo: o app começa em branco, pronto pra tu adicionares o teu).
// ---------------------------------------------------------------------

function seedIfNeeded() {
  if (localStorage.getItem(DB_KEYS.seeded)) return;

  writeAll(DB_KEYS.clients, []);
  writeAll(DB_KEYS.transactions, []);
  writeAll(DB_KEYS.posts, []);
  writeAll(DB_KEYS.moedasAtivas, []); // nenhuma moeda ativa por padrão — o usuário escolhe
  writeAll(DB_KEYS.team, [{
    id: newId('u'),
    nome: 'Cxi',
    email: '',
    papel: 'admin',
    criado_em: new Date().toISOString(),
  }]);
  localStorage.setItem(DB_KEYS.seeded, '1');
}

// ---------------------------------------------------------------------
// Clientes + itens adquiridos
// ---------------------------------------------------------------------

function getClients() {
  return readAll(DB_KEYS.clients);
}

function getClientById(id) {
  return getClients().find(c => c.id === id) || null;
}

function getDefaultAgenteId() {
  const team = getTeam();
  const nomeAtual = getCurrentUser().nome;
  const eu = team.find(m => m.nome === nomeAtual);
  if (eu) return eu.id;
  const admin = team.find(m => m.papel === 'admin');
  return admin ? admin.id : (team[0]?.id || '');
}

function saveClient(dadosCliente) {
  const clients = getClients();
  const novo = {
    id: newId('c'),
    nome: '', contato: '', documento: '', origem_lead: '', notas: '',
    agente_id: getDefaultAgenteId(),
    criado_em: new Date().toISOString(),
    itens: [],
    ...dadosCliente,
  };
  clients.push(novo);
  writeAll(DB_KEYS.clients, clients);
  return novo;
}

function updateClient(id, dadosParciais) {
  const clients = getClients();
  const idx = clients.findIndex(c => c.id === id);
  if (idx === -1) return null;
  clients[idx] = { ...clients[idx], ...dadosParciais };
  writeAll(DB_KEYS.clients, clients);
  return clients[idx];
}

function deleteClient(id) {
  const clients = getClients().filter(c => c.id !== id);
  writeAll(DB_KEYS.clients, clients);
}

function addItemToClient(clientId, dadosItem) {
  const clients = getClients();
  const cliente = clients.find(c => c.id === clientId);
  if (!cliente) return null;
  const novoItem = {
    id: newId('i'),
    tipo: 'outro', descricao: '', status: 'pendente',
    valor: 0, moeda: 'AOA', data_servico: null, fornecedor: '',
    ...dadosItem,
  };
  cliente.itens.push(novoItem);
  writeAll(DB_KEYS.clients, clients);
  return novoItem;
}

function updateItemStatus(clientId, itemId, novoStatus) {
  const clients = getClients();
  const cliente = clients.find(c => c.id === clientId);
  if (!cliente) return null;
  const item = cliente.itens.find(i => i.id === itemId);
  if (!item) return null;
  item.status = novoStatus;
  writeAll(DB_KEYS.clients, clients);
  return item;
}

function updateClientItem(clientId, itemId, dadosParciais) {
  const clients = getClients();
  const cliente = clients.find(c => c.id === clientId);
  if (!cliente) return null;
  const idx = cliente.itens.findIndex(i => i.id === itemId);
  if (idx === -1) return null;
  cliente.itens[idx] = { ...cliente.itens[idx], ...dadosParciais };
  writeAll(DB_KEYS.clients, clients);
  return cliente.itens[idx];
}

function deleteClientItem(clientId, itemId) {
  const clients = getClients();
  const cliente = clients.find(c => c.id === clientId);
  if (!cliente) return null;
  cliente.itens = cliente.itens.filter(i => i.id !== itemId);
  writeAll(DB_KEYS.clients, clients);
  return true;
}

// ---------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------

function getTransactions() {
  return readAll(DB_KEYS.transactions);
}

function saveTransaction(dadosTransacao) {
  const transactions = getTransactions();
  const nova = {
    id: newId('t'),
    client_id: null, tipo: 'receita', valor: 0, moeda: 'AOA',
    taxa_cambio_no_momento: 1, categoria: '', agente_id: getDefaultAgenteId(),
    data: new Date().toISOString(), notas: '',
    ...dadosTransacao,
  };
  transactions.push(nova);
  writeAll(DB_KEYS.transactions, transactions);
  return nova;
}

function updateTransaction(id, dadosParciais) {
  const transactions = getTransactions();
  const idx = transactions.findIndex(t => t.id === id);
  if (idx === -1) return null;
  transactions[idx] = { ...transactions[idx], ...dadosParciais };
  writeAll(DB_KEYS.transactions, transactions);
  return transactions[idx];
}

function deleteTransaction(id) {
  const transactions = getTransactions().filter(t => t.id !== id);
  writeAll(DB_KEYS.transactions, transactions);
}

// Saldo consolidado por moeda: soma receitas, subtrai despesas, sem
// converter entre moedas (evita o problema de câmbio que o escopo já identificou).
// Dinâmico: reflete qualquer moeda que apareça nos lançamentos, mesmo que
// não esteja mais na lista de moedas "ativas" — nenhum dado fica escondido.
function getSaldoPorMoeda() {
  const saldo = {};
  for (const t of getTransactions()) {
    const sinal = t.tipo === 'receita' ? 1 : -1;
    saldo[t.moeda] = (saldo[t.moeda] || 0) + sinal * t.valor;
  }
  return saldo;
}

// ---------------------------------------------------------------------
// Moedas ativas — quais moedas o usuário decidiu usar no Financeiro.
// Vazio por padrão; o usuário escolhe até LIMITE_MOEDAS_ATIVAS no início.
// ---------------------------------------------------------------------

function getMoedasAtivas() {
  return readAll(DB_KEYS.moedasAtivas);
}

// Recebe a lista completa de códigos que devem ficar ativos (substitui a
// lista anterior). Retorna { ok: true, lista } ou { erro: 'limite_excedido' }
// se vier mais que o limite — quem chama decide como avisar o usuário.
function saveMoedasAtivas(listaCodigos) {
  const unicos = [...new Set(listaCodigos)].filter(c => CATALOGO_MOEDAS[c]);
  if (unicos.length > LIMITE_MOEDAS_ATIVAS) {
    return { erro: 'limite_excedido', limite: LIMITE_MOEDAS_ATIVAS };
  }
  writeAll(DB_KEYS.moedasAtivas, unicos);
  return { ok: true, lista: unicos };
}

// Nome de exibição de uma moeda — cai pro próprio código se não estiver
// no catálogo (ex.: moeda antiga digitada manualmente antes do catálogo existir).
function nomeMoeda(codigo) {
  return CATALOGO_MOEDAS[codigo] || codigo;
}

// Cor do design system associada a uma moeda ativa, pela posição dela na
// lista ativa (cicla entre as cores disponíveis). Moeda fora da lista ativa
// (ex.: aparece em lançamentos antigos mas foi desativada) cai sempre em 'ink'.
function corMoeda(codigo) {
  const ativas = getMoedasAtivas();
  const idx = ativas.indexOf(codigo);
  return idx === -1 ? 'ink' : CICLO_CORES_MOEDA[idx % CICLO_CORES_MOEDA.length];
}

// Moedas que aparecem em lançamentos reais mas não estão (mais) na lista
// ativa — usado pra nunca esconder saldo de dados que já existem.
function getMoedasForaDaAtiva() {
  const ativas = new Set(getMoedasAtivas());
  const usadas = new Set(getTransactions().map(t => t.moeda));
  return [...usadas].filter(m => !ativas.has(m));
}

// ---------------------------------------------------------------------
// Marketing
// ---------------------------------------------------------------------

function getPosts() {
  return readAll(DB_KEYS.posts);
}

function savePost(dadosPost) {
  const posts = getPosts();
  const novo = {
    id: newId('p'),
    data_agendada: null, rede_social: 'instagram', status: 'ideia',
    texto: '', link_referencia: '', criado_por: 'cxi',
    ...dadosPost,
  };
  posts.push(novo);
  writeAll(DB_KEYS.posts, posts);
  return novo;
}

function updatePostStatus(id, novoStatus) {
  const posts = getPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return null;
  post.status = novoStatus;
  writeAll(DB_KEYS.posts, posts);
  return post;
}

function deletePost(id) {
  const posts = getPosts().filter(p => p.id !== id);
  writeAll(DB_KEYS.posts, posts);
}

// ---------------------------------------------------------------------
// Equipe — quem tem acesso ao sistema e com qual papel.
// Local por enquanto (sem convite por email de verdade); quando o
// backend existir, "convidar" passa a disparar um email real.
// ---------------------------------------------------------------------

function getTeam() {
  return readAll(DB_KEYS.team);
}

function countAdmins() {
  return getTeam().filter(m => m.papel === 'admin').length;
}

function addTeamMember(dadosMembro) {
  const team = getTeam();
  const novo = {
    id: newId('u'),
    nome: '', email: '', papel: 'agente',
    criado_em: new Date().toISOString(),
    ...dadosMembro,
  };
  team.push(novo);
  writeAll(DB_KEYS.team, team);
  return novo;
}

function updateTeamMember(id, dadosParciais) {
  const team = getTeam();
  const idx = team.findIndex(m => m.id === id);
  if (idx === -1) return null;

  // não deixa remover o papel de admin do último administrador —
  // senão ninguém mais consegue gerenciar a equipe
  if (dadosParciais.papel === 'agente' && team[idx].papel === 'admin' && countAdmins() <= 1) {
    return { erro: 'ultimo_admin' };
  }

  team[idx] = { ...team[idx], ...dadosParciais };
  writeAll(DB_KEYS.team, team);
  return team[idx];
}

function removeTeamMember(id) {
  const team = getTeam();
  const membro = team.find(m => m.id === id);
  if (!membro) return { erro: 'nao_encontrado' };
  if (membro.papel === 'admin' && countAdmins() <= 1) {
    return { erro: 'ultimo_admin' };
  }
  writeAll(DB_KEYS.team, team.filter(m => m.id !== id));
  return { ok: true };
}

// ---------------------------------------------------------------------
// Métricas do Dashboard — calculadas a partir dos dados reais acima
// ---------------------------------------------------------------------

function getDashboardMetrics() {
  const clients = getClients();
  const posts = getPosts();

  const itensPendentes = clients
    .flatMap(c => c.itens)
    .filter(i => i.status === 'pendente').length;

  const proximoPost = posts
    .filter(p => p.data_agendada && new Date(p.data_agendada) >= new Date())
    .sort((a, b) => new Date(a.data_agendada) - new Date(b.data_agendada))[0] || null;

  return {
    clientesAtivos: clients.length,
    itensPendentes,
    saldoPorMoeda: getSaldoPorMoeda(),
    proximoPost,
  };
}

// ---------------------------------------------------------------------
// Formatação — usada por todas as páginas, pra não duplicar a lógica
// ---------------------------------------------------------------------

function formatCurrency(valor, moeda) {
  const num = Number(valor) || 0;
  const formatado = num.toLocaleString('pt-PT', { minimumFractionDigits: num % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
  return `${moeda} ${formatado}`;
}

function formatDate(iso, style = 'short') {
  if (!iso) return null;
  const d = new Date(iso);
  if (style === 'short') {
    // ex: "03 Jul"
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }).replace('.', '');
  }
  if (style === 'weekday') {
    // ex: "Qui, 09 Jul · 18:00"
    const dia = d.toLocaleDateString('pt-PT', { weekday: 'short' }).replace('.', '');
    const data = d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }).replace('.', '');
    const hora = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${data} · ${hora}`;
  }
  if (style === 'relative') {
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return diffMin <= 1 ? 'agora mesmo' : `há ${diffMin} minutos`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `há ${diffH} hora${diffH > 1 ? 's' : ''}`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'ontem';
    return `há ${diffD} dias`;
  }
  return d.toLocaleDateString('pt-PT');
}

function initials(nome) {
  return (nome || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('');
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Sessão / Perfil — separado dos dados do negócio de propósito:
// "Sair" nunca apaga clientes, lançamentos ou posts, só a sessão.
// ---------------------------------------------------------------------

function defaultUser() {
  return { nome: 'Cxi', papel: 'admin', email: '' };
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEYS.currentUser)) || defaultUser();
  } catch {
    return defaultUser();
  }
}

function setCurrentUser(dadosParciais) {
  const atual = getCurrentUser();
  const novo = { ...atual, ...dadosParciais };
  localStorage.setItem(DB_KEYS.currentUser, JSON.stringify(novo));
  return novo;
}

function logout() {
  localStorage.removeItem(DB_KEYS.currentUser);
}

// ---------------------------------------------------------------------

window.RotaDB = {
  seedIfNeeded,
  getClients, getClientById, saveClient, updateClient, deleteClient,
  addItemToClient, updateItemStatus, updateClientItem, deleteClientItem,
  getTransactions, saveTransaction, updateTransaction, deleteTransaction, getSaldoPorMoeda,
  getPosts, savePost, updatePostStatus, deletePost,
  getTeam, addTeamMember, updateTeamMember, removeTeamMember,
  getDashboardMetrics,
  formatCurrency, formatDate, initials,
  getCurrentUser, setCurrentUser, logout,
  getMoedasAtivas, saveMoedasAtivas, nomeMoeda, corMoeda, getMoedasForaDaAtiva,
  CATALOGO_MOEDAS, LIMITE_MOEDAS_ATIVAS,
};

// Roda sozinho ao incluir <script src="data.js"> — nenhuma página
// precisa lembrar de chamar isso manualmente.
seedIfNeeded();
