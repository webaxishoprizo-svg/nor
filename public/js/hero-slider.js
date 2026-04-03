import { shopifyQuery, QUERIES } from './shopify.js';

class HeroSlider {
    constructor(containerSelector, collectionHandle = 'hero-slider') {
        this.container = document.querySelector(containerSelector);
        this.handle = collectionHandle;
        this.slides = [];
        this.currentIndex = 0;
        this.timer = null;
        this.isPaused = false;

        if (this.container) {
            this.init();
        }
    }

    async init() {
        const data = await shopifyQuery(QUERIES.getHeroSlider, { handle: this.handle });

        if (data?.collection?.products?.edges) {
            this.slides = data.collection.products.edges
                .map(({ node }) => {
                    const desktopUrl = node.hero_image?.reference?.image?.url || node.hero_image?.value || '';
                    const mobileImgUrl = node.hero_mobile_image?.reference?.image?.url || desktopUrl;
                    const mobileVideoUrl = node.hero_mobile_video?.reference?.sources?.[0]?.url || null;

                    return {
                        id: node.id,
                        title: node.title,
                        handle: node.handle,
                        imageDesktop: desktopUrl,
                        imageMobile: mobileImgUrl,
                        videoMobile: mobileVideoUrl,
                        description: node.heroText?.value || "",
                        variantId: node.variants?.edges[0]?.node?.id || null
                    };
                })
                .filter(s => s.imageDesktop !== '');

            if (this.slides.length > 0) {
                this.render();
                this.startAutoPlay();
                this.attachListeners();
                this.handleResize();
                this.preloadImage(1); // Preload next slide
            } else {
                this.container.style.display = 'none';
            }
        } else {
            this.container.style.display = 'none';
        }
    }

    handleResize() {
        window.addEventListener('resize', () => {
            // Re-render only if switching between mobile/desktop if necessary,
            // or let CSS handle transition for static images, but for video we need to swap.
            this.render();
        });
    }

    getMedia(slide) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            if (slide.videoMobile) {
                return { type: 'video', url: slide.videoMobile };
            }
            return { type: 'image', url: slide.imageMobile };
        }
        return { type: 'image', url: slide.imageDesktop };
    }

    render() {
        if (this.slides.length === 0) return;

        this.container.innerHTML = `
            <div class="hs-track">
                ${this.slides.map((slide, i) => {
            const media = this.getMedia(slide);
            const mediaHtml = media.type === 'video'
                ? `<video class="hs-media hs-video" src="${media.url}" autoplay muted loop playsinline ${i === 0 ? 'fetchpriority="high"' : ''} style="width: 100%; height: 100%; object-fit: cover;"></video>`
                : `<img class="hs-media hs-img-bg" src="${media.url}" ${i === 0 ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} alt="${slide.title}" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1;">`;

            return `
                        <div class="hs-slide ${i === this.currentIndex ? 'active' : ''}" data-index="${i}" 
                             onclick="window.location.href='${slide.handle}.html'" style="cursor: pointer;">
                            ${mediaHtml}
                            <div class="overlay">
                                <div class="overlay-inner">
                                    <span class="hs-badge fade-up">Exclusive Release</span>
                                    <h1 class="slide-title">${slide.description || slide.title}</h1>
                                    <a href="${slide.handle}.html" class="cta-primary">Explore Fragrance</a>
                                </div>
                            </div>
                            
                            <!-- Floating Info Card (Requested Design) -->
                            <div class="hs-featured-card">
                                <div class="hs-card-eyebrow">BESTSELLER</div>
                                <h2 class="hs-card-title">${slide.title}</h2>
                                <div class="hs-card-notes">PREMIUM · HANDCRAFTED · EXOTIC</div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
            
            <div class="hs-controls">
                <button class="hs-arrow hs-prev" aria-label="Previous">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div class="hs-dots">
                    ${this.slides.map((_, i) => `<button class="hs-dot ${i === this.currentIndex ? 'active' : ''}" data-index="${i}"></button>`).join('')}
                </div>
                <button class="hs-arrow hs-next" aria-label="Next">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18l6-6-6-6"/></svg>
                </button>
            </div>
        `;
    }

    attachListeners() {
        const prev = this.container.querySelector('.hs-prev');
        const next = this.container.querySelector('.hs-next');
        const dots = this.container.querySelectorAll('.hs-dot');
        const cartBtns = this.container.querySelectorAll('.cta-cart-btn');

        if (prev) prev.addEventListener('click', () => this.goToSlide(this.currentIndex - 1));
        if (next) next.addEventListener('click', () => this.goToSlide(this.currentIndex + 1));

        dots.forEach(dot => {
            dot.addEventListener('click', () => this.goToSlide(parseInt(dot.dataset.index)));
        });

        // Pause on hover
        this.container.addEventListener('mouseenter', () => this.stopAutoPlay());
        this.container.addEventListener('mouseleave', () => this.startAutoPlay());

        // Responsive handling
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.updateOnResize(), 100);
        });
    }

    updateOnResize() {
        const slides = this.container.querySelectorAll('.hs-slide');
        slides.forEach((slideEl, i) => {
            const slide = this.slides[i];
            const bg = slideEl.querySelector('.hs-bg');
            if (bg) {
                const url = this.getImage(slide);
                bg.style.backgroundImage = `url('${url}')`;
            }
        });
    }

    goToSlide(index) {
        const total = this.slides.length;
        let nextIndex = index;

        if (index >= total) nextIndex = 0;
        if (index < 0) nextIndex = total - 1;

        // Update DOM classes
        const slides = this.container.querySelectorAll('.hs-slide');
        const dots = this.container.querySelectorAll('.hs-dot');

        slides[this.currentIndex].classList.remove('active');
        dots[this.currentIndex].classList.remove('active');

        this.currentIndex = nextIndex;

        slides[this.currentIndex].classList.add('active');
        dots[this.currentIndex].classList.add('active');

        // Preload next image (if any)
        this.preloadImage((this.currentIndex + 1) % total);
    }

    startAutoPlay() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.goToSlide(this.currentIndex + 1), 3000);
    }

    stopAutoPlay() {
        clearInterval(this.timer);
    }

    getImage(slide) {
        const isMobile = window.innerWidth <= 768;
        return isMobile ? slide.imageMobile : slide.imageDesktop;
    }

    preloadImage(index) {
        if (!this.slides[index]) return;
        const img = new Image();
        img.src = this.getImage(this.slides[index]);
    }
}

// Global initialization or export
window.HeroSlider = HeroSlider;
export default HeroSlider;
