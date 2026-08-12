import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Navigation, Plus, Search } from 'lucide-react';
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
    <div className="min-h-screen">
      {/* Hero */}
      <section className="home-hero relative h-[100svh] overflow-hidden">
        <div className="absolute inset-0 bg-[#171b17]">
          <video
            src="https://eoxot1zisi65zkqg.public.blob.vercel-storage.com/vid1.mp4"
            poster="https://eoxot1zisi65zkqg.public.blob.vercel-storage.com/hero-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="home-hero__content relative">
          <div className="home-hero__copy">
            <h1 className="home-hero__title font-display mymenders-card-title-light text-white">
              We love your clothes
              <br />
              like you do.
            </h1>
          </div>

          <nav aria-label="Hero links" className="home-hero__actions">
            <Link
              to="/map"
              className="home-hero__map-link"
            >
              Search menders
              <ArrowRight aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#f5f6f8]">
        <div className="grid grid-cols-1 gap-px px-[30px] py-16 md:grid-cols-3">
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
