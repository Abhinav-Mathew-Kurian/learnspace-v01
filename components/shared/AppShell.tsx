'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import Sidebar from './Sidebar';
import PageTransition from './PageTransition';
import { UserRole } from '@/types';
import Image from 'next/image';
import { Menu, UserCircle, LogOut } from 'lucide-react';

interface Props {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
  upcomingEventCount?: number;
  unreadEnquiryCount?: number;
}

const STORAGE_KEY = 'sidebar-collapsed';

export default function AppShell({ role, userName, children, upcomingEventCount = 0, unreadEnquiryCount = 0 }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const profileHref = `/${role}/profile`;

  return (
    // h-dvh accounts for mobile browser chrome (address bar), unlike h-screen (100vh)
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Desktop sidebar — participates in flex layout */}
      <div className="hidden lg:flex lg:flex-shrink-0 h-full">
        <Sidebar
          role={role}
          userName={userName}
          collapsed={collapsed}
          onToggle={handleToggle}
          upcomingEventCount={upcomingEventCount}
          unreadEnquiryCount={unreadEnquiryCount}
        />
      </div>

      {/* Mobile sidebar — fixed overlay drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          role={role}
          userName={userName}
          collapsed={false}
          upcomingEventCount={upcomingEventCount}
          unreadEnquiryCount={unreadEnquiryCount}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      <main className="flex-1 overflow-y-auto min-w-0 min-h-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200/80 shadow-sm flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2">
            <Image src="/images/logo/HOWLFOOX-LOGO2.svg" alt="Howlfox Academy" width={28} height={28} className="rounded-lg object-contain flex-shrink-0" />
            <span className="text-base font-bold text-slate-900 tracking-tight">Howlfox Academy</span>
          </div>

          {/* User avatar + dropdown — profile & logout */}
          <div className="ml-auto relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 transition-colors"
              aria-label="User menu"
            >
              <span className="text-indigo-700 text-xs font-bold">
                {userName.charAt(0).toUpperCase()}
              </span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-10 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[160px] z-50">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
                  <p className="text-[11px] text-slate-400 capitalize">{role}</p>
                </div>
                <Link
                  href={profileHref}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <UserCircle size={15} className="text-slate-400" />
                  Profile
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
