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

const imageClassName =
  'h-full w-full object-cover grayscale-[65%] saturate-[65%] brightness-[1.08] contrast-[0.88] transition-[filter,transform] duration-700 ease-out group-hover:scale-[1.025] group-hover:grayscale-0 group-hover:saturate-100 group-hover:brightness-100 group-hover:contrast-100 motion-reduce:transition-none';
const postcardClassName =
  'mymenders-stamp-frame overflow-hidden bg-[#fffdf9] p-3 sm:p-3.5';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-[rgba(245,246,248,0.92)] pt-16 text-[var(--mm-text)]">
      <main className="relative isolate mx-auto w-full max-w-7xl overflow-hidden px-4 py-14 sm:px-6 sm:py-20 lg:h-[calc(100svh-4rem)] lg:min-h-[700px] lg:px-8 lg:py-0">
        <section className="relative z-[60] bg-white p-6 shadow-[0_10px_28px_rgba(23,27,23,0.08)] ring-1 ring-black/[0.05] lg:absolute lg:left-8 lg:top-12 lg:w-[31rem] lg:p-7">
          <h2 className="mymenders-field-label-font text-[10px] uppercase tracking-[0.06em] text-[var(--mm-faint)]">
            Our Mission
          </h2>
          <p className="mt-4 max-w-xl text-lg font-light leading-[1.48] text-[var(--mm-text-soft)] lg:text-[20px]">
            My Mender is a map-based, subscription-driven platform designed to extend the life of garments by reconnecting people with menders, repair knowledge, and the cultures of care that already exist, yet remain fragmented and undervalued.
          </p>
        </section>

        <div className="mt-12 grid grid-cols-2 items-start gap-4 sm:mt-16 sm:gap-6 lg:contents">
          <figure className={`group relative aspect-[3/4] -rotate-2 ${postcardClassName} transition-transform duration-500 hover:rotate-0 motion-reduce:transition-none lg:absolute lg:left-[48%] lg:top-[210px] lg:z-20 lg:h-[240px] lg:w-[180px] lg:-rotate-[7deg]`}>
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4HlqVTJTaT05peNF4XRrIuTeK4_yvBNoKODCw14riFW15Ba7W076ojmWE&s=10"
              alt="A blue sweater repaired with plaid and geometric patches"
              className={imageClassName}
              decoding="async"
            />
          </figure>

          <figure className={`group relative z-20 aspect-square rotate-2 ${postcardClassName} transition-transform duration-500 hover:rotate-0 motion-reduce:transition-none lg:absolute lg:left-[43%] lg:top-[380px] lg:z-30 lg:h-[160px] lg:w-[160px] lg:rotate-[8deg]`}>
            <img
              src="/images/about/visible-mending-red.webp"
              alt="Red fabric patches secured with visible blue stitches"
              className={imageClassName}
              decoding="async"
            />
          </figure>

          <figure className={`group relative z-30 aspect-square -rotate-1 ${postcardClassName} transition-transform duration-500 hover:rotate-0 motion-reduce:transition-none lg:absolute lg:left-[57%] lg:top-[245px] lg:z-40 lg:h-[190px] lg:w-[190px] lg:rotate-[4deg]`}>
            <img
              src="/images/about/denim-visible-mending.webp"
              alt="Colourful running stitches radiating from a denim patch"
              className={imageClassName}
              decoding="async"
            />
          </figure>

          <figure className={`group relative aspect-square rotate-1 ${postcardClassName} transition-transform duration-500 hover:rotate-0 motion-reduce:transition-none lg:absolute lg:right-[-35px] lg:top-[235px] lg:z-10 lg:h-[240px] lg:w-[240px] lg:-rotate-[5deg]`}>
            <img
              src="/images/about/sashiko-in-progress.webp"
              alt="Hands stitching a sashiko repair into black denim"
              className={imageClassName}
              decoding="async"
            />
          </figure>

          <figure className={`group relative aspect-square -rotate-3 ${postcardClassName} transition-transform duration-500 hover:rotate-0 motion-reduce:transition-none lg:absolute lg:bottom-[-16px] lg:right-[260px] lg:z-30 lg:h-[160px] lg:w-[160px] lg:rotate-[7deg]`}>
            <img
              src="/images/about/woven-darn.webp"
              alt="A small colourful woven darn on grey knitwear"
              className={imageClassName}
              decoding="async"
            />
          </figure>
        </div>

        <section className="relative z-50 mt-16 max-w-xl lg:absolute lg:bottom-[68px] lg:left-8 lg:mt-0 lg:w-[34rem]">
          <h1 className="font-display mymenders-card-title-light text-[44px] leading-[0.98] tracking-[-0.035em] text-[var(--mm-text)] sm:text-[58px] lg:text-[64px]">
            Repair keeps
            <br />
            <span className="italic">what we love</span> alive.
          </h1>
        </section>

        <section className="relative z-50 mt-16 border-t border-[var(--mm-border-strong)] pt-8 lg:absolute lg:right-8 lg:top-12 lg:mt-0 lg:w-[25rem] lg:border-0 lg:pt-0">
          <div className="grid grid-cols-[6rem_1fr] items-center gap-5">
            <h2 className="mymenders-field-label-font text-[10px] uppercase tracking-[0.06em] text-[var(--mm-faint)]">
              Initiative Of
            </h2>
            <div className="flex items-center gap-6 opacity-65 transition-opacity hover:opacity-100">
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
                    className="h-10 w-auto max-w-20 object-contain mix-blend-multiply grayscale transition-all group-hover:grayscale-0"
                  />
                </a>
              ))}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-[6rem_1fr] items-center gap-5">
            <h2 className="mymenders-field-label-font text-[10px] uppercase tracking-[0.06em] text-[var(--mm-faint)]">
              Supported By
            </h2>
            <div className="flex items-center gap-5 opacity-65 transition-opacity hover:opacity-100">
              {supporters.map((supporter) => (
                <img
                  key={supporter.name}
                  src={supporter.url}
                  alt={supporter.name}
                  className="h-9 w-auto max-w-24 object-contain mix-blend-multiply grayscale transition-all hover:grayscale-0"
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
