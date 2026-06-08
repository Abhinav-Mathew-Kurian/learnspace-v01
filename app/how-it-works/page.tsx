import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, UserCheck, LogIn, BookMarked, Video, Radio, Brain, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Discover how Howlfox Academy works — from getting access to completing courses, attending live classes, and tracking your progress.',
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo/HOWLFOOX-LOGO2.svg" alt="Howlfox Academy" width={48} height={48} className="object-contain" />
            <span className="font-bold text-slate-900 text-lg">Howlfox Academy</span>
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

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-6">How it works</h1>
          <p className="text-xl text-slate-500 leading-relaxed mb-16">
            Howlfox Academy is invite-only. Here&apos;s the full journey from enrollment to completion.
          </p>

          {/* Student flow */}
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
              For Students
            </div>
            <div className="space-y-0">
              {STUDENT_STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full ${step.bg} flex items-center justify-center flex-shrink-0`}>
                      <step.icon size={18} className={step.iconColor} />
                    </div>
                    {i < STUDENT_STEPS.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-1 min-h-[2rem]" />}
                  </div>
                  <div className="pb-8 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400 font-medium">Step {i + 1}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-base mb-1">{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Teacher flow */}
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
              For Teachers
            </div>
            <div className="space-y-0">
              {TEACHER_STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full ${step.bg} flex items-center justify-center flex-shrink-0`}>
                      <step.icon size={18} className={step.iconColor} />
                    </div>
                    {i < TEACHER_STEPS.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-1 min-h-[2rem]" />}
                  </div>
                  <div className="pb-8 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400 font-medium">Step {i + 1}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-base mb-1">{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Common questions</h2>
            <div className="space-y-4">
              {FAQ.map((q) => (
                <div key={q.q} className="border border-slate-200 rounded-xl p-5">
                  <h3 className="font-semibold text-slate-900 text-sm mb-2">{q.q}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{q.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 pt-10 border-t border-slate-100 text-center">
            <p className="text-slate-500 mb-4">Got your credentials? You&apos;re ready to go.</p>
            <Link href="/login" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm">
              Sign in now
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const STUDENT_STEPS = [
  { title: 'Get your account', desc: 'Your institution\'s admin creates your account and sets your subscription. You\'ll receive your email and password directly from them.', icon: UserCheck, bg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
  { title: 'Sign in', desc: 'Go to the sign-in page and enter your email and password. If your account is banned or expired, you\'ll see a clear message explaining why.', icon: LogIn, bg: 'bg-sky-100', iconColor: 'text-sky-600' },
  { title: 'Access your courses', desc: 'You\'ll only see courses you\'re enrolled in. Each course shows your progress, the video list, and a "Continue" button to pick up where you left off.', icon: BookMarked, bg: 'bg-violet-100', iconColor: 'text-violet-600' },
  { title: 'Watch and track progress', desc: 'Videos play in an embedded player — no YouTube distractions. Your progress is saved every 10 seconds. Close the tab and resume exactly where you stopped.', icon: Video, bg: 'bg-green-100', iconColor: 'text-green-600' },
  { title: 'Join live classes', desc: 'Your upcoming live sessions appear on your dashboard and calendar. When it\'s time, click Join to get the secure Meet link — only you (in the right batch) can see it.', icon: Radio, bg: 'bg-red-100', iconColor: 'text-red-600' },
  { title: 'Ask the AI assistant', desc: 'On any course or video page, open the AI panel and ask a question. It reads your course\'s PDF materials and gives a structured, sourced answer.', icon: Brain, bg: 'bg-amber-100', iconColor: 'text-amber-600' },
] as const;

const TEACHER_STEPS = [
  { title: 'Receive your account', desc: 'The admin creates your teacher account. You get access to your own dashboard with your courses and students.', icon: UserCheck, bg: 'bg-sky-100', iconColor: 'text-sky-600' },
  { title: 'Create a course', desc: 'Add a title, description, category, and banner image. Set a preview video for students to see before enrolling. Publish when ready.', icon: BookMarked, bg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
  { title: 'Add video lessons', desc: 'Paste any YouTube URL (unlisted or public). Howlfox Academy extracts the video ID and embeds it securely. Set the order, add descriptions.', icon: Video, bg: 'bg-violet-100', iconColor: 'text-violet-600' },
  { title: 'Schedule live sessions', desc: 'Create a live session with a Google Meet link and optional password. Students in the assigned batch see it on their calendar. The link is never publicly exposed.', icon: Radio, bg: 'bg-green-100', iconColor: 'text-green-600' },
  { title: 'Mark attendance', desc: 'After a live session, open the attendance panel, select students, and mark them present, late, or absent. It\'s saved to their permanent record.', icon: UserCheck, bg: 'bg-amber-100', iconColor: 'text-amber-600' },
] as const;

const FAQ = [
  { q: 'Can I register myself?', a: 'No. Howlfox Academy is invite-only. Your admin creates your account and sends you your credentials. This keeps the platform private and the learning community focused.' },
  { q: 'What happens when my subscription expires?', a: 'You won\'t be able to log in until your admin renews your subscription. You\'ll see a clear message at the login screen with your expiry date.' },
  { q: 'Can I see courses I\'m not enrolled in?', a: 'You\'ll see a preview (course overview and possibly the first video) for courses you\'re not enrolled in. Full access requires enrollment by your admin.' },
  { q: 'Is my video progress saved automatically?', a: 'Yes. Progress is saved every 10 seconds while you\'re watching, and when you pause or close the video. You can always resume from exactly where you left off.' },
  { q: 'How does the AI assistant work?', a: 'Your teacher uploads PDF materials to the course. When you ask a question, the AI reads those PDFs and answers based on the content. It works best for questions directly about the material.' },
];
