import React, { useState, useEffect, useCallback, useRef } from 'react';
import './HeroSlider.css';

/**
 * Headless Shopify Hero Slider
 * Fetches data from a collection handle "hero-slider"
 * Uses "custom.hero_image" metafield for slide visuals
 */

const SHOPIFY_DOMAIN = 'nor-perfume-2.myshopify.com';
const STOREFRONT_ACCESS_TOKEN = '597e532f7345926a95b019ced728a002';

const HERO_QUERY = `
  query getHeroSlider($handle: String!) {
    collection(handle: $handle) {
      products(first: 10) {
        edges {
          node {
            id
            title
            handle
            hero_image: metafield(namespace: "custom", key: "hero_image") {
              value
              reference {
                ... on MediaImage {
                  image {
                    url(transform: { maxWidth: 2000, preferredContentType: WEBP })
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const HeroSlider = ({ collectionHandle = 'hero-slider', autoPlaySpeed = 4000 }) => {
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  // 1. Data Fetching
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN,
          },
          body: JSON.stringify({
            query: HERO_QUERY,
            variables: { handle: collectionHandle },
          }),
        });

        const { data } = await response.json();

        if (data?.collection?.products?.edges) {
          const fetchedSlides = data.collection.products.edges
            .map(({ node }) => {
              // Extract image URL from metafield (handle both direct string and reference)
              let imageUrl = '';
              if (node.hero_image?.reference?.image?.url) {
                imageUrl = node.hero_image.reference.image.url;
              } else if (node.hero_image?.value) {
                imageUrl = node.hero_image.value;
              }

              return {
                id: node.id,
                title: node.title,
                handle: node.handle,
                image: imageUrl
              };
            })
            // Requirement: Only include products with valid hero_image
            .filter(slide => slide.image && slide.image !== '');

          setSlides(fetchedSlides);
        }
      } catch (error) {
        console.error('HeroSlider Fetch Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSlides();
  }, [collectionHandle]);

  // 2. Logic: Auto-slide & Manual Override
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsPaused(true); // Manual override: pause on interaction
  };

  useEffect(() => {
    if (!isPaused && slides.length > 0) {
      timerRef.current = setInterval(nextSlide, autoPlaySpeed);
    }
    return () => clearInterval(timerRef.current);
  }, [isPaused, nextSlide, autoPlaySpeed, slides.length]);

  // 3. Error Handling: Hide if no slides
  if (loading) return null;
  if (slides.length === 0) return null;

  return (
    <section
      className="hero-slider-v2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="New arrivals and featured products"
    >
      <div className="slides-container">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`slide-item ${index === currentIndex ? 'active' : ''}`}
            aria-hidden={index !== currentIndex}
          >
            {/* Optimized & Lazy Loading */}
            <img
              src={slide.image}
              alt={slide.title}
              loading={index === 0 ? "eager" : "lazy"}
              className="slide-img"
            />

            <div className="slide-content">
              <div className="container">
                <span className="slide-eyebrow fade-down-anim">Luxury Perfume Collection</span>
                <h2 className="slide-title fade-up-anim">{slide.title}</h2>
                <a href={`/products/${slide.handle}`} className="cta-primary fade-up-anim">
                  Explore Now
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Controls: Navigation Arrows */}
      <button
        className="nav-arrow prev"
        onClick={() => { prevSlide(); setIsPaused(true); }}
        aria-label="Previous slide"
      >
        <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <button
        className="nav-arrow next"
        onClick={() => { nextSlide(); setIsPaused(true); }}
        aria-label="Next slide"
      >
        <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* 4. Controls: Pagination Dots */}
      <div className="pagination-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSlider;
