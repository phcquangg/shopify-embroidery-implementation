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

## The Implementation
if ```embroidery.enabled == true``` render a "Add Embroidery Name" checkbox in PDP which opens a Embroidery Form.

Embroidery Form contains Title input with max length limited by ```embroidery.char_limit_label```, Colours generate by JSON ```embroidery.colours``` and Fonts generate by ```embroidery.fonts```.

By clicking add to cart with Embroidery info, gather the info inputed by user and push together with the product data using ```properties```.

Inside ```cart-drawer```, display added Embroidery and allow customer to add/remove/edit by opening a mini form which exactly the same to the one on PDP. Actions on this form also trigger cart APIs to perform updates.

## The Improvements.
To add more clarity to cart subtotal and in checkout page where "Add Embroidery" is just a property for now, we have to add an extra products to represent, or Shopify Functions to customise it in Checkout Page.

Pre-defined supported fonts and prepared font files will help in display the fonts correctly when customers input it.

The Mockup Image at thhe time is static, we could upgrade it further to be dynamic by adding more images into metafield and re-structure it, or we can use ```<canvas>```, it might be a superior solution for real-time preview as customer inputs, but also come with some constraints since Font rendering != actual Embroidery.


Here is the [Preview Link](https://dev-store-212.myshopify.com/?_ab=0&_bt=eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaEpJaUJrWlhZdGMzUnZjbVV0TWpFeUxtMTVjMmh2Y0dsbWVTNWpiMjBHT2daRlZBPT0iLCJleHAiOiIyMDI2LTAzLTA5VDAzOjIyOjI3LjA4N1oiLCJwdXIiOiJwZXJtYW5lbnRfcGFzc3dvcmRfYnlwYXNzIn19--b99cdcde006a2c77b9231e847f3787158a7083ca&_fd=0&_sc=1&key=2a288cd05ab7de6f92a43a8303c820248f3490fd4cc4b42a7090ef4372f6e589&preview_theme_id=160223854804)