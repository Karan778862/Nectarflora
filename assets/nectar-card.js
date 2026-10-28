/**
 * Nectarflora Universal Card & Carousel Interactions
 * - Super-fast AJAX Add to Cart
 * - Wishlist LocalStorage Toggle
 * - Carousel Slider Navigation
 * - Category Tabs Switcher
 */

(function () {
  'use strict';

  // --- 1. AJAX ADD TO CART ---
  document.addEventListener('click', function (e) {
    const atcBtn = e.target.closest('[data-nectar-quick-add]');
    if (!atcBtn || atcBtn.disabled || atcBtn.classList.contains('is-loading')) return;

    e.preventDefault();
    e.stopPropagation();

    const variantId = atcBtn.getAttribute('data-variant-id');
    if (!variantId) {
      console.warn('No variant ID found on button');
      return;
    }

    const originalHTML = atcBtn.innerHTML;

    // Show instant loading state
    atcBtn.classList.add('is-loading');
    atcBtn.innerHTML = `
      <svg class="nectar-card__spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      <span>Adding...</span>
    `;

    const rootUrl = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';
    const postData = {
      id: parseInt(variantId, 10),
      quantity: 1,
      sections: 'cart-icon-bubble,cart-drawer'
    };

    fetch(rootUrl + 'cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(postData)
    })
      .then(async function (response) {
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.description || 'Failed to add item to cart');
        }
        return response.json();
      })
      .then(function (data) {
        // Success state
        atcBtn.classList.remove('is-loading');
        atcBtn.classList.add('is-added');
        atcBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Added!</span>
        `;

        // Update Cart Badges across header
        updateCartBadges(data);

        // Update Cart Drawer if present
        const cartDrawer = document.querySelector('cart-drawer');
        if (cartDrawer) {
          if (data.sections && data.sections['cart-drawer']) {
            const drawerInner = cartDrawer.querySelector('#CartDrawer');
            if (drawerInner) {
              const parser = new DOMParser();
              const parsedDoc = parser.parseFromString(data.sections['cart-drawer'], 'text/html');
              const newDrawer = parsedDoc.querySelector('#CartDrawer');
              if (newDrawer) {
                drawerInner.innerHTML = newDrawer.innerHTML;
              }
            }
          }
          if (typeof cartDrawer.open === 'function') {
            cartDrawer.open();
          }
        }

        // Reset button after 1.8 seconds
        setTimeout(function () {
          atcBtn.classList.remove('is-added');
          atcBtn.innerHTML = originalHTML;
        }, 1800);
      })
      .catch(function (error) {
        console.error('Nectar Add to Cart error:', error);
        atcBtn.classList.remove('is-loading');
        atcBtn.innerHTML = `<span>Out of Stock</span>`;
        setTimeout(function () {
          atcBtn.innerHTML = originalHTML;
        }, 2000);
      });
  });

  function updateCartBadges(data) {
    const rootUrl = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';
    fetch(rootUrl + 'cart.js')
      .then((r) => r.json())
      .then((cart) => {
        const count = cart.item_count;
        document.querySelectorAll('.nectar-header__cart-badge').forEach((badge) => {
          badge.textContent = count;
          badge.setAttribute('data-count', count);
          badge.classList.remove('badge-bounce');
          void badge.offsetWidth; // trigger reflow
          badge.classList.add('badge-bounce');
        });

        // Also update standard Dawn cart bubble if present
        const bubble = document.querySelector('#cart-icon-bubble');
        if (bubble && !bubble.querySelector('.nectar-header__cart-badge')) {
          const countSpan = bubble.querySelector('.cart-count-bubble');
          if (countSpan) countSpan.textContent = count;
        }
      })
      .catch((e) => console.error('Error fetching cart:', e));
  }

  // --- 2. WISHLIST TOGGLE ---
  document.addEventListener('click', function (e) {
    const wishlistBtn = e.target.closest('[data-nectar-wishlist]');
    if (!wishlistBtn) return;

    e.preventDefault();
    e.stopPropagation();

    const productId = wishlistBtn.getAttribute('data-product-id');
    let wishlist = [];
    try {
      wishlist = JSON.parse(localStorage.getItem('nectar_wishlist') || '[]');
    } catch (err) {
      wishlist = [];
    }

    const index = wishlist.indexOf(productId);
    if (index > -1) {
      wishlist.splice(index, 1);
      wishlistBtn.classList.remove('is-active');
    } else {
      if (productId) wishlist.push(productId);
      wishlistBtn.classList.add('is-active');
    }

    try {
      localStorage.setItem('nectar_wishlist', JSON.stringify(wishlist));
    } catch (err) {}
  });

  // Restore wishlist states on page load
  document.addEventListener('DOMContentLoaded', function () {
    try {
      const wishlist = JSON.parse(localStorage.getItem('nectar_wishlist') || '[]');
      if (Array.isArray(wishlist)) {
        wishlist.forEach((id) => {
          document.querySelectorAll(`[data-nectar-wishlist][data-product-id="${id}"]`).forEach((btn) => {
            btn.classList.add('is-active');
          });
        });
      }
    } catch (err) {}
  });

  // --- 3. CAROUSEL ARROWS ---
  document.addEventListener('click', function (e) {
    const prevBtn = e.target.closest('[data-nectar-slider-prev]');
    if (prevBtn) {
      e.preventDefault();
      const wrapper = prevBtn.closest('.nectar-carousel-wrapper');
      if (wrapper) {
        const track = wrapper.querySelector('.nectar-carousel-track');
        if (track) {
          const scrollDist = track.offsetWidth * 0.75;
          track.scrollBy({ left: -scrollDist, behavior: 'smooth' });
        }
      }
      return;
    }

    const nextBtn = e.target.closest('[data-nectar-slider-next]');
    if (nextBtn) {
      e.preventDefault();
      const wrapper = nextBtn.closest('.nectar-carousel-wrapper');
      if (wrapper) {
        const track = wrapper.querySelector('.nectar-carousel-track');
        if (track) {
          const scrollDist = track.offsetWidth * 0.75;
          track.scrollBy({ left: scrollDist, behavior: 'smooth' });
        }
      }
      return;
    }
  });

  // --- 4. CATEGORY TABS SWITCHER ---
  document.addEventListener('click', function (e) {
    const tab = e.target.closest('[data-nectar-tab]');
    if (!tab) return;

    e.preventDefault();
    const targetId = tab.getAttribute('data-target');
    const container = tab.closest('.nectar-products-section');
    if (!container || !targetId) return;

    // Set active tab
    container.querySelectorAll('[data-nectar-tab]').forEach((t) => t.classList.remove('is-active'));
    tab.classList.add('is-active');

    // Switch panels
    container.querySelectorAll('.nectar-cat-panel').forEach((panel) => {
      if (panel.id === targetId) {
        panel.classList.add('is-active');
      } else {
        panel.classList.remove('is-active');
      }
    });
  });
})();
