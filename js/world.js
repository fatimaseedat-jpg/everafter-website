const chapterNames = ['Our world', 'Weddings', 'Celebrations', 'Corporate occasions'];
const clamp = (value) => Math.max(0, Math.min(1, value));

export async function mountCelebrationWorld(section) {
  const stage = section?.querySelector('.world-stage');
  const host = section?.querySelector('.world-canvas');
  if (!stage || !host) return () => {};

  const chapters = [...section.querySelectorAll('[data-world-chapter]')];
  const buttons = [...section.querySelectorAll('[data-world-jump]')];
  const progressFill = section.querySelector('#world-progress');
  const status = section.querySelector('#world-status');
  const header = document.querySelector('.site-header');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phone = window.matchMedia('(max-width: 700px)');
  let renderer;
  let world;
  let observer;
  let disposed = false;
  let suspended = false;
  let ready = false;
  let motionAllowed = false;
  let visible = false;
  let activeChapter = 0;
  let targetProgress = 0;
  let currentProgress = 0;
  let width = 0;
  let height = 0;
  let pixelRatio = 0;
  let geometry;
  let dirty = true;
  let frame = 0;
  let lastFrameTime = 0;

  function selectChapter(index) {
    for (const chapter of chapters) {
      const active = Number(chapter.dataset.worldChapter) === index;
      chapter.hidden = !active;
      chapter.classList.toggle('is-active', active);
    }
    for (const button of buttons) {
      if (Number(button.dataset.worldJump) === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    if (index !== activeChapter && status) status.textContent = chapterNames[index];
    activeChapter = index;
  }

  function updateProgress(progress) {
    targetProgress = clamp(progress);
    section.style.setProperty('--world-progress', String(targetProgress));
    if (progressFill) progressFill.style.transform = `scaleX(${targetProgress})`;
    selectChapter(Math.round(targetProgress * 3));
  }

  function measure() {
    const rect = section.getBoundingClientRect();
    const headerHeight = header?.getBoundingClientRect().height || 0;
    return {
      top: rect.top + window.scrollY,
      bottom: rect.bottom + window.scrollY,
      scroll: window.scrollY,
      headerHeight,
      track: Math.max(0, rect.height - stage.getBoundingClientRect().height),
      visible: rect.bottom > headerHeight && rect.top < window.innerHeight,
    };
  }

  function preserveFollowingContent(previous, next) {
    if (!previous || previous.bottom > previous.scroll + previous.headerHeight + 1) return;
    const delta = next.bottom - previous.bottom;
    if (Math.abs(delta) > 0.5) {
      // Use the saved position: native scroll anchoring may already have applied this delta.
      window.scrollTo({ top: Math.max(0, previous.scroll + delta), behavior: 'instant' });
    }
  }

  function stopFrame() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastFrameTime = 0;
  }

  function requestFrame() {
    if (!frame && !disposed && ready && visible && !suspended && !document.hidden) {
      frame = requestAnimationFrame(animate);
    }
  }

  function syncScroll() {
    if (disposed || !ready) return;
    geometry = measure();
    visible = geometry.visible;
    if (motionAllowed) {
      updateProgress(
        geometry.track
          ? (window.scrollY - geometry.top + geometry.headerHeight) / geometry.track
          : 0,
      );
    }
    if (!visible) {
      stopFrame();
      currentProgress = targetProgress;
      dirty = true;
      return;
    }
    if (dirty || Math.abs(currentProgress - targetProgress) > 0.0001) requestFrame();
  }

  function resizeRenderer() {
    const bounds = host.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(bounds.width));
    const nextHeight = Math.max(1, Math.round(bounds.height));
    const nextRatio = Math.min(window.devicePixelRatio || 1, phone.matches ? 1.5 : 1.75);
    if (nextWidth === width && nextHeight === height && nextRatio === pixelRatio) return;
    width = nextWidth;
    height = nextHeight;
    pixelRatio = nextRatio;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    dirty = true;
  }

  function refreshLayout() {
    if (disposed || !ready) return;
    try {
      const previous = geometry;
      const wasInside =
        previous &&
        previous.scroll >= previous.top - previous.headerHeight - 1 &&
        previous.scroll < previous.bottom - previous.headerHeight - 1;
      const previousMotion = motionAllowed;
      const availableHeight = window.innerHeight - (header?.getBoundingClientRect().height || 0);
      const nextMotion =
        !reducedMotion.matches &&
        window.innerHeight >= 600 &&
        stage.getBoundingClientRect().height <= availableHeight + 1;
      if (motionAllowed !== nextMotion) {
        motionAllowed = nextMotion;
        if (!motionAllowed) {
          updateProgress(activeChapter / 3);
          currentProgress = targetProgress;
        }
        dirty = true;
      }
      section.classList.toggle('world-enhanced', motionAllowed);
      section.classList.toggle('world-static', !motionAllowed);
      const next = measure();
      if (wasInside && previousMotion !== motionAllowed) {
        const progressOffset = motionAllowed ? next.track * targetProgress : 0;
        window.scrollTo({
          top: Math.max(0, next.top - next.headerHeight + progressOffset),
          behavior: 'instant',
        });
      } else {
        preserveFollowingContent(previous, next);
      }
      resizeRenderer();
      syncScroll();
    } catch {
      cleanup();
    }
  }

  function draw() {
    if (renderer.getContext().isContextLost()) {
      cleanup();
      return false;
    }
    world.renderState(currentProgress, width / height);
    renderer.render(world.scene, world.camera);
    dirty = false;
    return true;
  }

  function animate(time) {
    frame = 0;
    if (disposed || suspended || !visible || document.hidden) return;
    try {
      const delta = lastFrameTime ? Math.min(64, time - lastFrameTime) : 16;
      lastFrameTime = time;
      if (motionAllowed) {
        currentProgress += (targetProgress - currentProgress) * (1 - Math.exp(-delta * 0.012));
      } else {
        currentProgress = targetProgress;
      }
      const moving = Math.abs(targetProgress - currentProgress) > 0.0001;
      if (!moving) currentProgress = targetProgress;
      if (!draw()) return;
      if (moving) requestFrame();
      else lastFrameTime = 0;
    } catch {
      cleanup();
    }
  }

  function onJump(event) {
    const index = Number(event.currentTarget.dataset.worldJump);
    if (!Number.isInteger(index) || index < 0 || index > 3 || disposed) return;
    if (!motionAllowed) {
      updateProgress(index / 3);
      currentProgress = targetProgress;
      dirty = true;
      requestFrame();
      return;
    }
    const bounds = measure();
    window.scrollTo({
      top: Math.max(0, bounds.top - bounds.headerHeight + (bounds.track * index) / 3),
      behavior: 'smooth',
    });
  }

  function onContextLost(event) {
    event.preventDefault();
    cleanup();
  }

  function onVisibilityChange() {
    if (document.hidden) stopFrame();
    else refreshLayout();
  }

  function onPageHide(event) {
    if (event.persisted) {
      suspended = true;
      stopFrame();
    } else cleanup(false);
  }

  function onPageShow(event) {
    if (!event.persisted || disposed) return;
    suspended = false;
    dirty = true;
    refreshLayout();
  }

  function cleanup(preservePosition = true) {
    if (disposed) return;
    disposed = true;
    stopFrame();
    observer?.disconnect();
    window.removeEventListener('scroll', syncScroll);
    window.removeEventListener('resize', refreshLayout);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    reducedMotion.removeEventListener('change', refreshLayout);
    phone.removeEventListener('change', refreshLayout);
    for (const button of buttons) button.removeEventListener('click', onJump);
    const previous = ready ? measure() : null;
    const wasInside =
      previous &&
      window.scrollY >= previous.top - previous.headerHeight - 1 &&
      window.scrollY < previous.bottom - previous.headerHeight - 1;
    section.classList.remove('world-ready', 'world-enhanced', 'world-static');
    updateProgress(0);
    if (preservePosition && wasInside) {
      window.scrollTo({
        top: Math.max(0, previous.top - previous.headerHeight),
        behavior: 'instant',
      });
    } else if (preservePosition) {
      preserveFollowingContent(previous, measure());
    }
    if (renderer) {
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.remove();
    }
    try {
      world?.dispose();
    } finally {
      renderer?.dispose();
      renderer?.forceContextLoss();
    }
  }

  // Register before imports so leaving the page during module loading cannot mount a late canvas.
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);

  try {
    const [THREE, { createCelebrationScene }] = await Promise.all([
      import('../assets/vendor/three.module.min.js'),
      import('./celebration-scene.js'),
    ]);
    if (disposed) return cleanup;
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    world = createCelebrationScene();
    host.append(canvas);
    resizeRenderer();
    if (!draw()) return cleanup;
    geometry = measure();
    updateProgress(0);
    ready = true;
    section.classList.add('world-ready');
    for (const button of buttons) button.addEventListener('click', onJump);
    window.addEventListener('scroll', syncScroll, { passive: true });
    window.addEventListener('resize', refreshLayout, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    reducedMotion.addEventListener('change', refreshLayout);
    phone.addEventListener('change', refreshLayout);
    observer = new ResizeObserver(refreshLayout);
    observer.observe(host);
    if (header) observer.observe(header);
    refreshLayout();
  } catch {
    cleanup();
  }

  return cleanup;
}
