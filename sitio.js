/* ---- ScrollTrigger: recalcular posiciones cuando cambia el layout ----
   Las fotos y las fuentes cargan despues del HTML. Si no se refresca, los
   disparadores se quedan con las posiciones de antes y las animaciones saltan
   donde no toca (o no saltan nunca y el bloque se queda oculto). */
(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  function refrescar() { ScrollTrigger.refresh(); }
  window.addEventListener('load', refrescar);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(refrescar); }
  // cada foto que termina de cargar cambia la altura de la pagina
  var imgs = document.images, pend = 0;
  for (var i = 0; i < imgs.length; i++) {
    if (!imgs[i].complete) {
      pend++;
      imgs[i].addEventListener('load', function () { if (--pend <= 0) refrescar(); }, { once: true });
      imgs[i].addEventListener('error', function () { if (--pend <= 0) refrescar(); }, { once: true });
    }
  }
})();

/* Sin GSAP el respaldo de CSS+IntersectionObserver necesita ocultar antes de
   animar. Con GSAP no se oculta nada desde CSS a proposito. */
if (!window.gsap) { document.documentElement.classList.add('js-anim'); }

/* ---- Doble hélice de ADN girando detrás de toda la página ---- */
(function () {
  var canvas = document.getElementById('trace');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var giro = 0, raton = 0.5, objetivo = 0.5, w = 0, h = 0, dpr = 1, vertical = false;

  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vertical = w < 820;              // en móvil la hélice baja por la pantalla
  }

  // Un punto de la hélice: recorrido "u" de 0 a 1 a lo largo del eje largo.
  // z va de -1 a 1 y simula profundidad (delante / detrás).
  function hebra(u, desfase) {
    var largo = vertical ? h : w;
    var ancho = vertical ? w : h;
    var vueltas = vertical ? 3 : 2.2;
    var angulo = u * Math.PI * 2 * vueltas + giro + desfase;
    var radio = ancho * (vertical ? 0.24 : 0.21);
    var centro = ancho * 0.5;
    var desplaza = Math.sin(angulo) * radio;
    return {
      x: vertical ? centro + desplaza : u * largo,
      y: vertical ? u * largo : centro + desplaza,
      z: Math.cos(angulo)
    };
  }

  function pintar() {
    ctx.clearRect(0, 0, w, h);
    raton += (objetivo - raton) * 0.06;

    var pasos = vertical ? 150 : 190;
    var a = [], b = [];
    for (var i = 0; i <= pasos; i++) {
      var u = i / pasos;
      a.push(hebra(u, 0));
      b.push(hebra(u, Math.PI));
    }

    // travesaños: las bases que unen las dos hebras
    for (var j = 0; j < a.length; j += 4) {
      var pa = a[j], pb = b[j];
      var prof = (pa.z + 1) / 2;                       // 0 detrás, 1 delante
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = 'rgba(182,255,61,' + (0.09 + prof * 0.24) + ')';
      ctx.lineWidth = 1 + prof * 1.6;
      ctx.stroke();

      var r = 1.6 + prof * 3.2;
      ctx.beginPath(); ctx.arc(pa.x, pa.y, r, 0, 6.283);
      ctx.fillStyle = 'rgba(182,255,61,' + (0.25 + prof * 0.6) + ')';
      ctx.fill();
      ctx.beginPath(); ctx.arc(pb.x, pb.y, 1.6 + (1 - prof) * 3.2, 0, 6.283);
      ctx.fillStyle = 'rgba(124,229,119,' + (0.22 + (1 - prof) * 0.5) + ')';
      ctx.fill();
    }

    // las dos hebras
    [[a, 'rgba(182,255,61,'], [b, 'rgba(124,229,119,']].forEach(function (par) {
      var pts = par[0];
      ctx.beginPath();
      pts.forEach(function (p, k) { k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
      ctx.strokeStyle = par[1] + (0.4 + raton * 0.16) + ')';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    });

    if (!quieto) giro += 0.0055;
    requestAnimationFrame(pintar);
  }

  window.addEventListener('resize', medir);
  window.addEventListener('pointermove', function (e) {
    objetivo = e.clientY / window.innerHeight;
    document.documentElement.style.setProperty('--mx', (e.clientX / window.innerWidth * 100) + '%');
    document.documentElement.style.setProperty('--my', (e.clientY / window.innerHeight * 100) + '%');
  }, { passive: true });

  medir();
  pintar();
})();

/* ---- Aparición al hacer scroll (GSAP si está disponible) + contadores ---- */
(function () {
  var reveals = document.querySelectorAll('.reveal');
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // En las paginas de articulo manda el bloque de animaciones de articulo:
  // si los dos tocan el mismo elemento con .from(), el segundo toma como destino
  // el estado ya invisible y el elemento no vuelve a aparecer nunca.
  var esArticulo = !!document.querySelector('.articulo');

  if (window.gsap && !quieto && !esArticulo) {
    gsap.registerPlugin(ScrollTrigger);

    // el hero se ve al cargar, no hace falta esperar scroll: entrada propia y mas cuidada
    var heroTitulo = document.querySelector('.hero h1');
    var heroResto = document.querySelectorAll('.hero p, .hero .promise, .hero .scale');
    if (heroTitulo) {
      var tlHero = gsap.timeline({ delay: .1 });
      tlHero
        .from(heroTitulo, { opacity: 0, y: 26, duration: .9, ease: 'power3.out' })
        .from(heroResto, { opacity: 0, y: 16, duration: .7, ease: 'power3.out', stagger: .1 }, '-=0.5')
        .from('.hero .cifras .cifra', { opacity: 0, y: 20, duration: .6, ease: 'back.out(1.6)', stagger: .09 }, '-=0.35');
    }

    // tarjetas de categoria: entran con una leve rotacion 3D, como si se abrieran
    gsap.utils.toArray('.cat').forEach(function (el, i) {
      gsap.from(el, {
        opacity: 0, y: 34, rotateX: -8, transformPerspective: 600, transformOrigin: 'top center',
        duration: .8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
        delay: (i % 3) * 0.08,
      });
    });

    // fila de medidores: escalonado con un ligero rebote
    var medidores = document.querySelectorAll('.medidor');
    if (medidores.length) {
      gsap.from(medidores, {
        opacity: 0, y: 24, scale: .94, duration: .7, ease: 'back.out(1.5)', stagger: .1,
        scrollTrigger: { trigger: medidores[0], start: 'top 90%' },
      });
    }

    // tarjetas de guia: aparecen con una barrida diagonal + zoom leve de la foto
    gsap.utils.toArray('.guia').forEach(function (el, i) {
      var col = i % 3;
      gsap.from(el, {
        opacity: 0, y: 30, x: (col - 1) * 14, duration: .75, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%' },
        delay: (i % 6) * 0.06,
      });
    });

    // el resto de bloques con .reveal que no encajan en los grupos de arriba:
    // aparicion simple pero con variedad de direccion segun su posicion en la pagina
    var yaAnimados = new Set();
    gsap.utils.toArray('.cat, .medidor, .guia').forEach(function (el) { yaAnimados.add(el); });
    var restantes = Array.prototype.filter.call(reveals, function (el) { return !yaAnimados.has(el); });
    restantes.forEach(function (el, i) {
      var desdeIzq = i % 2 === 0;
      gsap.from(el, {
        opacity: 0, y: 20, x: desdeIzq ? -12 : 12, duration: .7, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%' },
      });
    });
  } else if (esArticulo && window.gsap && !quieto) {
    // los reveal se ven tal cual; manda el bloque de animaciones de articulo
  } else if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js-anim');
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i * 45, 220) + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('seen'); });
  }

  var nums = document.querySelectorAll('[data-count]');
  var arrancado = false;
  function contar() {
    if (arrancado) return;
    arrancado = true;
    nums.forEach(function (n) {
      var fin = parseInt(n.getAttribute('data-count'), 10);
      var suf = n.getAttribute('data-suffix') || '';
      if (!fin) { n.textContent = '0' + suf; return; }
      var t0 = performance.now(), dur = 1100, hecho = false;
      (function paso(t) {
        var p = Math.min((t - t0) / dur, 1);
        var e = 1 - Math.pow(1 - p, 3);
        n.textContent = Math.round(fin * e) + suf;
        if (p < 1) requestAnimationFrame(paso); else hecho = true;
      })(t0);
      // Si el navegador congela el rAF (pestana en segundo plano) el numero se
      // quedaria a medias para siempre: a los 3 s se pone el valor real.
      setTimeout(function () { if (!hecho) n.textContent = fin + suf; }, 3000);
    });
  }
  var caja = nums.length ? (nums[0].closest('.cifras') || nums[0].parentElement) : null;
  if (caja && 'IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { contar(); io2.disconnect(); } });
    }, { threshold: 0.25 });
    io2.observe(caja);
    // por si el observador no llega a dispararse (cargas raras, pestana en segundo plano)
    if (caja.getBoundingClientRect().top < window.innerHeight) { setTimeout(contar, 600); }
  } else { contar(); }
})();

