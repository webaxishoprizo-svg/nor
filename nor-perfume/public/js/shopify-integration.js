/* ============================================================
   NOR PERFUME — SHOPIFY INTEGRATION MANAGER
   Main entry point that orchestrates product loading and cart UI.
   ============================================================ */

import { shopifyQuery, QUERIES } from './shopify.js';
import cartManager from './cart.js';
import productManager from './product.js';
import HeroSlider from './hero-slider.js';
import BestSellerManager from './best-seller.js';
import NewArrivalsManager from './new-arrivals.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 0. Force refresh Shopify data by clearing session cache
    sessionStorage.clear();

    // 1. Parallelize initial data tasks for maximum speed
    const initTasks = [
        cartManager.fetchCart(),
        setupSearchBridge(),
        renderFooter()
    ];


    // 2. Identify Page
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';

    // 3. Add page-specific tasks to the parallel queue
    if (page === 'index.html' || page === 'collections.html' || page === '') {
        initTasks.push(productManager.renderProductGrid('#shopify-product-grid'));

        // Homepage only high-performance sections
        if (page === 'index.html' || page === '') {
            initTasks.push(productManager.renderCollections('#shopify-collections-grid', 6));
            initTasks.push((async () => { new HeroSlider('#shopify-hero-slider'); })());
            initTasks.push((async () => { new BestSellerManager('#bestSeller'); })());
            initTasks.push((async () => { new NewArrivalsManager(); })());
        }
    } else if (page === 'cart.html') {
        initTasks.push((async () => {
            await import('./cart-ui.js');
            return productManager.renderProductGrid('#shopify-suggestions-grid', 4);
        })());
    } else {
        const nonProductPages = ['product.html', 'profile.html', 'about.html', 'faq.html', 'track-order.html', 'privacy-policy.html', 'return-policy.html', 'shipping-policy.html', 'terms.html', 'contact.html', 'success.html', 'design-system.html'];

        const urlParams = new URLSearchParams(window.location.search);
        const queryHandle = urlParams.get('handle');

        if (page === 'product.html' && queryHandle) {
            initTasks.push(productManager.renderProductPage(queryHandle));
        } else if (page.endsWith('.html') && !nonProductPages.includes(page)) {
            const handle = page.replace('.html', '');
            initTasks.push(productManager.renderProductPage(handle));
        }
    }

    // Run all tasks in parallel to avoid waterfalls
    try {
        await Promise.all(initTasks);
    } catch (err) {
        console.warn('Initial data tasks failed partially:', err);
    }

    // 4. Newsletter Setup (Doesn't need to be awaited)
    const nlForm = document.getElementById('nl-form');
    // ... rest of newsletter logic
    if (nlForm) {
        nlForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = nlForm.querySelector('input').value;
            const btn = nlForm.querySelector('button');
            const originalText = btn.textContent;

            btn.textContent = 'Joining...';
            try {
                const res = await shopifyQuery(QUERIES.customerEmailMarketingSubscribe, {
                    input: { email: email }
                });

                if (res && res.customerEmailMarketingSubscribe && !res.customerEmailMarketingSubscribe.userErrors?.length) {
                    btn.textContent = '✓ Subscribed';
                    nlForm.querySelector('input').value = '';
                } else {
                    const errorMsg = res.errors?.[0]?.message || res.customerEmailMarketingSubscribe?.userErrors?.[0]?.message || 'Check Permission';
                    btn.textContent = errorMsg.substring(0, 15) + (errorMsg.length > 15 ? '...' : '');
                    console.warn('Shopify Dashboard Sync Error:', res);
                    setTimeout(() => btn.textContent = originalText, 5000);
                }
            } catch (error) {
                btn.textContent = 'Connection Fail';
                setTimeout(() => btn.textContent = originalText, 3000);
            }
        });
    }
});

async function setupSearchBridge() {
    const data = await shopifyQuery(QUERIES.getProducts, { first: 20 });
    if (data && data.products) {
        const products = data.products.edges.map(e => {
            const title = e.node.title;
            let productUrl = e.node.handle + '.html';


            return {
                name: title,
                url: productUrl,
                img: e.node.images.edges[0]?.node?.url || '',
                price: '₹' + parseFloat(e.node.priceRange.minVariantPrice.amount).toLocaleString('en-IN')
            };
        });

        // Overwrite the global testProducts used in main.js search
        if (window.testProducts) {
            window.testProducts.length = 0;
            window.testProducts.push(...products);
        }
    }
}


// Global hook for legacy triggers if any
window.syncCartState = () => cartManager.fetchCart();

/**
 * Renders Social Icons and Dynamic Shop Collections in Footer
 */
async function renderFooter() {
    // 1. Social Icons Enhancement
    const socialRows = document.querySelectorAll('.social-row');
    const socialHTML = `
        <a href="https://www.instagram.com/norperfumeofficial/" target="_blank" aria-label="Instagram" style="color: var(--c-silver); transition: color 0.3s var(--ease); opacity: 0.8; margin-right: 12px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
        </a>
        <a href="https://www.facebook.com/norperfumeofficial/" target="_blank" aria-label="Facebook" style="color: var(--c-silver); transition: color 0.3s var(--ease); opacity: 0.8; margin-right: 12px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
        </a>
        <a href="https://www.linkedin.com/company/norperfume/" target="_blank" aria-label="LinkedIn" style="color: var(--c-silver); transition: color 0.3s var(--ease); opacity: 0.8;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
        </a>
    `;
    socialRows.forEach(row => {
        row.innerHTML = socialHTML;
        row.style.display = 'flex';
        row.style.alignItems = 'center';
    });

    // 2. Dynamic Collection Links
    const shopCols = document.querySelectorAll('.fb-col');
    const data = await shopifyQuery(QUERIES.getCollections, { first: 8 });

    if (data && data.collections) {
        let linksHTML = '<h5>Shop</h5>';
        data.collections.edges.forEach(e => {

            const c = e.node;
            // Exclude internal utility collections
            if (['hero-slider', 'frontpage', 'all'].includes(c.handle)) return;
            linksHTML += `<a href="collections.html?collection=${c.handle}">${c.title}</a>`;
        });
        linksHTML += `<a href="collections.html">All Collections</a>`;

        shopCols.forEach(col => {
            const heading = col.querySelector('h4, h5');
            if (heading && heading.textContent.trim().includes('Shop')) {
                col.innerHTML = linksHTML;
            }
        });
    }

    // 3. Reorganize Footer Columns (Support vs Legal)
    const allCols = document.querySelectorAll('.fb-col');
    let supportCol, legalCol;
    allCols.forEach(col => {
        const heading = col.querySelector('h4, h5');
        if (heading) {
            if (heading.innerText.includes('Support')) supportCol = col;
            if (heading.innerText.includes('Legal')) legalCol = col;
        }
    });

    if (supportCol && legalCol) {
        const aboutLink = legalCol.querySelector('a[href="about.html"]');
        if (aboutLink) {
            const h = supportCol.querySelector('h4, h5');
            // Move it to top of Support
            h.insertAdjacentElement('afterend', aboutLink);
            aboutLink.style.display = 'block';
            aboutLink.style.marginBottom = '14px';
        } else if (!supportCol.querySelector('a[href="about.html"]')) {
            // If missing entirely (like index.html), inject it
            const h = supportCol.querySelector('h4, h5');
            const link = document.createElement('a');
            link.href = 'about.html';
            link.textContent = 'About NOR';
            link.style.display = 'block';
            link.style.marginBottom = '14px';
            h.insertAdjacentElement('afterend', link);
        }
    }
}



