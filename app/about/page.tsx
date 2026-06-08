import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Target, Heart, Zap, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Howlfox Academy — our mission, values, and the team behind the platform.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo/HOWLFOOX-LOGO4.svg" alt="Howlfox Academy" width={108} height={99} className="h-9 w-auto object-contain" />
            <Image src="/images/logo/HOWLFOOXTEXT.svg" alt="Howlfox" width={145} height={54} className="h-5 w-auto object-contain" />
          </Link>
          <Link href="/login" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            Sign In
          </Link>
        </div>
      </nav>

      <div className="pt-28 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-8">
            <ArrowLeft size={15} />
            Back to home
          </Link>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-6">About Howlfox Academy</h1>
          <p className="text-xl text-slate-500 leading-relaxed mb-12">
            Howlfox Academy is a private online course platform built for small, focused learning communities — think coaching institutes, boot camps, and private tutoring setups.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
            {VALUES.map((v) => (
              <div key={v.title} className={`rounded-2xl p-6 ${v.bg}`}>
                <v.icon size={22} className={v.color} />
                <h3 className="font-semibold text-slate-900 mt-3 mb-1">{v.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>

          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Why we built this</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Most online learning platforms are built for massive scale — thousands of courses, millions of students, and a marketplace mindset. That&apos;s great for discovery, but terrible for the focused, personal learning experience that small institutions provide.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              Howlfox Academy is different. It&apos;s invite-only by design. There&apos;s no self-registration, no marketplace, no algorithm recommending random courses. Your admin creates your account, assigns you to the right courses, and you get exactly what you need — nothing more, nothing less.
            </p>
            <p className="text-slate-600 leading-relaxed mb-10">
              It&apos;s built for institutions that know their students by name.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">The stack</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Howlfox Academy is built with modern, production-grade technology — Next.js 14 with the App Router, MongoDB Atlas, NextAuth v5 for authentication, Cloudinary for media, and OpenRouter for the AI assistant.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Video hosting uses YouTube unlisted embeds — keeping storage costs zero while delivering smooth playback with full progress tracking via the YouTube IFrame API.
            </p>
          </div>

          <div className="mt-16 pt-10 border-t border-slate-100 text-center">
            <p className="text-slate-500 mb-4">Ready to get started? Your admin has your credentials.</p>
            <Link href="/login" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm">
              Sign in to Howlfox Academy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const VALUES = [
  { title: 'Privacy first', desc: 'No public profiles, no social feeds. Your learning data stays between you and your institution.', icon: Lock, bg: 'bg-indigo-50', color: 'text-indigo-600' },
  { title: 'Focused by design', desc: 'Only your enrolled courses. No recommendations, no distractions, no rabbit holes.', icon: Target, bg: 'bg-sky-50', color: 'text-sky-600' },
  { title: 'Built with care', desc: 'Every feature exists because a real student or teacher needed it — not to pad a feature list.', icon: Heart, bg: 'bg-pink-50', color: 'text-pink-600' },
  { title: 'Fast and lightweight', desc: 'No heavy bundles, no tracking pixels. Pages load fast even on slower connections.', icon: Zap, bg: 'bg-amber-50', color: 'text-amber-600' },
] as const;
