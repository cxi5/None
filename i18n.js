/* ===================================================================
   ROTA — i18n.js
   Motor de tradução PT/EN. Inglês é o padrão automático (nada salvo =
   inglês); português é escolha explícita, lembrada por navegador —
   mesmo padrão do theme.js, e pelo mesmo motivo: cada página (inclusive
   login/cadastro, que não carregam RotaDB) precisa funcionar sozinha.

   Este arquivo é só o MOTOR — genérico, sem nenhuma string de nenhuma
   página. Cada página registra o próprio dicionário:

     <script src="i18n.js"></script>       (primeiro script do <head>)
     ...
     <script>
       RotaI18n.register({
         en: { 'login.submit': 'Sign in' },
         pt: { 'login.submit': 'Entrar' },
       });
       RotaI18n.apply();                    // preenche [data-i18n] etc
       RotaI18n.onChange(() => RotaI18n.apply()); // re-preenche ao trocar idioma
     </script>

   NO HTML:
     <h1 data-i18n="login.title">ROTA</h1>
     <input data-i18n-placeholder="login.emailPlaceholder" />
     <button data-i18n-aria-label="login.closeLabel">×</button>

   NO JS (strings que não vivem em elemento fixo — alert, toast, texto
   gerado dinamicamente):
     alert(RotaI18n.t('equipe.confirmarRemover', { nome: membro.nome }));
   =================================================================== */

(function () {
  var CHAVE = 'rota_lang';
  var PADRAO = 'en'; // inglês é o automático — só troca se a pessoa escolher pt
  var dicionario = { en: {}, pt: {} };
  var ouvintes = [];

  function obter() {
    try {
      var salvo = localStorage.getItem(CHAVE);
      return salvo === 'pt' || salvo === 'en' ? salvo : PADRAO;
    } catch {
      return PADRAO;
    }
  }

  function definir(lang) {
    var normalizado = lang === 'pt' ? 'pt' : 'en';
    try { localStorage.setItem(CHAVE, normalizado); } catch {}
    document.documentElement.lang = normalizado === 'pt' ? 'pt-BR' : 'en';
    ouvintes.forEach(function (fn) { fn(normalizado); });
    return normalizado;
  }

  // Mescla o dicionário de uma página no dicionário global — cada
  // página só registra as próprias chaves, sem pisar nas outras.
  function registrar(parcial) {
    if (parcial.en) Object.assign(dicionario.en, parcial.en);
    if (parcial.pt) Object.assign(dicionario.pt, parcial.pt);
  }

  // t('chave', { nome: 'Ana' }) — troca {{nome}} pelo valor. Cai pro
  // inglês se faltar a chave em pt, e mostra a própria chave (bem
  // visível, tipo [[chave]]) se faltar nos dois — mais fácil de achar
  // texto esquecido do que um branco silencioso.
  function t(chave, vars) {
    var lang = obter();
    var texto = dicionario[lang][chave] ?? dicionario.en[chave] ?? ('[[' + chave + ']]');
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        texto = texto.replace(new RegExp('{{' + k + '}}', 'g'), vars[k]);
      });
    }
    return texto;
  }

  // Varre o DOM (ou uma raiz específica, útil após innerHTML dinâmico)
  // e preenche data-i18n / data-i18n-<atributo>.
  function aplicar(raiz) {
    var escopo = raiz || document;

    escopo.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });

    escopo.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });

    // qualquer data-i18n-nome-do-atributo vira setAttribute('nome-do-atributo', ...)
    escopo.querySelectorAll('*').forEach(function (el) {
      for (var i = 0; i < el.attributes.length; i++) {
        var attr = el.attributes[i];
        if (attr.name.indexOf('data-i18n-') === 0 && attr.name !== 'data-i18n-html') {
          var alvo = attr.name.replace('data-i18n-', '');
          el.setAttribute(alvo, t(attr.value));
        }
      }
    });

  }

  document.documentElement.lang = obter() === 'pt' ? 'pt-BR' : 'en';

  window.RotaI18n = {
    register: registrar,
    get: obter,
    set: definir,
    toggle: function () { return definir(obter() === 'pt' ? 'en' : 'pt'); },
    t: t,
    apply: aplicar,
    onChange: function (fn) { ouvintes.push(fn); },
  };
})();
