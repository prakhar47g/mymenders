import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Map as MapIcon, Navigation, Plus, Search } from 'lucide-react';

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
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetEmail = email.trim();
    if (!targetEmail || status === 'submitting') return;

    setStatus('submitting');
    setMessage('');

    try {
      const res = await fetch(`${window.location.origin}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });

      if (res.ok) {
        setEmail('');
        setStatus('success');
        setMessage("You're on the list — see you in the inbox!");
      } else {
        const data = await res.json().catch(() => null);
        setStatus('error');
        setMessage(data?.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

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
      <footer className="bg-brand-dark text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
            <div>
              <div className="flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="10" y="10" width="20" height="80" fill="#fafafa" />
                  <rect x="40" y="10" width="20" height="80" fill="#fafafa" />
                  <rect x="70" y="10" width="20" height="80" fill="#fafafa" />
                </svg>
                <span className="mymenders-logo-font text-lg text-white">My Mender</span>
              </div>
              <p className="mt-3 max-w-xs text-sm font-light leading-[1.5] text-white/50">
                A map of the people who repair the things you love.
              </p>
            </div>

            <div className="w-full md:max-w-sm">
              <p className="text-sm font-medium text-white">Join the newsletter</p>
              <p className="mt-1 text-xs font-light text-white/50">
                Mending stories, repair tips, and new menders on the map.
              </p>
              <form onSubmit={handleSubscribe} className="mt-4 flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  className="h-11 min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="h-11 shrink-0 rounded-full bg-brand px-5 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === 'submitting' ? 'Subscribing…' : 'Subscribe'}
                </button>
              </form>
              {message ? (
                <p
                  role="status"
                  className={`mt-2 text-xs ${status === 'error' ? 'text-[#f4a261]' : 'text-[#6eb7b0]'}`}
                >
                  {message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 pt-6 sm:flex-row">
            <p className="text-xs text-white/40">© {new Date().getFullYear()} My Mender</p>
            <nav className="flex items-center gap-6 text-sm text-white/60">
              <Link to="/map" className="transition-colors hover:text-white">
                Map
              </Link>
              <Link to="/about" className="transition-colors hover:text-white">
                About Us
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
