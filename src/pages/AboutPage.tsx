import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';

const initiatives = [
  {
    name: 'Estethica',
    url: 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzEzMUMxOCIvPjxyZWN0IHg9IjEwIiB5PSI0MCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMTMxQzE4Ii8+PHJlY3QgeD0iMTAiIHk9IjcwIiB3aWR0aD0iODAiIGhlaWdodD0iMjAiIGZpbGw9IiMxMzFDMTgiLz48L3N2Zz4=',
    href: 'https://www.estethica.com/',
    imageClassName: 'h-10 w-10',
  },
  {
    name: 'Iro Iro',
    url: '/images/about/iroiro-logo.png',
    href: 'https://iroiro.in',
    imageClassName: 'h-auto w-24 max-w-full',
  },
];

const supporters = [
  {
    name: 'UAL Fashion, Textiles and Technology Institute',
    url: 'https://framerusercontent.com/images/vJF1QbF0EXixrZS1fTq0YedHPWE.png',
    imageClassName: 'w-[88px] max-w-full lg:w-[122px] lg:max-w-none',
  },
  {
    name: 'British Council',
    url: 'https://framerusercontent.com/images/7pyvLdQzMPkyxitxCpPjxuMFO9Q.png',
    imageClassName: 'w-[104px] max-w-full lg:w-36 lg:max-w-none',
  },
];

const howItWorks = [
  {
    title: 'Explore the map',
    description: 'Find menders near you, searchable by skill and location.',
  },
  {
    title: 'Connect',
    description: 'Reach out directly to book a repair or ask a question.',
  },
  {
    title: 'Add a mender',
    description: "Know a mending practitioner, or are one yourself? Tap 'Add a Mender' and share their details.",
  },
];

const logoClassName =
  'object-contain mix-blend-multiply grayscale opacity-60 transition-[filter,opacity] duration-300 hover:grayscale-0 hover:opacity-100';

const missionText = 'My Mender is a map-based digital platform designed to extend the life of garments by reconnecting people with their local menders, making repair services visible, searchable and trustworthy, while documenting the cultural knowledge and everyday practices that already exist but remain undervalued and undocumented.';

const heroSlides = [
  { src: '/images/about/hero-3.webp', alt: 'A close-up of pale floral fabric with a button' },
  { src: '/images/about/hero-4.webp', alt: 'A mender working on a light-colored garment by hand' },
  { src: '/images/about/hero-1.webp', alt: 'Colorful visible mending on fabric, with the words care through mending' },
  { src: '/images/about/hero-2.webp', alt: 'A close-up of a neatly mended area on blue fabric' },
];

