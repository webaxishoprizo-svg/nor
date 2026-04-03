/* ============================================================
   NOR PERFUME - PRODUCT COMPONENT
   Handles fetching and rendering product data from Shopify.
   ============================================================ */

import { shopifyQuery, QUERIES } from './shopify.js';
import cartManager from './cart.js';

const RUPEE_SYMBOL = '\u20B9';
const ADDED_LABEL = '\u2713 Added';

class ProductManager {
    isVariantAvailable(product, variant) {
        return Boolean(
            product?.availableForSale !== false &&
            variant?.availableForSale !== false &&
            variant?.id
        );
    }

    getCartErrorMessage(result) {
        if (!result) return 'Unable to update cart right now.';

        if (Array.isArray(result.errors)) {
            return result.errors[0]?.message || 'Unable to update cart right now.';
        }

        if (typeof result.errors === 'string') {
            return result.errors;
        }

        return 'Unable to update cart right now.';
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

    markButtonUnavailable(button, label = null) {
        if (!button) return;

        const nextLabel = label || (button.classList.contains('btn-buy-now') ? 'Unavailable' : 'Sold Out');
        button.disabled = true;
        button.dataset.shopifyAttached = 'true';
        button.classList.add('is-unavailable');
        button.setAttribute('aria-disabled', 'true');
        button.removeAttribute('data-variant');
        button.textContent = nextLabel;
    }

    resetActionButtons(scope = document) {
        scope.querySelectorAll('.btn-add-cart, .btn-buy-now').forEach((button) => {
            if (button.classList.contains('is-unavailable') || button.disabled) return;

            const fallbackLabel = button.classList.contains('btn-buy-now') ? 'Buy Now' : 'Add to Cart';
            button.textContent = button.dataset.defaultLabel || fallbackLabel;
        });
    }

    /**
     * Renders a list of products into a specified container
     */
    async renderProductGrid(selector, count = 20) {
        const container = document.querySelector(selector);
        if (!container) return;

        const urlParams = new URLSearchParams(window.location.search);
        const collectionHandle = urlParams.get('collection');

        if (collectionHandle) {
            return this.renderCollectionProducts(selector, collectionHandle, count);
        }

        const cacheKey = `shopify_products_${count}`;
        let products = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');

        if (!products) {
            const data = await shopifyQuery(QUERIES.getProducts, { first: count });
            if (data && data.products) {
                products = data.products.edges;
                sessionStorage.setItem(cacheKey, JSON.stringify(products));
            }
        }

        if (products) {
            container.innerHTML = '';
            container.className = 'product-grid-modern';
            products.forEach((edge, i) => {
                const node = edge.node;
                const card = this.createProductCard(node, i);
                container.insertAdjacentHTML('beforeend', card);
            });

            this.triggerAnimations(container);
            this.attachAddToCartListeners(container);
        }
    }

    /**
     * Renders products from a specific collection
     */
    async renderCollectionProducts(selector, handle, first = 4) {
        const container = document.querySelector(selector);
        if (!container) return;

        const data = await shopifyQuery(QUERIES.getCollectionByHandle, { handle, first });
        if (data && data.collection) {
            container.innerHTML = '';
            data.collection.products.edges.forEach((edge, i) => {
                const isSuggestion = selector.includes('suggestions') || selector.includes('cart') || selector.includes('suggest');
                const card = this.createProductCard(edge.node, i, isSuggestion);
                container.insertAdjacentHTML('beforeend', card);
            });

            this.triggerAnimations(container);
            this.attachAddToCartListeners(container);
        }
    }

    /**
     * Renders a list of collection banners/links
     */
    async renderCollections(selector, first = 6) {
        const container = document.querySelector(selector);
        if (!container) return;

        const data = await shopifyQuery(QUERIES.getCollections, { first });
        if (data && data.collections) {
            container.innerHTML = '';
            data.collections.edges.forEach((edge, i) => {
                const collection = edge.node;
                if (['hero-slider', 'frontpage', 'all'].includes(collection.handle)) return;

                const img = collection.image?.url || collection.products?.edges[0]?.node?.featuredImage?.url || '';

                const card = `
                    <article class="modern-card fade-up" data-delay="${i * 150}" onclick="window.location.href='collections.html?collection=${collection.handle}'" style="cursor: pointer; aspect-ratio: 16/10;">
                        <div class="card-media">
                            <img src="${img}" alt="${collection.title}" loading="lazy">
                            <div class="card-overlay-modern" style="background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);">
                                <span class="hs-badge" style="color: var(--c-gold); margin-bottom: 8px;">${collection.handle.includes('nor') ? 'NOR — SERIES I' : 'NOR — EXPLORER'}</span>
                                <h3 class="card-name" style="font-size: 2rem; margin-bottom: 12px;">${collection.title}</h3>
                                <div class="card-meta">
                                    <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #fff;">Discover Scene &rsaquo;</span>
                                </div>
                            </div>
                        </div>
                    </article>
                `;
                container.insertAdjacentHTML('beforeend', card);
            });
            this.triggerAnimations(container);
        }
    }

    /**
     * Triggers reveal animations for dynamically injected elements
     */
    triggerAnimations(container) {
        const elements = container.querySelectorAll('.fade-up, .fade-left, .fade-right, .scale-up, .reveal-text');
        elements.forEach(el => {
            const delay = parseInt(el.dataset.delay || '0', 10);
            setTimeout(() => {
                el.classList.add('visible');
            }, delay);
        });
    }

    /**
     * Helper to create a product card HTML based on original design
     */
    createProductCard(product, index, isSuggestion = false) {
        const rawImg = product.images.edges[0]?.node?.url || '';
        const isHighPrio = index < 2 && !isSuggestion;
        const targetWidth = (isHighPrio || isSuggestion) ? 800 : 450;
        const img = rawImg ? `${rawImg}${rawImg.includes('?') ? '&' : '?'}width=${targetWidth}&format=webp` : '';

        const { price, compareAt, offerPercent } = this.getPriceDetails(product);
        const formattedPrice = price.toLocaleString('en-IN');
        const formattedCompareAt = compareAt ? compareAt.toLocaleString('en-IN') : '';
        const variant = product.variants.edges[0]?.node;
        const variantId = variant?.id || '';
        const isAvailable = this.isVariantAvailable(product, variant);
        const delay = index * 80;
        const productUrl = `${product.handle}.html`;

        if (isSuggestion) {
            return `
                <div class="product-card glass fade-up" data-delay="${delay}" onclick="window.location.href='${productUrl}'" style="cursor: pointer; position: relative;">
                    <div class="card-img-wrap" style="height: 380px; overflow: hidden; border-radius: 8px; position: relative; margin-bottom: 24px;">
                        ${offerPercent ? `<span class="product-offer-badge">${offerPercent}% OFF</span>` : ''}
                        <img src="${img}" alt="${product.title}" class="card-img" ${isHighPrio ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} style="width: 100%; height: 100%; object-fit: cover;">
                        <div class="card-overlay" style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%);"></div>
                    </div>
                    <div class="card-info" style="text-align: center;">
                        <h3 class="card-title" style="font-family: var(--serif); font-size: 1.8rem; font-weight: 300; margin-bottom: 8px; color: var(--c-cream);">${product.title}</h3>
                        <div class="card-price-stack" style="justify-content: center; margin-bottom: 24px;">
                            <p class="card-price" style="font-family: var(--sans); font-size: 1.1rem; color: var(--c-gold); margin: 0;">${RUPEE_SYMBOL}${formattedPrice}</p>
                            ${compareAt ? `<span class="card-compare-price">${RUPEE_SYMBOL}${formattedCompareAt}</span>` : ''}
                        </div>
                        ${isAvailable
                    ? `<button class="cta-ghost btn-add-shopify" data-variant="${variantId}" onclick="event.stopPropagation();" style="position: relative; z-index: 10; width: 100%; padding: 12px; border-color: var(--c-gold-dim); color: var(--c-gold);">Quick Add</button>`
                    : `<button class="cta-ghost btn-add-shopify is-unavailable" type="button" disabled onclick="event.stopPropagation();" style="position: relative; z-index: 10; width: 100%; padding: 12px; border-color: var(--c-gold-dim); color: var(--c-gold);">Sold Out</button>`}
                    </div>
                </div>
            `;
        }

        return `
            <article class="modern-card fade-up" data-delay="${delay}" onclick="window.location.href='${productUrl}'" style="cursor: pointer;">
                <div class="card-media">
                    ${offerPercent ? `<span class="product-offer-badge">${offerPercent}% OFF</span>` : ''}
                    <img src="${img}" alt="${product.title}" ${isHighPrio ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'}>
                    <div class="card-overlay-modern">
                        <div class="card-info-modern">
                            <h3 class="card-name">${product.title}</h3>
                            <div class="card-meta">
                                <div class="card-price-stack">
                                    <span class="card-price">${RUPEE_SYMBOL}${formattedPrice}</span>
                                    ${compareAt ? `<span class="card-compare-price">${RUPEE_SYMBOL}${formattedCompareAt}</span>` : ''}
                                </div>
                            </div>
                            <div class="card-actions-modern">
                                ${isAvailable
                ? `<button class="btn-modern-add btn-quick-add-shopify" data-variant="${variantId}" onclick="event.stopPropagation();">Add to Cart</button>`
                : `<button class="btn-modern-add btn-quick-add-shopify is-unavailable" type="button" disabled onclick="event.stopPropagation();">Sold Out</button>`}
                                <a href="${productUrl}" class="btn-modern-view" aria-label="View Details" onclick="event.stopPropagation();">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * Renders full product detail page content
     */
    async renderProductPage(handle) {
        const data = await shopifyQuery(QUERIES.getProductByHandle, { handle });

        if (data && data.product) {
            const product = data.product;
            const variant = product.variants.edges[0]?.node;
            if (!variant) return;

            const variantId = variant.id;
            const isAvailable = this.isVariantAvailable(product, variant);
            const isManualPage = false;

            if (!isManualPage) {
                const titleEl = document.getElementById('pdp-title');
                if (titleEl) titleEl.textContent = product.title;

                const categoryEl = document.getElementById('pdp-category');
                if (categoryEl) {
                    const series = product.handle.includes('nor') ? 'NOR — SERIES I' : 'NOR — EXPLORER';
                    const type = product.productType || 'Premium Fragrance';
                    categoryEl.textContent = `${series} · ${type}`;
                }

                const subEl = document.getElementById('pdp-sub');
                if (subEl) {
                    // Try to get scent notes from tags as a subtitle if available
                    const scentNotes = product.tags?.find(t => t.includes(':'))?.split(':')[1] || 'Signature Luxury Perfume';
                    subEl.textContent = scentNotes;
                }

                const descEl = document.getElementById('pdp-description');
                if (descEl) {
                    descEl.innerHTML = product.descriptionHtml || '';
                }

                const priceEl = document.getElementById('pdp-price');
                if (priceEl) {
                    const price = parseFloat(variant.price.amount);
                    const compareAt = parseFloat(variant.compareAtPrice?.amount || product.compareAtPriceRange?.minVariantPrice?.amount || 0);
                    const priceStr = `${RUPEE_SYMBOL}${price.toLocaleString('en-IN')}`;
                    
                    if (compareAt > price) {
                        const compareStr = `${RUPEE_SYMBOL}${compareAt.toLocaleString('en-IN')}`;
                        priceEl.innerHTML = `${priceStr} <span class="pdp-compare-price" style="font-size: 1.4rem; color: rgba(255,255,255,0.3); text-decoration: line-through; margin-left: 16px; font-family: var(--serif);">${compareStr}</span>`;
                    } else {
                        priceEl.textContent = priceStr;
                    }
                }

                // Update Scent Profile Tags
                const tagsEl = document.getElementById('pdp-tags');
                if (tagsEl) {
                    tagsEl.innerHTML = '';
                    
                    // Filter out internal tags and "series" tags to show only descriptive scent notes
                    let displayTags = (product.tags || []).filter(t => 
                        !t.includes(':') && 
                        !t.toLowerCase().includes('series') && 
                        !t.toLowerCase().includes('collection') &&
                        !t.startsWith('__')
                    );
                    
                    // Fallback if no clean tags exist
                    if (displayTags.length === 0) {
                        displayTags = ['Signature', 'Luxury', 'Long-lasting'];
                    }

                    displayTags.slice(0, 4).forEach(tag => {
                        const span = document.createElement('span');
                        span.style.cssText = 'font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; padding: 6px 12px; border: 1px solid rgba(196,163,90,0.3); border-radius: 4px; color: var(--c-cream);';
                        span.textContent = tag;
                        tagsEl.appendChild(span);
                    });
                }

                document.title = `${product.title} | NOR Perfume`;
            }

            const stickyBar = document.getElementById('sticky-buy-bar');
            if (stickyBar) {
                const sTitle = stickyBar.querySelector('.sbb-title');
                const sPrice = stickyBar.querySelector('.sbb-price');
                const sImg = stickyBar.querySelector('.sbb-img');
                const sBtn = stickyBar.querySelector('.btn-add-cart');

                if (sTitle) sTitle.textContent = product.title;
                if (sPrice) {
                    sPrice.textContent = RUPEE_SYMBOL + parseFloat(variant.price.amount).toLocaleString('en-IN');
                }
                if (sImg) sImg.src = product.images.edges[0]?.node?.url;
                if (sBtn) {
                    if (isAvailable) {
                        sBtn.dataset.variant = variantId;
                        sBtn.dataset.shopifyAttached = 'false';
                    } else {
                        this.markButtonUnavailable(sBtn);
                    }
                }
            }

            const actionButtons = document.querySelectorAll('.btn-add-cart, .btn-buy-now');
            actionButtons.forEach(btn => {
                if (btn.dataset.shopifyAttached) return;
                if (!isAvailable) {
                    this.markButtonUnavailable(btn);
                    return;
                }

                const text = btn.textContent.toLowerCase();
                const isBuyNowButton = btn.classList.contains('btn-buy-now') || text.includes('buy') || text.includes('now');

                btn.dataset.defaultLabel = btn.textContent.trim();
                btn.dataset.variant = variantId;
                btn.dataset.shopifyAttached = 'true';

                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const originalText = btn.textContent;

                    if (isBuyNowButton) {
                        btn.textContent = 'Wait...';
                        const res = await cartManager.createBuyNowCheckout(variantId, 1);

                        if (res.success && res.checkoutUrl) {
                            window.location.href = res.checkoutUrl;
                            return;
                        }

                        const errorMessage = this.getCartErrorMessage(res).toLowerCase();
                        if (errorMessage.includes('unavailable') || errorMessage.includes('sold out')) {
                            this.markButtonUnavailable(btn);
                            return;
                        }

                        btn.textContent = 'Error';
                        setTimeout(() => {
                            btn.textContent = originalText;
                        }, 1500);
                        return;
                    }

                    btn.textContent = 'Adding...';
                    const res = await cartManager.addItem(variantId, 1);

                    if (res.success) {
                        btn.textContent = ADDED_LABEL;
                        setTimeout(() => {
                            btn.textContent = originalText;
                        }, 1500);
                        return;
                    }

                    const errorMessage = this.getCartErrorMessage(res).toLowerCase();
                    if (errorMessage.includes('unavailable') || errorMessage.includes('sold out')) {
                        this.markButtonUnavailable(btn);
                        return;
                    }

                    btn.textContent = 'Error';
                    setTimeout(() => {
                        btn.textContent = originalText;
                    }, 1500);
                });
            });

            if (!window.__norProductPageButtonResetBound) {
                window.addEventListener('pageshow', () => {
                    this.resetActionButtons();
                });
                window.__norProductPageButtonResetBound = true;
            }

            const galleryImg = document.getElementById('pdp-gallery-main') || document.querySelector('.pdp-gallery-main');
            if (galleryImg && (galleryImg.src.includes('data:image') || galleryImg.style.opacity === '0' || !isManualPage)) {
                const rawUrl = product.images.edges[0]?.node?.url;
                if (rawUrl) {
                    galleryImg.src = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}width=800&format=webp`;
                    galleryImg.style.opacity = '1';
                    galleryImg.setAttribute('loading', 'eager');
                    galleryImg.alt = product.title;
                }
            }

