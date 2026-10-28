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

function initNectarDrawer() {
  const openBtn = document.querySelector('.nectar-header__kebab-btn');
  const closeBtn = document.querySelector('.nectar-drawer__close-btn');
  const backdrop = document.querySelector('.nectar-drawer-backdrop');
  const drawer = document.querySelector('.nectar-drawer');

  if (!openBtn || !drawer) return;

  function openDrawer() {
    drawer.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
      closeDrawer();
    }
  });
}

function initDrawerAccordions() {
  const toggleBtns = document.querySelectorAll('.nectar-drawer__toggle-btn');
  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const item = btn.closest('.nectar-drawer__item');
      if (!item) return;
      const content = item.querySelector('.nectar-drawer__subcontent');
      if (content) {
        const isOpen = content.classList.contains('is-open');
        content.classList.toggle('is-open', !isOpen);
        btn.classList.toggle('is-active', !isOpen);
      }
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
    const badge = document.querySelector('.nectar-header__cart-badge');
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
      const badge = document.querySelector('.nectar-header__cart-badge');
      if (badge) {
        badge.textContent = cart.item_count;
        badge.setAttribute('data-count', cart.item_count);
      }
    })
    .catch((err) => console.debug('Cart update fetch:', err));
}
