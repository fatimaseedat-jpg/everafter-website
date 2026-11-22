const mountedGalleries = new WeakMap();
const filterNames = new Map([
  ['all', 'All events'],
  ['weddings', 'Weddings'],
  ['celebrations', 'Celebrations'],
  ['corporate', 'Corporate'],
]);

export function mountGallery() {
  const gallery = document.querySelector('#gallery');
  if (!gallery) return () => {};
  if (mountedGalleries.has(gallery)) return mountedGalleries.get(gallery);

  const filters = [...gallery.querySelectorAll('[data-filter]')].filter((button) =>
    filterNames.has(button.dataset.filter),
  );
  const items = [...gallery.querySelectorAll('[data-gallery-item]')];
  const status = document.querySelector('#gallery-status');
  const dialog = document.querySelector('#gallery-dialog');
  const image = document.querySelector('#gallery-image');
  const caption = document.querySelector('#gallery-caption');
  const counter = document.querySelector('#gallery-counter');
  const previous = dialog?.querySelector('[data-gallery-prev]');
  const next = dialog?.querySelector('[data-gallery-next]');
  const canOpen = dialog && image && typeof dialog.showModal === 'function';
  const removers = [];
  let visibleItems = [];
  let activeIndex = -1;
  let originatingCard = null;
  let cleanedUp = false;

  function listen(element, type, handler) {
    if (!element) return;
    element.addEventListener(type, handler);
    removers.push(() => element.removeEventListener(type, handler));
  }

  function renderImage() {
    const item = visibleItems[activeIndex];
    if (!item || !image) return;
    const sourceImage = item.querySelector('img');
    const description = item.dataset.caption || '';
    const source = item.dataset.image || sourceImage?.getAttribute('src');
    if (source) image.setAttribute('src', source);
    else image.removeAttribute('src');
    image.alt = sourceImage?.getAttribute('alt') || description;
    if (caption) caption.textContent = description;
    if (counter) {
      counter.setAttribute('aria-live', 'polite');
      counter.setAttribute('aria-atomic', 'true');
      counter.textContent = `${activeIndex + 1} of ${visibleItems.length}`;
    }
    if (previous) previous.disabled = visibleItems.length < 2;
    if (next) next.disabled = visibleItems.length < 2;
  }

  function applyFilter(filter) {
    const activeItem = visibleItems[activeIndex];
    for (const item of items) {
      item.hidden = filter !== 'all' && item.dataset.category !== filter;
    }
    visibleItems = items.filter((item) => !item.hidden);
    for (const button of filters) {
      button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    }
    if (status) {
      status.setAttribute('role', 'status');
      status.setAttribute('aria-atomic', 'true');
      const count = visibleItems.length;
      status.textContent = `Showing ${count} ${count === 1 ? 'photo' : 'photos'} · ${filterNames.get(filter)}`;
    }
    if (dialog?.open) {
      if (!visibleItems.length) dialog.close();
      else {
        activeIndex = Math.max(0, visibleItems.indexOf(activeItem));
        renderImage();
      }
    }
  }

  function navigate(direction) {
    if (!dialog?.open || !visibleItems.length) return;
    activeIndex = (activeIndex + direction + visibleItems.length) % visibleItems.length;
    renderImage();
  }

  for (const button of filters) {
    listen(button, 'click', (event) => {
      event.preventDefault();
      applyFilter(button.dataset.filter);
    });
  }

  if (canOpen) {
    for (const item of items) {
      listen(item, 'click', (event) => {
        const index = visibleItems.indexOf(item);
        const sourceImage = item.querySelector('img');
        if (index < 0 || !(item.dataset.image || sourceImage?.getAttribute('src'))) return;
        event.preventDefault();
        originatingCard = item;
        activeIndex = index;
        renderImage();
        if (!dialog.open) {
          try {
            dialog.showModal();
          } catch {
            // A detached or otherwise unavailable dialog must not break filtering.
            originatingCard = null;
            activeIndex = -1;
          }
        }
      });
    }
    for (const button of dialog.querySelectorAll('[data-gallery-close]')) {
      listen(button, 'click', (event) => {
        event.preventDefault();
        dialog.close();
      });
    }
    listen(previous, 'click', (event) => {
      event.preventDefault();
      navigate(-1);
    });
    listen(next, 'click', (event) => {
      event.preventDefault();
      navigate(1);
    });
    listen(dialog, 'keydown', (event) => {
      if (!dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        navigate(event.key === 'ArrowLeft' ? -1 : 1);
      }
      // Escape retains the native dialog cancel and focus-trapping behavior.
    });
    listen(dialog, 'click', (event) => {
      if (event.target !== dialog || !dialog.open) return;
      const bounds = dialog.getBoundingClientRect();
      const outside = event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom;
      if (outside) dialog.close();
    });
    listen(dialog, 'close', () => {
      const focusTarget = originatingCard;
      originatingCard = null;
      activeIndex = -1;
      if (focusTarget?.isConnected && !focusTarget.hidden) focusTarget.focus();
      else filters.find((button) => button.getAttribute('aria-pressed') === 'true')?.focus();
    });
  }

  applyFilter(filters.find((button) => button.getAttribute('aria-pressed') === 'true')?.dataset.filter || 'all');

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    if (canOpen && dialog.open) {
      dialog.close();
      if (originatingCard?.isConnected && !originatingCard.hidden) originatingCard.focus();
    }
    for (const remove of removers) remove();
    mountedGalleries.delete(gallery);
  }

  mountedGalleries.set(gallery, cleanup);
  return cleanup;
}