            this.renderProductGrid('#shopify-suggestions-grid', 4);
            this.updateAccordions(product);

            // Dynamic "What's in the Box" injection
            const whatsInBoxEl = document.getElementById('pdp-whats-in-box');
            if (whatsInBoxEl && product.whatsInTheBox?.value) {
                const parseBoxContent = (val) => {
                    if (!val) return null;
                    try {
                        const parsed = JSON.parse(val);
                        if (parsed.type === 'root' && Array.isArray(parsed.children)) {
                            // Extract text items from list or paragraphs
                            let rawItems = [];
                            parsed.children.forEach(child => {
                                if (child.type === 'list' && Array.isArray(child.children)) {
                                    child.children.forEach(li => {
                                        if (li.type === 'list-item' && Array.isArray(li.children)) {
                                            rawItems.push(li.children.map(c => c.value || '').join(''));
                                        }
                                    });
                                } else if (child.type === 'paragraph' && Array.isArray(child.children)) {
                                    rawItems.push(child.children.map(c => c.value || '').join(''));
                                }
                            });

                            // Intelligently split strings if they contain multiple manual bullets or numbers
                            let finalItems = [];
                            rawItems.forEach(rawText => {
                                // Split by bullets (•, *, -, ·) or numbered list patterns (1., 2. etc)
                                // We use a regex that lookaheads for bullets or numbers to split properly
                                const tokens = rawText.split(/(?=[•·*\-\u2022\u25cf\u25aa\u25ab])|(?=\d+\.)/);
                                tokens.forEach(token => {
                                    // Clean up: remove the manual bullet/number prefix and trim
                                    const cleaned = token.replace(/^[•·*\-\u2022\u25cf\u25aa\u25ab\s]+|^\d+\.\s*/, '').trim();
                                    if (cleaned) {
                                        finalItems.push(cleaned);
                                    }
                                });
                            });
                            
                            if (finalItems.length > 0) {
                                return finalItems.map((text, idx) => `
                                    <div style="font-size: 0.95rem; color: var(--c-cream); padding: 12px 0; ${idx < finalItems.length - 1 ? 'border-bottom: 1px solid rgba(255,255,255,0.05);' : ''} display: flex; align-items: center; gap: 12px;">
                                        <span style="display: block; width: 6px; height: 6px; border-radius: 50%; background: var(--c-gold); flex-shrink: 0; margin-top: 1px;"></span>
                                        <span style="line-height: 1.4;">${text}</span>
                                    </div>
                                `).join('');
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing box metafield:', e);
                    }
                    return null;
                };

                const boxHtml = parseBoxContent(product.whatsInTheBox.value);
                if (boxHtml) {
                    whatsInBoxEl.innerHTML = boxHtml;
                }
            }
        }
    }

