import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  const isAbout = pathname === '/' || pathname === '/about';

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        menuTriggerRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (desktop.matches) setIsOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  const closeMenu = () => {
    setIsOpen(false);
    menuTriggerRef.current?.focus();
  };

  return (
    <nav
      className="mymenders-public-nav"
    >
      <div className="mymenders-public-nav__inner">
        <div className="mymenders-public-nav__row">
          <div className="flex items-center">
            <NavLink to="/" className="mymenders-public-nav__logo flex items-center gap-3">
              <BrandLogo className="h-6 w-6 shrink-0 md:h-[29px] md:w-[29px]" color="currentColor" />
              <span className="mymenders-logo-wordmark text-2xl mymenders-logo-font text-current md:text-[29px]">
                My Mender
              </span>
            </NavLink>
          </div>

          <div className="mymenders-public-nav__links hidden items-center gap-2 md:flex">
            <NavLink
              to="/#about-mission"
              data-active={isAbout || undefined}
              className="mymenders-navbar-link inline-flex h-11 items-center justify-center px-3 text-sm uppercase"
            >
              About
            </NavLink>
            <NavLink to="/map" className="mymenders-navbar-link inline-flex h-11 items-center justify-center px-3 text-sm uppercase">
              Map
            </NavLink>
            <NavLink to="/add" className="mymenders-navbar-link inline-flex h-11 items-center justify-center px-3 text-sm uppercase">Add Mender</NavLink>
            <a
              href="https://www.instagram.com/my.mender"
              target="_blank"
              rel="noopener noreferrer"
              className="mymenders-navbar-link inline-flex h-11 items-center justify-center px-3 text-sm uppercase"
            >
              Instagram
            </a>
          </div>

          <div className="flex md:hidden items-center">
            <button
              ref={menuTriggerRef}
              onClick={() => setIsOpen(!isOpen)}
              className="mymenders-public-nav__trigger rounded-full p-2 opacity-80 transition-colors hover:bg-black/5 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mm-text)]"
              aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isOpen}
              aria-controls="mobile-navigation-menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <div
        id="mobile-navigation-menu"
        ref={drawerRef}
        hidden={!isOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Primary navigation"
        className="fixed inset-0 z-[1001] h-[100dvh] w-full overflow-y-auto overscroll-contain bg-[#e9e9e7] text-[#222222] md:hidden"
      >
        <div className="flex min-h-full flex-col">
          <div className="flex h-20 shrink-0 items-center justify-between px-4">
            <NavLink to="/" onClick={closeMenu} className="flex items-center gap-3">
              <BrandLogo className="h-6 w-6 shrink-0" color="currentColor" />
              <span className="mymenders-logo-wordmark text-2xl mymenders-logo-font text-current">
                My Mender
              </span>
            </NavLink>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeMenu}
              aria-label="Close navigation menu"
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mm-text)]"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex flex-1 items-center px-6 py-8">
            <div className="mx-auto w-full max-w-sm space-y-1">
              <NavLink
                to="/#about-mission"
                data-active={isAbout || undefined}
                onClick={closeMenu}
                className="mymenders-navbar-link flex min-h-16 items-center justify-center text-center uppercase text-[clamp(1.625rem,7vw,1.875rem)]"
              >
                About
              </NavLink>
              <NavLink
                to="/map"
                onClick={closeMenu}
                className="mymenders-navbar-link flex min-h-16 items-center justify-center text-center uppercase text-[clamp(1.625rem,7vw,1.875rem)]"
              >
                Map
              </NavLink>
              <NavLink to="/add" onClick={closeMenu} className="mymenders-navbar-link flex min-h-16 items-center justify-center text-center uppercase text-[clamp(1.625rem,7vw,1.875rem)]">Add Mender</NavLink>
              <a
                href="https://www.instagram.com/my.mender"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="mymenders-navbar-link flex min-h-16 items-center justify-center text-center uppercase text-[clamp(1.625rem,7vw,1.875rem)]"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
