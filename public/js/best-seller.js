/* ============================================================
   NOR PERFUME - BEST SELLER CAROUSEL (GYMKHA STYLE)
   Vanilla JS logic to fetch and animate the carousel.
   ============================================================ */

import { shopifyQuery, QUERIES } from './shopify.js';

class BestSellerManager {
    constructor(selector = '#bestSeller') {
        this.container = document.querySelector(selector);
        if (!this.container) return;

        this.viewport = this.container.querySelector('.bs-carousel-viewport');
        this.track = this.container.querySelector('.bs-carousel-track');
        this.prevBtn = this.container.querySelector('.bs-prev');
        this.nextBtn = this.container.querySelector('.bs-next');

        this.currentIndex = 0;
        this.products = [];
        this.isMoving = false;
        this.autoSlideInterval = null;
        this.intervalTime = 2000;

        this.init();
    }

    async init() {
        const data = await shopifyQuery(QUERIES.getBestSellersCollection, { handle: 'best-seller', first: 10 });
        if (!data || !data.collection || data.collection.products.edges.length === 0) {
            this.container.classList.add('hidden');
            return;
        }

        this.products = data.collection.products.edges;
        this.render();
        this.attachListeners();
        this.updateActiveSlide();
        this.startAutoSlide();
        this.container.classList.add('fade-up', 'visible');
    }

    render() {
        if (this.products.length === 0) return;

        this.track.innerHTML = this.products.map((edge, i) => {
            const product = edge.node;
            return this.createCardHTML(product, i);
        }).join('');
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

    createCardHTML(product, index) {
        const img = product.featuredImage?.url || '';
        const { price, compareAt, offerPercent } = this.getPriceDetails(product);
        const formattedPrice = price.toLocaleString('en-IN');
        const formattedCompareAt = compareAt ? compareAt.toLocaleString('en-IN') : '';
        const url = `${product.handle}.html`;
        const variant = product.variants?.edges[0]?.node;
        const variantId = variant?.id || '';
        const isAvailable = product.availableForSale !== false && variant?.availableForSale !== false && variantId;

        return `
            <div class="bs-card" data-index="${index}">
                <div class="bs-card-inner">
                    <a href="${url}" class="bs-card-link-overlay" aria-label="View ${product.title}"></a>
                    <div class="bs-img-wrap">
                        ${offerPercent ? `<span class="product-offer-badge bs-offer-badge">${offerPercent}% OFF</span>` : ''}
                        <img src="${img}${img.includes('?') ? '&' : '?'}width=800&format=webp"
                            alt="${product.title}"
                            class="bs-img"
                            loading="${index < 3 ? 'eager' : 'lazy'}">

                        <div class="bs-card-actions">
                            ${isAvailable ? `<button class="bs-quick-add" data-variant="${variantId}" aria-label="Quick Add to Cart">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                                <span>+ Add</span>
                            </button>` : `<button class="bs-quick-add is-unavailable" type="button" disabled aria-label="Sold Out">
                                <span>Sold Out</span>
                            </button>`}
                        </div>
                    </div>
                    <div class="bs-info">
                        <h4 class="bs-title">${product.title}</h4>
                        <div class="bs-price-row">
                            <p class="bs-price">₹${formattedPrice}</p>
                            ${compareAt ? `<span class="bs-compare-price">₹${formattedCompareAt}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachListeners() {
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.goToSlide(this.currentIndex - 1));
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.goToSlide(this.currentIndex + 1));

        const quickAdds = this.container.querySelectorAll('.bs-quick-add:not([disabled])');
        quickAdds.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const variantId = btn.dataset.variant;
                if (!variantId) return;

                btn.classList.add('loading');
                const cartModule = await import('./cart.js');
                const cart = cartModule.default;

                const res = await cart.addItem(variantId);
                if (res.success) {
                    btn.classList.add('added');
                    const span = btn.querySelector('span');
                    if (span) span.textContent = 'Added';
                    setTimeout(() => {
                        btn.classList.remove('added');
                        if (span) span.textContent = '+ Add';
                    }, 2000);
                } else {
                    btn.disabled = true;
                    btn.classList.add('is-unavailable');
                    const span = btn.querySelector('span');
                    if (span) span.textContent = 'Sold Out';
                }
                btn.classList.remove('loading');
            });
        });

        let isDown = false;
        let startX;

        this.viewport.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - this.viewport.offsetLeft;
        });

        this.viewport.addEventListener('mouseleave', () => {
            isDown = false;
        });
        this.viewport.addEventListener('mouseup', () => {
            isDown = false;
        });

        this.viewport.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - this.viewport.offsetLeft;
            const walk = x - startX;
            if (Math.abs(walk) > 100) {
                if (walk > 0) this.goToSlide(this.currentIndex - 1);
                else this.goToSlide(this.currentIndex + 1);
                isDown = false;
            }
        });

        window.addEventListener('resize', () => this.updateActiveSlide());
        this.container.addEventListener('mouseenter', () => this.stopAutoSlide());
        this.container.addEventListener('mouseleave', () => this.startAutoSlide());
        this.container.addEventListener('touchstart', () => this.stopAutoSlide());
        this.container.addEventListener('touchend', () => this.startAutoSlide());
    }

    startAutoSlide() {
        if (this.autoSlideInterval) return;
        this.autoSlideInterval = setInterval(() => {
            this.goToSlide(this.currentIndex + 1);
        }, this.intervalTime);
    }

    stopAutoSlide() {
        clearInterval(this.autoSlideInterval);
        this.autoSlideInterval = null;
    }

    goToSlide(index) {
        if (this.isMoving) return;
        this.isMoving = true;

        const totalItems = this.products.length;
        this.currentIndex = (index + totalItems) % totalItems;
        this.updateActiveSlide();

        setTimeout(() => {
            this.isMoving = false;
        }, 600);
    }

    updateActiveSlide() {
        const cards = this.container.querySelectorAll('.bs-card');
        if (cards.length === 0) return;

        cards.forEach(card => card.classList.remove('is-active'));
        cards[this.currentIndex].classList.add('is-active');

        const viewportWidth = this.viewport.offsetWidth;
        const cardWidth = cards[this.currentIndex].offsetWidth;
        const offset = (viewportWidth / 2) - (cardWidth / 2);
        const cardPosition = cards[this.currentIndex].offsetLeft;
        const transformX = -cardPosition + offset;

        this.track.style.transform = `translateX(${transformX}px)`;
    }
}

export default BestSellerManager;