export function AboutPage({ homepage = false }: { homepage?: boolean }) {
  const heroRef = useRef<HTMLElement>(null);
  const [heroTextOpacity, setHeroTextOpacity] = useState(1);
  const [activeSlide, setActiveSlide] = useState(0);
  const { hash, pathname } = useLocation();
  const isHomepage = pathname === '/';
  const heroImage = homepage
    ? {
        src: '/images/about/red-patched-top.webp',
        alt: 'A red ribbed top repaired with colorful visible mending patches',
        width: 1086,
        height: 1448,
      }
    : {
        src: '/images/about/visible-mending-sweater.jpg',
        alt: 'A charcoal knitted sweater restored with visible woven patches',
        width: 726,
        height: 1024,
      };

  useEffect(() => {
    if (!isHomepage) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = true;
    let timer: number | undefined;
    const syncPlayback = () => {
      window.clearInterval(timer);
      if (inView && !document.hidden && !motion.matches) {
        timer = window.setInterval(() => {
          setActiveSlide((current) => (current + 1) % heroSlides.length);
        }, 10000);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    });
    if (heroRef.current) observer.observe(heroRef.current);
    document.addEventListener('visibilitychange', syncPlayback);
    motion.addEventListener('change', syncPlayback);
    syncPlayback();

    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      motion.removeEventListener('change', syncPlayback);
    };
  }, [isHomepage]);

  useEffect(() => {
    if (hash !== '#about-mission') return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById('about-mission')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hash]);

  useEffect(() => {
    const updateHeroTextOpacity = () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setHeroTextOpacity(1);
        return;
      }

      const heroHeight = heroRef.current?.getBoundingClientRect().height ?? window.innerHeight;
      const progress = Math.min(Math.max(window.scrollY / Math.max(heroHeight, 1), 0), 1);
      setHeroTextOpacity(1 - progress * 0.85);
    };

    let frame: number | null = null;
    const handleScroll = () => {
      if (frame !== null) return;

      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateHeroTextOpacity();
      });
    };

    updateHeroTextOpacity();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={`min-h-screen bg-[#f3f5f9] text-[var(--mm-text)] ${isHomepage ? '' : 'pt-20'}`}>
      <main>
        <section
          ref={heroRef}
          aria-labelledby="about-hero-title"
          className={isHomepage
            ? 'grid w-full bg-brand-dark/95 lg:min-h-[100svh] lg:grid-cols-6'
            : 'grid w-full bg-brand-dark/95 lg:h-[calc(100svh-5rem)] lg:grid-cols-[2fr_1fr] lg:gap-x-12'}
        >
          {isHomepage ? (
            <div className="flex min-w-0 flex-col justify-end pb-8 pl-[30px] pr-8 pt-[200px] text-left lg:col-span-3 lg:pt-0 xl:pb-12 xl:pr-12">
              <h1 id="about-hero-title" className="font-display text-[clamp(36px,4vw,72px)] leading-[1.05] text-[var(--mm-text-soft)] lg:whitespace-nowrap">
                Find trusted menders
              </h1>
              <div className="mt-8 inline-grid w-full max-w-full grid-cols-2 gap-3 sm:w-[374.5px]">
                <Link
                  to="/map"
                  className="mymenders-outline-button mymenders-hero-action min-w-0 w-full max-sm:px-2! sm:whitespace-nowrap"
                >
                  Browse Map
                </Link>
                <Link
                  to="/add"
                  className="mymenders-outline-button mymenders-hero-action min-w-0 w-full max-sm:px-2! sm:whitespace-nowrap"
                >
                  Add Mender
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[28rem] items-end px-[30px] pb-12 pt-20 sm:min-h-[34rem] sm:pb-16 lg:min-h-0 lg:pb-16 lg:pt-0">
              <div>
                <h1
                  id="about-hero-title"
                  className="font-display text-[clamp(24px,7.6vw,42px)] leading-[0.98] text-[var(--mm-text)] sm:text-[56px] lg:text-[clamp(48px,4.45vw,76px)]"
                  style={{ opacity: heroTextOpacity }}
                >
                  <span className="block">The only antidote</span>
                  <span className="block whitespace-nowrap">to a throwaway society</span>
                  <span className="block">is to keep</span>
                </h1>
              </div>
            </div>
          )}

          <figure className={isHomepage ? 'relative min-w-0 w-full overflow-hidden lg:col-span-2 lg:col-start-5' : 'w-full overflow-hidden'}>
            {isHomepage ? (
              <div className="relative aspect-[3/4] w-full overflow-hidden lg:absolute lg:inset-x-0 lg:bottom-0 lg:top-0 lg:aspect-auto">
                {heroSlides.map((slide, index) => (
                  <img
                    key={slide.src}
                    src={slide.src}
                    alt={slide.alt}
                    aria-hidden={index !== activeSlide}
                    className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ease-linear motion-reduce:transition-none ${index === activeSlide ? 'opacity-100' : 'opacity-0'}`}
                    decoding="async"
                  />
                ))}
              </div>
            ) : (
            <img
              src={heroImage.src}
              alt={heroImage.alt}
              className={isHomepage
                ? 'block h-auto w-full lg:absolute lg:inset-x-0 lg:top-[10px] lg:h-[calc(100%-20px)] lg:object-cover lg:object-center'
                : 'block h-auto w-full lg:h-full lg:object-cover lg:object-center'}
              width={heroImage.width}
              height={heroImage.height}
              decoding="async"
            />
            )}
          </figure>
        </section>

        <section
          id="about-mission"
          aria-labelledby="about-mission-title"
          className="scroll-mt-20 px-[30px] pb-12 pt-24 text-center sm:pb-16 sm:pt-32 lg:pb-20 lg:pt-40"
        >
          <div className="mx-auto max-w-3xl">
            <h2
              id="about-mission-title"
              className="font-display text-[19.33px] uppercase text-[var(--mm-faint)]"
            >
              Our Mission
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.55] text-[var(--mm-text-soft)] sm:text-[20px]">
              {missionText}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="how-it-works-title"
          className="px-[30px] pb-24 pt-12 text-center sm:pb-32 sm:pt-16 lg:pb-40 lg:pt-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2
              id="how-it-works-title"
              className="font-display text-[19.33px] uppercase text-[var(--mm-faint)]"
            >
              How It Works
            </h2>

            <div className="mx-auto mt-20 grid max-w-5xl divide-y divide-black/[0.1] text-left sm:mt-24 lg:grid-cols-3 lg:divide-y-0">
              {howItWorks.map((step) => (
                <article key={step.title} className="py-7 lg:px-8 lg:py-2">
                  <h3 className="text-center text-[18px] leading-[1.2] text-[var(--mm-text)]">{step.title}</h3>
                  <p className="mt-3 max-w-2xl text-center text-[15px] leading-[1.55] text-[var(--mm-text-soft)]">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="Organizations">
          <div className="grid gap-y-9 px-[30px] py-10 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-x-0">
            <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-x-4 lg:flex lg:justify-center lg:gap-x-0">
              <h2 className="mymenders-field-label-font text-[10px] uppercase text-[var(--mm-faint)] lg:mr-[50px] lg:shrink-0">
                Initiative Of
              </h2>
              <div className="grid min-w-0 grid-cols-2 items-center gap-x-5 lg:flex lg:justify-start lg:gap-[50px]">
                {initiatives.map((initiative) => (
                  <a
                    key={initiative.name}
                    href={initiative.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={initiative.name}
                    className="group flex min-w-0 items-center justify-center lg:shrink-0"
                  >
                    <img
                      src={initiative.url}
                      alt=""
                      className={`${logoClassName} ${initiative.imageClassName} group-hover:grayscale-0 group-hover:opacity-100`}
                    />
                  </a>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-x-4 lg:flex lg:justify-center lg:gap-x-0">
              <h2 className="mymenders-field-label-font text-[10px] uppercase text-[var(--mm-faint)] lg:mr-[50px] lg:shrink-0">
                Supported By
              </h2>
              <div className="grid min-w-0 grid-cols-2 items-center gap-x-5 lg:flex lg:justify-start lg:gap-[50px]">
                {supporters.map((supporter) => (
                  <div key={supporter.name} className="flex min-w-0 items-center justify-center lg:shrink-0">
                    <img
                      src={supporter.url}
                      alt={supporter.name}
                      className={`${logoClassName} ${supporter.imageClassName}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
