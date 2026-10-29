/* ==========================================================================
   NECTARFLORA PRODUCT DETAIL PAGE INTERACTIVITY
   ========================================================================== */

(function () {
  function initNectarProductInteractions() {
    // ------------------------------------------------------------------------
    // 1. Tabs Switching
    // ------------------------------------------------------------------------
    const tabNavs = document.querySelectorAll('.nectar-tabs-nav');
    tabNavs.forEach((nav) => {
      const tabBtns = nav.querySelectorAll('.nectar-tab-btn');
      const wrap = nav.closest('.nectar-product-tabs-wrap');
      if (!wrap) return;

      tabBtns.forEach((btn) => {
        btn.addEventListener('click', function () {
          const targetId = this.getAttribute('data-tab-target');
          if (!targetId) return;

          tabBtns.forEach((b) => {
            b.classList.remove('is-active');
            b.setAttribute('aria-selected', 'false');
          });
          this.classList.add('is-active');
          this.setAttribute('aria-selected', 'true');

          const panels = wrap.querySelectorAll('.nectar-tab-panel');
          panels.forEach((p) => p.classList.remove('is-active'));

          const targetPanel = wrap.querySelector(`#${targetId}`);
          if (targetPanel) {
            targetPanel.classList.add('is-active');
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // 2. View Lab Report Button -> Switch to Lab Reports Tab
    // ------------------------------------------------------------------------
    const labReportBtns = document.querySelectorAll('[data-view-lab-report]');
    labReportBtns.forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const tabBtn = document.querySelector('[data-tab-target^="lab-"]');
        if (tabBtn) {
          tabBtn.click();
          tabBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // ------------------------------------------------------------------------
    // 3. Coupon Click to Copy
    // ------------------------------------------------------------------------
    const couponBadges = document.querySelectorAll('.nectar-offer-badge');
    couponBadges.forEach((badge) => {
      badge.addEventListener('click', function () {
        const code = this.getAttribute('data-coupon') || this.innerText;
        navigator.clipboard.writeText(code).then(() => {
          const original = this.innerText;
          this.innerText = 'Copied! ✓';
          this.style.backgroundColor = '#16A34A';
          setTimeout(() => {
            this.innerText = original;
            this.style.backgroundColor = '';
          }, 2000);
        });
      });
    });

    // ------------------------------------------------------------------------
    // 4. Bundle Selector (Quantity Breaks)
    // ------------------------------------------------------------------------
    const bundleWraps = document.querySelectorAll('.nectar-bundle-selector');
    bundleWraps.forEach((wrap) => {
      const cards = wrap.querySelectorAll('.nectar-bundle-card');
      const qtyInput = document.querySelector('[data-nectar-quantity-input]');
      const priceDisplay = document.querySelector('[data-price-current]');

      cards.forEach((card) => {
        card.addEventListener('click', function () {
          cards.forEach((c) => c.classList.remove('is-active'));
          this.classList.add('is-active');

          const qty = parseInt(this.getAttribute('data-qty') || '1', 10);
          if (qtyInput) {
            qtyInput.value = qty;
          }

          // Optional: update price display if price data attribute is present
          const priceRaw = this.getAttribute('data-price');
          if (priceRaw && priceDisplay) {
            const num = (parseInt(priceRaw, 10) / 100).toLocaleString('en-IN', {
              maximumFractionDigits: 2,
            });
            priceDisplay.innerText = `₹${num}`;
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // 5. Add to Cart (Fast AJAX)
    // ------------------------------------------------------------------------
    const addToCartBtns = document.querySelectorAll('[data-nectar-add-to-cart]');
    addToCartBtns.forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const variantInput = document.querySelector('[data-nectar-variant-id]');
        const qtyInput = document.querySelector('[data-nectar-quantity-input]');
        const variantId = variantInput ? variantInput.value : null;
        const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;

        if (!variantId) return;

        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span>Adding...</span>';
        btn.disabled = true;

        fetch(window.Shopify ? `${window.Shopify.routes.root}cart/add.js` : '/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            id: variantId,
            quantity: qty,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            btn.innerHTML = '<span>Added to Cart! ✓</span>';
            btn.style.backgroundColor = '#0D3B2B';
            btn.style.color = '#FFFFFF';

            // Refresh cart bubble
            fetch(window.Shopify ? `${window.Shopify.routes.root}cart.js` : '/cart.js')
              .then((res) => res.json())
              .then((cart) => {
                const bubble = document.querySelector('.cart-count-bubble');
                if (bubble) {
                  bubble.textContent = cart.item_count;
                  bubble.classList.remove('hidden');
                }
                // Dispatch standard cart event
                document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
              });

            setTimeout(() => {
              btn.innerHTML = originalHTML;
              btn.style.backgroundColor = '';
              btn.style.color = '';
              btn.disabled = false;
            }, 2500);
          })
          .catch((err) => {
            console.error('Error adding to cart:', err);
            btn.innerHTML = originalHTML;
            btn.disabled = false;
          });
      });
    });

    // ------------------------------------------------------------------------
    // 6. BUY NOW (Instant Checkout)
    // ------------------------------------------------------------------------
    const buyNowBtns = document.querySelectorAll('[data-nectar-buy-now]');
    buyNowBtns.forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const variantInput = document.querySelector('[data-nectar-variant-id]');
        const qtyInput = document.querySelector('[data-nectar-quantity-input]');
        const variantId = variantInput ? variantInput.value : null;
        const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;

        if (!variantId) return;

        btn.disabled = true;
        btn.style.opacity = '0.7';

        fetch(window.Shopify ? `${window.Shopify.routes.root}cart/add.js` : '/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            id: variantId,
            quantity: qty,
          }),
        })
          .then(() => {
            window.location.href = '/checkout';
          })
          .catch((err) => {
            console.error('Error during Buy Now:', err);
            window.location.href = `/cart/${variantId}:${qty}`;
          });
      });
    });

    // ------------------------------------------------------------------------
    // 7. FAQ Accordion Expand / Collapse
    // ------------------------------------------------------------------------
    const faqContainers = document.querySelectorAll('[data-nectar-accordion]');
    faqContainers.forEach((container) => {
      const questions = container.querySelectorAll('.nectar-faq-question');
      questions.forEach((btn) => {
        btn.addEventListener('click', function () {
          const item = this.closest('.nectar-faq-item');
          if (!item) return;
          const isOpen = item.classList.contains('is-open');

          container.querySelectorAll('.nectar-faq-item').forEach((other) => {
            other.classList.remove('is-open');
            const toggle = other.querySelector('.nectar-faq-toggle-icon');
            if (toggle) toggle.textContent = '+';
            const q = other.querySelector('.nectar-faq-question');
            if (q) q.setAttribute('aria-expanded', 'false');
          });

          if (!isOpen) {
            item.classList.add('is-open');
            const toggle = item.querySelector('.nectar-faq-toggle-icon');
            if (toggle) toggle.textContent = '−';
            this.setAttribute('aria-expanded', 'true');
          }
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNectarProductInteractions);
  } else {
    initNectarProductInteractions();
  }

  document.addEventListener('shopify:section:load', initNectarProductInteractions);
})();
