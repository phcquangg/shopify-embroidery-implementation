/**
 * EmbroideryForm Web Component
 *
 * Responsibilities:
 * - Update the price label when a colour swatch is selected
 * - Update the hidden _embroidery_price_pence input value on colour change
 * - Enable/disable form inputs when the toggle checkbox is checked/unchecked
 * - Provide JS fallback for the CSS :has() expand/collapse for older browsers
 * - Reset the form after a successful add-to-cart (via PUB_SUB_EVENTS.cartUpdate)
 * - Announce price changes to assistive technology via aria-live region
 *
 * @element embroidery-form
 * @extends HTMLElement
 */

if (!customElements.get('embroidery-form')) {
  class EmbroideryForm extends HTMLElement {
    /** @type {string} */ sectionId;
    /** @type {HTMLInputElement | null} */ toggle;
    /** @type {HTMLElement | null} */ panel;
    /** @type {HTMLElement | null} */ priceLabel;
    /** @type {HTMLInputElement | null} */ priceInput;
    /** @type {HTMLInputElement | null} */ nameInput;
    /** @type {NodeListOf<HTMLInputElement>} */ colourRadios;
    /** @type {NodeListOf<HTMLInputElement>} */ fontRadios;
    /** @type {NodeListOf<HTMLInputElement | HTMLTextAreaElement>} */ allPropertyInputs;
    /** @type {HTMLButtonElement | null} */ submitButton;
    /** @type {(() => void) | undefined} */ unsubscribeCartUpdate;

    constructor() {
      super();
      this.sectionId = this.dataset.sectionId;
    }

    connectedCallback() {
      this.toggle = this.querySelector('.embroidery-form__checkbox');
      this.panel = this.querySelector('.embroidery-form__panel');
      this.priceLabel = this.querySelector('.embroidery-form__price');
      this.priceInput = this.querySelector(`#embroidery-price-input-${this.sectionId}`);
      this.nameInput = this.querySelector('.embroidery-form__name-input');
      this.colourRadios = this.querySelectorAll('input[name="properties[Embroidery Colour]"]');
      this.fontRadios = this.querySelectorAll('input[name="properties[Embroidery Font]"]');
      this.allPropertyInputs = this.querySelectorAll(
        'input[name^="properties["], textarea[name^="properties["]'
      );

      this.submitButton = document.getElementById(`ProductSubmitButton-${this.sectionId}`);

      this.toggle?.addEventListener('change', this.onToggleChange.bind(this));
      this.nameInput?.addEventListener('input', this.updateSubmitButton.bind(this));
      this.colourRadios.forEach((radio) =>
        radio.addEventListener('change', this.onColourChange.bind(this))
      );

      // Subscribe to cart update to reset form after successful add-to-cart
      if (window.subscribe && window.PUB_SUB_EVENTS) {
        this.unsubscribeCartUpdate = subscribe(PUB_SUB_EVENTS.cartUpdate, () => {
          this.resetForm();
        });
      }

      // Initialise: ensure inputs are disabled until checkbox is checked
      this.setInputsDisabled(!this.toggle?.checked);
      this.updateSubmitButton();

      // CSS :has() fallback for browsers that don't support it
      if (!CSS.supports('selector(:has(*))')) {
        this.applyHasFallback(this.toggle?.checked ?? false);
      }
    }

    disconnectedCallback() {
      this.unsubscribeCartUpdate?.();
    }

    /**
     * Disables the add-to-cart button when embroidery is toggled on but no name is entered.
     */
    updateSubmitButton() {
      if (!this.submitButton) return;
      const blocked = this.toggle?.checked && !this.nameInput?.value.trim();
      this.submitButton.disabled = blocked;
    }

    /**
     * Handles the embroidery toggle checkbox change event.
     * Shows/hides the panel, updates ARIA attributes, toggles input states,
     * and applies the CSS :has() fallback if needed.
     */
    onToggleChange() {
      const checked = this.toggle.checked;
      this.toggle.setAttribute('aria-expanded', checked.toString());

      this.setInputsDisabled(!checked);
      this.updateSubmitButton();

      // CSS :has() fallback
      if (!CSS.supports('selector(:has(*))')) {
        this.applyHasFallback(checked);
      }

      // Toggle hidden attribute after transition when closing
      if (checked) {
        this.panel.removeAttribute('hidden');
        this.panel.setAttribute('aria-hidden', 'false');
      } else {
        this.panel.setAttribute('aria-hidden', 'true');
        // Delay hidden until after CSS transition (300ms)
        setTimeout(() => {
          if (!this.toggle.checked) this.panel.setAttribute('hidden', '');
        }, 300);
      }
    }

    /**
     * Handles a colour radio change event and updates the displayed price.
     * @param {Event} event - The change event from a colour radio input.
     */
    onColourChange(event) {
      const radio = event.target;
      const pricePence = parseInt(radio.dataset.price ?? '0', 10);
      this.updatePrice(pricePence);
    }

    /**
     * Updates the hidden price input and the visible price label.
     * @param {number} pricePence - Price in pence (e.g. 500 = £5.00).
     */
    updatePrice(pricePence) {
      if (this.priceInput) {
        this.priceInput.value = pricePence;
      }
      if (this.priceLabel) {
        const formatted = this.formatMoney(pricePence);
        this.priceLabel.textContent = `+${formatted}`;
      }
    }

    /**
     * Formats a price in pence to a localised money string using Shopify's moneyFormat.
     * Supports both {{amount}} and {{amount_no_decimals}} format tokens.
     * @param {number} pricePence - Price in pence (e.g. 500 = £5.00).
     * @returns {string} Formatted price string (e.g. "£5.00").
     */
    formatMoney(pricePence) {
      const moneyFormat = window.Shopify?.moneyFormat ?? '£{{amount}}';
      const amount = (pricePence / 100).toFixed(2);
      return moneyFormat.replace('{{amount}}', amount).replace('{{amount_no_decimals}}', Math.floor(pricePence / 100));
    }

    /**
     * Enables or disables all embroidery property inputs.
     * @param {boolean} disabled - Whether to disable the inputs.
     */
    setInputsDisabled(disabled) {
      this.allPropertyInputs.forEach((input) => {
        input.disabled = disabled;
      });
    }

    /**
     * Applies manual panel expand/collapse styles for browsers without CSS :has() support.
     * @param {boolean} checked - Whether the embroidery toggle is currently checked.
     */
    applyHasFallback(checked) {
      const box = this.querySelector('.embroidery-form__box');
      const checkmark = this.querySelector('.embroidery-form__checkmark');

      if (checked) {
        this.panel?.style.setProperty('max-height', '900px');
        box?.classList.add('bg-[rgb(var(--color-foreground))]', 'border-[rgb(var(--color-foreground))]');
        checkmark?.classList.remove('hidden');
      } else {
        this.panel?.style.setProperty('max-height', '0');
        box?.classList.remove('bg-[rgb(var(--color-foreground))]', 'border-[rgb(var(--color-foreground))]');
        checkmark?.classList.add('hidden');
      }
    }

    /**
     * Resets the embroidery form to its unchecked default state.
     * Called after a successful add-to-cart via the cartUpdate pub/sub event.
     */
    resetForm() {
      if (!this.toggle) return;
      this.toggle.checked = false;
      this.toggle.setAttribute('aria-expanded', 'false');
      this.setInputsDisabled(true);
      this.panel?.setAttribute('aria-hidden', 'true');
      this.panel?.setAttribute('hidden', '');

      if (!CSS.supports('selector(:has(*))')) {
        this.applyHasFallback(false);
      }

      if (this.nameInput) {
        this.nameInput.value = '';
      }
      this.updateSubmitButton();

      // Reset colour to first option
      const firstColour = this.colourRadios[0];
      if (firstColour) {
        firstColour.checked = true;
        this.updatePrice(parseInt(firstColour.dataset.price ?? '0', 10));
      }

      // Reset font to first option
      const firstFont = this.fontRadios[0];
      if (firstFont) firstFont.checked = true;
    }
  }

  customElements.define('embroidery-form', EmbroideryForm);
}
