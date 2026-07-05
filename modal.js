/* ===================================================================
   ROTA — modal.js
   Modal genérico e reutilizável. Cada página monta o HTML do próprio
   formulário e decide o que fazer no submit — este arquivo só cuida
   de abrir, fechar, e não deixar o clique fora/Cancelar quebrar nada.

   USO:
     RotaModal.open({
       title: 'Novo cliente',
       bodyHtml: '<div>...</div>',
       submitLabel: 'Salvar cliente',
       onSubmit: () => { ... lê os campos, chama RotaDB, fecha o modal ... }
     });
   =================================================================== */

function ensureModalRoot() {
  if (document.getElementById('rotaModalRoot')) return;

  const root = document.createElement('div');
  root.id = 'rotaModalRoot';
  root.className = 'fixed inset-0 z-50 hidden items-center justify-center p-4';
  root.innerHTML = `
    <div id="rotaModalBackdrop" class="absolute inset-0 bg-ink/40"></div>
    <div class="relative bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
      <div class="flex items-center justify-between px-5 py-4 border-b border-ink/10 flex-shrink-0">
        <h2 id="rotaModalTitle" class="font-display text-lg font-semibold text-ink"></h2>
        <button type="button" id="rotaModalClose" class="text-ink/40 hover:text-ink transition">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>
      <form id="rotaModalForm" class="flex flex-col overflow-hidden flex-1">
        <div id="rotaModalBody" class="px-5 py-4 space-y-4 overflow-y-auto flex-1"></div>
        <div class="flex items-center gap-3 px-5 py-4 border-t border-ink/10 flex-shrink-0">
          <button type="button" id="rotaModalCancel" class="flex-1 py-2.5 rounded-md border border-ink/15 text-ink/70 text-sm font-medium hover:bg-paper transition">Cancelar</button>
          <button type="submit" id="rotaModalSubmit" class="btn-ticket flex-1 bg-amber hover:bg-amber/90 text-ink font-semibold text-sm py-2.5">Salvar</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(root);

  document.getElementById('rotaModalClose').onclick = closeModal;
  document.getElementById('rotaModalCancel').onclick = closeModal;
  document.getElementById('rotaModalBackdrop').onclick = closeModal;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

function openModal({ title, bodyHtml, onSubmit, submitLabel }) {
  ensureModalRoot();

  document.getElementById('rotaModalTitle').textContent = title;
  document.getElementById('rotaModalBody').innerHTML = bodyHtml;
  document.getElementById('rotaModalSubmit').textContent = submitLabel || 'Salvar';

  // .onsubmit substitui o handler anterior sozinho — não precisa
  // remover listener nenhum antes de trocar de formulário.
  document.getElementById('rotaModalForm').onsubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  const root = document.getElementById('rotaModalRoot');
  root.classList.remove('hidden');
  root.classList.add('flex');

  if (window.lucide) lucide.createIcons();
}

function closeModal() {
  const root = document.getElementById('rotaModalRoot');
  if (!root) return;
  root.classList.add('hidden');
  root.classList.remove('flex');
}

window.RotaModal = { open: openModal, close: closeModal };

// Classe de input compartilhada — pra manter a mesma cara do resto do app
window.ROTA_INPUT_CLASS = 'w-full bg-white border border-ink/15 rounded-md px-3.5 py-2.5 text-ink placeholder-ink/35 focus:outline-none input-focus text-sm transition-all';
window.ROTA_LABEL_CLASS = 'text-sm font-medium text-ink/70 mb-1.5 block';
