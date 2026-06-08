'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

export default function HomeNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    { label: 'Browse Courses', href: '/courses', scroll: false },
    { label: 'Free Webinars', href: '#webinars', scroll: true },
    { label: 'About', href: '/about', scroll: false },
  ];

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-[#060B18]/90 backdrop-blur-xl border-b border-white/8 shadow-xl shadow-black/20'
        : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/images/logo/logo.jpeg" alt="Howlfox Academy" width={28} height={28} className="rounded-lg object-contain flex-shrink-0" />
          <span className="font-bold text-white text-base tracking-tight">Howlfox Academy</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-7">
          {links.map(({ label, href, scroll }) =>
            scroll ? (
              <a key={label} href={href} onClick={e => { e.preventDefault(); document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }); }}
                className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
                {label}
              </a>
            ) : (
              <Link key={label} href={href} className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
                {label}
              </Link>
            )
          )}
          <Link href="/login" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
            Sign In
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(o => !o)} className="md:hidden p-1.5 text-slate-300 hover:text-white transition-colors" aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-[#060B18] border-t border-white/8 px-4 py-3 space-y-1">
          {links.map(({ label, href, scroll }) =>
            scroll ? (
              <a key={label} href={href} onClick={e => { e.preventDefault(); setOpen(false); document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }); }}
                className="block text-sm text-slate-400 hover:text-white py-2.5 font-medium transition-colors">
                {label}
              </a>
            ) : (
              <Link key={label} href={href} onClick={() => setOpen(false)}
                className="block text-sm text-slate-400 hover:text-white py-2.5 font-medium transition-colors">
                {label}
              </Link>
            )
          )}
          <Link href="/login" onClick={() => setOpen(false)}
            className="block text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg font-semibold text-center transition-colors mt-2">
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}
