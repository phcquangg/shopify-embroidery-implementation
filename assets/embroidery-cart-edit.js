/**
 * EmbroideryCartEdit Web Component
 *
 * Renders a checkbox-row toggle per cart item for embroidery-eligible products.
 *
 * States:
 *   - has_embroidery=true:  row has .is-checked + bg-neutral-100, checked icon, summary visible
 *   - has_embroidery=false: plain white row, unchecked icon
 *
 * Interactions:
 *   - Click row (not checkbox): open edit panel
 *   - Click checkbox when checked: optimistic uncheck → removeEmbroidery()
 *   - Click checkbox when unchecked: open edit panel
 *   - Save flow: remove item (qty=0) → re-add with new properties → renderContents()
 *   - Remove flow: cart/change.js with explicit empty properties → renderContents()
 *
 * @element embroidery-cart-edit
 * @extends HTMLElement
 */

if (!customElements.get('embroidery-cart-edit')) {
  class EmbroideryCartEdit extends HTMLElement {
    /** @type {HTMLElement | null} */ row;
    /** @type {HTMLElement | null} */ checkboxBtn;
    /** @type {HTMLElement | null} */ panel;
    /** @type {HTMLButtonElement | null} */ saveBtn;
    /** @type {HTMLButtonElement | null} */ cancelBtn;
    /** @type {HTMLButtonElement | null} */ removeBtn;
    /** @type {HTMLElement | null} */ priceLabel;
    /** @type {AbortController} */ _ac;

    connectedCallback() {
      this.row         = this.querySelector('.embroidery-cart-row');
      this.checkboxBtn = this.querySelector('.embroidery-checkbox-btn');
      this.panel       = this.querySelector('.embroidery-edit-panel');
      this.saveBtn     = this.querySelector('.embroidery-edit-panel__save');
      this.cancelBtn   = this.querySelector('.embroidery-edit-panel__cancel');
      this.removeBtn   = this.querySelector('.embroidery-edit-panel__remove');

      this._ac = new AbortController();
      const { signal } = this._ac;

      // Row click → open panel (checkbox click is handled separately below)
      this.row?.addEventListener('click', () => this.openPanel(), { signal });
      this.row?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openPanel(); }
      }, { signal });

      // Checkbox click: stops row click from firing, then either removes or opens panel
      this.checkboxBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.row?.classList.contains('is-checked')) {
          this.optimisticUncheck();
          this.removeEmbroidery();
        } else {
          this.openPanel();
        }
      }, { signal });

      this.saveBtn?.addEventListener('click', () => this.saveEmbroidery(), { signal });
      this.cancelBtn?.addEventListener('click', () => this.closePanel(), { signal });
      this.removeBtn?.addEventListener('click', () => {
        this.optimisticUncheck();
        this.removeEmbroidery();
      }, { signal });
    }

    disconnectedCallback() {
      this._ac?.abort();
    }

    /** Opens the embroidery edit panel and focuses the name input. */
    openPanel() {
      this.panel?.removeAttribute('hidden');
      setTimeout(() => {
        this.panel?.querySelector('.embroidery-edit-panel__name')?.focus();
      }, 50);
    }

    /** Hides the embroidery edit panel. */
    closePanel() {
      this.panel?.setAttribute('hidden', '');
    }

    /** Instantly uncheck the row before the API responds. */
    optimisticUncheck() {
      this.row?.classList.remove('is-checked', 'bg-neutral-100');
      this.querySelector('.embroidery-cart-summary')?.remove();
    }

    /**
     * Reads the current panel inputs and returns them as Shopify line item properties.
     * @returns {{ [key: string]: string }} Line item properties object.
     */
    collectProperties() {
      const nameInput  = this.panel?.querySelector('.embroidery-edit-panel__name');
      const colourRadio = this.panel?.querySelector('input[name^="embroidery-edit-colour"]:checked');
      const fontRadio  = this.panel?.querySelector('input[name^="embroidery-edit-font"]:checked');

      const properties = {};
      if (nameInput?.value?.trim()) {
        properties['Embroidered Name'] = nameInput.value.trim();
      }
      if (colourRadio?.value) {
        properties['Embroidery Colour'] = colourRadio.value;
        properties['_embroidery_price_pence'] = colourRadio.dataset.price ?? '';
      }
      if (fontRadio?.value) {
        properties['Embroidery Font'] = fontRadio.value;
      }
      return properties;
    }

    /**
     * Validates the panel inputs and triggers a cart update with embroidery properties.
     * Focuses the name input if it is empty.
     * @returns {Promise<void>}
     */
    async saveEmbroidery() {
      const properties = this.collectProperties();

      if (!properties['Embroidered Name']) {
        this.panel?.querySelector('.embroidery-edit-panel__name')?.focus();
        return;
      }

      await this.updateCart(properties);
    }

    /**
     * Clears embroidery properties from the cart line item via cart/change.js,
     * then refreshes the cart drawer.
     * @returns {Promise<void>}
     */
    async removeEmbroidery() {
      const line = parseInt(this.dataset.line, 10);
      this.setLoading(true);

      try {
        const cartDrawer = document.querySelector('cart-drawer');
        const sectionsToRender = cartDrawer?.getSectionsToRender?.()?.map((s) => s.section ?? s.id) ?? [];

        const body = {
          line,
          properties: {
            'Embroidered Name': '',
            'Embroidery Colour': '',
            'Embroidery Font': '',
            '_embroidery_price_pence': '',
          },
        };
        if (sectionsToRender.length > 0) {
          body.sections = sectionsToRender;
          body.sections_url = window.location.pathname;
        }

        const resp = await fetch(window.routes.cart_change_url + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify(body),
        });
        if (!resp.ok) throw new Error('cart_change failed');

        const data = await resp.json();
        if (cartDrawer?.renderContents) {
          cartDrawer.renderContents(data);
        }
      } catch (err) {
        console.error('[EmbroideryCartEdit]', err);
      } finally {
        this.setLoading(false);
      }
    }

    /**
     * Replaces the current cart line item with the same variant re-added with
     * the given embroidery properties. Uses a remove + add strategy because
     * Shopify does not support in-place property updates.
     * @param {{ [key: string]: string }} properties - Embroidery line item properties.
     * @returns {Promise<void>}
     */
    async updateCart(properties) {
      const line      = parseInt(this.dataset.line, 10);
      const variantId = parseInt(this.dataset.variantId, 10);
      const quantity  = parseInt(this.dataset.quantity, 10);

      this.setLoading(true);

      try {
        // Step 1: Remove the current line item
        const removeResp = await fetch(window.routes.cart_change_url + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ line, quantity: 0 }),
        });
        if (!removeResp.ok) throw new Error('cart_change failed');

        // Step 2: Re-add with embroidery properties
        const cartDrawer = document.querySelector('cart-drawer');
        const sectionsToRender = cartDrawer?.getSectionsToRender?.()?.map((s) => s.section ?? s.id) ?? [];

        const addBody = { id: variantId, quantity, properties };
        if (sectionsToRender.length > 0) {
          addBody.sections = sectionsToRender;
          addBody.sections_url = window.location.pathname;
        }

        const addResp = await fetch(window.routes.cart_add_url + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify(addBody),
        });
        if (!addResp.ok) throw new Error('cart_add failed');

        const data = await addResp.json();

        // Step 3: Refresh cart UI
        if (cartDrawer?.renderContents) {
          cartDrawer.renderContents(data);
        }
      } catch (err) {
        console.error('[EmbroideryCartEdit]', err);
      } finally {
        this.setLoading(false);
      }
    }

    /**
     * Enables or disables the save, remove, and checkbox buttons.
     * @param {boolean} loading - Whether a request is in flight.
     */
    setLoading(loading) {
      if (this.saveBtn) {
        this.saveBtn.disabled = loading;
        this.saveBtn.classList.toggle('loading', loading);
        this.saveBtn.querySelector('.loading__spinner')?.classList.toggle('hidden', !loading);
      }
      if (this.removeBtn)   this.removeBtn.disabled = loading;
      if (this.checkboxBtn) this.checkboxBtn.disabled = loading;
    }
  }

  customElements.define('embroidery-cart-edit', EmbroideryCartEdit);
}
