import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StitchedLogo } from '../StitchedLogo';

export function Footer() {
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
    <footer className="bg-brand-dark text-[var(--mm-text)]">
      <div className="px-[30px] py-12">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
          <div>
            <div className="footer-engraved-logo" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="flex flex-col gap-10 sm:flex-row sm:gap-16">
            <div>
              <p className="text-sm font-medium text-[var(--mm-text)]">Company</p>
              <nav className="mt-4 flex flex-col gap-3 text-sm">
                <Link to="/map" className="text-[var(--mm-muted)] transition-colors hover:text-[var(--mm-text)]">
                  Map
                </Link>
                <Link to="/about" className="text-[var(--mm-muted)] transition-colors hover:text-[var(--mm-text)]">
                  About Us
                </Link>
              </nav>
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--mm-text)]">Legal</p>
              <nav className="mt-4 flex flex-col gap-3 text-sm">
                <Link to="/privacy" className="text-[var(--mm-muted)] transition-colors hover:text-[var(--mm-text)]">
                  Your Privacy
                </Link>
                <Link to="/terms" className="text-[var(--mm-muted)] transition-colors hover:text-[var(--mm-text)]">
                  Terms and Conditions
                </Link>
              </nav>
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--mm-text)]">Social</p>
              <nav className="mt-4 flex flex-col gap-3 text-sm">
                <a
                  href="https://www.instagram.com/my.mender"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--mm-muted)] transition-colors hover:text-[var(--mm-text)]"
                >
                  Instagram
                </a>
              </nav>
            </div>

            <div className="w-full sm:ml-auto sm:max-w-sm">
              <p className="text-sm font-medium text-[var(--mm-text)]">Join the newsletter</p>
              <p className="mt-1 text-xs font-light text-[var(--mm-faint)]">
                Mending stories, repair tips, and new menders on the map.
              </p>
              <form onSubmit={handleSubscribe} className="mt-4 flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-label="Email address"
                  className="h-11 min-w-0 flex-1 rounded-full border border-[var(--mm-border-strong)] bg-[var(--mm-panel-muted)] px-4 text-sm text-[var(--mm-text)] placeholder:text-[var(--mm-faint)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="h-11 shrink-0 rounded-full bg-brand px-5 text-sm font-medium text-brand-dark-on transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
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
        </div>

        {/* Big stitched logo */}
        <div className="mt-16">
          <StitchedLogo className="w-full" />
        </div>
      </div>
    </footer>
  );
}
