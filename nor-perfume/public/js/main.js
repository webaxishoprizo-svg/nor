/* ============================================================
   NOR PERFUME — MAIN JS
   Custom cursor | Scroll reveal | Navbar | Parallax |
   Marquee pause | Counter animation | Cart | Newsletter |
   Glass glow | Float card tilt | Page transitions
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    /* ─────────────────────────────────────────
       1. SMOOTH SCROLL (LENIS)
    ───────────────────────────────────────── */
    let lenis = null;

    // Many secondary pages don't load Lenis. Fall back to native scrolling
    // instead of crashing the rest of the shared page logic.
    if (typeof window.Lenis === "function") {
        lenis = new window.Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            orientation: "vertical",
            smoothTouch: false,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        // Sync with other observers
        lenis.on("scroll", () => {
            // Optional: Trigger specific heavy animations on scroll if needed
        });
    }

    /* Custom cursor logic removed */

    /* ─────────────────────────────────────────
       2. SCROLL REVEAL — Intersection Observer (Class-based)
    ───────────────────────────────────────── */
    const revealSelectors = ".fade-up, .fade-left, .fade-right, .scale-up, .reveal-text, .reveal-box";
    const revealElements = document.querySelectorAll(revealSelectors);

    if ("IntersectionObserver" in window && revealElements.length > 0) {
        document.documentElement.classList.add("reveal-ready");

        const revealCallback = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const delay = el.dataset.delay || 0;

                    setTimeout(() => {
                        el.classList.add("visible");
                    }, delay);

                    observer.unobserve(el);
                }
            });
        };

        const revealObserver = new IntersectionObserver(revealCallback, {
            threshold: 0.1,
            rootMargin: "0px 0px -60px 0px"
        });

        revealElements.forEach(el => {
            revealObserver.observe(el);
        });
    } else {
        revealElements.forEach(el => el.classList.add("visible"));
    }

    // Handle Hero Stagger (Motion JS is fine for these specific elements)
    if (window.Motion) {
        const { animate, stagger } = window.Motion;
        const heroElements = document.querySelectorAll('.hero-eyebrow, .hero-title .line-wrap, .hero-sub, .hero-ctas, .float-card');

        if (heroElements.length > 0) {
            heroElements.forEach(el => {
                el.style.opacity = "0";
                el.style.transform = "translateY(20px)";
                el.classList.add("hero-animating");
            });

            animate(
                heroElements,
                { opacity: 1, transform: "translateY(0)" },
                {
                    delay: stagger(0.1, { startDelay: 0.4 }),
                    duration: 0.9,
                    easing: [0.16, 1, 0.3, 1]
                }
            );
        }
    }

    /* ─────────────────────────────────────────
       3. NAVBAR SCROLL STATE & HERO PARALLAX
    ───────────────────────────────────────── */
    const navbar = document.getElementById("navbar");
    const heroBg = document.querySelector(".hero-bg-gradient");
    const heroBody = document.querySelector(".hero-body");

    let lastKnownScrollY = 0;
    let ticking = false;

    const updateScrollElements = () => {
        // Navbar scrolled state
        if (navbar) {
            navbar.classList.toggle("scrolled", lastKnownScrollY > 60);
        }

        // Hero Parallax
        const vh = window.innerHeight;
        if (lastKnownScrollY < vh) {
            const p = lastKnownScrollY / vh;
            if (heroBg) {
                heroBg.style.transform = `translate3d(0, ${lastKnownScrollY * 0.4}px, 0) scale(${1 + p * 0.05})`;
            }
            if (heroBody) {
                heroBody.style.transform = `translate3d(0, ${lastKnownScrollY * 0.25}px, 0)`;
                heroBody.style.opacity = Math.max(0, 1 - p * 1.8).toString();
            }
        }

        ticking = false;
    };

    const onScroll = () => {
        lastKnownScrollY = window.scrollY;
        if (!ticking) {
            window.requestAnimationFrame(updateScrollElements);
            ticking = true;
        }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* ─────────────────────────────────────────
       5. SMOOTH ANCHOR SCROLL
    ───────────────────────────────────────── */

    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener("click", function (e) {
            const id = this.getAttribute("href");
            if (!id || id === "#") return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const navH = navbar ? navbar.offsetHeight : 0;
            window.scrollTo({
                top: target.getBoundingClientRect().top + window.scrollY - navH - 16,
                behavior: "smooth"
            });
        });
    });

    /* ─────────────────────────────────────────
       6. MARQUEE: Pause on hover (CSS handles it too, but JS backup)
    ───────────────────────────────────────── */
    const SHOPIFY_STOREFRONT_ORIGIN = "https://nor-perfume-2.myshopify.com";
    const SHOPIFY_ACCOUNT_URL = `${SHOPIFY_STOREFRONT_ORIGIN}/account`;
    const SHOPIFY_LOGIN_URL = `${SHOPIFY_STOREFRONT_ORIGIN}/account/login`;
    const SHOPIFY_REGISTER_URL = `${SHOPIFY_STOREFRONT_ORIGIN}/account/register`;
    const accountConnection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const shouldSkipIdleWarmup = Boolean(
        accountConnection?.saveData ||
        /(^|-)2g$/.test(accountConnection?.effectiveType || "")
    );

    const ensureHeadHint = (rel, href, useCrossOrigin = false) => {
        if (!href || !document.head) return null;

        const existing = document.head.querySelector(`link[rel="${rel}"][href="${href}"]`);
        if (existing) return existing;

        const hint = document.createElement("link");
        hint.rel = rel;
        hint.href = href;
        if (useCrossOrigin) {
            hint.crossOrigin = "anonymous";
        }

        document.head.appendChild(hint);
        return hint;
    };

    const accountLinkNodes = Array.from(
        document.querySelectorAll(".nav-right a, .mm-footer a")
    ).filter((link) => {
        const href = (link.getAttribute("href") || "").trim().toLowerCase();
        const ariaLabel = (link.getAttribute("aria-label") || "").trim().toLowerCase();
        const text = (link.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

        return (
            ariaLabel.includes("user account") ||
            href === "profile.html" ||
            href.includes("myshopify.com/account") ||
            text.includes("login") ||
            text.includes("account") ||
            text.includes("register") ||
            text.includes("profile")
        );
    });

    if (accountLinkNodes.length > 0) {
        ensureHeadHint("dns-prefetch", SHOPIFY_STOREFRONT_ORIGIN);
        ensureHeadHint("preconnect", SHOPIFY_STOREFRONT_ORIGIN, true);

        accountLinkNodes.forEach((link) => {
            const text = (link.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
            const ariaLabel = (link.getAttribute("aria-label") || "").trim().toLowerCase();
            const isAccountIcon = ariaLabel.includes("user account");
            const isRegisterLink = text.includes("register");

            link.href = isRegisterLink
                ? SHOPIFY_REGISTER_URL
                : (isAccountIcon ? SHOPIFY_ACCOUNT_URL : SHOPIFY_LOGIN_URL);
            link.setAttribute("rel", "noopener");
            link.dataset.accountLink = "true";
        });

        let accountWarmPromise = null;
        const warmShopifyAccount = () => {
            if (accountWarmPromise) return accountWarmPromise;

            accountWarmPromise = Promise.allSettled([
                fetch(`${SHOPIFY_STOREFRONT_ORIGIN}/account`, {
                    mode: "no-cors",
                    credentials: "include",
                    cache: "no-store",
                    keepalive: true,
                }),
                fetch(SHOPIFY_LOGIN_URL, {
                    mode: "no-cors",
                    credentials: "include",
                    cache: "no-store",
                    keepalive: true,
                }),
            ]).catch(() => null);

            return accountWarmPromise;
        };

        const scheduleIdleWarmup = window.requestIdleCallback
            ? (cb) => window.requestIdleCallback(cb, { timeout: 1800 })
            : (cb) => window.setTimeout(cb, 900);

        if (!shouldSkipIdleWarmup) {
            scheduleIdleWarmup(() => {
                warmShopifyAccount();
            });
        }

        accountLinkNodes.forEach((link) => {
            const warmOnce = () => warmShopifyAccount();
            link.addEventListener("pointerenter", warmOnce, { passive: true, once: true });
            link.addEventListener("focus", warmOnce, { passive: true, once: true });
            link.addEventListener("touchstart", warmOnce, { passive: true, once: true });
        });
    }

    const track = document.querySelector(".marquee-track");
    if (track) {
        const strip = track.closest(".marquee-strip");
        strip?.addEventListener("mouseenter", () => track.style.animationPlayState = "paused");
        strip?.addEventListener("mouseleave", () => track.style.animationPlayState = "running");
    }

    /* ─────────────────────────────────────────
       7. STATS COUNTER — ease-out cubic
    ───────────────────────────────────────── */
    const countUp = (el, target) => {
        const dur = 2000;
        const start = performance.now();
        const update = (now) => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 4); // quartic ease-out
            el.textContent = Math.round(eased * target).toLocaleString();
            if (p < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    };

    const statNums = document.querySelectorAll(".stat-num[data-target]");
    const statsObs = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const val = parseInt(el.dataset.target, 10);
            if (!isNaN(val)) countUp(el, val);
            obs.unobserve(el);
        });
    }, { threshold: 0.4 });
    statNums.forEach(el => statsObs.observe(el));

    /* ─────────────────────────────────────────
       8. SHOPIFY CART & PRODUCT INTEGRATION
    ───────────────────────────────────────── */
    // Placeholder for Shopify modular initialization (will be handled by shopify-integration.js)
    if (window.syncCartState) {
        window.syncCartState();
    }

    // Cross-tab real-time updates for cart (if needed in main.js context)
    window.addEventListener('storage', (e) => {
        if (e.key === 'nor_shopify_cart_id') {
            // Let the cartManager handle this when loaded as module
        }
    });

    /* ─────────────────────────────────────────
       9. NEWSLETTER
    ───────────────────────────────────────── */
    const nlForm = document.getElementById("nl-form");
    if (nlForm) {
        nlForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const input = nlForm.querySelector("input[type='email']");
            const btn = nlForm.querySelector("button[type='submit']");
            if (!input || !btn || !input.value) return;

            const origText = btn.textContent;
            btn.textContent = "Submitting...";

            try {
                const res = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: input.value })
                });

                if (res.ok) {
                    btn.textContent = "Subscribed ✓";
                    btn.style.background = "linear-gradient(135deg, #809076, #284139)";
                    btn.style.color = "#fff";
                    input.value = "";
                    input.placeholder = "Thank you for subscribing!";
                } else {
                    btn.textContent = "Error";
                }
            } catch (err) {
                btn.textContent = "Error";
            }

            setTimeout(() => {
                btn.textContent = "Subscribe";
                btn.style.background = "";
                btn.style.color = "";
                input.placeholder = "Your e-mail address";
            }, 3500);
        });
    }

    /* ─────────────────────────────────────────
       10. GLASS CARD MOUSE GLOW — CSS variable proxy
    ───────────────────────────────────────── */
    const glassCards = document.querySelectorAll(
        ".product-card, .review-card, .trust-card, .nl-box, .ed-badge, .float-card"
    );

    glassCards.forEach(card => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Glow
            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);

            // 3D Tilt calculation
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const dx = (x - cx) / cx; // -1 to 1
            const dy = (y - cy) / cy; // -1 to 1

            // Max 6deg tilt
            card.style.setProperty("--tilt-x", `${dy * -6}deg`);
            card.style.setProperty("--tilt-y", `${dx * 6}deg`);
        });

        card.addEventListener("mouseleave", () => {
            card.style.setProperty("--tilt-x", `0deg`);
            card.style.setProperty("--tilt-y", `0deg`);
        });
    });

    /* ─────────────────────────────────────────
       11. FLOAT CARDS — 3-D mouse parallax tilt
    ───────────────────────────────────────── */
    const floatCards = document.querySelectorAll(".float-card");
    let lastMouseX = window.innerWidth / 2;
    let lastMouseY = window.innerHeight / 2;
    let fcRafId;

    document.addEventListener("mousemove", (e) => {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    const animFloatCards = () => {
        // Smooth damp mouse pos
        const cx = (lastMouseX - window.innerWidth / 2) / window.innerWidth;
        const cy = (lastMouseY - window.innerHeight / 2) / window.innerHeight;
        const now = Date.now() / 1500; // slower bob

        floatCards.forEach((fc, i) => {
            const dir = i % 2 === 0 ? 1 : -1;
            const bob = Math.sin(now + i * 1.8) * 12; // gentle float
            const rotY = cx * 18 * dir; // more responsive tilt
            const rotX = cy * -15;

            fc.style.transform = `
                perspective(1000px)
                translateY(${bob}px)
                rotateY(${rotY}deg)
                rotateX(${rotX}deg)
            `;
        });
        fcRafId = requestAnimationFrame(animFloatCards);
    };
    if (floatCards.length) animFloatCards();

    /* ─────────────────────────────────────────
       12. SECTION ENTRANCE COUNTER — horizontal nav line
    ───────────────────────────────────────── */
    // Highlight active nav link based on scroll position
    const sections = document.querySelectorAll("section[id], footer[id]");
    const navLinks = document.querySelectorAll(".nav-link");

    const sectionObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                navLinks.forEach(link => {
                    const href = link.getAttribute("href");
                    if (href && (href.includes(id) || (id === "home" && href === "index.html"))) {
                        link.style.color = "var(--c-cream)";
                    } else {
                        link.style.color = "";
                    }
                });
            }
        });
    }, { threshold: 0.4 });

    sections.forEach(s => sectionObs.observe(s));

    /* ─────────────────────────────────────────
       13. MOBILE MENU
    ───────────────────────────────────────── */
    const mobileMenu = document.getElementById("mobile-menu");
    const menuOpenBtn = document.querySelector(".nav-menu-label");
    const menuCloseBtn = document.getElementById("mm-close");

    if (mobileMenu && menuOpenBtn && menuCloseBtn) {
        const toggleMenu = (force) => {
            const isActive = force !== undefined ? force : !mobileMenu.classList.contains("active");
            if (isActive) {
                mobileMenu.classList.add("active");
                document.body.style.overflow = "hidden"; // lock scroll
            } else {
                mobileMenu.classList.remove("active");
                document.body.style.overflow = "";
            }
        };

        menuOpenBtn.addEventListener("click", () => toggleMenu(true));
        menuCloseBtn.addEventListener("click", () => toggleMenu(false));

        // Close on link click
        mobileMenu.querySelectorAll(".mm-link").forEach(link => {
            link.addEventListener("click", () => toggleMenu(false));
        });
    }

    /* ─────────────────────────────────────────
       14. CURRENCY SELECTOR
    ───────────────────────────────────────── */
    const currencySelector = document.getElementById('currency-selector');
    const currencyBtn = document.getElementById('currency-btn');
    const currencyLabel = document.getElementById('currency-label');
    const currencyDropdown = document.getElementById('currency-dropdown');

    if (currencySelector && currencyBtn && currencyDropdown) {
        // Toggle open/close
        currencyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = currencySelector.classList.toggle('open');
            currencyBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Select a currency option
        currencyDropdown.querySelectorAll('.currency-option').forEach(option => {
            option.addEventListener('click', () => {
                const val = option.dataset.value;
                const flag = option.dataset.flag;

                // Update button label
                if (currencyLabel) currencyLabel.textContent = val;
                const flagEl = currencyBtn.querySelector('.currency-flag');
                if (flagEl) flagEl.textContent = flag;

                // Mark selected
                currencyDropdown.querySelectorAll('.currency-option')
                    .forEach(o => o.classList.remove('active'));
                option.classList.add('active');

                // Close
                currencySelector.classList.remove('open');
                currencyBtn.setAttribute('aria-expanded', 'false');
            });
        });

        // Close when clicking outside
        document.addEventListener('click', () => {
            currencySelector.classList.remove('open');
            currencyBtn.setAttribute('aria-expanded', 'false');
        });

        // Prevent inside clicks from closing
        currencyDropdown.addEventListener('click', e => e.stopPropagation());
    }

    /* ─────────────────────────────────────────
       15. DRAGGABLE CAROUSEL
    ───────────────────────────────────────── */
    const carousels = document.querySelectorAll('.carousel-container');
    carousels.forEach(carousel => {
        let isDown = false;
        let startX;
        let scrollLeft;

        carousel.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - carousel.offsetLeft;
            scrollLeft = carousel.scrollLeft;
        });
        carousel.addEventListener('mouseleave', () => { isDown = false; });
        carousel.addEventListener('mouseup', () => { isDown = false; });
        carousel.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - carousel.offsetLeft;
            const walk = (x - startX) * 2; // scroll sensitivity
            carousel.scrollLeft = scrollLeft - walk;
        });
    });

    /* ─────────────────────────────────────────
       16. DYNAMIC SEARCH OVERLAY
    ───────────────────────────────────────── */
    const searchHTML = `
        <div class="search-overlay" id="search-overlay">
            <button class="search-close" id="search-close" aria-label="Close Search">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div class="search-content">
                <div class="search-input-wrapper">
                    <svg class="search-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="search-input" placeholder="Search for luxury fragrances..." autocomplete="off">
                </div>
                <div class="search-state" id="search-state">
                    <h3 class="search-eyebrow" id="search-eyebrow">Best Sellers</h3>
                    <div class="search-results-grid" id="search-results">
                        <!-- Products injected here -->
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', searchHTML);

    // Search simulation data (now global so it can be overwritten by Shopify)
    window.testProducts = window.testProducts || [];
    const bestSellers = ["MUSK NOR", "AQUA NOR"];

    const searchOverlay = document.getElementById("search-overlay");
    const searchInput = document.getElementById("search-input");
    const searchResults = document.getElementById("search-results");
    const searchEyebrow = document.getElementById("search-eyebrow");
    const searchClose = document.getElementById("search-close");
    const navSearchBtn = document.querySelector("#search-btn");

    const renderProducts = (productList, isBestSeller = false) => {
        if (!searchResults) return;
        searchResults.innerHTML = "";
        if (searchEyebrow) searchEyebrow.textContent = isBestSeller ? "Best Sellers" : "Search Results";

        if (productList.length === 0) {
            searchResults.innerHTML = "<p class='no-results'>No products found matching your search.</p>";
            return;
        }

        productList.forEach(p => {
            const card = document.createElement("a");
            card.href = p.url;
            card.className = "search-product-card";
            card.innerHTML = `
                <div class="spc-img"><img src="${p.img}" alt="${p.name}"></div>
                <div class="spc-info">
                    <h4>${p.name}</h4>
                    <p>${p.price}</p>
                </div>
            `;
            searchResults.appendChild(card);
        });
    };

    const initialRender = () => {
        const topProducts = window.testProducts.filter(p => bestSellers.includes(p.name.toUpperCase()));
        renderProducts(topProducts, true);
    };

    if (navSearchBtn) {
        navSearchBtn.addEventListener("click", (e) => {
            e.preventDefault();
            searchOverlay.classList.add("active");
            document.body.style.overflow = "hidden";
            initialRender();
            setTimeout(() => searchInput.focus(), 300);
        });
    }

    if (searchClose) {
        searchClose.addEventListener("click", () => {
            searchOverlay.classList.remove("active");
            document.body.style.overflow = "";
            searchInput.value = "";
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query === "") {
                initialRender();
            } else {
                const results = window.testProducts.filter(p => p.name.toLowerCase().includes(query));
                renderProducts(results, false);
            }
        });
    }



});


// Legacy Cart Logic Removed (Replaced by Section 8)


// ==========================================
// 17. SHOPIFY CHECKOUT INTEGRATION
// ==========================================
// Handled by cart-ui.js and cartManager.getCheckoutUrl()

// Checkout logic moved to cart-ui.js
