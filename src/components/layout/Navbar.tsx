import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Map as MapIcon, Info, Menu, X } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] border-b border-[#e5e7eb] bg-[#fafafa]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <NavLink to="/" className="flex items-center gap-3">
              <svg width="24" height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="10" width="20" height="80" fill="#131C18" />
                <rect x="40" y="10" width="20" height="80" fill="#131C18" />
                <rect x="70" y="10" width="20" height="80" fill="#131C18" />
              </svg>
              <span className="text-2xl tracking-tight text-[#171b17] mymenders-logo-font">My Mender</span>
            </NavLink>
          </div>
          
          <div className="hidden md:flex h-16 items-stretch gap-6">
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                `relative inline-flex w-32 items-center justify-center border-b-2 text-sm font-medium transition-colors hover:text-[#171b17] ${isActive ? 'text-[#171b17] border-[#171b17]' : 'text-[#68665f] border-transparent'}`
              }
            >
              Map
            </NavLink>
            <NavLink 
              to="/about" 
              className={({ isActive }) => 
                `relative inline-flex w-32 items-center justify-center border-b-2 text-sm font-medium transition-colors hover:text-[#171b17] ${isActive ? 'text-[#171b17] border-[#171b17]' : 'text-[#68665f] border-transparent'}`
              }
            >
              About Us
            </NavLink>
          </div>

          <div className="flex md:hidden items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-full p-2 text-[#68665f] transition-colors hover:bg-[#f3f4f6] hover:text-[#171b17] focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute w-full border-b border-[#e5e7eb] bg-[#fafafa] pb-4 md:hidden">
          <div className="px-2 pt-2 space-y-1 flex flex-col">
            <NavLink 
              to="/" 
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => 
                `block rounded-xl px-3 py-2 text-sm font-medium ${isActive ? 'bg-[#f3f4f6] text-[#171b17]' : 'text-[#68665f] hover:bg-[#f3f4f6]'}`
              }
            >
              <div className="flex items-center gap-2"><MapIcon className="w-5 h-5" /> Map</div>
            </NavLink>
            <NavLink 
              to="/about" 
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => 
                `block rounded-xl px-3 py-2 text-sm font-medium ${isActive ? 'bg-[#f3f4f6] text-[#171b17]' : 'text-[#68665f] hover:bg-[#f3f4f6]'}`
              }
            >
              <div className="flex items-center gap-2"><Info className="w-5 h-5" /> About Us</div>
            </NavLink>
          </div>
        </div>
      )}
    </nav>
  );
}
