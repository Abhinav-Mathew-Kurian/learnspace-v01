import Link from 'next/link';
import { BookOpen, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Search size={28} className="text-indigo-500" />
        </div>
        <h1 className="text-6xl font-extrabold text-slate-200 mb-2 select-none">404</h1>
        <h2 className="text-xl font-bold text-slate-800 mb-3">Page not found</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Check the URL or navigate back to safety.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <BookOpen size={15} />
            Go to Howlfox Academy
          </Link>
          <Link
            href="javascript:history.back()"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={15} />
            Go back
          </Link>
        </div>
      </div>
    </div>
  );
}
