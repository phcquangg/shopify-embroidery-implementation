# Embroidery Implementation

## The Idea
Allow customers to able make custom embroidery on their selected products.
Allow merchant to setup product with custom embroidery.

## The Plan
Create a distinct data to detect which products are support embroidery.
Create a embroidery block in PDP to gather customer inputs.
Add to cart that product also submit the embroidery data.
Allow customers to add/edit/remove embroidery inside cart drawer.

## The Preparation
Some Product Metafields:
  - Enable Embroidery (embroidery.enabled): type boolean, a toggle for supported products.
  - Embroidery Fonts (embroidery.fonts): type JSON, supported fonts.
  - Embroidery Colours (embroidery.colors): type JSON, supported colours and prices specific to each colours.
  - Embroidery Character Limit (embroidery.char_limit_label): type integer, limit character input by customer.
  - Embroidery Mockup Image (embroidery.mockup_image): type file, embroidery image demo.

# The Implementation
if ```embroidery.enabled == true``` render a "Add Embroidery Name" checkbox in PDP which opens a Embroidery Form.

Embroidery Form contains Title input with max length limited by ```embroidery.char_limit_label```, Colours generate by JSON ```embroidery.colours``` and Fonts generate by ```embroidery.fonts```.

By clicking add to cart with Embroidery info, gather the info inputed by user and push together with the product data using ```properties```.

Inside ```cart-drawer```, display added Embroidery and allow customer to add/remove/edit by opening a mini form which exactly the same to the one on PDP. Actions on this form also trigger cart APIs to perform updates.