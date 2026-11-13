(function () {
  "use strict";
  var D = window.DADOS_COMERCIAIS || {};
  var qs = new URLSearchParams(location.search);
  var MODO_APRES = qs.has("apresentador");
  var MODO_PRINT = qs.has("imprimir");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var N = slides.length, atual = 0, buf = "", bufT = null;
  var palco = document.getElementById("palco");
  var canal = null;
  try { canal = new BroadcastChannel("ge-deck"); } catch (e) {}

  /* ---- ícones ---- */
  var IC = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    message: '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.3A8 8 0 1 1 21 12z"/>',
    bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    heart: '<path d="M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="15" r="1.2"/>',
    shield: '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-ic]"), function (el) {
    var s = IC[el.getAttribute("data-ic")] || "";
    el.outerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + s + "</svg>";
  });

  /* ---- escala do palco ---- */
  function escalar() {
    if (MODO_PRINT || MODO_APRES) return;
    var s = Math.min(innerWidth / 1920, innerHeight / 1080);
    palco.style.transform = "translate(-50%,-50%) scale(" + s + ")";
  }
  addEventListener("resize", escalar); escalar();

  /* ---- dados comerciais ---- */
  function textoPreco(p) {
    return D.precosDefinidos && D.planos && D.planos[p] && D.planos[p].preco ? D.planos[p].preco : "Valor em definição";
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-preco]"), function (el) {
    el.textContent = textoPreco(el.getAttribute("data-preco"));
  });
  var cta = document.getElementById("cta-cadastro");
  if (cta && D.linkCadastro) cta.href = D.linkCadastro;
  var sup = document.getElementById("suporte-texto");
  if (sup && D.suporte && D.suporte.canal && D.suporte.horario)
    sup.textContent = "Suporte pelo " + D.suporte.canal + ", " + D.suporte.horario + ".";

  /* slide 20: investimento */
  (function () {
    var c = document.getElementById("invest-corpo");
    var h = '<div class="grade g3" style="align-content:start">' +
      '<div class="cartao"><div class="icone"><svg viewBox="0 0 24 24"><use/></svg></div><h3>14 dias grátis</h3><p>Com os recursos do plano Studio, para testar de verdade.</p></div>' +
      '<div class="cartao"><h3>Sem cartão de crédito</h3><p>Você só informa um cartão se decidir continuar.</p></div>' +
      '<div class="cartao"><h3>Aviso antes de cobrar</h3><p>Nada é cobrado sem você saber antes.</p></div></div>';
    h = h.replace('<div class="icone"><svg viewBox="0 0 24 24"><use/></svg></div>', "");
    if (D.precosDefinidos) {
      h += '<div class="grade g4" style="margin-top:34px">' + ["solo", "pro", "studio", "business"].map(function (p) {
        return '<div class="cartao"><h3>' + p.charAt(0).toUpperCase() + p.slice(1) + '</h3><p><b>' + textoPreco(p) + '</b></p></div>';
      }).join("") + "</div>";
    } else {
      h += '<div class="nota-honesta" style="margin-top:40px">Os valores dos planos estão em definição. Hoje você usa tudo no teste grátis e decide depois, já sabendo o valor.</div>';
    }
    if (D.formasPagamento && D.formasPagamento.length) h += '<p class="suave" style="font-size:26px;margin-top:20px">Formas de pagamento: ' + D.formasPagamento.join(", ") + ".</p>";
    if (D.ofertaLancamento) h += '<div class="nota-honesta">' + D.ofertaLancamento + "</div>";
    c.innerHTML = h;
  })();

  /* slide 3: calculadora (exemplo hipotético editável) */
  (function () {
    var t = document.getElementById("c-ticket"), f = document.getElementById("c-faltas");
    var s = document.getElementById("c-saida"), fm = document.getElementById("c-formula");
    function brl(v) { return "R$ " + Math.round(v).toLocaleString("pt-BR"); }
    function calc() {
      var a = Math.max(0, parseFloat(t.value) || 0), b = Math.max(0, parseFloat(f.value) || 0);
      s.textContent = brl(a * b * 12);
      fm.textContent = brl(a) + " × " + b + " falta" + (b === 1 ? "" : "s") + " por mês × 12 meses";
    }
    t.addEventListener("input", calc); f.addEventListener("input", calc); calc();
  })();

  /* slide 16: recomendador */
  (function () {
    var sel = { p: null, l: null }, res = document.getElementById("resultado");
    var info = {
      solo: ["Solo", "Cobre agenda, clientes e link de agendamento para quem atende sozinha. Quando quiser lembrete automático, é só subir para o Pro."],
      pro: ["Pro", "Até 2 pessoas e lembrete com confirmação no WhatsApp. É o menor plano que resolve essa necessidade."],
      studio: ["Studio", "Equipe de até 10 pessoas numa agenda só, com relatórios por profissional."],
      business: ["Business", "Para vários endereços. A gestão de várias unidades está em desenvolvimento: anotamos o seu interesse e avisamos."]
    };
    function render() {
      if (!sel.p || !sel.l) return;
      var k = sel.p === "1" ? "solo" : sel.p === "2" ? "pro" : sel.p === "3" ? "studio" : "business";
      if (k === "solo" && sel.l === "s") k = "pro";
      var extra = (sel.p === "1" && sel.l === "s") ? " (o Solo não inclui lembrete automático)" : "";
      res.innerHTML = '<div class="rn">' + info[k][0] + '</div><p>' + info[k][1] + extra + "</p><p style=\"font-weight:800;color:#e3c88f\">" + textoPreco(k) + " · 14 dias grátis para testar</p>";
    }
    function liga(id, key) {
      Array.prototype.forEach.call(document.querySelectorAll("#" + id + " .opcao"), function (b) {
        b.addEventListener("click", function () {
          Array.prototype.forEach.call(document.querySelectorAll("#" + id + " .opcao"), function (x) { x.classList.remove("sel"); });
          b.classList.add("sel"); sel[key] = b.getAttribute("data-v"); render();
        });
      });
    }
    liga("q-pessoas", "p"); liga("q-lembrete", "l");
  })();

  /* ---- navegação ---- */
  function ir(i, semEco) {
    i = Math.max(0, Math.min(N - 1, i)); atual = i;
    slides.forEach(function (s, k) { s.classList.toggle("ativo", k === i); });
    Array.prototype.forEach.call(document.querySelectorAll(".rodape .num"), function (el) {
      el.textContent = (slides.indexOf(el.closest(".slide")) + 1) + " / " + N;
    });
    document.getElementById("progresso").style.width = ((i + 1) / N * 100) + "%";
    document.title = "Gê · " + (i + 1) + "/" + N + " · " + slides[i].getAttribute("data-titulo");
    if (location.hash !== "#" + (i + 1)) history.replaceState(null, "", "#" + (i + 1) + location.search.replace(/^$/, ""));
    if (!semEco && canal) canal.postMessage({ t: "ir", i: i });
    if (MODO_APRES) pvAtualiza();
  }
  function fs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(function () {});
  }
  function abrirApresentador() {
    window.open(location.pathname + "?apresentador#" + (atual + 1), "ge-apresentador", "width=1280,height=760");
  }
  addEventListener("keydown", function (e) {
    if (/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) return;
    var k = e.key, aj = document.getElementById("ajuda");
    if (k === "ArrowRight" || k === " " || k === "PageDown") { e.preventDefault(); ir(atual + 1); }
    else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); ir(atual - 1); }
    else if (k === "Home") ir(0);
    else if (k === "End") ir(N - 1);
    else if (k === "f" || k === "F") fs();
    else if ((k === "p" || k === "P") && !MODO_APRES) abrirApresentador();
    else if (k === "?" || k === "h" || k === "H") aj.classList.toggle("ver");
    else if (k === "Escape") aj.classList.remove("ver");
    else if (/^[0-9]$/.test(k)) { buf += k; clearTimeout(bufT); bufT = setTimeout(function () { buf = ""; }, 2500); }
    else if (k === "Enter" && buf) { ir(parseInt(buf, 10) - 1); buf = ""; }
  });
  /* clique no lado direito/esquerdo avança/volta (não em controles) */
  palco.addEventListener("click", function (e) {
    if (e.target.closest("input,button,a,label")) return;
    var r = palco.getBoundingClientRect();
    ir(e.clientX > r.left + r.width / 2 ? atual + 1 : atual - 1);
  });
  if (canal) canal.onmessage = function (m) { if (m.data && m.data.t === "ir") ir(m.data.i, true); };
  addEventListener("hashchange", function () { var n = parseInt(location.hash.slice(1), 10); if (n && n - 1 !== atual) ir(n - 1); });

  /* ---- impressão (PDF) ---- */
  if (MODO_PRINT) {
    document.body.classList.add("imprimir");
    Array.prototype.forEach.call(document.querySelectorAll(".rodape .num"), function (el) {
      el.textContent = (slides.indexOf(el.closest(".slide")) + 1) + " / " + N;
    });
    return;
  }

  /* ---- modo apresentador: as notas só são carregadas aqui ---- */
  var NOTAS = null, t0 = Date.now();
  function pvAtualiza() {
    var pv = document.getElementById("pv"); if (!pv || !NOTAS) return;
    var a = slides[atual], b = slides[atual + 1];
    var mini = function (s) { return s ? '<div class="esc"><section class="slide ' + s.className.replace("ativo", "") + ' ativo" style="' + (s.getAttribute("style") || "") + '">' + s.innerHTML + "</section></div>" : "<div style='padding:20px;color:#999'>Fim</div>"; };
    pv.querySelector("#pvA").innerHTML = mini(a);
    pv.querySelector("#pvB").innerHTML = mini(b);
    escalaMini();
    pv.querySelector("#pvN").textContent = NOTAS[atual] || "(sem notas)";
    pv.querySelector("#pvT").textContent = (atual + 1) + " / " + N + " · " + a.getAttribute("data-titulo");
  }
  function escalaMini() {
    Array.prototype.forEach.call(document.querySelectorAll("#pv .mini"), function (m) {
      var s = m.clientWidth / 1920; m.style.height = (1080 * s) + "px";
      var e = m.firstChild; if (e && e.style) e.style.transform = "scale(" + s + ")";
    });
  }
  if (MODO_APRES) {
    document.body.classList.add("apresentador");
    var sc = document.createElement("script");
    sc.src = "notas.js";
    sc.onload = function () {
      NOTAS = window.NOTAS_PRIVADAS;
      var pv = document.getElementById("pv");
      pv.innerHTML = '<div class="topo"><div>Modo apresentador · <span id="pvT"></span></div><div><span class="tempo" id="pvC">00:00</span>' +
        '<button id="pvP">‹ Anterior</button><button id="pvX">Próximo ›</button></div></div>' +
        '<div style="display:grid;grid-template-rows:auto auto;gap:14px;align-content:start"><div class="cx"><h4>Slide atual (o que a cliente vê)</h4><div class="mini" id="pvA"></div></div><div class="cx"><h4>Próximo</h4><div class="mini" id="pvB"></div></div></div>' +
        '<div class="cx"><div class="alerta">Notas privadas: a cliente NÃO vê esta janela. Compartilhe só a janela da apresentação.</div><h4>Notas</h4><div class="notas" id="pvN"></div></div>';
      document.getElementById("pvP").onclick = function () { ir(atual - 1); };
      document.getElementById("pvX").onclick = function () { ir(atual + 1); };
      setInterval(function () { var s = Math.floor((Date.now() - t0) / 1000); document.getElementById("pvC").textContent = ("0" + Math.floor(s / 60)).slice(-2) + ":" + ("0" + s % 60).slice(-2); }, 1000);
      addEventListener("resize", escalaMini);
      pvAtualiza();
    };
    document.head.appendChild(sc);
  }

  var n0 = parseInt(location.hash.slice(1), 10);
  ir(n0 ? n0 - 1 : 0, true);
})();
