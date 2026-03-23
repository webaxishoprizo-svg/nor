/* ============================================================
   NOR PERFUME — MAIN JS
   Custom cursor | Scroll reveal | Navbar | Parallax |
   Marquee pause | Counter animation | Cart | Newsletter |
   Glass glow | Float card tilt | Page transitions
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    /* ─────────────────────────────────────────
       1. CUSTOM CURSOR — spring-follow with size morphing
    ───────────────────────────────────────── */
    const dot  = document.getElementById("cursor-dot");
    const ring = document.getElementById("cursor-ring");

    if (dot && ring) {
        document.body.classList.add("cursor-active");

        let mouseX = 0, mouseY = 0;
        let ringX  = 0, ringY  = 0;
        let velX   = 0, velY   = 0;

        document.addEventListener("mousemove", (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            dot.style.left = mouseX + "px";
            dot.style.top  = mouseY + "px";
        });

        // Smooth spring follow for ring with velocity tracking
        const animRing = () => {
            const dx   = mouseX - ringX;
            const dy   = mouseY - ringY;
            const ease = 0.12;
            velX = dx * ease;
            velY = dy * ease;
            ringX += velX;
            ringY += velY;
            ring.style.left = ringX + "px";
            ring.style.top  = ringY + "px";

            // Speed-based slight ring scale
            const speed = Math.sqrt(velX * velX + velY * velY);
            const scaleX = 1 + Math.min(speed * 0.025, 0.25);
            const scaleY = 1 - Math.min(speed * 0.015, 0.12);
            ring.style.transform = `translate(-50%, -50%) scaleX(${scaleX}) scaleY(${scaleY})`;

            requestAnimationFrame(animRing);
        };
        animRing();

        // Hover effect on interactive elements
        const hoverEls = document.querySelectorAll(
            "a, button, .product-card, .review-card, .trust-card, .float-card, input, .feat-list li"
        );
        hoverEls.forEach(el => {
            el.addEventListener("mouseenter", () => {
                ring.classList.add("hover");
                dot.classList.add("hover");
            });
            el.addEventListener("mouseleave", () => {
                ring.classList.remove("hover");
                dot.classList.remove("hover");
            });
        });

        document.addEventListener("mouseleave", () => document.body.classList.remove("cursor-active"));
        document.addEventListener("mouseenter", () => document.body.classList.add("cursor-active"));
    }

    /* ─────────────────────────────────────────
       2. SCROLL REVEAL — intersection with stagger
    ───────────────────────────────────────── */
    const fadeEls = document.querySelectorAll(".fade-up");
    const revealObs = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el    = entry.target;
                const delay = parseInt(el.dataset.delay || "0");
                setTimeout(() => el.classList.add("visible"), delay);
                obs.unobserve(el);
            }
        });
    }, { rootMargin: "0px 0px -50px 0px", threshold: 0.08 });

    fadeEls.forEach(el => revealObs.observe(el));

    /* ─────────────────────────────────────────
       3. NAVBAR SCROLL STATE
    ───────────────────────────────────────── */
    const navbar = document.getElementById("navbar");
    const handleNav = () => {
        if (!navbar) return;
        navbar.classList.toggle("scrolled", window.scrollY > 60);
    };
    window.addEventListener("scroll", handleNav, { passive: true });
    handleNav();

    /* ─────────────────────────────────────────
       4. HERO PARALLAX — smooth depth layers
    ───────────────────────────────────────── */
    const heroBg    = document.querySelector(".hero-bg-gradient");
    const heroBody  = document.querySelector(".hero-body");
    const scrollCue = document.querySelector(".scroll-cue");

    const handleParallax = () => {
        const sy = window.scrollY;
        const vh = window.innerHeight;
        if (sy >= vh) return;
        const p = sy / vh;

        if (heroBg) {
            heroBg.style.transform = `translateY(${sy * 0.3}px) scale(${1 + p * 0.04})`;
        }
        if (heroBody) {
            heroBody.style.transform = `translateY(${sy * 0.22}px)`;
            heroBody.style.opacity   = Math.max(0, 1 - p * 1.6).toString();
        }
        if (scrollCue) {
            scrollCue.style.opacity = Math.max(0, 1 - p * 4).toString();
        }
    };
    window.addEventListener("scroll", handleParallax, { passive: true });

    /* ─────────────────────────────────────────
       5. SMOOTH ANCHOR SCROLL
    ───────────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener("click", function(e) {
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
        const dur   = 2000;
        const start = performance.now();
        const update = (now) => {
            const p     = Math.min((now - start) / dur, 1);
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
            const el  = entry.target;
            const val = parseInt(el.dataset.target, 10);
            if (!isNaN(val)) countUp(el, val);
            obs.unobserve(el);
        });
    }, { threshold: 0.4 });
    statNums.forEach(el => statsObs.observe(el));

    /* ─────────────────────────────────────────
       8. CART — bounce feedback
    ───────────────────────────────────────── */
    const cartCountEl = document.getElementById("cart-count");
    let   cartCount   = 0;

    document.querySelectorAll(".btn-add-cart").forEach(btn => {
        btn.addEventListener("click", () => {
            cartCount++;
            if (cartCountEl) {
                cartCountEl.textContent = cartCount;
                // Pop animation via style
                cartCountEl.style.transform = "scale(1.8)";
                cartCountEl.style.transition = "transform .08s ease-out";
                setTimeout(() => {
                    cartCountEl.style.transform = "scale(1)";
                    cartCountEl.style.transition = "transform .25s cubic-bezier(.34,1.56,.64,1)";
                }, 100);
            }
            const orig = btn.textContent.trim();
            btn.textContent = "✓ Added";
            btn.style.background = "rgba(180,220,180,.15)";
            btn.style.borderColor = "rgba(180,220,180,.4)";
            setTimeout(() => {
                btn.textContent = orig;
                btn.style.background = "";
                btn.style.borderColor = "";
            }, 1400);
        });
    });

    /* ─────────────────────────────────────────
       9. NEWSLETTER
    ───────────────────────────────────────── */
    const nlForm = document.getElementById("nl-form");
    if (nlForm) {
        nlForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = nlForm.querySelector("input[type='email']");
            const btn   = nlForm.querySelector("button[type='submit']");
            if (!input || !btn) return;
            btn.textContent = "Subscribed ✓";
            btn.style.background = "linear-gradient(135deg, #4CAF50, #388E3C)";
            btn.style.color = "#fff";
            input.value = "";
            input.placeholder = "Thank you for subscribing!";
            setTimeout(() => {
                btn.textContent = "Subscribe";
                btn.style.background = "";
                btn.style.color = "";
                input.placeholder = "Your e-mail address";
            }, 3500);
        });
    }

    /* ─────────────────────────────────────────
       10. GLASS CARD MOUSE GLOW — radial follow
    ───────────────────────────────────────── */
    const glassCards = document.querySelectorAll(
        ".product-card, .review-card, .trust-card, .nl-box, .ed-badge, .float-card"
    );

    glassCards.forEach(card => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x    = ((e.clientX - rect.left)  / rect.width)  * 100;
            const y    = ((e.clientY - rect.top)    / rect.height) * 100;
            card.style.setProperty("--gx", x + "%");
            card.style.setProperty("--gy", y + "%");
            card.style.background = `
                radial-gradient(
                    circle at ${x}% ${y}%,
                    rgba(255,255,255,0.075) 0%,
                    rgba(255,255,255,0.02) 55%,
                    transparent 100%
                )
            `;
        });
        card.addEventListener("mouseleave", () => {
            // Fade back to original
            card.style.transition = "background .6s ease";
            card.style.background = "";
            setTimeout(() => card.style.transition = "", 600);
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
        const cx = (lastMouseX - window.innerWidth  / 2) / window.innerWidth;
        const cy = (lastMouseY - window.innerHeight / 2) / window.innerHeight;
        const now = Date.now() / 1200;

        floatCards.forEach((fc, i) => {
            const dir   = i % 2 === 0 ? 1 : -1;
            const bob   = Math.sin(now + i * 1.8) * 10;
            const rotY  = cx * 10 * dir;
            const rotX  = cy * -7;
            fc.style.transform = `
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

});
