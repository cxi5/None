/* ===================================================================
   ROTA — api.js
   Ponto único de comunicação com o backend (api.php no InfinityFree).
   Toda página (dashboard, clients, financeiro, marketing) chama
   apiRequest() em vez de usar fetch() direto — assim, se o endereço
   do backend mudar ou a forma de autenticar mudar, só se ajusta aqui.

   AINDA NÃO ESTÁ EM USO — o index.html de login por enquanto não faz
   chamada real. Isso já fica pronto pra quando o backend existir.
   =================================================================== */

// Ajustar quando o backend estiver no ar (ex: "https://seudominio.com/backend/api.php")
const API_BASE_URL = 'https://SEU-DOMINIO-AQUI/backend/api.php';

/**
 * Faz uma chamada ao backend.
 *
 * @param {string} action  - nome da ação, ex: 'login', 'clients.list', 'financeiro.create'
 * @param {object} options
 * @param {string} [options.method='GET'] - 'GET' | 'POST' | 'PUT' | 'DELETE'
 * @param {object} [options.data=null]    - corpo da requisição (POST/PUT)
 * @returns {Promise<any>} dados retornados pelo backend (já parseados de JSON)
 * @throws {Error} com mensagem legível se a chamada falhar
 */
async function apiRequest(action, { method = 'GET', data = null } = {}) {
  const url = `${API_BASE_URL}?action=${encodeURIComponent(action)}`;

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include' // manda o cookie de sessão do PHP em toda chamada
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkErr) {
    throw new Error('Não foi possível conectar ao servidor. Verifique sua internet.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch (parseErr) {
    throw new Error('Resposta inválida do servidor.');
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Ocorreu um erro ao processar a solicitação.');
  }

  return payload.data ?? payload;
}

// Disponibiliza globalmente pra qualquer página incluir <script src="api.js"> e usar direto
window.apiRequest = apiRequest;
