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

  /* ---------- títulos linha a linha: mede as linhas reais, revela, e devolve o texto original ---------- */
  const palavras = (raiz) => {
    const pecas = [];
    raiz.childNodes.forEach((no) => {
      const cl = no.nodeType === 1 ? no : null;
      // a segunda frase do título (.tom) sempre começa na linha de baixo, como no texto final
      if (cl && cl.classList.contains('tom') && pecas.length) pecas.push(document.createElement('br'));
      (no.textContent.match(/\S+/g) || []).forEach((p) => {
        // span comum (não inline-block): a linha animada tem a mesma altura da linha de texto normal
        const s = document.createElement('span');
        if (cl) { const c2 = cl.cloneNode(false); c2.textContent = p; s.appendChild(c2); } else s.textContent = p;
        pecas.push(s);
      });
      // frases que no texto final ocupam linhas próprias continuam separadas aqui
      if (cl && raiz.hasAttribute('data-cada-span')) pecas.push(document.createElement('br'));
    });
    return pecas;
  };
  const partir = (el) => {
    el.dataset.original = el.innerHTML;
    const pecas = palavras(el);
    el.textContent = '';
    pecas.forEach((p, k) => { el.appendChild(p); if (k < pecas.length - 1) el.appendChild(document.createTextNode(' ')); });
    const linhas = [];
    pecas.filter((p) => p.tagName !== 'BR').forEach((p) => {
      const ult = linhas[linhas.length - 1];
      if (ult && Math.abs(ult.top - p.offsetTop) < 4) ult.itens.push(p); else linhas.push({ top: p.offsetTop, itens: [p] });
    });
    el.textContent = '';
    let w = 0; // índice de cada palavra: nas seções elas entram uma depois da outra, como no Warbox TV
    linhas.forEach((ln, n) => {
      const l = document.createElement('span'); l.className = 'l';
      const i = document.createElement('span'); i.className = 'l__i'; i.style.setProperty('--n', n);
      ln.itens.forEach((p, k) => { p.classList.add('w'); p.style.setProperty('--w', w++); i.appendChild(p); if (k < ln.itens.length - 1) i.appendChild(document.createTextNode(' ')); });
      l.appendChild(i); el.appendChild(l); el.appendChild(document.createTextNode(' '));
    });
    el.classList.add('partido');
    el.dataset.linhas = linhas.length;
    el.dataset.palavras = w;
  };
  const devolver = (el) => {
    if (el.dataset.original === undefined) return;
    el.innerHTML = el.dataset.original;
    delete el.dataset.original;
  };

  /* ---------- entradas por seção ---------- */
  const entrar = (el) => {
    el.classList.add('is-in');
    if (el.dataset.original !== undefined) {
      // depois de assentar, o título volta a ser texto normal e quebra sozinho ao redimensionar
      const porLinha = 1150 + Number(el.dataset.linhas || 1) * 90;
      const porPalavra = 100 + Number(el.dataset.palavras || 0) * 70 + 800 + Number(getComputedStyle(el).getPropertyValue('--i') || 0) * 70;
      setTimeout(() => devolver(el), Math.max(porLinha, porPalavra) + 200);
    }
    if (el.matches('[data-fluxo]')) correrFluxo();
  };
  const correrFluxo = () => {
    const trilho = $('.fluxo__trilho'); const ponto = $('[data-fluxo-ponto]');
    if (!trilho || !ponto || !ponto.animate || calmo) return;
    const r = trilho.getBoundingClientRect();
    const horizontal = r.width > r.height;
    const lim = (horizontal ? r.width : r.height) - 2;
    const fim = horizontal ? `translateX(${lim}px)` : `translateY(${lim}px)`;
    // percorre a linha, some em Receita, espera e recomeça; parado fora da tela
    // como o ponto do gráfico de pico: corre a linha, pousa em Receita, solta uma onda, some e recomeça
    const tempo = { duration: 6000, delay: 200, iterations: Infinity };
    const a = ponto.animate([
      { transform: 'translate(0,0)', opacity: 0, offset: 0, easing: 'cubic-bezier(.65,0,.35,1)' },
      { opacity: 1, offset: .03, easing: 'cubic-bezier(.65,0,.35,1)' },
      { transform: fim, opacity: 1, offset: .3 },
      { transform: fim, opacity: 1, offset: .44 },
      { transform: fim, opacity: 0, offset: .49 },
      { transform: fim, opacity: 0, offset: 1 },
    ], { ...tempo, easing: 'linear' });
    const corridas = [a];
    const onda = ponto.querySelector('.fluxo__onda');
    if (onda) corridas.push(onda.animate([
      { transform: 'scale(1)', opacity: 0, offset: 0 },
      { transform: 'scale(1)', opacity: 0, offset: .3 },
      { transform: 'scale(1)', opacity: .9, offset: .305, easing: 'cubic-bezier(.23,1,.32,1)' },
      { transform: 'scale(3.4)', opacity: 0, offset: .44 },
      { transform: 'scale(3.4)', opacity: 0, offset: 1 },
    ], { ...tempo, easing: 'linear' }));
    new IntersectionObserver((es) => corridas.forEach((c) => (es[0].isIntersecting ? c.play() : c.pause()))).observe(trilho);
  };
  const alvos = [...$$('[data-revela], [data-abre], [data-partir], .rodape')];
  const iniciarEntradas = () => {
    if (!calmo) $$('[data-partir]').forEach(partir);
    $$('[data-ja]').forEach((el) => requestAnimationFrame(() => requestAnimationFrame(() => entrar(el))));
    if ('IntersectionObserver' in window && !calmo) {
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { entrar(e.target); io.unobserve(e.target); }
      }), { rootMargin: '0px 0px -10% 0px', threshold: 0 });
      // o rodapé fica no fim da página: margem negativa nunca dispararia
      const ioFim = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { entrar(e.target); ioFim.unobserve(e.target); }
      }), { threshold: 0 });
      const pendentes = new Set(alvos.filter((el) => !el.hasAttribute('data-ja')));
      pendentes.forEach((el) => (el.matches('.rodape') ? ioFim : io).observe(el));
      const varrer = () => {
        pendentes.forEach((el) => {
          if (el.classList.contains('is-in')) { pendentes.delete(el); return; }
          const r = el.getBoundingClientRect();
          // sem caixa (display: none) ou acima da dobra: entra sem esperar o observador
          if ((r.width === 0 && r.height === 0) || r.top < innerHeight * 0.9) { entrar(el); io.unobserve(el); ioFim.unobserve(el); pendentes.delete(el); }
        });
      };
      let espera = 0;
      addEventListener('scroll', () => { clearTimeout(espera); espera = setTimeout(varrer, 90); }, { passive: true });
      addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(varrer, 160); }, { passive: true });
    } else {
      alvos.forEach((el) => el.classList.add('is-in'));
    }
  };
  // tela mudou de largura (celular girado): títulos ainda não revelados medem as linhas de novo
  let larguraAtual = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === larguraAtual || calmo) return;
    larguraAtual = innerWidth;
    $$('.partido:not(.is-in)').forEach((el) => { devolver(el); partir(el); });
  }, { passive: true });
  window.__muveOk = true;
  const fontes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontes, new Promise((ok) => setTimeout(ok, 700))]).then(iniciarEntradas);

  /* ---------- luz que segue o cursor ---------- */
  if (matchMedia('(hover: hover)').matches) {
    $$('.botao').forEach((el) => {
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

  /* ---------- tema: o interruptor da GR Brands. O novo tema abre em círculo a partir do botão ---------- */
  const raiz = document.documentElement;
  const botaoTema = $('#tema');
  const corBarra = $('meta[name="theme-color"]');
  const pôrTema = (t, guardar) => {
    raiz.setAttribute('data-tema', t);
    if (botaoTema) botaoTema.setAttribute('aria-pressed', String(t === 'escuro'));
    if (corBarra) corBarra.setAttribute('content', t === 'escuro' ? '#060C18' : '#0B172A');
    if (guardar) { try { sessionStorage.setItem('muve-tema', t); } catch { /* sem armazenamento */ } }
  };
  pôrTema(raiz.getAttribute('data-tema') || 'escuro', false);
  let trocandoTema = false;
  const trocarTema = () => pôrTema(raiz.getAttribute('data-tema') === 'escuro' ? 'claro' : 'escuro', true);
  const revelarTema = () => {
    if (calmo || !document.startViewTransition || !botaoTema) { trocandoTema = false; trocarTema(); return; }
    const r = botaoTema.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const longe = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    raiz.style.setProperty('--wipe-x', `${x.toFixed(1)}px`);
    raiz.style.setProperty('--wipe-y', `${y.toFixed(1)}px`);
    raiz.style.setProperty('--wipe-far', `${(longe + 180).toFixed(1)}px`);
    raiz.classList.add('is-trocando');
    const solta = () => { raiz.classList.remove('is-trocando'); trocandoTema = false; };
    let vt;
    try { vt = document.startViewTransition(trocarTema); } catch { solta(); trocarTema(); return; }
    vt.finished.then(solta, solta);
  };
  if (botaoTema) botaoTema.addEventListener('click', () => {
    if (trocandoTema) return;
    trocandoTema = true;
    // o retorno do toque começa no DOM vivo antes da foto da transição
    setTimeout(revelarTema, 70);
  });

  /* ---------- campos de luz: o respiro só corre com o bloco na tela, cada um no seu tempo ---------- */
  const campos = $$('.card:nth-child(2), .card:nth-child(4), .fluxo-area, .fundador__frase, .final__grade, .metodo__topo');
  if ('IntersectionObserver' in window && !calmo) {
    const ioCampo = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-vivo', e.isIntersecting)));
    campos.forEach((el, k) => { el.style.setProperty('--atraso', `${(-k * 1.7).toFixed(1)}s`); ioCampo.observe(el); });
  }

  /* ---------- borda que acende: segue o cursor no mouse; no toque, corre pela borda de cima ao rolar ---------- */
  const comBrilho = $$('.card, .pilar, .fundador__cartao, .painel, .fluxo-area, .fundador__frase');
  const brilhos = new Map();
  comBrilho.forEach((el) => {
    el.classList.add('tem-brilho');
    const b = document.createElement('span');
    b.className = 'brilho'; b.setAttribute('aria-hidden', 'true');
    el.appendChild(b); brilhos.set(el, b);
  });
  if ('IntersectionObserver' in window && comBrilho.length) {
    const visiveis = new Set();
    // as variáveis vão no próprio <span>, não no cartão: assim só ele recalcula a cada quadro
    const pôrLuz = (b, x, y, o) => { b.style.setProperty('--bx', `${x.toFixed(1)}px`); b.style.setProperty('--by', `${y.toFixed(1)}px`); b.style.setProperty('--bo', o.toFixed(3)); };
    const cursor = matchMedia('(hover: hover) and (pointer: fine)').matches;
    let px = -1e4, py = -1e4, pedido = 0;
    const pintar = () => {
      pedido = 0;
      const h = innerHeight;
      visiveis.forEach((el) => {
        const r = el.getBoundingClientRect(); const b = brilhos.get(el);
        if (cursor) {
          const d = Math.hypot(Math.max(r.left - px, 0, px - r.right), Math.max(r.top - py, 0, py - r.bottom));
          pôrLuz(b, px - r.left, py - r.top, Math.max(0, 1 - d / 160));
        } else {
          // a borda de cima atravessa a tela de baixo para cima; a luz corre da esquerda para a direita e é mais forte no meio
          const p = Math.min(1, Math.max(0, 1 - r.top / h));
          pôrLuz(b, r.width * (0.12 + 0.76 * p), -30, Math.sin(Math.PI * p) * 0.9);
        }
      });
    };
    const pedir = () => { if (!pedido) pedido = requestAnimationFrame(pintar); };
    const ioB = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) visiveis.add(e.target);
      else { visiveis.delete(e.target); brilhos.get(e.target).style.setProperty('--bo', '0'); }
    }), { rootMargin: '80px 0px' });
    comBrilho.forEach((el) => ioB.observe(el));
    if (cursor) {
      document.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; pedir(); }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => { px = py = -1e4; pedir(); });
      addEventListener('scroll', pedir, { passive: true });
    } else if (!calmo) {
      addEventListener('scroll', pedir, { passive: true });
      addEventListener('resize', pedir, { passive: true });
      setTimeout(pedir, 400);
    }
  }

  /* ---------- seções empilhadas na rolagem (como no Warbox TV) ---------- */
  const pilha = $$('main > section');
  const telaLarga = matchMedia('(min-width: 901px) and (min-height: 600px)');
  if (pilha.length > 1 && !calmo && telaLarga.matches && CSS.supports('position', 'sticky')) {
    raiz.classList.add('empilhado');
    // um marco de altura zero antes de cada seção guarda onde ela fica na página, já que a seção colada mente a própria posição
    const marcos = new Map();
    pilha.forEach((sec) => {
      const sombra = document.createElement('span'); sombra.className = 'sombra-pilha'; sombra.setAttribute('aria-hidden', 'true'); sec.appendChild(sombra);
      const m = document.createElement('span'); m.className = 'marco-secao'; m.setAttribute('aria-hidden', 'true'); sec.before(m); marcos.set(sec, m);
    });
    // cola cada seção quando o FIM dela chega ao pé da tela: nada fica escondido
    const colar = () => pilha.forEach((sec) => { sec.style.top = `${Math.min(0, innerHeight - sec.offsetHeight)}px`; });
    let pedidoPilha = 0;
    const pintarPilha = () => {
      pedidoPilha = 0;
      const vh = innerHeight;
      pilha.forEach((sec, k) => {
        const prox = pilha[k + 1];
        const p = prox ? Math.min(1, Math.max(0, (vh - prox.getBoundingClientRect().top) / vh)) : 0;
        sec.style.setProperty('--cobre', p.toFixed(3));
      });
    };
    const aoRolarPilha = () => { if (!pedidoPilha) pedidoPilha = requestAnimationFrame(pintarPilha); };
    colar(); pintarPilha();
    addEventListener('scroll', aoRolarPilha, { passive: true });
    addEventListener('resize', () => { colar(); pintarPilha(); });
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => { colar(); pintarPilha(); }); pilha.forEach((sec) => ro.observe(sec)); }
    // âncoras (#metodo, #diagnostico...) vão para o lugar real da seção, mesmo que ela esteja colada lá em cima
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      const alvo = document.getElementById(a.getAttribute('href').slice(1));
      if (!alvo || !marcos.has(alvo)) return;
      e.preventDefault();
      const y = marcos.get(alvo).getBoundingClientRect().top + scrollY;
      scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      history.replaceState(null, '', `#${alvo.id}`);
    });
  }

  /* ---------- ilha ---------- */
  const topo = $('[data-topo]');
  // a pílula tem largura fixa: ao rolar só ganha uma sombra mais funda, sem medir nem animar largura
  let ilhaAtiva = null;
  const aoRolarIlha = () => {
    const ativa = scrollY > 24;
    if (topo && ativa !== ilhaAtiva) { ilhaAtiva = ativa; topo.classList.toggle('is-ilha', ativa); }
  };
  aoRolarIlha();
  addEventListener('scroll', aoRolarIlha, { passive: true });

  // link da seção atual aceso: a seção da vez é a ÚLTIMA cujo topo já passou do meio da tela
  // (com as seções empilhadas, as de baixo continuam "na tela", cobertas, e não podem acender junto)
  const linksNav = $$('.ilha__nav a');
  const secoesTodas = $$('main > section');
  if (linksNav.length && secoesTodas.length) {
    let pedidoNav = 0;
    const marcarNav = () => {
      pedidoNav = 0;
      const meio = innerHeight * 0.45;
      let atual = null;
      secoesTodas.forEach((sec) => { if (sec.getBoundingClientRect().top <= meio) atual = sec; });
      linksNav.forEach((l) => l.classList.toggle('is-aqui', !!atual && l.getAttribute('href') === `#${atual.id}`));
    };
    addEventListener('scroll', () => { if (!pedidoNav) pedidoNav = requestAnimationFrame(marcarNav); }, { passive: true });
    addEventListener('resize', marcarNav);
    marcarNav();
  }

  /* ---------- critérios: a lista é conferida conforme a rolagem passa por ela ---------- */
  const criterios = $$('.criterios li');
  const lista = $('.criterios');
  if (calmo || !lista || !('IntersectionObserver' in window)) {
    criterios.forEach((li) => li.classList.add('is-marcado'));
  } else {
    // conta pela linha de leitura (58% da tela), não por cruzamento: rolagem rápida e âncora não deixam item para trás
    let pedido = 0;
    const conferir = () => {
      pedido = 0;
      const linha = innerHeight * .58;
      let atual = -1;
      criterios.forEach((li, k) => { if (li.getBoundingClientRect().top < linha) atual = k; });
      criterios.forEach((li, k) => {
        li.classList.toggle('is-marcado', k <= atual);
        li.classList.toggle('is-aqui', k === atual && li.getBoundingClientRect().bottom > innerHeight * .2);
      });
    };
    const aoRolarLista = () => { if (!pedido) pedido = requestAnimationFrame(conferir); };
    new IntersectionObserver((es) => {
      if (es[0].isIntersecting) { addEventListener('scroll', aoRolarLista, { passive: true }); conferir(); }
      else removeEventListener('scroll', aoRolarLista);
    }).observe(lista);
  }

  /* ---------- as ondas da marca: feixe de linhas que liga as três palavras da subheadline ---------- */
  $$('[data-ondas]').forEach((cv) => {
    const g = cv.getContext('2d');
    if (!g) return;
    const fundo = cv.closest('[data-hero-fundo]');
    const elos = fundo ? $$('[data-elo]', fundo) : [];
    const claro = cv.dataset.ondas === 'claro';
    // a camada acompanha de leve o ponteiro: o feixe parece estar atrás do texto
    const seguir = Boolean(fundo) && !calmo && matchMedia('(hover: hover) and (pointer: fine)').matches;
    let alvoX = 0; let alvoY = 0; let posX = 0; let posY = 0;
    if (seguir) {
      addEventListener('pointermove', (e) => {
        alvoX = (e.clientX / innerWidth - .5) * -18;
        alvoY = (e.clientY / innerHeight - .5) * -12;
      }, { passive: true });
    }
    let w = 0; let h = 0; let vis = true; let raf = 0; let ultimo = 0; let t = 1.2; let estreito = false;
    const medir = () => {
      const d = Math.min(devicePixelRatio || 1, 1.5);
      const r = cv.getBoundingClientRect();
      w = r.width; h = r.height; estreito = w < 1000;
      cv.width = Math.round(w * d); cv.height = Math.round(h * d);
      g.setTransform(d, 0, 0, d, 0, 0);
    };
    const linha = (n, f, fase = 0, abre = 1) => {
      const base = h * (estreito ? .95 : .78);
      const sobe = -n * n * h * (estreito ? .05 : .5);
      // a faixa dá voltas: onde o cosseno zera, as linhas se cruzam e ela parece uma fita no espaço
      const volta = .3 + .7 * Math.cos(n * 4.4 - t * .55 + fase);
      return base + sobe + fase * 40
        + Math.sin(n * 3.1 + t + f * 1.5 + fase) * (estreito ? 8 + f * 14 : 20 + f * 70)
        + Math.sin(n * 7.2 - t * .7 + f * 3.2 + fase) * (estreito ? 3 : 6 + f * 20)
        + (f - .5) * (estreito ? 44 : 260) * abre * (.2 + n) * volta;
    };
    const feixe = (qtd, tinta, largura, fase, abre) => {
      g.strokeStyle = tinta; g.lineWidth = largura;
      for (let i = 0; i < qtd; i += 1) {
        const f = i / qtd;
        g.beginPath();
        for (let x = 0; x <= w + 18; x += 18) {
          const y = linha(x / Math.max(w, 1), f, fase, abre);
          if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }
    };
    const degrade = (cor, a1, a2, a3) => {
      const d = g.createLinearGradient(0, 0, w, 0);
      d.addColorStop(0, `rgba(${cor},0)`); d.addColorStop(.4, `rgba(${cor},${a1})`); d.addColorStop(.78, `rgba(${cor},${a2})`); d.addColorStop(1, `rgba(${cor},${a3})`);
      return d;
    };
    const desenhar = () => {
      g.clearRect(0, 0, w, h);
      if (claro) {
        feixe(estreito ? 12 : 26, degrade('255,255,255', .03, .16, .24), 1, 0, 1);
        return;
      }
      if (!estreito) feixe(30, degrade('203,107,240', .02, .13, .2), 1, 1.1, 1.5); // camada de trás, mais aberta
      feixe(estreito ? 20 : 56, degrade('165,36,212', .1, .6, .85), estreito ? 1 : .9, 0, 1);
      if (!estreito) feixe(9, degrade('236,190,255', .04, .3, .5), 1, 0, .34); // miolo claro, na frente
      elos.forEach((e) => {
        const n = Number(e.dataset.elo);
        e.style.transform = `translate(calc(${(n * w).toFixed(1)}px - 50%), ${linha(n, .5).toFixed(1)}px)`;
      });
    };
    const quadro = (agora) => {
      raf = 0;
      if (!vis || document.hidden) return;
      if (agora - ultimo > 40) {
        if (seguir) {
          const k = Math.min(1, (agora - ultimo) * .004);
          posX += (alvoX - posX) * k; posY += (alvoY - posY) * k;
          fundo.style.transform = `translate3d(${posX.toFixed(1)}px, ${posY.toFixed(1)}px, 0)`;
        }
        t += (agora - ultimo) * .00016; ultimo = agora; desenhar();
      }
      raf = requestAnimationFrame(quadro);
    };
    const ligar = () => { if (!calmo && !raf && vis && !document.hidden) { ultimo = performance.now(); raf = requestAnimationFrame(quadro); } };
    medir(); desenhar();
    addEventListener('resize', () => { medir(); desenhar(); }, { passive: true });
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; ligar(); }).observe(cv);
    document.addEventListener('visibilitychange', ligar);
  });

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

  /* segmentos: rádios de verdade (setas, Tab e leitor de tela nativos); a pílula só acompanha a escolha */
  $$('[data-segmento]', form).forEach((seg) => {
    const trilho = $('[data-segmento-trilho]', seg);
    const pilula = $('.segmento__pilula', seg);
    const radios = $$('input[type=radio]', seg);
    const bordas = () => {
      const resto = trilho.scrollWidth - trilho.clientWidth - trilho.scrollLeft;
      trilho.toggleAttribute('data-fade-start', trilho.scrollLeft > 1);
      trilho.toggleAttribute('data-fade-end', resto > 1);
    };
    let primeira = true;
    const posicionar = (rolar) => {
      const marcado = radios.find((r) => r.checked);
      seg.classList.toggle('is-escolhido', Boolean(marcado));
      if (!marcado) return;
      const op = marcado.closest('.segmento__op');
      // na primeira escolha a pílula nasce no lugar, sem viajar desde a ponta
      if (primeira) seg.classList.remove('is-pronto');
      pilula.style.setProperty('--x', `${op.offsetLeft}px`);
      pilula.style.setProperty('--w', `${op.offsetWidth}px`);
      if (primeira) { void pilula.offsetWidth; seg.classList.add('is-pronto'); primeira = false; }
      // a opção escolhida fica inteira à vista, com folga para não cair no esmaecido
      if (rolar && trilho.scrollWidth > trilho.clientWidth) {
        const folga = 24;
        const ini = op.offsetLeft - folga;
        const fim = op.offsetLeft + op.offsetWidth + folga - trilho.clientWidth;
        const alvo = trilho.scrollLeft > ini ? ini : trilho.scrollLeft < fim ? fim : trilho.scrollLeft;
        if (alvo !== trilho.scrollLeft) trilho.scrollTo({ left: Math.max(0, alvo), behavior: calmo ? 'auto' : 'smooth' });
      }
    };
    radios.forEach((r) => r.addEventListener('change', () => posicionar(true)));
    trilho.addEventListener('scroll', bordas, { passive: true });
    // o passo 3 nasce escondido: mede de novo quando aparece e quando a largura muda
    if ('ResizeObserver' in window) new ResizeObserver(() => { bordas(); posicionar(false); }).observe(trilho);
    bordas();
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
    rotulos.forEach((l, i) => {
      l.classList.toggle('is-atual', i === n - 1);
      l.classList.toggle('is-feito', i < n - 1);
    });
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
    form.dataset.sentido = 'vai';
    irPara(passo + 1, true);
  });
  voltar.addEventListener('click', () => { form.dataset.sentido = 'volta'; irPara(passo - 1, true); });
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

  /* ---------- dado ainda não preenchido não aparece para o visitante ---------- */
  $$('[data-preencher]').forEach((el) => {
    if (/\{\{/.test(el.textContent + (el.getAttribute('href') || ''))) el.hidden = true;
  });

  /* ---------- ano do rodapé ---------- */
  const ano = $('[data-ano]');
  if (ano) ano.textContent = String(new Date().getFullYear());
})();