/* ---- Menú móvil, filtro por veredicto, progreso y volver arriba ---- */
(function () {
  // menú móvil
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu-movil');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var abierto = menu.classList.toggle('abierto');
      burger.setAttribute('aria-expanded', String(abierto));
      burger.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('abierto');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // filtro por veredicto
  var filtros = document.querySelectorAll('.filtro');
  var filas = document.querySelectorAll('.guias .guia');
  var vacio = document.getElementById('sin-resultados');
  filtros.forEach(function (b) {
    b.addEventListener('click', function () {
      var quiere = b.getAttribute('data-filtro');
      filtros.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      var visibles = 0;
      filas.forEach(function (fila) {
        var sello = fila.querySelector('.stamp');
        var tipo = sello ? (sello.classList.contains('ok') ? 'ok' : sello.classList.contains('maybe') ? 'maybe' : 'hype') : '';
        var mostrar = quiere === 'todos' || tipo === quiere;
        fila.hidden = !mostrar;
        if (mostrar) {
          // reordena el escalonado y relanza la animacion de entrada
          fila.style.setProperty('--i', visibles);
          fila.style.animation = 'none';
          void fila.offsetWidth;
          fila.style.animation = '';
          visibles++;
        }
      });
      if (vacio) vacio.hidden = visibles > 0;
    });
  });

  // barra de progreso de lectura
  var barra = document.getElementById('progreso');
  var arriba = document.getElementById('arriba');
  function alScroll() {
    var alto = document.documentElement.scrollHeight - window.innerHeight;
    var y = window.scrollY;
    if (barra) barra.style.width = (alto > 0 ? (y / alto) * 100 : 0) + '%';
    if (arriba) arriba.classList.toggle('visible', y > 700);
  }
  window.addEventListener('scroll', alScroll, { passive: true });
  alScroll();

  if (arriba) {
    arriba.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // foco de luz siguiendo el cursor dentro de las tarjetas
  document.querySelectorAll('.cat, .feature').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--cx', ((e.clientX - r.left) / r.width * 100) + '%');
      el.style.setProperty('--cy', ((e.clientY - r.top) / r.height * 100) + '%');
    }, { passive: true });
  });
})();

