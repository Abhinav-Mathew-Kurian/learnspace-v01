'use client';

import { useState } from 'react';
import { ShoppingCart, Zap } from 'lucide-react';
import BuyModal from './BuyModal';

interface Props {
  courseTitle: string;
  pricingType?: 'free' | 'lifetime' | 'installment';
  price: number;
  originalPrice?: number | null;
  installmentMonths?: number | null;
  currency?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  variant?: 'dark' | 'light';
}

export default function BuyButton({ courseTitle, pricingType = 'free', price, originalPrice, installmentMonths, currency = 'INR', size = 'md', fullWidth = false, variant = 'dark' }: Props) {
  const [open, setOpen] = useState(false);

  const isFree = pricingType === 'free' || price === 0;
  const classes = size === 'sm'
    ? 'text-xs px-3 py-1.5 rounded-lg gap-1.5'
    : 'text-sm px-5 py-3 rounded-xl gap-2';

  return (
    <>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={`${fullWidth ? 'w-full justify-center' : ''} inline-flex items-center font-bold transition-all ${classes} ${
          isFree
            ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/30'
            : variant === 'light'
              ? 'bg-white hover:bg-slate-50 text-indigo-700 shadow-lg shadow-indigo-900/20'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/30'
        }`}
      >
        {isFree ? <Zap size={size === 'sm' ? 11 : 14} /> : <ShoppingCart size={size === 'sm' ? 11 : 14} />}
        {isFree ? 'Enroll Free' : 'Buy Now'}
      </button>

      {open && (
        <BuyModal
          courseTitle={courseTitle}
          pricingType={pricingType}
          price={price}
          originalPrice={originalPrice}
          installmentMonths={installmentMonths}
          currency={currency}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
