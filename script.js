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
      (no.textContent.match(/\S+/g) || []).forEach((p) => {
        const s = document.createElement('span');
        s.style.display = 'inline-block';
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
    linhas.forEach((ln, n) => {
      const l = document.createElement('span'); l.className = 'l';
      const i = document.createElement('span'); i.className = 'l__i'; i.style.setProperty('--n', n);
      ln.itens.forEach((p, k) => { i.appendChild(p); if (k < ln.itens.length - 1) i.appendChild(document.createTextNode(' ')); });
      l.appendChild(i); el.appendChild(l); el.appendChild(document.createTextNode(' '));
    });
    el.classList.add('partido');
    el.dataset.linhas = linhas.length;
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
      setTimeout(() => devolver(el), 1150 + Number(el.dataset.linhas || 1) * 90 + 200);
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
    const a = ponto.animate([
      { transform: 'translate(0,0)', opacity: 0, offset: 0 },
      { opacity: 1, offset: .03 },
      { transform: fim, opacity: 1, offset: .3 },
      { transform: fim, opacity: 0, offset: .34 },
      { transform: fim, opacity: 0, offset: 1 },
    ], { duration: 6000, delay: 200, iterations: Infinity, easing: 'linear' });
    new IntersectionObserver((es) => { if (es[0].isIntersecting) a.play(); else a.pause(); }).observe(trilho);
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
      alvos.filter((el) => !el.hasAttribute('data-ja')).forEach((el) => (el.matches('.rodape') ? ioFim : io).observe(el));
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

  /* ---------- ano do rodapé ---------- */
  const ano = $('[data-ano]');
  if (ano) ano.textContent = String(new Date().getFullYear());
})();
