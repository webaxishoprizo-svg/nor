/* ============================================================
   NOR PERFUME - NEW ARRIVALS (STACKED SCROLL ANIMATION)
   High-performance scroll-driven storytelling.
   ============================================================ */

import { shopifyQuery, QUERIES } from './shopify.js';

class NewArrivalsManager {
    constructor() {
        this.products = [];
        this.section = null;
        this.cards = [];
        this.init();
    }

    async init() {
        const data = await shopifyQuery(QUERIES.getNewArrivals, { handle: 'new-arrival', first: 8 });

        if (!data || !data.collection || data.collection.products.edges.length === 0) {
            console.log('New Arrivals: No products found, skipping section render.');
            return;
        }

        this.products = data.collection.products.edges.map((edge) => edge.node);
        this.render();
        this.setupScrollAnimation();
        this.observeImages();
    }

    getPriceDetails(product) {
        const price = parseFloat(product.priceRange?.minVariantPrice?.amount || 0);
        const compareAt = parseFloat(product.compareAtPriceRange?.minVariantPrice?.amount || 0);
        const hasOffer = Number.isFinite(compareAt) && compareAt > price;
        const savings = hasOffer ? (compareAt - price) : 0;
        const rawOfferPercent = hasOffer ? ((savings / compareAt) * 100) : 0;
        const offerPercent = hasOffer ? String(Math.floor(rawOfferPercent)) : '';

        return {
            price,
            compareAt: hasOffer ? compareAt : null,
            savings,
            offerPercent
        };
    }

