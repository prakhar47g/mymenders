import React from 'react';
import { Footer } from '../components/layout/Footer';

const initiatives = [
  {
    name: 'Iro Iro',
    url: 'https://framerusercontent.com/images/I832b7iZYGhar08MeqXTnrXE0TA.png',
    href: 'https://iroirozerowaste.com',
    imageClassName: 'h-12 w-auto max-w-16',
  },
  {
    name: 'Estethica',
    url: 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzEzMUMxOCIvPjxyZWN0IHg9IjEwIiB5PSI0MCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMTMxQzE4Ii8+PHJlY3QgeD0iMTAiIHk9IjcwIiB3aWR0aD0iODAiIGhlaWdodD0iMjAiIGZpbGw9IiMxMzFDMTgiLz48L3N2Zz4=',
    href: 'https://www.estethica.com/',
    imageClassName: 'h-10 w-10',
  },
];

const supporters = [
  {
    name: 'UAL Fashion, Textiles and Technology Institute',
    url: 'https://framerusercontent.com/images/vJF1QbF0EXixrZS1fTq0YedHPWE.png',
    imageClassName: 'w-[52.7%] max-w-[10.2rem]',
  },
  {
    name: 'British Council',
    url: 'https://framerusercontent.com/images/7pyvLdQzMPkyxitxCpPjxuMFO9Q.png',
    imageClassName: 'w-[62%] max-w-64',
  },
];

const logoClassName =
  'object-contain mix-blend-multiply grayscale opacity-60 transition-[filter,opacity] duration-300 hover:grayscale-0 hover:opacity-100';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-[rgba(245,246,248,0.92)] pt-20 text-[var(--mm-text)]">
      <main>
        <section
          aria-labelledby="about-hero-title"
          className="grid w-full bg-brand-dark/95 lg:h-[calc(100svh-5rem)] lg:grid-cols-[2fr_1fr]"
        >
          <div className="flex min-h-[28rem] items-end px-4 pb-12 pt-20 sm:min-h-[34rem] sm:px-6 sm:pb-16 lg:min-h-0 lg:px-8 lg:pb-16 lg:pt-0 xl:px-[max(2rem,calc((100vw-80rem)/2+2rem))] xl:pr-12">
            <h1
              id="about-hero-title"
              className="font-display mymenders-card-title-light text-[42px] leading-[0.98] tracking-[-0.04em] text-[var(--mm-text)] sm:text-[56px] lg:text-[clamp(48px,4.45vw,76px)]"
            >
              Repair keeps
              <span className="block italic">what we love</span>
              <span className="block">
                alive.
              </span>
            </h1>
          </div>

          <figure className="w-full overflow-hidden">
            <img
              src="/images/about/visible-mending-sweater.jpg"
              alt="A charcoal knitted sweater restored with visible woven patches"
              className="block h-auto w-full lg:h-full lg:object-cover lg:object-center"
              width="726"
              height="1024"
              decoding="async"
            />
          </figure>
        </section>

        <section
          aria-labelledby="about-mission-title"
          className="border-t border-black/[0.06] px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8 lg:py-40"
        >
          <div className="mx-auto max-w-3xl">
            <h2
              id="about-mission-title"
              className="font-display mymenders-card-title-light text-[19.33px] uppercase tracking-[0.06em] text-[var(--mm-faint)]"
            >
              Our Mission
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg font-light leading-[1.55] text-[var(--mm-text-soft)] sm:text-[20px]">
              My Mender is a map-based, subscription-driven platform designed to extend the life of garments by reconnecting people with menders, repair knowledge, and the cultures of care that already exist, yet remain fragmented and undervalued.
            </p>
          </div>
        </section>

        <section aria-label="Organizations">
          <div className="mx-auto grid max-w-7xl gap-y-9 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-x-0 lg:px-8">
            <div className="grid grid-cols-[6.75rem_minmax(0,1fr)] items-center gap-x-6 lg:grid-cols-[7rem_repeat(2,minmax(0,1fr))] lg:gap-x-4">
              <h2 className="mymenders-field-label-font text-[10px] uppercase tracking-[0.06em] text-[var(--mm-faint)]">
                Initiative Of
              </h2>
              <div className="flex min-w-0 items-center justify-between gap-6 lg:contents">
                {initiatives.map((initiative) => (
                  <a
                    key={initiative.name}
                    href={initiative.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={initiative.name}
                    className="group flex min-w-0 items-center justify-center"
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

            <div className="grid grid-cols-[6.75rem_minmax(0,1fr)] items-center gap-x-6 lg:grid-cols-[7rem_repeat(2,minmax(0,1fr))] lg:gap-x-4">
              <h2 className="mymenders-field-label-font text-[10px] uppercase tracking-[0.06em] text-[var(--mm-faint)]">
                Supported By
              </h2>
              <div className="flex min-w-0 items-center justify-between gap-5 lg:contents">
                {supporters.map((supporter) => (
                  <div key={supporter.name} className="flex min-w-0 items-center justify-center">
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
