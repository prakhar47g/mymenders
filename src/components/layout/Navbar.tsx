import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Map as MapIcon, Info, Menu, Plus, X } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isAbout = pathname === '/' || pathname === '/about';

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[1000] bg-brand-dark/95 text-[var(--mm-text)] backdrop-blur-sm"
    >
      <div className="px-[30px]">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <NavLink to="/" className="flex items-center gap-3">
              <BrandLogo className="h-[29px] w-[29px] shrink-0" color="var(--color-brand-dark-text)" />
              <span className="text-[29px] tracking-tight mymenders-logo-font text-brand-dark-text">
                My Mender
              </span>
            </NavLink>
          </div>

          <div className="hidden md:flex h-20 items-stretch gap-2">
            <NavLink
              to="/map"
              className="group relative inline-flex items-center justify-center px-3 text-sm font-medium"
            >
              {({ isActive }) => (
                <span className={`border-b-2 pb-0.5 transition-colors group-hover:border-[#b8dceb] ${isActive ? 'border-[#b8dceb]' : 'border-transparent'}`}>
                  Map
                </span>
              )}
            </NavLink>
            <NavLink
              to="/about"
              className="group relative inline-flex items-center justify-center px-3 text-sm font-medium"
            >
              {({ isActive }) => (
                <span className={`border-b-2 pb-0.5 transition-colors group-hover:border-[#b8dceb] ${isActive || isAbout ? 'border-[#b8dceb]' : 'border-transparent'}`}>
                  About
                </span>
              )}
            </NavLink>
            <div className="flex items-center pl-3">
              <button
                onClick={() => navigate('/add')}
                className="flex h-11 cursor-pointer items-center justify-center rounded-full bg-white px-4 text-brand-dark-on shadow-[var(--mm-shadow-subtle)] transition-colors hover:bg-brand-light"
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
              className="rounded-full p-2 opacity-80 transition-colors focus:outline-none hover:bg-black/5 hover:opacity-100"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute w-full bg-brand-dark pb-4 text-[var(--mm-text)] md:hidden">
          <div className="px-2 pt-2 space-y-1 flex flex-col">
            <NavLink
              to="/map"
              onClick={() => setIsOpen(false)}
              className="group block rounded-xl px-3 py-2 text-sm font-medium hover:bg-black/5"
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
              className="group block rounded-xl px-3 py-2 text-sm font-medium hover:bg-black/5"
            >
              {({ isActive }) => (
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  <span className={`border-b-2 pb-0.5 transition-colors group-hover:border-[#b8dceb] ${isActive || isAbout ? 'border-[#b8dceb]' : 'border-transparent'}`}>About</span>
                </div>
              )}
            </NavLink>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/add');
              }}
              className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-brand-dark-on transition-colors hover:bg-brand-light"
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
