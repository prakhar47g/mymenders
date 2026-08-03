import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Map as MapIcon, Info, Menu, X } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] bg-brand-dark/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <NavLink to="/" className="flex items-center gap-3">
              <svg width="24" height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="10" width="20" height="80" fill="#fafafa" />
                <rect x="40" y="10" width="20" height="80" fill="#fafafa" />
                <rect x="70" y="10" width="20" height="80" fill="#fafafa" />
              </svg>
              <span className="text-2xl tracking-tight text-white mymenders-logo-font">My Mender</span>
            </NavLink>
          </div>

          <div className="hidden md:flex h-16 items-stretch gap-5">
            <NavLink
              to="/map"
              className="group relative inline-flex items-center justify-center px-4 text-sm font-medium text-white"
            >
              {({ isActive }) => (
                <span className={`inline-flex h-full items-center border-b-2 transition-colors group-hover:border-[#b8dceb] ${isActive ? 'border-[#b8dceb]' : 'border-transparent'}`}>
                  Map
                </span>
              )}
            </NavLink>
            <NavLink
              to="/about"
              className="group relative inline-flex items-center justify-center px-4 text-sm font-medium text-white"
            >
              {({ isActive }) => (
                <span className={`inline-flex h-full items-center border-b-2 transition-colors group-hover:border-[#b8dceb] ${isActive ? 'border-[#b8dceb]' : 'border-transparent'}`}>
                  About
                </span>
              )}
            </NavLink>
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
          </div>
        </div>
      )}
    </nav>
  );
}
