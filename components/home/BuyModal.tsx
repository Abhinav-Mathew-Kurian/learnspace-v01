'use client';

import { useState } from 'react';
import { X, Tag, Send, CheckCircle, Percent, ArrowRight, Loader2, Mail, Phone } from 'lucide-react';

const ADMIN_CONTACTS = [
  {
    label: 'Email',
    value: 'howlfoxceo@gmail.com',
    sub: 'Drop us a mail',
    href: 'mailto:howlfoxceo@gmail.com',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    icon: (s: number) => <Mail size={s} />,
  },
  {
    label: 'Call / WhatsApp',
    value: '+91 62387 50649',
    sub: 'Mon–Sat, 9am–7pm IST',
    href: 'https://wa.me/916238750649',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    icon: (s: number) => <Phone size={s} />,
  },
  {
    label: 'Instagram',
    value: '@howlfoxacademy',
    sub: 'DM us anytime',
    href: 'https://instagram.com/howlfoxacademy',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    iconBg: 'bg-gradient-to-br from-pink-400 to-violet-500',
    iconColor: 'text-white',
    icon: (s: number) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
];

interface Props {
  courseTitle: string;
  pricingType?: 'free' | 'lifetime' | 'installment';
  price: number;
  originalPrice?: number | null;
  installmentMonths?: number | null;
  currency?: string;
  onClose: () => void;
}

const SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€' };

function fmt(n: number, currency = 'INR') {
  return `${SYMBOL[currency] ?? '₹'}${n.toLocaleString('en-IN')}`;
}

export default function BuyModal({ courseTitle, pricingType = 'free', price, originalPrice, installmentMonths, currency = 'INR', onClose }: Props) {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const isInstallment = pricingType === 'installment' && !!installmentMonths;
  const totalPrice = isInstallment ? price * (installmentMonths ?? 1) : price;
  const discount = originalPrice && originalPrice > (isInstallment ? totalPrice : price)
    ? Math.round(((originalPrice - (isInstallment ? totalPrice : price)) / originalPrice) * 100)
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        phone,
        subject: `Enroll: ${courseTitle}`,
        message: isInstallment
          ? `I'm interested in enrolling for "${courseTitle}" on the ${installmentMonths}-month installment plan (${fmt(price, currency)}/month · ${fmt(totalPrice, currency)} total). Please contact me with next steps.`
          : `I'm interested in enrolling for "${courseTitle}"${price > 0 ? ` (${fmt(price, currency)} lifetime)` : ' (Free)'}. Please contact me with next steps.`,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.success) { setError(data.error || 'Failed to send. Try again.'); return; }
    setSuccess(true);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Coloured header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} className="text-white/80" />
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">Enroll Now</span>
          </div>
          <h2 className="text-white font-bold text-base leading-snug pr-8 line-clamp-2">{courseTitle}</h2>

          {/* Price display */}
          <div className="flex items-baseline gap-3 mt-3">
            {pricingType === 'free' || price === 0 ? (
              <span className="text-2xl font-black text-emerald-300">FREE</span>
            ) : isInstallment ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">
                    {fmt(price, currency)}<span className="text-base font-semibold text-white/70">/mo</span>
                  </span>
                  {discount && (
                    <span className="flex items-center gap-0.5 bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      <Percent size={10} />{discount}% OFF
                    </span>
                  )}
                </div>
                <p className="text-indigo-200 text-xs mt-1">
                  {installmentMonths} months · {fmt(totalPrice, currency)} total
                  {originalPrice && originalPrice > totalPrice && (
                    <span className="ml-1 line-through text-white/40">{fmt(originalPrice, currency)}</span>
                  )}
                </p>
              </div>
            ) : (
              <>
                <span className="text-2xl font-black text-white">{fmt(price, currency)}</span>
                {originalPrice && originalPrice > price && (
                  <span className="text-sm text-white/50 line-through">{fmt(originalPrice, currency)}</span>
                )}
                {discount && (
                  <span className="flex items-center gap-0.5 bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    <Percent size={10} />{discount}% OFF
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {success ? (
          <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
              <CheckCircle size={28} className="text-emerald-500" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Enquiry sent!</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              We received your interest in <span className="font-semibold text-slate-700">{courseTitle}</span>.
              Our team will reach out to you at <span className="text-indigo-600">{email}</span> within 24 hours.
            </p>
            <button
              onClick={onClose}
              className="mt-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <p className="text-xs text-slate-500">
              Fill in your details and we'll get back to you with enrollment instructions.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Your Name *</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Address *</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Phone <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-sm"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Sending…</>
              ) : (
                <><Send size={15} /> Send Enquiry<ArrowRight size={14} /></>
              )}
            </button>

            {/* Direct contact divider */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">or contact directly</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {ADMIN_CONTACTS.map(c => (
                <a
                  key={c.label}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border ${c.border} ${c.bg} hover:opacity-80 transition-opacity text-center group`}
                >
                  <div className={`w-8 h-8 rounded-xl ${c.iconBg} ${c.iconColor} flex items-center justify-center shadow-sm`}>
                    {c.icon(14)}
                  </div>
                  <p className="text-[10px] font-black text-slate-700 leading-tight">{c.label}</p>
                  <p className="text-[9px] text-slate-400 leading-tight">{c.sub}</p>
                </a>
              ))}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
