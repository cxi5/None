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

// Rótulos vêm do dicionário — registra aqui mesmo porque o shell existe
// em toda página logada, então é o único ponto de tradução do menu.
if (window.RotaI18n) {
  RotaI18n.register({
    en: {
      'shell.dashboard': 'Dashboard',
      'shell.clients': 'Clients',
      'shell.financeiro': 'Finance',
      'shell.marketing': 'Marketing',
      'shell.settings': 'Settings',
      'shell.settingsShort': 'Settings',
      'shell.logout': 'Log out',
      'shell.darkMode': 'Dark mode',
      'shell.lightMode': 'Light mode',
    },
    pt: {
      'shell.dashboard': 'Dashboard',
      'shell.clients': 'Clientes',
      'shell.financeiro': 'Financeiro',
      'shell.marketing': 'Marketing',
      'shell.settings': 'Configurações',
      'shell.settingsShort': 'Ajustes',
      'shell.logout': 'Sair',
      'shell.darkMode': 'Modo escuro',
      'shell.lightMode': 'Modo claro',
    },
  });
}

function rotaMenuItems() {
  const t = window.RotaI18n ? RotaI18n.t : (k) => k;
  return [
    { id: 'dashboard',  label: t('shell.dashboard'),  icon: 'layout-dashboard', href: 'dashboard.html' },
    { id: 'clients',    label: t('shell.clients'),    icon: 'users',            href: 'clients.html' },
    { id: 'financeiro', label: t('shell.financeiro'), icon: 'wallet',           href: 'financeiro.html' },
    { id: 'marketing',  label: t('shell.marketing'),  icon: 'megaphone',        href: 'marketing.html' },
  ];
}

function renderShell(activePage) {
  const t = window.RotaI18n ? RotaI18n.t : (k) => k;
  const ROTA_MENU = rotaMenuItems();

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

      <button id="shellThemeToggle" type="button" class="flex items-center gap-3 px-3 py-2.5 rounded-md text-ink/70 hover:bg-paper font-medium text-sm transition mb-1" aria-label="${t('shell.darkMode')}">
        <i data-lucide="moon" class="w-4.5 h-4.5 shellThemeIcon"></i> <span class="shellThemeLabel">${t('shell.darkMode')}</span>
      </button>
      <a href="settings.html" class="flex items-center gap-3 px-3 py-2.5 rounded-md ${activePage === 'settings' ? 'bg-petrol text-paper' : 'text-ink/70 hover:bg-paper'} font-medium text-sm transition mb-1">
        <i data-lucide="settings" class="w-4.5 h-4.5"></i> ${t('shell.settings')}
      </a>
      <a href="index.html" onclick="if (window.RotaDB) RotaDB.logout();" class="flex items-center gap-3 px-3 py-2.5 rounded-md text-ink/50 hover:bg-paper hover:text-clay font-medium text-sm transition">
        <i data-lucide="log-out" class="w-4.5 h-4.5"></i> ${t('shell.logout')}
      </a>
    </aside>

    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-ink/10 flex items-center justify-around py-2 px-2 z-40" style="padding-bottom: env(safe-area-inset-bottom);">${bottomLinks}
      <a href="settings.html" class="flex flex-col items-center gap-1 px-3 py-1.5 ${activePage === 'settings' ? 'text-petrol' : 'text-ink/50'}">
        <i data-lucide="settings" class="w-5 h-5"></i>
        <span class="text-[11px] font-medium">${t('shell.settingsShort')}</span>
      </a>
    </nav>
  `;

  lucide.createIcons();

  // --- Alternância de tema — claro é o automático, escuro é a opção ---
  // Fica aqui porque o shell existe em toda página logada; settings.html
  // tem o mesmo controle (mesma API RotaTheme), só que explicado com o "i".
  function syncThemeToggle() {
    const escuro = window.RotaTheme ? RotaTheme.get() === 'dark' : false;
    const btn = document.getElementById('shellThemeToggle');
    if (!btn) return;
    btn.querySelector('.shellThemeLabel').textContent = escuro ? t('shell.lightMode') : t('shell.darkMode');
    btn.querySelector('.shellThemeIcon').setAttribute('data-lucide', escuro ? 'sun' : 'moon');
    lucide.createIcons();
  }

  if (window.RotaTheme) {
    syncThemeToggle();
    document.getElementById('shellThemeToggle').onclick = () => {
      RotaTheme.toggle();
      syncThemeToggle();
    };
  }

  // Reconstrói o shell inteiro ao trocar de idioma — mais simples do que
  // re-traduzir cada rótulo individualmente, e o shell é barato de montar.
  if (window.RotaI18n && !renderShell._ligadoAoIdioma) {
    renderShell._ligadoAoIdioma = true;
    RotaI18n.onChange(() => renderShell(activePage));
  }
}

window.renderShell = renderShell;
