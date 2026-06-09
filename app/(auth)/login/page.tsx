'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { AlertCircle, Eye, EyeOff, ArrowRight, ShieldAlert, Clock, UserX } from 'lucide-react';
import Link from 'next/link';

interface LoginError {
  type: 'banned' | 'expired' | 'deactivated' | 'invalid';
  message?: string;
}

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null); setLoading(true);

    // Pre-check: get specific block reason before attempting sign-in
    const preflight = await fetch('/api/auth/preflight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(r => r.json()).catch(() => ({ type: 'ok' }));

    if (preflight.type !== 'ok') {
      setLoading(false);
      setLoginError({ type: preflight.type, message: preflight.message });
      return;
    }

    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) { setLoginError({ type: 'invalid' }); return; }
    const callbackUrl = searchParams.get('callbackUrl');
    if (callbackUrl) { router.push(callbackUrl); return; }
    const session = await fetch('/api/auth/session').then(r => r.json());
    const role = session?.user?.role;
    if (role === 'admin') router.push('/admin/dashboard');
    else if (role === 'teacher') router.push('/teacher/dashboard');
    else router.push('/student/dashboard');
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT dark panel ── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between p-12 bg-[#080C14] relative overflow-hidden flex-shrink-0">
        {/* Background image */}
        <Image
          src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=900&q=50"
          alt="" fill priority
          className="object-cover opacity-[0.08]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080C14]/80 via-transparent to-[#080C14]" />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/images/logo/HOWLFOOX-LOGO4.svg" alt="Howlfox Academy" width={108} height={99} className="h-14 w-auto object-contain" />
          <div className="flex flex-col leading-none gap-0.5">
            <Image src="/images/logo/HOWLFOOXTEXT.svg" alt="Howlfox" width={145} height={54} className="h-7 w-auto object-contain brightness-0 invert" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50 pl-0.5">Academy</span>
          </div>
        </Link>

        {/* Headline */}
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4">India&apos;s Premium Platform</p>
          <h1 className="text-3xl xl:text-4xl font-black text-white leading-[1.1] mb-5">
            Your gateway to<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              expert learning.
            </span>
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
            Live classes, recorded videos, AI-powered assistance, and real-time progress tracking.
          </p>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4 pt-8 border-t border-white/8">
          {[
            { v: '10+',  l: 'Courses'  },
            { v: '200+', l: 'Students' },
            { v: '4.9★', l: 'Rating'   },
          ].map(s => (
            <div key={s.l}>
              <p className="text-lg font-black text-indigo-400">{s.v}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 sm:px-12">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-10 hover:opacity-80 transition-opacity">
            <Image src="/images/logo/HOWLFOOX-LOGO4.svg" alt="Howlfox Academy" width={108} height={99} className="h-12 w-auto object-contain" />
            <div className="flex flex-col leading-none gap-0.5">
              <Image src="/images/logo/HOWLFOOXTEXT.svg" alt="Howlfox" width={145} height={54} className="h-6 w-auto object-contain" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 pl-0.5">Academy</span>
            </div>
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-1">Sign in</h2>
            <p className="text-sm text-slate-400">Enter your credentials to access your account.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  suppressHydrationWarning
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors" suppressHydrationWarning>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {loginError && (
              loginError.type === 'banned' ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert size={16} className="text-red-600 flex-shrink-0" />
                    <p className="font-bold text-red-700 text-sm">Account Suspended</p>
                  </div>
                  <p className="text-red-600 text-sm leading-relaxed">{loginError.message || 'Your account has been suspended.'}</p>
                  <p className="text-red-400 text-xs mt-2">Please contact your administrator to resolve this.</p>
                </div>
              ) : loginError.type === 'expired' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-amber-600 flex-shrink-0" />
                    <p className="font-bold text-amber-700 text-sm">Subscription Expired</p>
                  </div>
                  <p className="text-amber-600 text-sm">Your access expired on <strong>{loginError.message}</strong>.</p>
                  <p className="text-amber-400 text-xs mt-2">Contact your administrator to renew your subscription.</p>
                </div>
              ) : loginError.type === 'deactivated' ? (
                <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl px-4 py-3 text-sm">
                  <UserX size={15} className="mt-0.5 flex-shrink-0" />
                  <span>Your account has been deactivated. Contact your administrator.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>Invalid email or password.</span>
                </div>
              )
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              suppressHydrationWarning
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
                : <>Sign in <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-400 mt-6 leading-relaxed">
            No self-registration · Contact your admin for access
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
