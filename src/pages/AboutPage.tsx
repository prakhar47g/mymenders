import React from 'react';
import { Footer } from '../components/layout/Footer';

const initiatives = [
  {
    name: 'Iro Iro',
    url: 'https://framerusercontent.com/images/I832b7iZYGhar08MeqXTnrXE0TA.png',
    href: 'https://iroirozerowaste.com',
  },
  {
    name: 'Estethica',
    url: 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzEzMUMxOCIvPjxyZWN0IHg9IjEwIiB5PSI0MCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMTMxQzE4Ii8+PHJlY3QgeD0iMTAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzEzMUMxOCIvPjxyZWN0IHg9IjEwIiB5PSI3MCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMTMxQzE4Ii8+PC9zdmc+',
    href: 'https://www.estethica.com/',
  },
];

const supporters = [
  {
    name: 'UAL Fashion, Textiles and Technology Institute',
    url: 'https://framerusercontent.com/images/vJF1QbF0EXixrZS1fTq0YedHPWE.png',
  },
  {
    name: 'British Council',
    url: 'https://framerusercontent.com/images/7pyvLdQzMPkyxitxCpPjxuMFO9Q.png',
  },
];

export function AboutPage() {
  return (
    <div className="min-h-screen bg-[rgba(245,246,248,0.92)] pt-20 text-[var(--mm-text)]">
      <main className="relative isolate mx-auto w-full max-w-7xl overflow-hidden px-4 py-14 sm:px-6 sm:py-20 lg:h-[calc(100svh-5rem)] lg:min-h-[700px] lg:px-8 lg:py-0">
        <section className="relative z-[60] text-center lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:-mt-24 lg:w-[31rem]">
          <h2 className="font-display mymenders-card-title-light text-[19.33px] uppercase tracking-[0.06em] text-[var(--mm-faint)]">
            Our Mission
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg font-light leading-[1.48] text-[var(--mm-text-soft)] lg:text-[20px]">
            My Mender is a map-based, subscription-driven platform designed to extend the life of garments by reconnecting people with menders, repair knowledge, and the cultures of care that already exist, yet remain fragmented and undervalued.
          </p>
        </section>

        <section className="relative z-50 mt-16 max-w-xl lg:absolute lg:bottom-[68px] lg:left-8 lg:mt-0 lg:w-[34rem]">
          <h1 className="font-display mymenders-card-title-light text-[44px] leading-[0.98] tracking-[-0.035em] text-[var(--mm-text)] sm:text-[58px] lg:text-[64px]">
            Repair keeps
            <br />
            <span className="italic">what we love</span> alive.
          </h1>
        </section>

        <section className="relative z-50 mt-16 border-t border-[var(--mm-border-strong)] pt-8 lg:absolute lg:bottom-[68px] lg:right-8 lg:mt-0 lg:w-[25rem] lg:border-0 lg:pt-0">
          <div className="grid grid-cols-[6rem_1fr] items-center gap-5">
            <h2 className="mymenders-field-label-font text-[10px] uppercase tracking-[0.06em] text-[var(--mm-faint)]">
              Initiative Of
            </h2>
            <div className="grid grid-cols-2 items-center gap-6 opacity-65 transition-opacity hover:opacity-100">
              {initiatives.map((initiative) => (
                <a
                  key={initiative.name}
                  href={initiative.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={initiative.name}
                  className="group flex h-11 items-center"
                >
                  <img
                    src={initiative.url}
                    alt=""
                    className="h-11 w-auto max-w-20 object-contain mix-blend-multiply grayscale transition-all group-hover:grayscale-0"
                  />
                </a>
              ))}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-[6rem_1fr] items-center gap-5">
            <h2 className="mymenders-field-label-font text-[10px] uppercase tracking-[0.06em] text-[var(--mm-faint)]">
              Supported By
            </h2>
            <div className="grid grid-cols-2 items-center gap-6 opacity-65 transition-opacity hover:opacity-100">
              {supporters.map((supporter) => (
                <div key={supporter.name} className="flex h-[107.5px] items-center">
                  <img
                    src={supporter.url}
                    alt={supporter.name}
                    className="h-[107.5px] w-auto max-w-full object-contain mix-blend-multiply grayscale transition-all hover:grayscale-0"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
