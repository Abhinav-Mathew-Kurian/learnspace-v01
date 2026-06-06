interface Props {
  text: string;
  className?: string;
}

const isHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

/**
 * Renders course descriptions.
 * - If the content is HTML (TipTap output): renders directly with scoped prose styles.
 * - If plain text: parses # headings and - bullets.
 */
export default function DescriptionRenderer({ text, className = '' }: Props) {
  if (!text?.trim()) return null;

  if (isHtml(text)) {
    return (
      <div
        className={`description-prose ${className}`}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  // Legacy plain-text renderer
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (!bulletBuffer.length) return;
    blocks.push(
      <ul key={key++} className="space-y-1.5 my-2 ml-1">
        {bulletBuffer.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('# ')) {
      flushBullets();
      blocks.push(<h3 key={key++} className="text-sm font-bold text-slate-900 mt-4 mb-1 first:mt-0">{line.slice(2)}</h3>);
    } else if (line.startsWith('## ')) {
      flushBullets();
      blocks.push(<h4 key={key++} className="text-xs font-bold text-indigo-700 uppercase tracking-wide mt-3 mb-1 first:mt-0">{line.slice(3)}</h4>);
    } else if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
      bulletBuffer.push(line.slice(2));
    } else if (line.trim() === '') {
      flushBullets();
    } else {
      flushBullets();
      blocks.push(<p key={key++} className="text-sm text-slate-600 leading-relaxed">{line}</p>);
    }
  }
  flushBullets();

  return <div className={`space-y-0.5 ${className}`}>{blocks}</div>;
}
