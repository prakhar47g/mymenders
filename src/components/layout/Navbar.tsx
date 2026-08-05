import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map as MapIcon, Info, Menu, Plus, X } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

interface NavbarProps {
  onAddMender: () => void;
}

const SCROLL_THRESHOLD = 48;

export function Navbar({ onAddMender }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Transparent over the homepage hero; solid everywhere else and after scrolling
  const transparent = isHome && !scrolled;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[1000] transition-colors duration-300 ${
        transparent ? 'bg-transparent' : 'bg-brand-dark/95 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <NavLink to="/" className="flex items-center gap-3">
              <BrandLogo />
              <span className="text-2xl tracking-tight text-white mymenders-logo-font">My Mender</span>
            </NavLink>
          </div>

          <div className="hidden md:flex h-20 items-stretch gap-2">
            <NavLink
              to="/map"
              className="group relative inline-flex items-center justify-center px-3 text-sm font-medium text-white"
            >
              {({ isActive }) => (
                <span className={`inline-flex h-full items-center border-b-2 transition-colors group-hover:border-[#b8dceb] ${isActive ? 'border-[#b8dceb]' : 'border-transparent'}`}>
                  Map
                </span>
              )}
            </NavLink>
            <NavLink
              to="/about"
              className="group relative inline-flex items-center justify-center px-3 text-sm font-medium text-white"
            >
              {({ isActive }) => (
                <span className={`inline-flex h-full items-center border-b-2 transition-colors group-hover:border-[#b8dceb] ${isActive ? 'border-[#b8dceb]' : 'border-transparent'}`}>
                  About
                </span>
              )}
            </NavLink>
            <div className="flex items-center pl-3">
              <button
                onClick={onAddMender}
                className="flex h-11 cursor-pointer items-center justify-center rounded-full bg-white px-4 text-brand-dark shadow-[var(--mm-shadow-subtle)] transition-colors hover:bg-brand-light"
                title="Add Mender"
                aria-label="Add mender"
              >
                <Plus className="h-5 w-5 shrink-0" />
                <span className="ml-2 text-xs font-medium">Add Mender</span>
              </button>
            </div>
          </div>

          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute w-full bg-brand-dark pb-4 md:hidden">
          <div className="px-2 pt-2 space-y-1 flex flex-col">
            <NavLink
              to="/map"
              onClick={() => setIsOpen(false)}
              className="group block rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              {({ isActive }) => (
                <div className="flex items-center gap-2">
                  <MapIcon className="h-5 w-5" />
                  <span className={`border-b-2 pb-0.5 transition-colors group-hover:border-[#b8dceb] ${isActive ? 'border-[#b8dceb]' : 'border-transparent'}`}>Map</span>
                </div>
              )}
            </NavLink>
            <NavLink
              to="/about"
              onClick={() => setIsOpen(false)}
              className="group block rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              {({ isActive }) => (
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  <span className={`border-b-2 pb-0.5 transition-colors group-hover:border-[#b8dceb] ${isActive ? 'border-[#b8dceb]' : 'border-transparent'}`}>About</span>
                </div>
              )}
            </NavLink>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddMender();
              }}
              className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-light"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add Mender
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