    /**
     * Updates the product accordion with Shopify metafields or fallbacks
     * Preserves existing UI, design and animations.
     */
    updateAccordions(product) {
        const accordionItems = document.querySelectorAll('.accordion-item');
        accordionItems.forEach(item => {
            const h3 = item.querySelector('h3');
            const contentEl = item.querySelector('.accordion-content');
            if (!h3 || !contentEl) return;

            const title = h3.textContent.trim().toLowerCase();

            const parseRichText = (val) => {
                if (!val) return '';
                if (!val.startsWith('{')) return val;

                try {
                    const parsed = JSON.parse(val);
                    if (parsed.type === 'root' && Array.isArray(parsed.children)) {
                        return parsed.children.map(child => {
                            if (child.type === 'list' && Array.isArray(child.children)) {
                                const listItems = child.children.map(li => {
                                    const text = li.children?.map(c => c.value || '').join('') || '';
                                    return `<li>${text}</li>`;
                                }).join('');
                                return `<ul>${listItems}</ul>`;
                            }
                            if (child.type === 'paragraph' && Array.isArray(child.children)) {
                                const rawText = child.children.map(c => c.value || '').join('') || '';
                                // Split by bullets or numbers if they appear mid-paragraph
                                const tokens = rawText.split(/(?=[•·*\-\u2022\u25cf\u25aa\u25ab])|(?=\d+\.)/);
                                if (tokens.length > 1) {
                                    return tokens.map(t => {
                                        const clean = t.replace(/^[•·*\-\u2022\u25cf\u25aa\u25ab\s]+|^\d+\.\s*/, '').trim();
                                        return clean ? `<p>${clean}</p>` : '';
                                    }).join('');
                                }
                                return `<p>${rawText}</p>`;
                            }
                            if (child.type === 'text') return child.value || '';
                            return '';
                        }).join('');
                    }
                } catch (e) {
                    console.error('Error parsing metafield JSON:', e);
                }

                return val;
            };

            if (title.includes('composition')) {
                const shopifyVal = parseRichText(product.composition?.value);
                if (shopifyVal && shopifyVal.trim() !== '') {
                    contentEl.innerHTML = shopifyVal;
                }
            } else if (title.includes('how to use')) {
                const shopifyVal = parseRichText(product.howToUse?.value);
                if (shopifyVal && shopifyVal.trim() !== '') {
                    contentEl.innerHTML = shopifyVal;
                }
            }
        });
    }

    attachAddToCartListeners(container) {
        container.querySelectorAll('.btn-add-shopify:not([disabled]), .btn-quick-add-shopify:not([disabled])').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const variantId = btn.dataset.variant;
                if (!variantId) return;

                const originalText = btn.textContent;
                btn.classList.add('loading');
                btn.textContent = 'Adding...';

                const res = await cartManager.addItem(variantId, 1);

                if (res.success) {
                    btn.textContent = ADDED_LABEL;
                    btn.classList.add('added');
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.classList.remove('added');
                        btn.classList.remove('loading');
                    }, 1500);
                    return;
                }

                const errorMessage = this.getCartErrorMessage(res).toLowerCase();
                if (errorMessage.includes('unavailable') || errorMessage.includes('sold out')) {
                    this.markButtonUnavailable(btn);
                    btn.classList.remove('loading');
                    return;
                }

                btn.textContent = 'Error';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('loading');
                }, 1500);
            });
        });
    }
}

const productManager = new ProductManager();
export default productManager;