/* ---- Consentimiento de cookies ---- */
(function () {
  var KEY = 'bsf_consent';
  var banner = document.getElementById('cookie-banner');
  function getConsent() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function setConsent(v) { localStorage.setItem(KEY, JSON.stringify(v)); }
  function show() { if (banner) banner.hidden = false; }
  function hide() { if (banner) banner.hidden = true; }
  if (!getConsent()) show();
  if (banner) {
    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-consent]');
      if (!btn) return;
      var choice = btn.getAttribute('data-consent');
      if (choice === 'all') setConsent({ analytics: true, ads: true });
      else if (choice === 'reject') setConsent({ analytics: false, ads: false });
      else if (choice === 'custom') { setConsent({ analytics: true, ads: false }); }
      hide();
      location.reload();
    });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('.cookie-prefs-link')) { e.preventDefault(); show(); }
  });
})();

/* ---- Índice del artículo: marcar la sección en la que estás ---- */
(function () {
  var enlaces = document.querySelectorAll('.indice a');
  if (!enlaces.length || !('IntersectionObserver' in window)) return;

  var mapa = {};
  var titulos = [];
  enlaces.forEach(function (a) {
    var destino = document.getElementById(a.getAttribute('href').slice(1));
    if (destino) { mapa[destino.id] = a; titulos.push(destino); }
  });

  var visibles = new Set();
  var io = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (e.isIntersecting) visibles.add(e.target.id); else visibles.delete(e.target.id);
    });
    var actual = titulos.filter(function (t) { return visibles.has(t.id); })[0];
    if (!actual) return;
    enlaces.forEach(function (a) { a.classList.remove('activo'); });
    if (mapa[actual.id]) mapa[actual.id].classList.add('activo');
  }, { rootMargin: '-88px 0px -65% 0px' });

  titulos.forEach(function (t) { io.observe(t); });
})();

