/**
 * Nectarflora Modern Header JavaScript
 * High performance, zero dependencies vanilla JS
 */

document.addEventListener('DOMContentLoaded', () => {
  initNectarDrawer();
  initDrawerAccordions();
  initNectarSearch();
  initCartListeners();
});

function initNectarDrawer(root = document) {
  const openBtn = root.querySelector('.nectar-header__kebab-btn');
  const drawer = root.querySelector('.nectar-drawer');
  const backdrop = root.querySelector('.nectar-drawer-backdrop');
  if (!openBtn || !drawer || openBtn.dataset.nfDrawerReady) return;
  openBtn.dataset.nfDrawerReady = 'true';
  document.querySelectorAll('[data-nf-menu-portal]').forEach((node) => {
    if (node !== drawer && node !== backdrop) node.remove();
  });
  [backdrop, drawer].filter(Boolean).forEach((node) => {
    node.dataset.nfMenuPortal = 'true';
    document.body.appendChild(node);
  });
  const closeBtn = drawer.querySelector('.nectar-drawer__close-btn');
  drawer.id = 'NectarMenuDrawer';
  drawer.inert = true;
  drawer.setAttribute('aria-hidden', 'true');
  openBtn.setAttribute('aria-controls', drawer.id);
  openBtn.setAttribute('aria-expanded', 'false');
  let previousOverflow = '';
  function closeDrawer() {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    drawer.inert = true;
    drawer.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = previousOverflow;
    openBtn.focus({ preventScroll: true });
  }
  function openDrawer() {
    previousOverflow = document.body.style.overflow;
    drawer.inert = false;
    drawer.setAttribute('aria-hidden', 'false');
    drawer.classList.add('is-open');
    backdrop?.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    const content = drawer.querySelector('.nectar-drawer__content');
    if (content) content.scrollTop = 0;
    closeBtn?.focus({ preventScroll: true });
  }
  openBtn.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);
  drawer.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); }
    if (event.key !== 'Tab') return;
    const items = Array.from(drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')).filter((node) => node.getClientRects().length);
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
}
document.addEventListener('shopify:section:load', (event) => {
  initNectarDrawer(event.target);
  initDrawerAccordions();
});

function initDrawerAccordions() {
  const accordionItems = document.querySelectorAll('.nectar-drawer__item.has-accordion');
  accordionItems.forEach((item) => {
    const trigger = item.querySelector('.nectar-drawer__link-row');
    if (!trigger || trigger.dataset.nfAccordionReady) return;
    trigger.dataset.nfAccordionReady = 'true';
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      item.classList.toggle('is-expanded');
    });
  });
}

function initNectarSearch() {
  const searchInput = document.querySelector('.nectar-header__search-input');
  const resetBtn = document.querySelector('.nectar-header__search-reset');

  if (!searchInput || !resetBtn) return;

  function toggleReset() {
    if (searchInput.value.trim().length > 0) {
      resetBtn.classList.remove('hidden');
    } else {
      resetBtn.classList.add('hidden');
    }
  }

  searchInput.addEventListener('input', toggleReset);

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    toggleReset();
    searchInput.focus();
  });
}

function initCartListeners() {
  // Listen for Shopify cart update events across Dawn theme
  document.addEventListener('cart:updated', updateCartBadge);
  document.addEventListener('cart:change', updateCartBadge);

  // Monitor DOM mutations in case Dawn re-renders #cart-icon-bubble
  const observer = new MutationObserver(() => {
    const bubble = document.querySelector('#cart-icon-bubble .cart-count-bubble span');
    const badge = document.querySelector('.nectar-header__cart-badge:not(.nectar-wishlist-badge)');
    if (bubble && badge) {
      const count = bubble.textContent.trim();
      badge.textContent = count;
      badge.setAttribute('data-count', count);
    }
  });

  const cartBubble = document.querySelector('#cart-icon-bubble');
  if (cartBubble) {
    observer.observe(cartBubble, { childList: true, subtree: true, characterData: true });
  }
}

function updateCartBadge() {
  const root = window.Shopify?.routes?.root || '/';
  fetch(root + 'cart.js')
    .then((res) => res.json())
    .then((cart) => {
      const badge = document.querySelector('.nectar-header__cart-badge:not(.nectar-wishlist-badge)');
      if (badge) {
        badge.textContent = cart.item_count;
        badge.setAttribute('data-count', cart.item_count);
      }
    })
    .catch((err) => console.debug('Cart update fetch:', err));
}

function nfMeasureStickyHeader() {
  const header = document.querySelector('.nectar-header-wrapper.is-sticky');
  const section = header?.closest('.shopify-section-group-header-group');
  document.documentElement.style.setProperty('--nf-sticky-header-height', (section ? Math.ceil(section.getBoundingClientRect().height) : 0) + 'px');
}
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.nectar-header-wrapper');
  if (header && window.ResizeObserver) new ResizeObserver(nfMeasureStickyHeader).observe(header);
  nfMeasureStickyHeader();
});
window.addEventListener('resize', nfMeasureStickyHeader, { passive: true });
document.addEventListener('shopify:section:load', nfMeasureStickyHeader);
