import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Target, Heart, Zap, Lock, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Howlfox Academy — our mission, values, and our parent company Howlfox.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo/HOWLFOOX-LOGO4.svg" alt="Howlfox Academy" width={108} height={99} className="h-11 w-auto object-contain" />
            <div className="flex flex-col leading-none gap-0.5">
              <Image src="/images/logo/HOWLFOOXTEXT.svg" alt="Howlfox" width={145} height={54} className="h-5 w-auto object-contain" />
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 pl-0.5">Academy</span>
            </div>
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
            Howlfox Academy is the education arm of Howlfox — a Kerala-based branding and digital services company. We bring the same creative expertise from the agency floor directly into structured, expert-led learning experiences.
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
              Most online learning platforms are built for massive scale — thousands of courses, millions of students, and a marketplace mindset. That&apos;s great for discovery, but terrible for the focused, personal learning experience that real professionals provide.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              Howlfox Academy is different. It&apos;s invite-only by design. There&apos;s no self-registration, no marketplace, no algorithm recommending random courses. Your admin creates your account, assigns you to the right courses, and you get exactly what you need — nothing more, nothing less.
            </p>
            <p className="text-slate-600 leading-relaxed mb-10">
              It&apos;s built for institutions that know their students by name.
            </p>
          </div>

          {/* Parent company section */}
          <div className="mt-12 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-8 py-6">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Part of the Howlfox family</p>
              <h2 className="text-2xl font-extrabold text-white">Howlfox</h2>
              <p className="text-slate-400 text-sm mt-1">Branding &amp; Digital Services · Kerala, India</p>
            </div>
            <div className="px-8 py-7 bg-white">
              <p className="text-slate-600 leading-relaxed mb-4">
                Howlfox Academy is a subsidiary of <strong className="text-slate-800">Howlfox</strong> — a Kerala-based creative agency that combines strategy with storytelling to make brands heard, loud and clear. Whether working with startups chasing the spotlight or established brands ready for reinvention, Howlfox doesn&apos;t just advertise — it crafts stories that resonate.
              </p>
              <p className="text-slate-600 leading-relaxed mb-6">
                The agency offers end-to-end branding, digital marketing, creative design, advertising, and print solutions — serving businesses across Kerala with passion and precision. Howlfox Academy was built to share that expertise directly with students and professionals who want to learn the craft from the inside.
              </p>
              <a
                href="https://howlfox.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                Visit Howlfox
                <ExternalLink size={14} />
              </a>
            </div>
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
