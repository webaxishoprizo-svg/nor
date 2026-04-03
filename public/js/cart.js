/* ============================================================
   NOR PERFUME — CART COMPONENT
   Handles Shopify Cart API calls and localStorage sync.
   ============================================================ */

import { shopifyQuery, QUERIES } from './shopify.js';

const STORAGE_KEY = 'nor_shopify_cart_id';

class CartManager {
    constructor() {
        this.cartId = localStorage.getItem(STORAGE_KEY);
        this.cartData = null;
        this.createCartPromise = null;
        this.ready = this.bootstrap();
    }

    async bootstrap() {
        if (!this.cartId) {
            await this.createCart();
        } else {
            await this.fetchCart({ skipReady: true });
        }
    }

    /**
     * Creates a new cart on Shopify and saves the ID in localStorage
     */
    async createCart() {
        if (this.createCartPromise) return this.createCartPromise;

        this.createCartPromise = (async () => {
            const createRes = await shopifyQuery(QUERIES.createCart);
            const cart = createRes?.cartCreate?.cart;

            if (cart) {
                this.cartId = cart.id;
                this.cartData = cart;
                localStorage.setItem(STORAGE_KEY, this.cartId);
                this.updateBadges(cart.totalQuantity || 0);
                return cart;
            }

            return null;
        })();

        try {
            return await this.createCartPromise;
        } finally {
            this.createCartPromise = null;
        }
    }

    /**
     * Fetches current cart status and updates total quantity badges
     */
    async fetchCart(options = {}) {
        const { skipReady = false } = options;
        if (!skipReady) await this.ready;
        if (!this.cartId) return this.cartData;

        const res = await shopifyQuery(QUERIES.getCart, { cartId: this.cartId });

        if (res?.cart) {
            this.cartData = res.cart;
            this.updateBadges(this.cartData.totalQuantity);
            return this.cartData;
        }

        if (res && Object.prototype.hasOwnProperty.call(res, 'cart') && !res.cart) {
            // Only replace the cart when Shopify confirms the ID is no longer valid.
            this.cartData = null;
            localStorage.removeItem(STORAGE_KEY);
            this.cartId = null;
            return this.createCart();
        }

        // Keep the current cart ID on transient failures so we don't wipe a valid cart.
        if (this.cartData) {
            this.updateBadges(this.cartData.totalQuantity);
        }

        return this.cartData;
    }

    /**
     * Returns an empty cart shape used by the cart page before any items exist
     */
    getEmptyCart() {
        return {
            totalQuantity: 0,
            cost: {
                subtotalAmount: {
                    amount: 0,
                    currencyCode: 'INR'
                },
                totalAmount: {
                    amount: 0,
                    currencyCode: 'INR'
                }
            },
            lines: {
                edges: []
            }
        };
    }

    /**
     * Adds an item (variant ID) to the Shopify cart
     */
    async addItem(variantId, quantity = 1) {
        if (!variantId) {
            return { success: false, errors: [{ message: 'Missing product variant.' }] };
        }

        await this.ready;
        if (!this.cartId) await this.createCart();

        const requestedQuantity = parseInt(quantity, 10) || 1;
        const previousQuantity = parseInt(this.cartData?.totalQuantity || 0, 10);
        const lines = [{ merchandiseId: variantId, quantity: requestedQuantity }];
        const res = await shopifyQuery(QUERIES.addToCart, { cartId: this.cartId, lines });

        if (res?.cartLinesAdd?.userErrors?.length) {
            return { success: false, errors: res.cartLinesAdd.userErrors };
        }

        if (res?.cartLinesAdd?.cart) {
            this.cartData = res.cartLinesAdd.cart;
            this.updateBadges(this.cartData.totalQuantity);

            const nextQuantity = parseInt(this.cartData.totalQuantity || 0, 10);
            if (nextQuantity < previousQuantity + requestedQuantity) {
                return {
                    success: false,
                    cart: this.cartData,
                    errors: [{ message: 'This product is currently unavailable for purchase.' }]
                };
            }

            return { success: true, cart: this.cartData };
        }

        return { success: false, errors: res?.errors || 'Error adding to cart' };
    }

