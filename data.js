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
  seeded: 'rota_seeded_v1',
};

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

function saveClient(dadosCliente) {
  const clients = getClients();
  const novo = {
    id: newId('c'),
    nome: '', contato: '', documento: '', origem_lead: '', notas: '',
    agente_id: 'cxi', // fixo até termos usuário logado de verdade
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
    taxa_cambio_no_momento: 1, categoria: '', agente_id: 'cxi',
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
function getSaldoPorMoeda() {
  const saldo = { AOA: 0, USD: 0, EUR: 0 };
  for (const t of getTransactions()) {
    const sinal = t.tipo === 'receita' ? 1 : -1;
    saldo[t.moeda] = (saldo[t.moeda] || 0) + sinal * t.valor;
  }
  return saldo;
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

window.RotaDB = {
  seedIfNeeded,
  getClients, getClientById, saveClient, updateClient, deleteClient,
  addItemToClient, updateItemStatus,
  getTransactions, saveTransaction, updateTransaction, deleteTransaction, getSaldoPorMoeda,
  getPosts, savePost, updatePostStatus, deletePost,
  getDashboardMetrics,
  formatCurrency, formatDate, initials,
};

// Roda sozinho ao incluir <script src="data.js"> — nenhuma página
// precisa lembrar de chamar isso manualmente.
seedIfNeeded();
