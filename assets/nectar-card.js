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

  // ==========================================================================
  // --- 2. INTERACTIVE WISHLIST SYSTEM (Real-time Storage, Drawer & Badges) ---
  // ==========================================================================
  const WishlistStore = {
    KEY: 'nectar_wishlist_items',

    getAll() {
      try {
        const data = localStorage.getItem(this.KEY);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}

      // Fallback check for legacy ID array
      try {
        const legacy = JSON.parse(localStorage.getItem('nectar_wishlist') || '[]');
        if (Array.isArray(legacy) && legacy.length > 0) {
          return legacy.map((id) => ({ id: String(id), title: 'Saved Item', price: '', url: '', img: '' }));
        }
      } catch (e) {}

      return [];
    },

    save(items) {
      try {
        localStorage.setItem(this.KEY, JSON.stringify(items));
        // Keep legacy key synced
        localStorage.setItem('nectar_wishlist', JSON.stringify(items.map((i) => i.id)));
      } catch (e) {}
    },

    has(id) {
      if (!id) return false;
      const strId = String(id);
      return this.getAll().some((item) => String(item.id) === strId);
    },

    toggle(item) {
      if (!item || !item.id) return false;
      const strId = String(item.id);
      let items = this.getAll();
      const index = items.findIndex((i) => String(i.id) === strId);

      let isAdded = false;
      if (index > -1) {
        items.splice(index, 1);
        isAdded = false;
      } else {
        items.unshift(item);
        isAdded = true;
      }

      this.save(items);
      this.syncUI();
      return isAdded;
    },

    remove(id) {
      if (!id) return;
      const strId = String(id);
      let items = this.getAll().filter((i) => String(i.id) !== strId);
      this.save(items);
      this.syncUI();
    },

    syncUI() {
      const items = this.getAll();
      const count = items.length;

      // 1. Update Header Wishlist Badge
      document.querySelectorAll('[data-nectar-wishlist-count]').forEach((badge) => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
      });

      // 2. Update Drawer Header Count
      document.querySelectorAll('[data-drawer-wishlist-count]').forEach((span) => {
        span.textContent = `(${count})`;
      });

      // 3. Sync all heart buttons on page
      document.querySelectorAll('[data-nectar-wishlist]').forEach((btn) => {
        const id = btn.getAttribute('data-product-id');
        if (id && this.has(id)) {
          btn.classList.add('is-active');
        } else {
          btn.classList.remove('is-active');
        }
      });

      // 4. Render Drawer Contents
      this.renderDrawer(items);
    },

    renderDrawer(items) {
      const container = document.querySelector('[data-wishlist-items-container]');
      const footer = document.querySelector('[data-wishlist-footer]');
      if (!container) return;

      if (!items || items.length === 0) {
        container.innerHTML = `
          <div class="nectar-wishlist-empty">
            <div class="nectar-wishlist-empty__icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
            <h3 class="nectar-wishlist-empty__title">Your wishlist is empty</h3>
            <p class="nectar-wishlist-empty__text">Explore our science-backed wellness formulas and save your favorites here.</p>
            <button type="button" class="nectar-wishlist-empty__btn" data-wishlist-close>Explore Products</button>
          </div>
        `;
        if (footer) footer.style.display = 'none';
        return;
      }

      if (footer) footer.style.display = 'flex';

      container.innerHTML = items
        .map((item) => {
          const imgSrc = item.img || 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';
          const safeTitle = (item.title || 'Product').replace(/"/g, '&quot;');
          return `
            <div class="nectar-wishlist-item" data-item-id="${item.id}">
              <a href="${item.url || '#'}" class="nectar-wishlist-item__img-link" aria-label="${safeTitle}">
                <img src="${imgSrc}" alt="${safeTitle}" class="nectar-wishlist-item__img" loading="lazy" width="72" height="72" />
              </a>
              <div class="nectar-wishlist-item__content">
                <a href="${item.url || '#'}" class="nectar-wishlist-item__title">${safeTitle}</a>
                <div class="nectar-wishlist-item__price">${item.price || ''}</div>
                <div class="nectar-wishlist-item__actions">
                  <button
                    type="button"
                    class="nectar-wishlist-item__atc"
                    data-wishlist-move-cart
                    data-variant-id="${item.variantId || ''}"
                    data-product-id="${item.id}"
                    data-product-url="${item.url || ''}"
                  >
                    Move to Cart
                  </button>
                  <button
                    type="button"
                    class="nectar-wishlist-item__remove"
                    data-wishlist-remove
                    data-product-id="${item.id}"
                    aria-label="Remove ${safeTitle} from wishlist"
                    title="Remove"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        })
        .join('');
    },

    openDrawer() {
      const drawer = document.getElementById('NectarWishlistDrawer');
      if (drawer) {
        this.syncUI();
        drawer.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.classList.add('overflow-hidden');
      }
    },

    closeDrawer() {
      const drawer = document.getElementById('NectarWishlistDrawer');
      if (drawer) {
        drawer.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('overflow-hidden');
      }
    }
  };

  // Global access
  window.NectarWishlist = WishlistStore;

  // Click on wishlist button (cards or PDP)
  document.addEventListener('click', function (e) {
    const wishlistBtn = e.target.closest('[data-nectar-wishlist]');
    if (!wishlistBtn) return;

    e.preventDefault();
    e.stopPropagation();

    const productId = wishlistBtn.getAttribute('data-product-id');
    if (!productId) return;

    // Gather metadata from button or surrounding card
    const card = wishlistBtn.closest('.nectar-card') || wishlistBtn.closest('.card-wrapper') || wishlistBtn.closest('.product');
    const title = wishlistBtn.getAttribute('data-product-title') || card?.querySelector('.nectar-card__title a, .card__heading a, .nectar-product-title')?.textContent?.trim() || 'Wellness Formula';
    const url = wishlistBtn.getAttribute('data-product-url') || card?.querySelector('.nectar-card__title a, .card__heading a')?.getAttribute('href') || window.location.pathname;
    const img = wishlistBtn.getAttribute('data-product-img') || card?.querySelector('.nectar-card__img, .card__media img, .nectar-gallery-main-image')?.getAttribute('src') || '';
    const price = wishlistBtn.getAttribute('data-product-price') || card?.querySelector('.nectar-card__price, .price-item--regular, .nectar-price-current')?.textContent?.trim() || '';
    const variantId = wishlistBtn.getAttribute('data-variant-id') || card?.querySelector('[name="id"]')?.value || '';

    const isAdded = WishlistStore.toggle({
      id: String(productId),
      title: title,
      url: url,
      img: img,
      price: price,
      variantId: variantId
    });

    // Provide subtle feedback
    wishlistBtn.style.transform = 'scale(1.25)';
    setTimeout(() => {
      wishlistBtn.style.transform = '';
    }, 200);

    // If added, open drawer to show it instantly!
    if (isAdded) {
      WishlistStore.openDrawer();
    }
  });

  // Header wishlist trigger
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('[data-nectar-wishlist-trigger]');
    if (trigger) {
      e.preventDefault();
      WishlistStore.openDrawer();
    }
  });

  // Close drawer trigger (overlay, close btn, continue btn)
  document.addEventListener('click', function (e) {
    const closeBtn = e.target.closest('[data-wishlist-close]');
    if (closeBtn) {
      e.preventDefault();
      WishlistStore.closeDrawer();
    }
  });

  // Remove item from drawer
  document.addEventListener('click', function (e) {
    const removeBtn = e.target.closest('[data-wishlist-remove]');
    if (removeBtn) {
      e.preventDefault();
      const id = removeBtn.getAttribute('data-product-id');
      if (id) WishlistStore.remove(id);
    }
  });

  // Move single item to cart from drawer
  document.addEventListener('click', function (e) {
    const moveBtn = e.target.closest('[data-wishlist-move-cart]');
    if (!moveBtn) return;

    e.preventDefault();
    const variantId = moveBtn.getAttribute('data-variant-id');
    const productId = moveBtn.getAttribute('data-product-id');
    const productUrl = moveBtn.getAttribute('data-product-url');

    if (!variantId) {
      if (productUrl) {
        window.location.href = productUrl;
      }
      return;
    }

    moveBtn.disabled = true;
    moveBtn.textContent = 'Adding...';

    fetch(window.Shopify?.routes?.root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(variantId), quantity: 1 })
    })
      .then((res) => res.json())
      .then((data) => {
        moveBtn.textContent = 'Added!';
        // Remove from wishlist
        if (productId) WishlistStore.remove(productId);
        // Refresh cart header & drawer
        refreshCartCount();
        const cartDrawer = document.querySelector('cart-drawer');
        if (cartDrawer) {
          WishlistStore.closeDrawer();
          fetch('/?section_id=cart-drawer')
            .then((r) => r.text())
            .then((html) => {
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              const newInner = doc.querySelector('#CartDrawer');
              if (newInner) {
                const curInner = cartDrawer.querySelector('#CartDrawer');
                if (curInner) curInner.innerHTML = newInner.innerHTML;
              }
              cartDrawer.open();
            })
            .catch(() => {
              window.location.href = '/cart';
            });
        }
      })
      .catch((err) => {
        console.error('Error adding to cart:', err);
        moveBtn.disabled = false;
        moveBtn.textContent = 'Move to Cart';
      });
  });

  // Move All to Cart
  document.addEventListener('click', function (e) {
    const addAllBtn = e.target.closest('[data-wishlist-add-all]');
    if (!addAllBtn) return;

    e.preventDefault();
    const items = WishlistStore.getAll();
    const validItems = items.filter((i) => i.variantId).map((i) => ({ id: Number(i.variantId), quantity: 1 }));

    if (validItems.length === 0) {
      alert('Please select variant options on the product pages.');
      return;
    }

    addAllBtn.disabled = true;
    addAllBtn.textContent = 'Adding All...';

    fetch(window.Shopify?.routes?.root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: validItems })
    })
      .then((res) => res.json())
      .then(() => {
        WishlistStore.save([]);
        WishlistStore.syncUI();
        refreshCartCount();
        WishlistStore.closeDrawer();
        const cartDrawer = document.querySelector('cart-drawer');
        if (cartDrawer) cartDrawer.open();
        else window.location.href = '/cart';
      })
      .catch((err) => {
        console.error('Error adding all to cart:', err);
        addAllBtn.disabled = false;
        addAllBtn.textContent = 'Move All to Cart';
      });
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const drawer = document.getElementById('NectarWishlistDrawer');
      if (drawer && drawer.classList.contains('is-open')) {
        WishlistStore.closeDrawer();
      }
    }
  });

  // Restore & sync on load
  document.addEventListener('DOMContentLoaded', function () {
    WishlistStore.syncUI();
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