    /**
     * Creates a temporary single-item checkout without mutating the user's
     * saved cart state, used by "Buy Now" actions on PDPs.
     */
    async createBuyNowCheckout(variantId, quantity = 1) {
        if (!variantId) {
            return { success: false, errors: [{ message: 'Missing product variant.' }] };
        }

        const requestedQuantity = parseInt(quantity, 10) || 1;
        const input = {
            lines: [{ merchandiseId: variantId, quantity: requestedQuantity }]
        };
        const res = await shopifyQuery(QUERIES.createCart, { input });

        if (res?.cartCreate?.userErrors?.length) {
            return { success: false, errors: res.cartCreate.userErrors };
        }

        const cart = res?.cartCreate?.cart;
        if (cart?.checkoutUrl) {
            const nextQuantity = parseInt(cart.totalQuantity || 0, 10);
            if (nextQuantity < requestedQuantity) {
                return {
                    success: false,
                    cart,
                    errors: [{ message: 'This product is currently unavailable for purchase.' }]
                };
            }

            return {
                success: true,
                cart,
                checkoutUrl: cart.checkoutUrl
            };
        }

        return { success: false, errors: res?.errors || 'Error creating checkout' };
    }

    /**
     * Updates an existing cart line's quantity
     */
    async updateLine(lineId, quantity) {
        await this.ready;
        if (!this.cartId) {
            return { success: false, errors: [{ message: 'Cart unavailable.' }] };
        }

        const lines = [{ id: lineId, quantity: parseInt(quantity) }];
        const res = await shopifyQuery(QUERIES.updateCartLines, { cartId: this.cartId, lines });

        if (res?.cartLinesUpdate?.userErrors?.length) {
            return { success: false, errors: res.cartLinesUpdate.userErrors };
        }

        if (res?.cartLinesUpdate?.cart) {
            this.cartData = res.cartLinesUpdate.cart;
            this.updateBadges(this.cartData.totalQuantity);
            return { success: true, cart: this.cartData };
        }

        return { success: false, errors: res?.errors || 'Error updating cart' };
    }

    /**
     * Removes an item from the Shopify cart
     */
    async removeItem(lineId) {
        await this.ready;
        if (!this.cartId) {
            return { success: false, errors: [{ message: 'Cart unavailable.' }] };
        }

        const res = await shopifyQuery(QUERIES.removeCartLines, { cartId: this.cartId, lineIds: [lineId] });

        if (res?.cartLinesRemove?.userErrors?.length) {
            return { success: false, errors: res.cartLinesRemove.userErrors };
        }

        if (res?.cartLinesRemove?.cart) {
            this.cartData = res.cartLinesRemove.cart;
            this.updateBadges(this.cartData.totalQuantity);
            return { success: true, cart: this.cartData };
        }

        return { success: false, errors: res?.errors || 'Error removing cart item' };
    }

    /**
     * Updates UI badges across the site to reflect current cart count
     */
    updateBadges(count) {
        console.log(`[CartManager] Updating badges to: ${count}`);
        const badges = document.querySelectorAll('.cart-count, #mm-cart-count');
        badges.forEach(b => {
            b.textContent = count || 0;
            b.style.transform = "scale(1.4)";
            b.style.color = "var(--c-gold)";
            setTimeout(() => {
                b.style.transform = "scale(1)";
                b.style.color = "";
            }, 300);
        });
    }

    /**
     * Returns the cart checkout URL
     */
    getCheckoutUrl() {
        return this.cartData?.checkoutUrl || null;
    }
}

// Single instance of Cart Manager
const cartManager = new CartManager();
export default cartManager;
