'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Log to console (replace with Sentry/Datadog in production)
    console.error('[Howlfox Academy Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h1 className="text-6xl font-extrabold text-slate-200 mb-2 select-none">500</h1>
        <h2 className="text-xl font-bold text-slate-800 mb-3">Something went wrong</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-2">
          An unexpected error occurred. This has been logged and we&apos;ll look into it.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono mb-6">Error ID: {error.digest}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw size={15} />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={15} />
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
