/* ============================================================
   NOR PERFUME — CART UI COMPONENT
   Handles rendering the dynamic cart page using Shopify cart data.
   ============================================================ */

import cartManager from './cart.js';

class CartUI {
    constructor() {
        this.container = document.getElementById('cart-items-container');
        this.emptyMsg = document.getElementById('empty-cart-message');
        this.cartLayout = document.querySelector('.cart-layout');
        this.summaryCard = document.querySelector('.cart-summary');
        this.subtotalEl = document.querySelector('.summary-subtotal');
        this.finalTotalEl = document.querySelector('.summary-final-total');
        this.checkoutBtn = document.getElementById('btn-real-checkout');
        this.checkoutDefaultLabel = this.checkoutBtn?.textContent.trim() || 'Checkout';

        if (this.checkoutBtn) {
            this.checkoutBtn.dataset.defaultLabel = this.checkoutDefaultLabel;
        }

        this.bindCheckoutButtonReset();

        this.init();
    }

    bindCheckoutButtonReset() {
        if (window.__norCartCheckoutResetBound) return;

        window.addEventListener('pageshow', () => {
            this.resetCheckoutButton();
        });

        window.__norCartCheckoutResetBound = true;
    }

    resetCheckoutButton() {
        if (!this.checkoutBtn) return;

        this.checkoutBtn.disabled = false;
        this.checkoutBtn.textContent = this.checkoutBtn.dataset.defaultLabel || this.checkoutDefaultLabel;
    }

    triggerRevealAnimations(scope = document) {
        const selector = '.fade-up, .fade-left, .fade-right, .scale-up, .reveal-text, .reveal-box';
        const elements = [];

        if (typeof scope.matches === 'function' && scope.matches(selector)) {
            elements.push(scope);
        }

        if (typeof scope.querySelectorAll === 'function') {
            elements.push(...scope.querySelectorAll(selector));
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            elements.forEach((element) => element.classList.add('visible'));
            return;
        }

        const revealReady = document.documentElement.classList.contains('reveal-ready');
        elements.forEach((element) => {
            if (element.classList.contains('visible')) return;

            if (!revealReady) {
                element.classList.add('visible');
                return;
            }

            const delay = parseInt(element.dataset.delay || '0', 10);
            window.setTimeout(() => {
                element.classList.add('visible');
            }, delay);
        });
    }

    async init() {
        if (!this.container) return;

        this.resetCheckoutButton();
        const cartData = await cartManager.fetchCart();
        this.render(cartData || cartManager.getEmptyCart());
    }

    render(cart) {
        if (!this.container) return;

        if (cart.totalQuantity === 0) {
            this.container.innerHTML = '';
            if (this.emptyMsg) this.emptyMsg.style.display = 'block';
            if (this.container) this.container.style.display = 'none';
            if (this.summaryCard) this.summaryCard.style.display = 'none';
            if (this.emptyMsg) this.triggerRevealAnimations(this.emptyMsg);
            return;
        }

        if (this.emptyMsg) this.emptyMsg.style.display = 'none';
        if (this.container) this.container.style.display = '';
        if (this.summaryCard) this.summaryCard.style.display = '';
        if (this.cartLayout) this.cartLayout.style.display = '';

        this.container.innerHTML = '';
        const items = cart.lines.edges;

        items.forEach((edge, index) => {
            const node = edge.node;
            const itemHTML = this.createItemHTML(node, index);
            this.container.insertAdjacentHTML('beforeend', itemHTML);
        });

        // Update totals
        const subtotal = parseFloat(cart.cost.subtotalAmount.amount);
        const finalTotal = parseFloat(cart.cost.totalAmount.amount);
        const currency = cart.cost.totalAmount.currencyCode === 'INR' ? '₹' : '$';

        if (this.subtotalEl) this.subtotalEl.textContent = currency + subtotal.toLocaleString('en-IN');
        if (this.finalTotalEl) this.finalTotalEl.textContent = currency + finalTotal.toLocaleString('en-IN');
        
        this.attachEvents();
        this.triggerRevealAnimations(this.cartLayout || this.container);
    }

