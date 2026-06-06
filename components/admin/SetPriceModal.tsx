'use client';

import { useState } from 'react';
import { Tag, X, IndianRupee, Save, Zap, ShoppingCart, CalendarDays, Percent, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface Props {
  courseId: string;
  courseTitle: string;
  initialPricingType?: 'free' | 'lifetime' | 'installment';
  initialPrice?: number;
  initialOriginalPrice?: number | null;
  initialInstallmentMonths?: number | null;
  initialAccessDurationMonths?: number | null;
  initialCurrency?: string;
  hasActiveInstallmentStudents?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
];

function fmt(n: number, sym: string) {
  return `${sym}${n.toLocaleString('en-IN')}`;
}

type PricingType = 'free' | 'lifetime' | 'installment';

const TABS: { id: PricingType; label: string; icon: typeof Zap }[] = [
  { id: 'free',        label: 'Free',         icon: Zap          },
  { id: 'lifetime',    label: 'One-time',      icon: ShoppingCart },
  { id: 'installment', label: 'Installments',  icon: CalendarDays },
];

export default function SetPriceModal({
  courseId,
  courseTitle,
  initialPricingType = 'free',
  initialPrice = 0,
  initialOriginalPrice = null,
  initialInstallmentMonths = null,
  initialAccessDurationMonths = null,
  initialCurrency = 'INR',
  hasActiveInstallmentStudents = false,
  onClose,
  onSaved,
}: Props) {
  const [tab, setTab]                   = useState<PricingType>(initialPricingType);
  const [price, setPrice]               = useState(String(initialPrice || ''));
  const [originalPrice, setOriginal]    = useState(String(initialOriginalPrice ?? ''));
  const [months, setMonths]             = useState(String(initialInstallmentMonths ?? 6));
  const [currency, setCurrency]         = useState(initialCurrency);
  const [showAdvanced, setShowAdvanced] = useState(!!initialOriginalPrice);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  // Access duration
  const [lifetimeAccess, setLifetimeAccess]   = useState(initialAccessDurationMonths === null);
  const [accessMonths, setAccessMonths]       = useState(String(initialAccessDurationMonths ?? ''));
  const [accessLinked, setAccessLinked]       = useState(initialAccessDurationMonths === null || initialAccessDurationMonths === initialInstallmentMonths);

  const sym        = CURRENCIES.find(c => c.code === currency)?.symbol ?? '₹';
  const priceNum   = parseFloat(price) || 0;
  const origNum    = parseFloat(originalPrice) || null;
  const monthsNum  = parseInt(months, 10) || 1;
  const totalInst  = priceNum * monthsNum;
  const discount   = origNum && origNum > priceNum
    ? Math.round(((origNum - priceNum) / origNum) * 100)
    : null;

  async function save() {
    setError('');
    setLoading(true);
    try {
      const body: Record<string, unknown> = { pricingType: tab, currency };
      if (tab === 'free') {
        body.price = 0;
        body.originalPrice = null;
        body.installmentMonths = null;
        body.accessDurationMonths = null;
      } else if (tab === 'lifetime') {
        body.price = priceNum;
        body.originalPrice = origNum;
        body.installmentMonths = null;
        body.accessDurationMonths = lifetimeAccess ? null : (parseInt(accessMonths, 10) || null);
      } else {
        body.price = priceNum;
        body.originalPrice = origNum;
        body.installmentMonths = monthsNum;
        body.accessDurationMonths = accessLinked ? monthsNum : (parseInt(accessMonths, 10) || monthsNum);
      }

      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Save failed'); return; }
      onSaved();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-indigo-600" />
            <div>
              <h2 className="font-semibold text-slate-800 text-sm leading-tight">Set Pricing</h2>
              <p className="text-[11px] text-slate-400 truncate max-w-[260px]">{courseTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Pricing type tabs */}
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  tab === id
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Free */}
          {tab === 'free' && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-6 text-center">
              <Zap size={28} className="text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-emerald-700 text-lg">FREE</p>
              <p className="text-xs text-emerald-600 mt-1">Anyone can enroll at no cost</p>
            </div>
          )}

          {/* One-time / Lifetime */}
          {tab === 'lifetime' && (
            <div className="space-y-4">
              {/* Currency */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>

              {/* Selling price */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Selling Price (one-time)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{sym}</span>
                  <input
                    type="number" min={0}
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="e.g. 4999"
                    className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Discount (collapsible) */}
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors"
              >
                {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showAdvanced ? 'Hide' : 'Add'} discount / original price
              </button>

              {showAdvanced && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Original Price <span className="text-slate-400">(shown as strikethrough)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{sym}</span>
                    <input
                      type="number" min={0}
                      value={originalPrice}
                      onChange={e => setOriginal(e.target.value)}
                      placeholder="e.g. 9999"
                      className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Access duration */}
              <div className="border border-slate-200 rounded-xl px-4 py-3.5 space-y-2.5">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <CalendarDays size={12} className="text-indigo-500" /> Course Access
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={lifetimeAccess} onChange={e => setLifetimeAccess(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-700">Lifetime access after payment</span>
                </label>
                {!lifetimeAccess && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Access duration (months)</label>
                    <input type="number" min={1} max={120} value={accessMonths}
                      onChange={e => setAccessMonths(e.target.value)}
                      placeholder="e.g. 12"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <p className="text-[10px] text-slate-400 mt-1">Access expires N months after enrollment</p>
                  </div>
                )}
              </div>

              {/* Preview */}
              {priceNum > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1.5">Card preview</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-indigo-700">{fmt(priceNum, sym)}</span>
                    {origNum && origNum > priceNum && (
                      <span className="text-sm text-slate-400 line-through">{fmt(origNum, sym)}</span>
                    )}
                    {discount && (
                      <span className="inline-flex items-center gap-0.5 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        <Percent size={8} />{discount}% OFF
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {lifetimeAccess ? 'Lifetime access' : `Access for ${accessMonths || '?'} months`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Installment plan */}
          {tab === 'installment' && (
            <div className="space-y-4">
              {/* Currency */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Monthly amount */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Amount per month</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{sym}</span>
                    <input
                      type="number" min={0}
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Number of months */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Number of months</label>
                  <input
                    type="number" min={1} max={60}
                    value={months}
                    onChange={e => setMonths(e.target.value)}
                    placeholder="e.g. 6"
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Quick month presets */}
              <div className="flex flex-wrap gap-2">
                <p className="text-[10px] text-slate-400 w-full font-medium">Quick presets:</p>
                {[3, 6, 9, 12, 18, 24].map(m => (
                  <button
                    key={m}
                    onClick={() => setMonths(String(m))}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      parseInt(months) === m
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>

              {/* Discount (collapsible) */}
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors"
              >
                {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showAdvanced ? 'Hide' : 'Show'} original price (for discount display)
              </button>

              {showAdvanced && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Original / market total price <span className="text-slate-400">(strikethrough)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{sym}</span>
                    <input
                      type="number" min={0}
                      value={originalPrice}
                      onChange={e => setOriginal(e.target.value)}
                      placeholder="e.g. 9999"
                      className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Access duration */}
              <div className="border border-slate-200 rounded-xl px-4 py-3.5 space-y-2.5">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <CalendarDays size={12} className="text-indigo-500" /> Course Access Period
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={accessLinked} onChange={e => setAccessLinked(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-700">Same as payment period ({months || '?'} months)</span>
                </label>
                {!accessLinked && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Custom access duration (months)</label>
                    <input type="number" min={1} max={120} value={accessMonths}
                      onChange={e => setAccessMonths(e.target.value)}
                      placeholder={`e.g. ${months}`}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <p className="text-[10px] text-slate-400 mt-1">Student keeps access for this many months after enrollment</p>
                  </div>
                )}
              </div>

              {/* Preview */}
              {priceNum > 0 && (
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-4 space-y-2">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Card preview</p>

                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-lg font-black text-violet-700">
                      {fmt(priceNum, sym)}<span className="text-sm font-semibold text-violet-500">/mo</span>
                    </span>
                    {origNum && origNum > totalInst && (
                      <span className="text-sm text-slate-400 line-through">{fmt(origNum, sym)}</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    {monthsNum} months × {fmt(priceNum, sym)} ={' '}
                    <span className="font-bold text-slate-700">{fmt(totalInst, sym)} total</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Access: {accessLinked ? `${monthsNum} months (payment period)` : `${accessMonths || monthsNum} months`}
                  </p>
                </div>
              )}
            </div>
          )}

          {hasActiveInstallmentStudents && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                <span className="font-bold">Students are on active payment schedules for this course.</span> Changing the price here only affects <em>new</em> enquiries — existing installment schedules keep their original amounts and won&apos;t be touched.
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2.5 rounded-xl">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={loading || (tab !== 'free' && priceNum <= 0)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <Save size={14} />
            {loading ? 'Saving…' : 'Save Pricing'}
          </button>
        </div>
      </div>
    </div>
  );
}
