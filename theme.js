/* ===================================================================
   ROTA — theme.js
   Modo claro/escuro/sistema. Claro é o padrão automático (nada salvo =
   claro); escuro e sistema são opt-in e ficam lembrados por navegador,
   em localStorage.

   Fica de propósito FORA do data.js: é preferência de aparelho/navegador,
   não dado de negócio, e várias páginas (login, cadastro) não carregam
   RotaDB mas ainda precisam pintar no tema certo.

   USO: primeiro <script> do <head>, antes até do Tailwind CDN — assim
   a classe "dark" já está no <html> no primeiro paint, sem flash.

     <head>
       <script src="theme.js"></script>
       <script src="https://cdn.tailwindcss.com"></script>
       ...

   API:
     RotaTheme.get();             // 'light' | 'dark' — tema EFETIVO já
                                   // aplicado (resolve 'system' de verdade,
                                   // então código existente que só conhecia
                                   // light/dark continua funcionando igual)
     RotaTheme.getPreference();   // 'light' | 'dark' | 'system' — o que a
                                   // pessoa efetivamente escolheu
     RotaTheme.set(pref);         // 'light' | 'dark' | 'system'
     RotaTheme.toggle();          // alterna entre claro/escuro (ignora
                                   // sistema — ação rápida do sino no shell)
     RotaTheme.onChange(fn);      // fn(temaEfetivo, preferencia) toda vez
                                   // que mudar (inclui quando o SO muda de
                                   // tema e a preferência é 'system')
   =================================================================== */

(function () {
  var CHAVE = 'rota_theme';
  var ouvintes = [];

  function prefereEscuroNoSistema() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  }

  // Resolve uma preferência ('light' | 'dark' | 'system') pro tema
  // efetivo que de fato deve ser pintado ('light' | 'dark').
  function resolver(preferencia) {
    return preferencia === 'system' ? (prefereEscuroNoSistema() ? 'dark' : 'light') : preferencia;
  }

  function aplicar(temaEfetivo) {
    document.documentElement.classList.toggle('dark', temaEfetivo === 'dark');
  }

  function obterPreferencia() {
    try {
      var salvo = localStorage.getItem(CHAVE);
      return (salvo === 'dark' || salvo === 'light' || salvo === 'system') ? salvo : 'light';
    } catch {
      return 'light';
    }
  }

  // Mantém a API antiga: retorna o tema JÁ RESOLVIDO, nunca 'system' —
  // assim shell.js e financeiro.html (que só sabem light/dark) não quebram.
  function obterEfetivo() {
    return resolver(obterPreferencia());
  }

  function definir(preferencia) {
    var normalizado = (preferencia === 'dark' || preferencia === 'system') ? preferencia : 'light';
    try { localStorage.setItem(CHAVE, normalizado); } catch {}
    var efetivo = resolver(normalizado);
    aplicar(efetivo);
    ouvintes.forEach(function (fn) { fn(efetivo, normalizado); });
    return efetivo;
  }

  // Aplica imediatamente, antes do resto da página existir.
  aplicar(obterEfetivo());

  // Se a preferência é 'system', acompanha mudanças ao vivo do SO
  // (ex.: dispositivo muda de claro pra escuro à noite automaticamente).
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (obterPreferencia() === 'system') {
        var efetivo = resolver('system');
        aplicar(efetivo);
        ouvintes.forEach(function (fn) { fn(efetivo, 'system'); });
      }
    });
  } catch {}

  window.RotaTheme = {
    get: obterEfetivo,
    getPreference: obterPreferencia,
    set: definir,
    toggle: function () { return definir(obterEfetivo() === 'dark' ? 'light' : 'dark'); },
    onChange: function (fn) { ouvintes.push(fn); },
  };
})();
