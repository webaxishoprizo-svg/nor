/* ============================================================
   NOR PERFUME — PRODUCT DETAIL PAGE (PDP) UI
   Sticky Buy Section | Accordions | Smooth Scroll
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    initStickyBuyBar();
    initAccordions();
});

/**
 * Handles the Sticky Buy Bar visibility on scroll
 */
function initStickyBuyBar() {
    const stickyBar = document.getElementById('sticky-buy-bar');
    const mainAddToCart = document.querySelector('.pdp-wrapper .btn-add-cart');
    
    if (!stickyBar || !mainAddToCart) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Show sticky bar when the main Add to Cart button is NO LONGER visible
            if (entry.isIntersecting) {
                stickyBar.classList.remove('visible');
            } else {
                // Only show if we've scrolled PAST the button (not above it)
                if (entry.boundingClientRect.top < 0) {
                    stickyBar.classList.add('visible');
                }
            }
        });
    }, { threshold: 0 });

    observer.observe(mainAddToCart);
}

/**
 * Handles Accordion toggles in the Details section
 */
function initAccordions() {
    const headers = document.querySelectorAll('.accordion-header');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const isActive = item.classList.contains('active');
            
            // Close all other items
            document.querySelectorAll('.accordion-item').forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            // Toggle current item
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}
