import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Map as MapIcon, Navigation, Plus, Search } from 'lucide-react';
import { Footer } from '../components/layout/Footer';

const steps = [
  {
    icon: Search,
    title: 'Find a mender',
    body: 'Browse the map for tailors, sewers, cobblers and repair studios near you — or anywhere in the world.',
  },
  {
    icon: Navigation,
    title: 'Get there',
    body: 'Filter by specialty, workplace type and regional technique, then open directions with one tap.',
  },
  {
    icon: Plus,
    title: 'Add a mender',
    body: 'Know someone who deserves to be listed? Contribute to the map and grow the culture of care.',
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen pt-16">
      {/* Hero */}
      <section className="relative h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[#171b17]">
          <video
            src="https://eoxot1zisi65zkqg.public.blob.vercel-storage.com/vid1.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-4 text-center sm:px-6">
          <h1 className="font-display mymenders-card-title-light text-5xl leading-[1.02] tracking-[-0.03em] text-white md:text-7xl">
            We love your clothes
            <br />
            like you do.
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg font-light leading-[1.45] text-white">
            My Mender is a map of the people who repair the things you love — verified menders,
            community contributions, and the craft knowledge that keeps garments alive.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              to="/map"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-hover"
            >
              <MapIcon className="h-4 w-4" aria-hidden="true" />
              Explore the map
            </Link>
            <Link
              to="/about"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-dark px-7 text-sm font-medium text-white transition-colors hover:bg-brand-dark-hover"
            >
              About us
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white/60">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-px px-4 py-16 sm:px-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-center px-6 py-4 text-center">
              <div className="mymenders-cloth-panel flex h-14 w-14 items-center justify-center rounded-full border bg-cloth text-[#2f3e39]">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="font-display mymenders-card-title-light font-normal! mt-5 text-xl text-[#171b17]">{title}</h3>
              <p className="mt-2 text-sm leading-[1.5] text-[#68665f]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
