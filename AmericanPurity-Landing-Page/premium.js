(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');

  const setMenu = (open) => {
    if (!toggle || !nav) return;
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', open);
  };

  toggle?.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });

  // The brand mark is a deliberate top-of-page control, not an incremental anchor jump.
  document.querySelectorAll('.brand[href="#top"]').forEach((brandLink) => {
    brandLink.addEventListener('click', (event) => {
      event.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
      history.replaceState(null, '', '#top');
    });
  });

  const form = document.querySelector('#analysis-form');
  const note = document.querySelector('#form-note');
  // FUTURE CRM INTEGRATION: this sprint intentionally has no endpoint. The local confirmation below
  // must not be treated as proof that a production lead was delivered.
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const zip = form.querySelector('#zip');
    if (!zip.checkValidity()) {
      zip.reportValidity();
      return;
    }
    note.textContent = `Thank you. We’ll be in touch soon about your water analysis in ${zip.value.trim()}.`;
    note.style.color = '#84632e';
    form.reset();
  });

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  // The technical diagrams share one clock per page. SVG owns both the visible
  // geometry and the stream overlays, so highlights cannot drift away from a line.
  const diagramRoots = [...document.querySelectorAll('.flow-visual, .ecmc-visual')];
  const diagramReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const diagramMobile = window.matchMedia('(max-width: 760px)');

  const makeRuntimePath = (svg, d) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'none');
    path.setAttribute('aria-hidden', 'true');
    path.style.visibility = 'hidden';
    svg.appendChild(path);
    return path;
  };

  const prepareDiagram = (root) => {
    const svg = root.querySelector(diagramMobile.matches ? '.diagram-svg-mobile' : '.diagram-svg-desktop');
    if (!svg) return null;
    const mobile = diagramMobile.matches;
    const muted = [...svg.querySelectorAll('.diagram-path-muted')];
    const contact = svg.querySelector('.diagram-path-contact');
    const paths = root.classList.contains('flow-visual') ? {
      input: muted[0],
      output: mobile ? muted[1] : makeRuntimePath(svg, 'M475 235 V251 H520'),
      branches: (mobile ? [...svg.querySelectorAll('.diagram-path-branch')] : ['M520 251 V284', 'M520 251 V322', 'M520 251 V360'].map((d) => makeRuntimePath(svg, d))),
      internal: svg.querySelector('.diagram-internal-light')
    } : {
      input: mobile ? muted[0] : makeRuntimePath(svg, 'M89 190 H300'),
      output: mobile ? muted[2] : makeRuntimePath(svg, 'M300 190 H511'),
      contact: [...svg.querySelectorAll('.diagram-path-contact')].length ? [...svg.querySelectorAll('.diagram-path-contact')] : [contact, contact, contact],
      internal: null
    };
    const info = (path) => ({ path, length: path?.getTotalLength?.() || 1 });
    const streamPaths = root.classList.contains('flow-visual')
      ? [paths.input, paths.output, ...paths.branches]
      : [paths.input, ...paths.contact, paths.output];
    const streams = streamPaths.filter(Boolean).flatMap((path, index) => {
      return ['channel', 'body', 'highlight'].map((layer) => {
        const stream = path.cloneNode(true);
        stream.classList.add('diagram-flow', `diagram-flow-${layer}`);
        stream.classList.remove('diagram-path-muted', 'diagram-path-branch', 'diagram-path-contact');
        stream.removeAttribute('marker-end');
        stream.style.visibility = 'visible';
        stream.style.opacity = '0';
        stream.style.pointerEvents = 'none';
        stream.dataset.streamIndex = String(index);
        svg.appendChild(stream);
        return { path: stream, length: path.getTotalLength?.() || 1, layer, contact: !root.classList.contains('flow-visual') && index > 0 && index < 4 };
      });
    });
    return {
      root,
      svg,
      flow: root.classList.contains('flow-visual'),
      paths: Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, Array.isArray(value) ? value.map(info) : info(value)])),
      streams,
      marker: svg.querySelector(root.classList.contains('flow-visual') ? '.flow-marker' : '.ecmc-marker'),
      halo: svg.querySelector('.diagram-halo'),
      branchMarkers: [...svg.querySelectorAll('.flow-branch-marker')],
      contactMarkers: [...svg.querySelectorAll('.ecmc-contact-marker')],
      exitMarker: svg.querySelector('.ecmc-exit-marker')
    };
  };

  const buildMobileArtwork = () => {
    diagramRoots.forEach((root) => {
      const mobile = root.querySelector('.diagram-svg-mobile');
      if (!mobile || mobile.dataset.artworkReady) return;
      const isFlow = root.classList.contains('flow-visual');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'diagram-svg diagram-svg-mobile mobile-artwork');
      svg.setAttribute('viewBox', isFlow ? '0 0 360 500' : '0 0 360 560');
      svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
      const paths = isFlow ? [
        ['diagram-path-muted', 'M180 78 V166'], ['diagram-path-muted', 'M180 320 V368'],
        ['diagram-path-branch', 'M180 368 C180 385 120 389 72 412'], ['diagram-path-branch', 'M180 368 C180 386 180 397 180 412'], ['diagram-path-branch', 'M180 368 C180 385 240 389 288 412']
      ] : [
        ['diagram-path-muted', 'M180 72 V150'], ['diagram-path-contact', 'M180 150 C158 181 148 218 162 252 C174 284 168 320 180 350'], ['diagram-path-contact', 'M180 150 C180 212 180 286 180 350'], ['diagram-path-contact', 'M180 150 C202 181 212 218 198 252 C186 284 192 320 180 350'], ['diagram-path-muted', 'M180 350 V468']
      ];
      paths.forEach(([klass, d]) => { const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('class', `diagram-path ${klass}`); path.setAttribute('d', d); svg.appendChild(path); });
      root.insertBefore(svg, root.firstChild); mobile.dataset.artworkReady = 'true';
    });
  };
  buildMobileArtwork();
  const diagramModels = diagramRoots.map(prepareDiagram).filter(Boolean);
  const hideMarkers = (model) => {
    [model.marker, model.halo, ...model.branchMarkers, ...model.contactMarkers, model.exitMarker].filter(Boolean).forEach((marker) => {
      marker.style.opacity = 0;
    });
  };
  const renderFlow = (model, phase) => {
    hideMarkers(model);
    const elapsed = phase * 8000;
    const shimmer = .5 + Math.sin(phase * Math.PI * 2) * .08;
    model.streams.forEach((stream, index) => {
      const speed = stream.contact ? 14 : 25;
      const phaseOffset = stream.layer === 'highlight' ? 16 : 0;
      stream.path.style.strokeDashoffset = `${-((elapsed / 1000) * speed + phaseOffset)}px`;
      if (stream.layer === 'channel') {
        stream.path.style.opacity = stream.contact ? '.34' : '.38';
        stream.path.style.strokeDasharray = 'none';
      } else {
        stream.path.style.opacity = String((stream.contact ? (stream.layer === 'highlight' ? .78 : .62) : (stream.layer === 'highlight' ? .94 : .68)) * shimmer);
        stream.path.style.strokeWidth = stream.contact ? (stream.layer === 'highlight' ? '1.8' : '3.4') : (stream.layer === 'highlight' ? '1.8' : '3.2');
        stream.path.style.strokeDasharray = stream.layer === 'highlight' ? (stream.contact ? '28 18' : '32 18') : 'none';
      }
    });
    if (model.paths.internal?.path) {
      model.paths.internal.path.style.opacity = String(.1 + shimmer * .12);
      model.paths.internal.path.style.transform = `translateX(${(Math.sin(phase * Math.PI * 2) * 4).toFixed(1)}px)`;
    }
    const flowShift = Math.sin(phase * Math.PI * 2) * 14;
    model.root.querySelector('.flow-system')?.style.setProperty('--flow-reflection', `${flowShift.toFixed(1)}px`);
    model.root.querySelector('.flow-system-field')?.style.setProperty('--flow-field-shift', `${(flowShift * .45).toFixed(1)}px`);
  };

  const renderEcmc = (model, phase) => {
    hideMarkers(model);
    const elapsed = phase * 8000;
    model.streams.forEach((stream) => {
      const speed = stream.contact ? 14 : 28;
      const phaseOffset = stream.layer === 'highlight' ? 16 : 0;
      stream.path.style.strokeDashoffset = `${-((elapsed / 1000) * speed + phaseOffset)}px`;
      if (stream.layer === 'channel') {
        stream.path.style.opacity = stream.contact ? '.42' : '.38';
        stream.path.style.strokeDasharray = 'none';
      } else {
        stream.path.style.opacity = String(stream.contact ? (stream.layer === 'highlight' ? .82 : .68) : (stream.layer === 'highlight' ? .94 : .7));
        stream.path.style.strokeWidth = stream.contact ? (stream.layer === 'highlight' ? '1.8' : '3.5') : (stream.layer === 'highlight' ? '1.8' : '3.2');
        stream.path.style.strokeDasharray = stream.layer === 'highlight' ? (stream.contact ? '30 18' : '34 18') : 'none';
      }
    });
    const ecmcShift = Math.sin(phase * Math.PI * 2) * 18;
    model.root.querySelector('.ecmc-chamber')?.style.setProperty('--ecmc-reflection', `${ecmcShift.toFixed(1)}px`);
    model.root.querySelector('.ecmc-flow-field')?.style.setProperty('--ecmc-field-shift', `${(ecmcShift * .35).toFixed(1)}px`);
  };

  if (diagramModels.length) {
    if (diagramReducedMotion) {
      diagramModels.forEach((model) => {
        hideMarkers(model);
        if (model.paths.internal?.path) model.paths.internal.path.style.opacity = '.16';
      });
    } else {
      const visible = new Set();
      let timeline = 0;
      let lastTime = performance.now();
      let raf = 0;
      const tick = (now) => {
        if (!visible.size) { raf = 0; return; }
        timeline += Math.min(100, now - lastTime);
        lastTime = now;
        const phase = (timeline % 8000) / 8000;
        diagramModels.forEach((model) => model.flow ? renderFlow(model, phase) : renderEcmc(model, phase));
        raf = requestAnimationFrame(tick);
      };
      const wake = () => {
        lastTime = performance.now();
        if (!raf) raf = requestAnimationFrame(tick);
      };
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
          if (visible.size) wake();
        }, { threshold: .08, rootMargin: '0px 0px -10% 0px' });
        diagramModels.forEach((model) => observer.observe(model.root));
      } else {
        diagramModels.forEach((model) => visible.add(model.root));
        wake();
      }
    }
  }

  // The product responds to a precise pointer only. CSS owns the long ambient float;
  // JS supplies a bounded 2.5D offset without making the filter chase the cursor.
  const product = document.querySelector('#product-art');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (product && canHover && !reducedMotion) {
    let frame = 0;
    let target = { x: 0, y: 0, rx: 0, ry: 0 };
    let current = { ...target };
    let scrollFrame = 0;

    const render = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      current.rx += (target.rx - current.rx) * 0.08;
      current.ry += (target.ry - current.ry) * 0.08;
      product.style.setProperty('--pointer-x', `${current.x.toFixed(2)}px`);
      product.style.setProperty('--pointer-y', `${current.y.toFixed(2)}px`);
      product.style.setProperty('--pointer-rx', `${current.rx.toFixed(2)}deg`);
      product.style.setProperty('--pointer-ry', `${current.ry.toFixed(2)}deg`);
      frame = requestAnimationFrame(render);
    };

    product.addEventListener('pointermove', (event) => {
      const bounds = product.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      target = { x: x * 4, y: y * 3, rx: y * -1, ry: x * 1.25 };
    }, { passive: true });
    product.addEventListener('pointerleave', () => { target = { x: 0, y: 0, rx: 0, ry: 0 }; }, { passive: true });

    const updateScroll = () => {
      scrollFrame = 0;
      const drift = -Math.min(window.scrollY, 320) * 0.018;
      product.style.setProperty('--scroll-drift', `${drift.toFixed(2)}px`);
    };
    window.addEventListener('scroll', () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    }, { passive: true });
    frame = requestAnimationFrame(render);
  }
})();
