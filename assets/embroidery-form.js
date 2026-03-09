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
 */

if (!customElements.get('embroidery-form')) {
  class EmbroideryForm extends HTMLElement {
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

    updateSubmitButton() {
      if (!this.submitButton) return;
      const blocked = this.toggle?.checked && !this.nameInput?.value.trim();
      this.submitButton.disabled = blocked;
    }

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

    onColourChange(event) {
      const radio = event.target;
      const pricePence = parseInt(radio.dataset.price ?? '0', 10);
      this.updatePrice(pricePence);
    }

    updatePrice(pricePence) {
      if (this.priceInput) {
        this.priceInput.value = pricePence;
      }
      if (this.priceLabel) {
        // Format price using Shopify's money format exposed via window.Shopify
        const formatted = this.formatMoney(pricePence);
        this.priceLabel.textContent = `+${formatted}`;
      }
    }

    formatMoney(pricePence) {
      const moneyFormat = window.Shopify?.moneyFormat ?? '£{{amount}}';
      const amount = (pricePence / 100).toFixed(2);
      // Remove trailing .00 if the format doesn't use decimals in this locale
      return moneyFormat.replace('{{amount}}', amount).replace('{{amount_no_decimals}}', Math.floor(pricePence / 100));
    }

    setInputsDisabled(disabled) {
      this.allPropertyInputs.forEach((input) => {
        input.disabled = disabled;
      });
    }

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
