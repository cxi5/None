/* ===================================================================
   ROTA — theme.js
   Modo claro/escuro. Claro é o padrão automático (nada salvo = claro);
   escuro é opt-in e fica lembrado por navegador, em localStorage.

   Fica de propósito FORA do data.js: é preferência de aparelho/navegador,
   não dado de negócio, e várias páginas (login, cadastro) não carregam
   RotaDB mas ainda precisam pintar no tema certo.

   USO: primeiro <script> do <head>, antes até do Tailwind CDN — assim
   a classe "dark" já está no <html> no primeiro paint, sem flash.

     <head>
       <script src="theme.js"></script>
       <script src="https://cdn.tailwindcss.com"></script>
       ...

   Em qualquer botão de alternância:
     RotaTheme.toggle();          // troca e já aplica
     RotaTheme.get();             // 'light' | 'dark'
     RotaTheme.onChange(fn);      // fn(theme) toda vez que mudar
   =================================================================== */

(function () {
  var CHAVE = 'rota_theme';
  var ouvintes = [];

  function aplicar(tema) {
    document.documentElement.classList.toggle('dark', tema === 'dark');
  }

  function obter() {
    try {
      return localStorage.getItem(CHAVE) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  function definir(tema) {
    var normalizado = tema === 'dark' ? 'dark' : 'light';
    try { localStorage.setItem(CHAVE, normalizado); } catch {}
    aplicar(normalizado);
    ouvintes.forEach(function (fn) { fn(normalizado); });
    return normalizado;
  }

  // Aplica imediatamente, antes do resto da página existir.
  aplicar(obter());

  window.RotaTheme = {
    get: obter,
    set: definir,
    toggle: function () { return definir(obter() === 'dark' ? 'light' : 'dark'); },
    onChange: function (fn) { ouvintes.push(fn); },
  };
})();