/* ---- Índice de artículos: buscador + filtros por categoría ---- */
(function () {
  var caja = document.getElementById('buscar');
  var fichas = [].slice.call(document.querySelectorAll('.ficha'));
  if (!fichas.length) return;

  var botones = [].slice.call(document.querySelectorAll('.filtro[data-fam]'));
  var botonesVer = [].slice.call(document.querySelectorAll('.filtro[data-ver]'));
  var cuenta = document.getElementById('cuenta');
  var vacio = document.getElementById('sin-resultados');
  var familia = 'todas';
  var veredicto = 'todos';

  function normaliza(t) {
    return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function aplicar() {
    var texto = normaliza(caja ? caja.value.trim() : '');
    var visibles = 0;
    fichas.forEach(function (f) {
      var okFam = familia === 'todas' || f.getAttribute('data-fam') === familia;
      var okVer = veredicto === 'todos' || f.getAttribute('data-ver') === veredicto;
      var okTexto = !texto || normaliza(f.getAttribute('data-busca')).indexOf(texto) !== -1;
      var ver = okFam && okVer && okTexto;
      f.hidden = !ver;
      if (ver) visibles++;
    });
    if (cuenta) cuenta.textContent = visibles + (visibles === 1 ? ' artículo' : ' artículos');
    if (vacio) vacio.hidden = visibles > 0;
  }

  botones.forEach(function (b) {
    b.addEventListener('click', function () {
      familia = b.getAttribute('data-fam');
      botones.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      aplicar();
    });
  });
  botonesVer.forEach(function (b) {
    b.addEventListener('click', function () {
      veredicto = b.getAttribute('data-ver');
      botonesVer.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      aplicar();
    });
  });
  if (caja) caja.addEventListener('input', aplicar);
  aplicar();
})();


/* ---- Animaciones de las páginas de artículo (GSAP) ---- */
(function () {
  var articulo = document.querySelector('.articulo');
  if (!articulo || !window.gsap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  // Entrada de la cabecera al cargar: ruta, titulo, datos y foto, en cascada.
  var tl = gsap.timeline({ delay: .12 });
  // Red de seguridad: la cabecera es lo mas importante de la pagina. Si por lo
  // que sea la animacion no llega a terminar, se limpian los estilos y el
  // contenido queda visible igualmente.
  var cabeceraSel = '.art-ruta, .art-cabecera h1, .art-datos, .art-foto';
  setTimeout(function () {
    if (!tl.isActive() && tl.progress() < 1) { gsap.set(cabeceraSel, { clearProps: 'all' }); }
  }, 3000);
  tl.from('.art-ruta', { opacity: 0, y: 12, duration: .5, ease: 'power2.out' })
    .from('.art-cabecera h1', { opacity: 0, y: 22, duration: .8, ease: 'power3.out' }, '-=0.25')
    .from('.art-datos', { opacity: 0, y: 14, duration: .6, ease: 'power2.out' }, '-=0.45')
    .from('.art-foto', { opacity: 0, y: 24, scale: .985, duration: .9, ease: 'power3.out' }, '-=0.4');

  // La foto de cabecera se mueve un poco mas despacio que la pagina (profundidad).
  var foto = document.querySelector('.art-foto img');
  if (foto) {
    gsap.to(foto, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '.art-foto', start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  // Los titulos de seccion del cuerpo aparecen al llegar; el texto no se toca
  // para no entorpecer la lectura.
  gsap.utils.toArray('.art-cuerpo h2').forEach(function (h) {
    gsap.from(h, {
      opacity: 0, y: 18, duration: .6, ease: 'power2.out',
      scrollTrigger: { trigger: h, start: 'top 88%' },
    });
  });

  // Bloques destacados: entran con algo mas de presencia.
  ['.evidencia', '.faq', '.fuentes', '.disclaimer'].forEach(function (sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    gsap.from(el, {
      opacity: 0, y: 26, duration: .75, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  // El grafico de nivel de evidencia se "dibuja": las barras crecen desde abajo.
  var barras = document.querySelectorAll('.evidencia svg rect, .evidencia svg line');
  if (barras.length) {
    gsap.from(barras, {
      scaleY: 0, transformOrigin: 'bottom center', opacity: 0,
      duration: .7, ease: 'power2.out', stagger: .07,
      scrollTrigger: { trigger: '.evidencia', start: 'top 85%' },
    });
  }

  // Indice lateral: aparece cuando el cuerpo del articulo entra en pantalla.
  var indice = document.querySelector('.art-lado .indice');
  if (indice) {
    gsap.from(indice, {
      opacity: 0, x: 14, duration: .7, ease: 'power3.out',
      scrollTrigger: { trigger: '.art-cuerpo', start: 'top 85%' },
    });
  }

  // Articulos relacionados del final: escalonados.
  var rels = document.querySelectorAll('.rel-grid .rel');
  if (rels.length) {
    gsap.from(rels, {
      opacity: 0, y: 24, duration: .6, ease: 'power3.out', stagger: .09,
      scrollTrigger: { trigger: '.relacionados', start: 'top 88%' },
    });
  }
})();


/* ---- Animaciones del índice de artículos y de tablas/calculadora (GSAP) ---- */
(function () {
  if (!window.gsap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  // Pagina "Todos los articulos": cabecera, buscador y filtros entran en cascada,
  // y las fichas van apareciendo escalonadas por filas.
  var indice = document.querySelector('.indice-pagina');
  if (indice) {
    gsap.timeline({ delay: .1 })
      .from('.indice-cabecera h1', { opacity: 0, y: 20, duration: .7, ease: 'power3.out' })
      .from('.indice-cabecera p', { opacity: 0, y: 14, duration: .6, ease: 'power2.out' }, '-=0.4')
      .from('.buscador', { opacity: 0, y: 14, duration: .6, ease: 'power2.out' }, '-=0.35')
      .from('.filtros .filtro', { opacity: 0, y: 10, duration: .45, ease: 'back.out(1.6)', stagger: .05 }, '-=0.3');

    gsap.utils.toArray('.fichas .ficha').forEach(function (el, i) {
      gsap.from(el, {
        opacity: 0, y: 26, duration: .6, ease: 'power3.out',
        delay: (i % 3) * 0.07,
        scrollTrigger: { trigger: el, start: 'top 93%' },
      });
    });
  }

  // Tablas comparativas: las filas entran una detras de otra al llegar la tabla.
  gsap.utils.toArray('.table-wrap table').forEach(function (tabla) {
    var filas = tabla.querySelectorAll('tbody tr');
    if (!filas.length) return;
    gsap.from(filas, {
      opacity: 0, x: -12, duration: .45, ease: 'power2.out', stagger: .05,
      scrollTrigger: { trigger: tabla, start: 'top 85%' },
    });
  });

  // Calculadora: el formulario entra al cargar y las tarjetas de resultado
  // aparecen cada vez que se calcula (no solo la primera vez).
  var caja = document.querySelector('.calc-box');
  if (caja) {
    gsap.from(caja, { opacity: 0, y: 20, duration: .7, ease: 'power3.out', delay: .15 });
    var resultado = document.querySelector('.calc-result');
    if (resultado && 'MutationObserver' in window) {
      new MutationObserver(function () {
        var tarjetas = resultado.querySelectorAll('.result-card');
        if (tarjetas.length) {
          gsap.fromTo(tarjetas,
            { opacity: 0, y: 16, scale: .96 },
            { opacity: 1, y: 0, scale: 1, duration: .5, ease: 'back.out(1.5)', stagger: .07, overwrite: true });
        }
      }).observe(resultado, { childList: true, subtree: true });
    }
  }
})();


/* ---- Red de seguridad global ----
   Ninguna animacion puede dejar contenido invisible. Pero solo se rescata lo que
   esta DENTRO de la pantalla: si algo esta mas abajo, es que su animacion de
   scroll todavia no ha llegado y no hay que tocarlo (si se toca, se cargan las
   animaciones de toda la pagina antes de que el visitante baje). */
(function () {
  var sel = '.reveal, .guia, .cat, .cifra, .medidor, .ficha, .art-ruta, .art-cabecera h1,'
          + ' .art-datos, .art-foto, .art-cuerpo h2, .evidencia, .faq, .fuentes,'
          + ' .disclaimer, .indice, .rel, .calc-box, .calc-result, tbody tr,'
          + ' .error-404 .codigo, .error-404 h1, .error-404 p, .error-404 .bt,'
          + ' .error-404 .sugerencias li';

  function enPantalla(el) {
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    return r.top < (window.innerHeight || 0) - 40 && r.bottom > 40;
  }

  function rescatar() {
    var els = document.querySelectorAll(sel);
    Array.prototype.forEach.call(els, function (el) {
      if (el.hasAttribute('hidden') || el.closest('#cookie-banner')) return;
      if (!enPantalla(el)) return;
      var e = window.getComputedStyle(el);
      var op = parseFloat(e.opacity);
      if (isNaN(op) || op > 0.05) return;
      if (e.visibility === 'hidden' || e.display === 'none') return;
      // Si sigue invisible y en pantalla pasados 2,5 s, algo va mal aunque GSAP
      // crea que lo esta animando (pestana en segundo plano congela el rAF).
      el.classList.add('seen');
      if (window.gsap) { gsap.set(el, { clearProps: 'all' }); }
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.animation = 'none';
    });
  }

  // Se repasa unas cuantas veces mientras se navega, no una sola vez.
  var pases = 0;
  var reloj = setInterval(function () {
    rescatar();
    if (++pases >= 20) clearInterval(reloj);
  }, 2500);
  window.addEventListener('scroll', function () {
    clearTimeout(window.__rescate);
    window.__rescate = setTimeout(rescatar, 1200);
  }, { passive: true });
})();