    render() {
        this.section = document.createElement('section');
        this.section.id = 'newArrivals';
        this.section.className = 'new-arrivals-section';
        this.section.style.height = `${this.products.length * 100}vh`;

        this.section.innerHTML = `
            <div class="na-sticky-wrapper">
                <div class="na-card-container">
                    ${this.products.map((product, index) => this.createCardHTML(product, index)).join('')}
                </div>
            </div>
        `;

        const bestSeller = document.getElementById('bestSeller');
        if (bestSeller) {
            bestSeller.insertAdjacentElement('afterend', this.section);
        } else {
            document.body.appendChild(this.section);
        }

        this.cards = Array.from(this.section.querySelectorAll('.na-card'));

        this.section.querySelectorAll('.fade-up').forEach((el) => {
            const delay = parseInt(el.dataset.delay || '0', 10);
            setTimeout(() => el.classList.add('visible'), delay + 400);
        });

        const cartBtns = this.section.querySelectorAll('.na-quick-add:not([disabled])');
        cartBtns.forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const variantId = btn.dataset.variant;
                if (!variantId) return;

                btn.classList.add('loading');
                const originalText = btn.textContent;
                btn.textContent = 'Adding...';

                const cartModule = await import('./cart.js');
                const cart = cartModule.default;
                const res = await cart.addItem(variantId);

                if (res.success) {
                    btn.classList.add('added');
                    btn.textContent = 'Added';
                    setTimeout(() => {
                        btn.classList.remove('added');
                        btn.textContent = originalText;
                    }, 2000);
                } else {
                    btn.disabled = true;
                    btn.classList.add('is-unavailable');
                    btn.textContent = 'Sold Out';
                }
                btn.classList.remove('loading');
            });
        });
    }

    parseComposition(val) {
        if (!val) return '';
        if (!val.startsWith('{')) return val;
        try {
            const parsed = JSON.parse(val);
            if (parsed.type === 'root' && Array.isArray(parsed.children)) {
                const firstPara = parsed.children.find((child) => child.type === 'paragraph');
                if (firstPara && Array.isArray(firstPara.children)) {
                    return firstPara.children.map((child) => child.value || '').join('');
                }
            }
        } catch (e) {
            console.error('Error parsing composition:', e);
        }
        return val;
    }

    createCardHTML(product, index) {
        const img = product.featuredImage?.url || '';
        if (!img) return '';

        const variant = product.variants?.edges[0]?.node;
        const variantId = variant?.id || '';
        const isAvailable = product.availableForSale !== false && variant?.availableForSale !== false && variantId;
        const { price, compareAt, offerPercent } = this.getPriceDetails(product);
        const formattedPrice = price.toLocaleString('en-IN');
        const formattedCompareAt = compareAt ? compareAt.toLocaleString('en-IN') : '';

        const compositionText = this.parseComposition(product.composition?.value) ||
            'A masterwork of olfactory architecture, featuring a proprietary blend of sustainably sourced essential oils and rare botanicals, meticulously balanced for long-lasting projection.';

        return `
            <article class="na-card" data-index="${index}" style="z-index: ${this.products.length - index}">
                <div class="na-card-inner">
                    <div class="na-left">
                        <span class="na-eyebrow">NEW EXCLUSIVE</span>
                        <h2 class="na-title">${product.title}</h2>

                        <div class="na-price-tag fade-up" style="margin-bottom: 24px; display: block; opacity: 1 !important; visibility: visible !important;">
                            <div class="na-price-stack">
                                <span class="na-price-current">₹${formattedPrice}</span>
                                ${compareAt ? `<span class="na-compare-price">₹${formattedCompareAt}</span>` : ''}
                            </div>
                        </div>

                        ${compositionText ? `
                        <div class="na-desc-wrap fade-up" style="margin-bottom: 32px; max-width: 480px; border-left: 2px solid var(--c-gold); padding-left: 24px; opacity: 1 !important; visibility: visible !important;">
                            <p class="na-desc-text" style="font-size: 1.1rem; color: rgba(255,255,255,0.7); line-height: 1.8; font-family: var(--serif); font-style: italic;">
                                ${compositionText}
                            </p>
                        </div>
                        ` : ''}

                        <div class="na-trust-row fade-up" style="opacity: 1 !important; visibility: visible !important;">
                            <div class="na-trust-item">
                                <span class="nt-icon">✦</span>
                                <span>Handcrafted</span>
                            </div>
                            <div class="na-trust-item">
                                <span class="nt-icon">✦</span>
                                <span>Pure Oils</span>
                            </div>
                            <div class="na-trust-item">
                                <span class="nt-icon">✦</span>
                                <span>45 Days</span>
                            </div>
                        </div>

                        <div class="na-cta-wrap na-button-stack" style="margin-top: 40px; opacity: 1 !important; visibility: visible !important;">
                            <a href="${product.handle}.html" class="na-cta compact" style="padding: 14px 24px; border-color: rgba(255,255,255,0.15); background: transparent; font-size: 11px;">
                                VIEW DETAILS
                            </a>
                            ${isAvailable ? `<button class="na-quick-add cta-cart-btn" data-variant="${variantId}" style="min-width: 140px;">Add to Cart</button>` : `<button class="na-quick-add cta-cart-btn is-unavailable" type="button" disabled style="min-width: 140px;">Sold Out</button>`}
                        </div>
                    </div>
                    <div class="na-right">
                        <a href="${product.handle}.html" class="na-img-link" aria-label="View ${product.title}">
                            <div class="na-img-frame">
                                ${offerPercent ? `<span class="product-offer-badge na-offer-badge">${offerPercent}% OFF</span>` : ''}
                                <img src="${img}${img.includes('?') ? '&' : '?'}width=1200&format=webp"
                                     class="na-img"
                                     alt="${product.title}"
                                     loading="lazy">
                            </div>
                        </a>
                    </div>
                </div>
            </article>
        `;
    }

    setupScrollAnimation() {
        const observerOptions = {
            threshold: 0,
            rootMargin: '0px'
        };

        const boundOnScroll = this.onScroll.bind(this);
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    window.addEventListener('scroll', boundOnScroll);
                } else {
                    window.removeEventListener('scroll', boundOnScroll);
                }
            });
        }, observerOptions);

        observer.observe(this.section);
    }

    onScroll() {
        const rect = this.section.getBoundingClientRect();
        const winH = window.innerHeight;

        let totalScroll = this.section.offsetHeight - winH;
        let scrollY = -rect.top;
        if (scrollY < 0) scrollY = 0;
        if (scrollY > totalScroll) scrollY = totalScroll;

        const progress = scrollY / totalScroll;
        const totalCards = this.cards.length;

        this.cards.forEach((card, index) => {
            const segment = 1 / (totalCards - 1 || 1);

            if (index === 0) {
                const cardProgress = Math.min(Math.max(progress / segment, 0), 1);
                card.style.transform = `translateY(${-cardProgress * 100}%) scale(${1 - cardProgress * 0.1})`;
                card.style.opacity = 1 - (cardProgress * 0.5);
            } else if (index < totalCards - 1) {
                const cardProgress = Math.min(Math.max((progress - (index * segment)) / segment, 0), 1);
                card.style.transform = `translateY(${-cardProgress * 100}%) scale(${1 - cardProgress * 0.1})`;
                card.style.opacity = 1 - (cardProgress * 0.5);
            } else {
                card.style.transform = 'translateY(0%)';
                card.style.opacity = 1;
            }
        });
    }

    observeImages() {
        const naImgs = this.section.querySelectorAll('.na-img');
        const imgObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const scrollHandler = () => {
                        const winH = window.innerHeight;
                        const rect = entry.target.getBoundingClientRect();
                        const centerDiff = (rect.top + (rect.height / 2)) - (winH / 2);
                        const pY = centerDiff * 0.1;
                        entry.target.style.transform = `translateY(${pY}px) scale(1.1)`;
                    };
                    window.addEventListener('scroll', scrollHandler);
                    entry.target._scrollHandler = scrollHandler;
                } else {
                    window.removeEventListener('scroll', entry.target._scrollHandler);
                }
            });
        });

        naImgs.forEach((img) => imgObserver.observe(img));
    }
}

export default NewArrivalsManager;