    createItemHTML(line, index = 0) {
        const variant = line.merchandise;
        const product = variant.product;
        const img = product.images.edges[0]?.node?.url || 'assets/images/mask.webp';
        const price = parseFloat(variant.price.amount);
        const lineTotal = price * line.quantity;
        const delay = 80 + (index * 90);
        const currency = variant.price.currencyCode === 'INR' ? '₹' : '$';

        return `
            <div class="cart-item fade-up" data-line-id="${line.id}" data-delay="${delay}">
                <div class="cart-item-img" style="background-image: url('${img}');"></div>
                <div class="cart-item-info">
                    <div class="item-header">
                        <div class="cart-item-copy">
                            <h4 class="cart-item-title">${product.title}</h4>
                            <p class="cart-item-meta">${variant.title !== 'Default Title' ? variant.title : 'Luxury Fragrance'}</p>
                        </div>
                        <div class="dot-menu-wrap">
                            <button class="dot-menu-btn" onclick="this.nextElementSibling.classList.toggle('active')" aria-label="Item Actions">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                            </button>
                            <div class="glass-dropdown">
                                <button class="gd-item btn-remove-shopify" data-line-id="${line.id}">
                                    <svg viewBox="0 0 24 24" fill="none" style="width:14px; height:14px; margin-right:8px;"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="1.5"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="1.5"/></svg> Remove Item
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="cart-item-footer" style="display: flex; justify-content: space-between; width: 100%; align-items: flex-end; margin-top: auto;">
                        <div class="qty-control">
                            <button class="qty-btn minus-shopify" data-line-id="${line.id}" data-qty="${line.quantity}">-</button>
                            <span class="qty-num">${line.quantity}</span>
                            <button class="qty-btn plus-shopify" data-line-id="${line.id}" data-qty="${line.quantity}">+</button>
                        </div>
                        <div class="cart-item-price cart-total-price">${currency}${lineTotal.toLocaleString('en-IN')}</div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents() {
        // Handle Quantity Buttons
        this.container.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const lineId = btn.dataset.lineId;
                let qty = parseInt(btn.dataset.qty);
                
                if (btn.classList.contains('plus-shopify')) qty++;
                else if (btn.classList.contains('minus-shopify') && qty > 1) qty--;
                else return;

                btn.style.opacity = '0.5';
                const res = await cartManager.updateLine(lineId, qty);
                if (res?.success) this.render(res.cart);
                else btn.style.opacity = '1';
            });
        });

        // Handle Remove Item
        this.container.querySelectorAll('.btn-remove-shopify').forEach(btn => {
            btn.addEventListener('click', async () => {
                const lineId = btn.dataset.lineId;
                const itemEl = btn.closest('.cart-item');
                if (itemEl) {
                    itemEl.style.opacity = '0';
                    itemEl.style.transform = 'scale(0.9)';
                    setTimeout(async () => {
                        const res = await cartManager.removeItem(lineId);
                        if (res?.success) {
                            this.render(res.cart);
                            return;
                        }

                        itemEl.style.opacity = '';
                        itemEl.style.transform = '';
                    }, 300);
                }
            });
        });

        // Checkout Trigger
        if (this.checkoutBtn) {
            this.checkoutBtn.onclick = () => {
                const url = cartManager.getCheckoutUrl();
                if (url) {
                    this.checkoutBtn.dataset.defaultLabel = this.checkoutBtn.dataset.defaultLabel || this.checkoutBtn.textContent.trim();
                    this.checkoutBtn.textContent = 'loading...';
                    window.location.href = url;
                } else {
                    this.resetCheckoutButton();
                    alert('Checkout is currently unavailable. Please try again later.');
                }
            };
        }
    }
}

const cartUI = new CartUI();
export default cartUI;
