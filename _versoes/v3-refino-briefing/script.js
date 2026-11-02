/* ============================================================
   MUV.E · Comportamento da landing page
   ============================================================ */
(() => {
  'use strict';
  const cfg = window.MUVE_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const guarda = {
    ler(k) { try { return localStorage.getItem(k); } catch { return null; } },
    pôr(k, v) { try { localStorage.setItem(k, v); } catch { /* navegação privada */ } },
  };

  /* ---------- medição: só dataLayer. Nada carrega sem consentimento ---------- */
  window.dataLayer = window.dataLayer || [];
  const evento = (nome, dados = {}) => window.dataLayer.push({ event: nome, ...dados });
  evento('lp_view');

  /* ---------- origem do contato (UTMs) ---------- */
  const origem = (() => {
    const CHAVES = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
    let salvo = {};
    try { salvo = JSON.parse(sessionStorage.getItem('muve_origem') || '{}'); } catch { /* segue vazio */ }
    const q = new URLSearchParams(location.search);
    CHAVES.forEach((c) => { if (q.get(c)) salvo[c] = q.get(c).slice(0, 200); });
    if (!salvo.referrer && document.referrer) salvo.referrer = document.referrer.slice(0, 300);
    if (!salvo.pagina) salvo.pagina = location.href.split('#')[0].slice(0, 300);
    try { sessionStorage.setItem('muve_origem', JSON.stringify(salvo)); } catch { /* segue em memória */ }
    return salvo;
  })();

  /* ---------- cliques em CTA ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-cta]');
    if (a) evento('cta_click', { cta_local: a.dataset.cta });
  });

  /* ---------- entradas por seção ---------- */
  const alvos = $$('[data-revela], [data-abre]');
  if ('IntersectionObserver' in window && !calmo) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    alvos.forEach((el) => io.observe(el));
  } else {
    alvos.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- luz que segue o cursor ---------- */
  if (matchMedia('(hover: hover)').matches) {
    $$('.botao, .card, .pilar').forEach((el) => {
      el.classList.add('tem-luz');
      const l = document.createElement('span');
      l.className = 'luz'; l.setAttribute('aria-hidden', 'true');
      el.prepend(l);
    });
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('.tem-luz');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* ---------- ilha ---------- */
  const topo = $('[data-topo]');
  const ilha = topo && $('.ilha', topo);
  const medirIlha = () => {
    if (!ilha) return;
    const kids = Array.from(ilha.children).filter((k) => getComputedStyle(k).display !== 'none');
    const cs = getComputedStyle(ilha);
    let soma = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    kids.forEach((k) => { soma += k.getBoundingClientRect().width; });
    // respiro entre as peças: maior quando há links no meio
    ilha.style.setProperty('--ilha', `${Math.ceil(soma + (kids.length - 1) * (kids.length > 2 ? 32 : 18))}px`);
  };
  const aoRolarIlha = () => topo && topo.classList.toggle('is-ilha', scrollY > 60);
  medirIlha(); aoRolarIlha();
  addEventListener('resize', medirIlha, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirIlha);
  addEventListener('scroll', aoRolarIlha, { passive: true });

  // link da seção atual aceso
  const linksNav = $$('.ilha__nav a');
  if (linksNav.length && 'IntersectionObserver' in window) {
    const ioNav = new IntersectionObserver((es) => es.forEach((e) => {
      const l = linksNav.find((a) => a.getAttribute('href') === `#${e.target.id}`);
      if (l) l.classList.toggle('is-aqui', e.isIntersecting);
    }), { rootMargin: '-45% 0px -50% 0px' });
    linksNav.forEach((a) => { const s = $(a.getAttribute('href')); if (s) ioNav.observe(s); });
  }

  /* ---------- as ondas da marca: feixe de linhas que liga as três palavras da subheadline ---------- */
  $$('[data-ondas]').forEach((cv) => {
    const g = cv.getContext('2d');
    if (!g) return;
    const final = cv.classList.contains('ondas--final');
    const fundo = cv.closest('[data-hero-fundo]');
    const elos = fundo ? $$('[data-elo]', fundo) : [];
    let w = 0; let h = 0; let vis = true; let raf = 0; let ultimo = 0; let t = 1.2; let estreito = false;
    const medir = () => {
      const d = Math.min(devicePixelRatio || 1, 1.5);
      const r = cv.getBoundingClientRect();
      w = r.width; h = r.height; estreito = w < 1000;
      cv.width = Math.round(w * d); cv.height = Math.round(h * d);
      g.setTransform(d, 0, 0, d, 0, 0);
    };
    const linha = (n, f) => {
      const base = final ? h * .9 : h * (estreito ? .95 : .76);
      const sobe = final ? -n * h * .06 : -n * n * h * (estreito ? .05 : .46);
      return base + sobe
        + Math.sin(n * 3.1 + t + f * 1.5) * (estreito ? 8 + f * 14 : 18 + f * 58)
        + Math.sin(n * 7.2 - t * .7 + f * 3.2) * (estreito ? 3 : 6 + f * 16)
        + (f - .5) * (estreito ? 30 : 84) * (.35 + n);
    };
    const desenhar = () => {
      g.clearRect(0, 0, w, h);
      const N = estreito ? 20 : 34;
      const tinta = g.createLinearGradient(0, 0, w, 0);
      if (final) {
        tinta.addColorStop(0, 'rgba(165,36,212,.5)'); tinta.addColorStop(.5, 'rgba(165,36,212,.06)'); tinta.addColorStop(1, 'rgba(165,36,212,0)');
      } else {
        tinta.addColorStop(0, 'rgba(165,36,212,0)'); tinta.addColorStop(.42, 'rgba(165,36,212,.1)'); tinta.addColorStop(.8, 'rgba(165,36,212,.62)'); tinta.addColorStop(1, 'rgba(165,36,212,.8)');
      }
      g.strokeStyle = tinta; g.lineWidth = 1;
      for (let i = 0; i < N; i += 1) {
        const f = i / N;
        g.beginPath();
        for (let x = 0; x <= w + 16; x += 16) {
          const y = linha(x / Math.max(w, 1), f);
          if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }
      elos.forEach((e) => {
        const n = Number(e.dataset.elo);
        e.style.transform = `translate(calc(${(n * w).toFixed(1)}px - 50%), ${linha(n, .5).toFixed(1)}px)`;
      });
    };
    const quadro = (agora) => {
      raf = 0;
      if (!vis || document.hidden) return;
      if (agora - ultimo > 40) { t += (agora - ultimo) * .00016; ultimo = agora; desenhar(); }
      raf = requestAnimationFrame(quadro);
    };
    const ligar = () => { if (!calmo && !raf && vis && !document.hidden) { ultimo = performance.now(); raf = requestAnimationFrame(quadro); } };
    medir(); desenhar();
    addEventListener('resize', () => { medir(); desenhar(); }, { passive: true });
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; ligar(); }).observe(cv);
    document.addEventListener('visibilitychange', ligar);
  });

  /* ---------- o ponto corre o fluxo com a rolagem ---------- */
  const area = $('[data-fluxo]');
  const trilho = area && $('.fluxo__trilho', area);
  const pontoFluxo = area && $('[data-fluxo-ponto]', area);
  if (!calmo) {
    let pedido = false;
    const prog = (el, ini, fim) => {
      const r = el.getBoundingClientRect();
      const a = innerHeight * ini; const b = innerHeight * fim;
      return Math.max(0, Math.min(1, (a - r.top) / (r.height + a - b)));
    };
    const atualizar = () => {
      pedido = false;
      if (trilho && getComputedStyle(trilho).display !== 'none') {
        const r = trilho.getBoundingClientRect();
        const horizontal = r.width > r.height;
        const p = prog(area, .85, .55);
        const lim = (horizontal ? r.width : r.height) - 14;
        pontoFluxo.style.transform = horizontal ? `translateX(${p * lim}px)` : `translateY(${p * lim}px)`;
      }
    };
    const pedir = () => { if (!pedido) { pedido = true; requestAnimationFrame(atualizar); } };
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', pedir, { passive: true });
    atualizar();
  }

  /* ---------- formulário ---------- */
  const form = $('[data-form]');
  if (!form) return;
  const c = (n) => form.elements[n];

  // máscaras e limpeza, ao digitar e ao colar
  const trocar = (el, novo) => {
    if (el.value === novo) return;
    const fim = el.selectionStart === el.value.length;
    const cursor = el.selectionStart - (el.value.length - novo.length);
    el.value = novo;
    if (!fim && document.activeElement === el) { try { el.setSelectionRange(Math.max(0, cursor), Math.max(0, cursor)); } catch { /* tel/text */ } }
  };
  const SO_NOME = /[^\p{L}\p{M} '’-]/gu;
  const limparNome = (v) => v.replace(SO_NOME, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ').replace(/-{2,}/g, '-').replace(/'{2,}/g, "'");
  const limparTexto = (v) => v.replace(/[^\p{L}\p{M}\p{N} .,&'’ªº°()/+-]/gu, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ');

  // Tira o código do país só quando é inequívoco. DDD 55 é preservado:
  // 55 + 10 ou 11 dígitos (12 ou 13 no total) é país; 55 + 9 dígitos (11 no total) é DDD.
  const normalizarFone = (bruto) => {
    const comMais = /^\s*\+/.test(bruto);
    let d = bruto.replace(/\D/g, '');
    if (comMais && d.startsWith('55')) d = d.slice(2);
    else if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
    return d.slice(0, 11);
  };
  const mascararFone = (d) => {
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    const miolo = d.length === 11 ? 7 : 6;
    if (d.length <= miolo) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, miolo)}-${d.slice(miolo)}`;
  };
  const foneValido = (d) => {
    if (!/^[1-9][1-9]\d{8,9}$/.test(d)) return false;
    return d.length === 11 ? d[2] === '9' : /[2-5]/.test(d[2]);
  };

  const fone = c('whatsapp');
  fone.addEventListener('beforeinput', (e) => {
    // bloqueia na origem: letra, + e símbolo nem chegam a aparecer
    if (e.inputType === 'insertText' && e.data && /\D/.test(e.data)) e.preventDefault();
  });
  fone.addEventListener('paste', (e) => {
    e.preventDefault();
    const txt = (e.clipboardData || window.clipboardData).getData('text');
    fone.value = mascararFone(normalizarFone(txt));
    fone.dispatchEvent(new Event('change', { bubbles: true }));
    limparErro(fone);
  });
  fone.addEventListener('input', (e) => {
    // autopreenchimento chega com +55 ou com 55 + número completo
    const digitando = e.inputType && e.inputType.startsWith('insert') && e.inputType !== 'insertReplacementText' && e.inputType !== 'insertFromPaste';
    const d = digitando ? fone.value.replace(/\D/g, '').slice(0, 11) : normalizarFone(fone.value);
    fone.value = mascararFone(d);
  });

  [['nome', limparNome], ['cidade', limparNome], ['especialidade_outra', limparNome], ['clinica', limparTexto]].forEach(([n, fn]) => {
    const el = c(n);
    let compondo = false;
    el.addEventListener('compositionstart', () => { compondo = true; });
    el.addEventListener('compositionend', () => { compondo = false; trocar(el, fn(el.value)); });
    el.addEventListener('input', () => { if (!compondo) trocar(el, fn(el.value)); });
    el.addEventListener('blur', () => { el.value = el.value.trim(); });
  });

  // especialidade "Outra"
  const blocoOutra = $('[data-outra]', form);
  c('especialidade').addEventListener('change', () => {
    const outra = c('especialidade').value === 'Outra';
    blocoOutra.hidden = !outra;
    c('especialidade_outra').required = outra;
    if (outra) c('especialidade_outra').focus();
  });

  // validação
  const REGRAS = {
    nome: () => {
      const v = c('nome').value.trim();
      if (!v) return 'Informe seu nome completo.';
      if (v.split(/\s+/).filter((p) => /\p{L}/u.test(p)).length < 2) return 'Informe nome e sobrenome.';
      return '';
    },
    whatsapp: () => {
      const d = fone.value.replace(/\D/g, '');
      if (!d) return 'Informe seu WhatsApp com DDD.';
      return foneValido(d) ? '' : 'Número incompleto ou inválido. Use DDD + número.';
    },
    clinica: () => {
      const v = c('clinica').value.trim();
      if (!v) return 'Informe o nome da clínica ou do consultório.';
      return /\p{L}.*\p{L}/su.test(v) ? '' : 'Digite um nome válido.';
    },
    especialidade: () => (c('especialidade').value ? '' : 'Selecione a especialidade.'),
    especialidade_outra: () => {
      if (c('especialidade').value !== 'Outra') return '';
      return c('especialidade_outra').value.trim().length >= 3 ? '' : 'Informe qual é a especialidade.';
    },
    cidade: () => (c('cidade').value.trim().length >= 2 ? '' : 'Informe a cidade.'),
    uf: () => (c('uf').value ? '' : 'Selecione o estado.'),
    modelo: () => (form.querySelector('[name="modelo"]:checked') ? '' : 'Selecione o modelo de atendimento.'),
    investimento: () => (form.querySelector('[name="investimento"]:checked') ? '' : 'Selecione uma faixa de investimento.'),
    desafio: () => (form.querySelector('[name="desafio"]:checked') ? '' : 'Selecione o principal desafio.'),
  };
  const PASSOS = { 1: ['nome', 'whatsapp'], 2: ['clinica', 'especialidade', 'especialidade_outra', 'cidade', 'uf'], 3: ['modelo', 'investimento', 'desafio'] };
  const caixaDe = (n) => {
    const grupo = form.querySelector(`[data-grupo="${n}"]`);
    if (grupo) return grupo;
    return form.elements[n].closest('.campo');
  };
  const focoDe = (n) => {
    const g = form.querySelector(`[data-grupo="${n}"] input`);
    return g || form.elements[n];
  };
  function pintar(n, msg) {
    const cx = caixaDe(n);
    const e = cx.querySelector('[data-erro]');
    e.textContent = msg;
    cx.classList.toggle('is-erro', !!msg);
    cx.classList.toggle('is-ok', !msg);
    const f = focoDe(n);
    if (cx.dataset.grupo) cx.toggleAttribute('aria-invalid', !!msg);
    else f.setAttribute('aria-invalid', String(!!msg));
  }
  function limparErro(el) {
    const n = el.name;
    if (!REGRAS[n]) return;
    if (caixaDe(n).classList.contains('is-erro')) pintar(n, REGRAS[n]());
  }
  const validar = (lista) => {
    let primeiro = null;
    lista.forEach((n) => {
      const msg = REGRAS[n]();
      pintar(n, msg);
      if (msg && !primeiro) primeiro = n;
    });
    return primeiro;
  };
  form.addEventListener('input', (e) => limparErro(e.target));
  form.addEventListener('change', (e) => limparErro(e.target));
  form.addEventListener('focusout', (e) => {
    const n = e.target.name;
    if (REGRAS[n] && e.target.type !== 'radio' && e.target.value.trim()) pintar(n, REGRAS[n]());
  });

  // etapas
  let passo = 1;
  const blocos = $$('[data-passo]', form);
  const voltar = $('[data-voltar]', form);
  const avancar = $('[data-avancar]', form);
  const enviar = $('[data-enviar]', form);
  const progresso = $('[data-progresso]', form);
  const rotulos = $$('.progresso__rotulos li', form);
  const textoPasso = $('[data-passo-texto]', form);
  const painel = $('.painel');
  const irPara = (n, comFoco) => {
    passo = n;
    blocos.forEach((b) => b.classList.toggle('is-ativo', Number(b.dataset.passo) === n));
    voltar.hidden = n === 1;
    avancar.hidden = n === 3;
    enviar.hidden = n !== 3;
    progresso.style.setProperty('--andou', String((n - 1) / 2));
    rotulos.forEach((l, i) => l.classList.toggle('is-atual', i === n - 1));
    textoPasso.textContent = `Etapa ${n} de 3. Todos os campos são obrigatórios.`;
    if (comFoco) {
      const r = painel.getBoundingClientRect();
      if (r.top < 70 || r.top > innerHeight * .5) painel.scrollIntoView({ block: 'start', behavior: calmo ? 'auto' : 'smooth' });
      const f = blocos[n - 1].querySelector('input:not([type=radio]), select, input');
      if (f && matchMedia('(pointer: fine)').matches) f.focus({ preventScroll: true });
    }
  };
  irPara(1, false);
  avancar.addEventListener('click', () => {
    const ruim = validar(PASSOS[passo]);
    if (ruim) { focoDe(ruim).focus(); return; }
    evento('form_step', { etapa: passo + 1 });
    irPara(passo + 1, true);
  });
  voltar.addEventListener('click', () => irPara(passo - 1, true));
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && passo < 3) { e.preventDefault(); avancar.click(); }
  });

  // início de preenchimento
  const inicioEm = Date.now();
  let comecou = false;
  form.addEventListener('focusin', () => {
    if (!comecou) { comecou = true; evento('form_start'); }
  });

  // envio
  const erroGeral = $('[data-erro-geral]', form);
  const sucesso = $('[data-sucesso]');
  const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  let idEnvio = null;
  let enviando = false;

  const mostrarSucesso = () => {
    form.hidden = true;
    sucesso.hidden = false;
    sucesso.focus({ preventScroll: true });
    const r = painel.getBoundingClientRect();
    if (r.top < 70) painel.scrollIntoView({ block: 'start', behavior: calmo ? 'auto' : 'smooth' });
  };
  const local = /^(localhost|127\.|0\.0\.0\.0|$)/.test(location.hostname);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (enviando) return;
    erroGeral.textContent = '';

    // revalida tudo; volta para a etapa do primeiro erro
    for (const n of [1, 2, 3]) {
      const ruim = validar(PASSOS[n]);
      if (ruim) { irPara(n, false); focoDe(ruim).focus(); return; }
    }
    // robô: finge que deu certo e não envia
    if (c('site').value || Date.now() - inicioEm < 3000) { mostrarSucesso(); return; }

    const digitos = fone.value.replace(/\D/g, '');
    // mesma pessoa reenviando: confirma sem criar outra oportunidade
    const marca = `muve_enviado_${digitos}`;
    const antes = Number(guarda.ler(marca) || 0);
    if (antes && Date.now() - antes < 7 * 864e5) { mostrarSucesso(); return; }

    idEnvio = idEnvio || novoId();
    const dados = {
      id_envio: idEnvio,
      nome: c('nome').value.trim(),
      whatsapp: digitos,
      clinica: c('clinica').value.trim(),
      especialidade: c('especialidade').value === 'Outra' ? c('especialidade_outra').value.trim() : c('especialidade').value,
      cidade: c('cidade').value.trim(),
      uf: c('uf').value,
      modelo_atendimento: form.querySelector('[name="modelo"]:checked').value,
      investimento_mensal: form.querySelector('[name="investimento"]:checked').value,
      principal_desafio: form.querySelector('[name="desafio"]:checked').value,
      enviado_em: new Date().toISOString(),
      ...origem,
    };

    if (!cfg.endpoint) {
      if (local) {
        // teste local: mostra o fluxo, mas sem evento de lead
        console.info('[Muv.e] Sem endpoint em config.js. Envio simulado:', dados);
        window.__muveUltimoEnvio = dados;
        guarda.pôr(marca, String(Date.now()));
        mostrarSucesso();
        return;
      }
      erroGeral.textContent = 'O envio ainda não está disponível. Por favor, tente novamente mais tarde.';
      return;
    }

    enviando = true;
    enviar.disabled = true;
    voltar.disabled = true;
    const rotuloBotao = enviar.lastChild.textContent;
    enviar.lastChild.textContent = 'Enviando…';
    const ctl = new AbortController();
    const prazo = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
        signal: ctl.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      guarda.pôr(marca, String(Date.now()));
      // o lead só existe aqui, depois da resposta positiva
      evento('generate_lead', { id_envio: idEnvio });
      if (typeof window.fbq === 'function') window.fbq('track', 'Lead', {}, { eventID: idEnvio });
      mostrarSucesso();
    } catch {
      erroGeral.textContent = 'Não foi possível enviar agora. Seus dados continuam aqui: tente novamente em instantes.';
      enviar.lastChild.textContent = rotuloBotao;
    } finally {
      clearTimeout(prazo);
      enviando = false;
      enviar.disabled = false;
      voltar.disabled = false;
    }
  });

  /* ---------- consentimento: só existe se houver rastreamento configurado ---------- */
  const temRastreio = Boolean(cfg.gtmId || cfg.metaPixelId);
  const avisoCookies = $('[data-cookies]');
  const abrirCookies = $('[data-cookies-abrir]');
  const carregarRastreio = () => {
    if (window.__muveRastreio) return;
    window.__muveRastreio = true;
    if (cfg.gtmId) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(cfg.gtmId)}`;
      document.head.appendChild(s);
    }
    if (cfg.metaPixelId && !window.fbq) {
      const f = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
      f.queue = []; f.loaded = true; f.version = '2.0'; f.push = f;
      window.fbq = f; window._fbq = f;
      const s = document.createElement('script');
      s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(s);
      window.fbq('init', cfg.metaPixelId);
      window.fbq('track', 'PageView');
    }
  };
  if (temRastreio) {
    abrirCookies.hidden = false;
    abrirCookies.addEventListener('click', () => { avisoCookies.hidden = false; });
    const escolha = guarda.ler('muve_consentimento');
    if (escolha === 'aceitar') carregarRastreio();
    else if (!escolha) avisoCookies.hidden = false;
    $$('[data-cookies]', avisoCookies).forEach((b) => b.addEventListener('click', () => {
      guarda.pôr('muve_consentimento', b.dataset.cookies);
      avisoCookies.hidden = true;
      if (b.dataset.cookies === 'aceitar') carregarRastreio();
    }));
  }

  /* ---------- ano do rodapé ---------- */
  const ano = $('[data-ano]');
  if (ano) ano.textContent = String(new Date().getFullYear());
})();
