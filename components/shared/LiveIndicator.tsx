'use client';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizes = {
  sm: { dot: 'w-2 h-2', text: 'text-xs', gap: 'gap-1.5' },
  md: { dot: 'w-2.5 h-2.5', text: 'text-sm', gap: 'gap-2' },
  lg: { dot: 'w-3 h-3', text: 'text-base', gap: 'gap-2.5' },
};

export default function LiveIndicator({ size = 'md', label = 'LIVE NOW' }: Props) {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center ${s.gap}`}>
      <span className="relative flex">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75`} />
        <span className={`relative inline-flex rounded-full ${s.dot} bg-red-500`} />
      </span>
      <span className={`font-bold text-red-600 tracking-wide uppercase ${s.text}`}>{label}</span>
    </span>
  );
}
