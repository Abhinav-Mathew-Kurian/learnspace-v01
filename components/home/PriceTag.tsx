import { Percent } from 'lucide-react';

interface Props {
  pricingType?: 'free' | 'lifetime' | 'installment';
  price: number;
  originalPrice?: number | null;
  installmentMonths?: number | null;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
}

const SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€' };
const fmt = (n: number, currency = 'INR') => `${SYMBOL[currency] ?? '₹'}${n.toLocaleString('en-IN')}`;

export default function PriceTag({ pricingType = 'free', price, originalPrice, installmentMonths, currency = 'INR', size = 'md', variant = 'dark' }: Props) {
  const textSz = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-base';
  const smallSz = size === 'sm' ? 'text-xs' : 'text-sm';
  const isLight = variant === 'light';

  if (pricingType === 'free' || price === 0) {
    return (
      <span className={`font-black ${isLight ? 'text-emerald-300' : 'text-emerald-600'} ${textSz}`}>FREE</span>
    );
  }

  if (pricingType === 'installment' && installmentMonths) {
    const total = price * installmentMonths;
    const discountPct = originalPrice && originalPrice > total
      ? Math.round(((originalPrice - total) / originalPrice) * 100)
      : null;
    return (
      <span className="inline-flex flex-col gap-0">
        <span className="inline-flex items-baseline gap-1">
          <span className={`font-black ${isLight ? 'text-white' : 'text-violet-700'} ${textSz}`}>
            {fmt(price, currency)}<span className={`${smallSz} font-semibold ${isLight ? 'text-white/70' : 'text-violet-500'}`}>/mo</span>
          </span>
        </span>
        <span className={`${smallSz === 'text-sm' ? 'text-xs' : 'text-[10px]'} ${isLight ? 'text-white/60' : 'text-slate-500'}`}>
          {installmentMonths}m · {fmt(total, currency)} total
          {discountPct && (
            <span className={`ml-1 inline-flex items-center gap-0.5 font-bold rounded-full px-1 text-[9px] ${isLight ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
              <Percent size={7} />{discountPct}%
            </span>
          )}
        </span>
      </span>
    );
  }

  // Lifetime
  const discount = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null;
  return (
    <span className="inline-flex items-baseline gap-1.5 flex-wrap">
      <span className={`font-black ${isLight ? 'text-white' : 'text-indigo-700'} ${textSz}`}>{fmt(price, currency)}</span>
      {originalPrice && originalPrice > price && (
        <span className={`line-through ${smallSz} ${isLight ? 'text-white/50' : 'text-slate-400'}`}>{fmt(originalPrice, currency)}</span>
      )}
      {discount && (
        <span className={`inline-flex items-center gap-0.5 font-bold rounded-full px-1.5 py-0.5 text-[10px] ${isLight ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
          <Percent size={8} />{discount}%
        </span>
      )}
    </span>
  );
}
