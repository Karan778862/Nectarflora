if (!customElements.get('nf-product')) {
  customElements.define('nf-product', class extends HTMLElement {
    connectedCallback() {
      if (this.ready) return;
      this.ready = true;
      this.variants = JSON.parse(this.querySelector('[data-nf-variants]')?.textContent || '[]');
      this.config = JSON.parse(this.querySelector('[data-nf-config]')?.textContent || '{}');
      this.form = this.querySelector('form');
      this.addEventListener('click', (event) => {
        const thumbnail = event.target.closest('[data-nf-thumbnail]');
        if (thumbnail) this.showMedia(thumbnail.dataset.nfThumbnail);
        const tab = event.target.closest('[data-nf-tab]');
        if (tab) this.showTab(tab);
      });
      this.addEventListener('keydown', (event) => {
        const tab = event.target.closest('[data-nf-tab]');
        if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const tabs = Array.from(this.querySelectorAll('[data-nf-tab]'));
        let index = tabs.indexOf(tab);
        if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = tabs.length - 1;
        else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        event.preventDefault(); this.showTab(tabs[index]); tabs[index].focus();
      });
      this.querySelector('[data-nf-variant]')?.addEventListener('change', () => this.updateVariant(true));
      this.form?.addEventListener('submit', (event) => this.submit(event));
      this.updateVariant(false);
    }
    showMedia(id) {
      this.querySelectorAll('[data-nf-media]').forEach((slide) => {
        slide.hidden = slide.dataset.nfMedia !== String(id);
        if (slide.hidden) slide.querySelectorAll('video').forEach((video) => video.pause());
      });
      this.querySelectorAll('[data-nf-thumbnail]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.nfThumbnail === String(id))));
    }
    showTab(active) {
      this.querySelectorAll('[data-nf-tab]').forEach((tab) => { const selected = tab === active; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; });
      this.querySelectorAll('[data-nf-panel]').forEach((panel) => panel.hidden = panel.dataset.nfPanel !== active.dataset.nfTab);
    }
    money(cents) {
      return new Intl.NumberFormat(document.documentElement.lang || 'en-IN', { style: 'currency', currency: this.config.currency || 'INR', minimumFractionDigits: Number(cents) % 100 === 0 ? 0 : 2 }).format(Number(cents) / 100);
    }
    updateVariant(changeUrl) {
      const variant = this.variants.find((item) => String(item.id) === this.querySelector('[data-nf-variant]')?.value);
      if (!variant) return;
      const price = this.querySelector('[data-nf-price]');
      if (price) price.textContent = this.money(variant.price);
      const discounted = variant.compare_at_price > variant.price;
      const compare = this.querySelector('[data-nf-compare]');
      if (compare) { compare.hidden = !discounted; compare.textContent = discounted ? this.money(variant.compare_at_price) : ''; }
      const saving = this.querySelector('[data-nf-saving]');
      const discount = this.querySelector('[data-nf-discount]');
      const percentage = discounted ? Math.round((variant.compare_at_price - variant.price) * 100 / variant.compare_at_price) : 0;
      if (saving) saving.textContent = discounted ? percentage + '% off' : '';
      if (discount) { discount.hidden = !discounted; discount.textContent = percentage + '% OFF'; }
      this.querySelectorAll('[data-nf-bundle-price]').forEach((item) => item.textContent = this.money(variant.price * Number(item.dataset.nfBundlePrice)));
      this.querySelectorAll('[data-nf-add], [data-nf-buy]').forEach((button) => button.disabled = !variant.available);
      const label = this.querySelector('[data-nf-add] span');
      if (label) label.textContent = variant.available ? this.config.add : this.config.soldOut;
      if (variant.featured_media) this.showMedia(variant.featured_media.id);
      if (changeUrl) { const url = new URL(window.location.href); url.searchParams.set('variant', variant.id); history.replaceState({}, '', url); }
    }
    async submit(event) {
      event.preventDefault();
      if (this.busy) return;
      const buyNow = event.submitter?.hasAttribute('data-nf-buy');
      const error = this.querySelector('[data-nf-error]');
      const addLabel = this.querySelector('[data-nf-add] span');
      const root = window.Shopify?.routes?.root || '/';
      this.busy = true;
      if (error) error.textContent = '';
      this.querySelectorAll('[data-nf-add], [data-nf-buy]').forEach((button) => button.disabled = true);
      if (addLabel) addLabel.textContent = this.config.adding;
      try {
        const data = new FormData(this.form);
        data.append('sections', 'cart-drawer,cart-icon-bubble');
        data.append('sections_url', window.location.pathname);
        const response = await fetch(root + 'cart/add.js', { method: 'POST', headers: { Accept: 'application/json' }, body: data });
        const result = await response.json();
        if (!response.ok || result.status) throw new Error(result.description || result.message || this.config.error);
        if (buyNow) { window.location.assign(root + 'checkout'); return; }
        const drawer = document.querySelector('cart-drawer');
        if (drawer && typeof drawer.renderContents === 'function' && result.sections?.['cart-drawer']) { drawer.classList.remove('is-empty'); drawer.renderContents(result); }
        document.dispatchEvent(new CustomEvent('cart:updated', {detail:{item:result}}));
        if (addLabel) addLabel.textContent = this.config.added;
      } catch (exception) {
        if (error) error.textContent = exception.message || this.config.error;
      } finally {
        this.busy = false;
        this.updateVariant(false);
      }
    }
  });
}
