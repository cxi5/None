/* ===================================================================
   ROTA — shell.js
   Sidebar (desktop) + barra inferior (mobile) num único lugar.
   Cada página só chama renderShell('id-da-pagina') e pronto —
   editar o menu (adicionar item, trocar ícone, etc) passa a ser
   1 arquivo em vez de 4.

   USO:
     <body>
       <div id="shell"></div>
       <script src="shell.js"></script>
       <script>renderShell('dashboard');</script>
     </body>
   =================================================================== */

const ROTA_MENU = [
  { id: 'dashboard',  label: 'Dashboard',  icon: 'layout-dashboard', href: 'dashboard.html' },
  { id: 'clients',    label: 'Clientes',   icon: 'users',            href: 'clients.html' },
  { id: 'financeiro', label: 'Financeiro', icon: 'wallet',           href: 'financeiro.html' },
  { id: 'marketing',  label: 'Marketing',  icon: 'megaphone',        href: 'marketing.html' },
];

function renderShell(activePage) {
  const sidebarLinks = ROTA_MENU.map(item => {
    const active = item.id === activePage;
    const cls = active
      ? 'flex items-center gap-3 px-3 py-2.5 rounded-md bg-petrol text-paper font-medium text-sm'
      : 'flex items-center gap-3 px-3 py-2.5 rounded-md text-ink/70 hover:bg-paper font-medium text-sm transition';
    return `
        <a href="${item.href}" class="${cls}">
          <i data-lucide="${item.icon}" class="w-4.5 h-4.5"></i> ${item.label}
        </a>`;
  }).join('');

  const bottomLinks = ROTA_MENU.map(item => {
    const active = item.id === activePage;
    const cls = active
      ? 'flex flex-col items-center gap-1 px-3 py-1.5 text-petrol'
      : 'flex flex-col items-center gap-1 px-3 py-1.5 text-ink/50';
    return `
    <a href="${item.href}" class="${cls}">
      <i data-lucide="${item.icon}" class="w-5 h-5"></i>
      <span class="text-[11px] font-medium">${item.label}</span>
    </a>`;
  }).join('');

  document.getElementById('shell').innerHTML = `
    <aside class="hidden md:flex md:flex-col md:w-60 md:min-h-screen bg-white border-r border-ink/10 px-5 py-6">
      <div class="flex items-center gap-3 mb-10">
        <div class="w-10 h-10 bg-paper stamp-mark rounded-full flex items-center justify-center flex-shrink-0">
          <i data-lucide="compass" class="w-5 h-5 text-petrol"></i>
        </div>
        <span class="font-display font-semibold text-xl text-ink tracking-tight">ROTA</span>
      </div>

      <nav class="space-y-1 flex-1">${sidebarLinks}
      </nav>

      <a href="index.html" onclick="if (window.RotaDB) RotaDB.logout();" class="flex items-center gap-3 px-3 py-2.5 rounded-md text-ink/50 hover:bg-paper hover:text-clay font-medium text-sm transition">
        <i data-lucide="log-out" class="w-4.5 h-4.5"></i> Sair
      </a>
    </aside>

    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-ink/10 flex items-center justify-around py-2 px-2 z-40" style="padding-bottom: env(safe-area-inset-bottom);">${bottomLinks}
    </nav>
  `;

  lucide.createIcons();
}

window.renderShell = renderShell;
