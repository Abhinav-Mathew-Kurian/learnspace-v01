'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Type, Palette, ChevronDown,
  Undo, Redo, RemoveFormatting,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TEXT_COLORS = [
  { label: 'Default', color: '' },
  { label: 'Indigo', color: '#6366f1' },
  { label: 'Sky', color: '#0ea5e9' },
  { label: 'Green', color: '#22c55e' },
  { label: 'Amber', color: '#f59e0b' },
  { label: 'Red', color: '#ef4444' },
  { label: 'Slate', color: '#64748b' },
  { label: 'White', color: '#ffffff' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', color: '' },
  { label: 'Yellow', color: '#fef08a' },
  { label: 'Indigo', color: '#e0e7ff' },
  { label: 'Sky', color: '#bae6fd' },
  { label: 'Green', color: '#bbf7d0' },
  { label: 'Red', color: '#fecaca' },
  { label: 'Amber', color: '#fed7aa' },
  { label: 'Dark', color: '#1e1e2e' },
];

function ColorPicker({
  colors,
  onSelect,
  icon: Icon,
  title,
}: {
  colors: { label: string; color: string }[];
  onSelect: (c: string) => void;
  icon: React.ElementType;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={title}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-0.5 p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-600"
      >
        <Icon size={14} />
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2 mt-1 min-w-[140px]">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1 mb-1.5">{title}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {colors.map(({ label, color }) => (
              <button
                key={label}
                type="button"
                title={label}
                onClick={() => { onSelect(color); setOpen(false); }}
                className="w-7 h-7 rounded-lg border-2 border-slate-200 hover:border-indigo-400 transition-colors flex items-center justify-center"
                style={{ backgroundColor: color || '#f8fafc' }}
              >
                {!color && <span className="text-[8px] text-slate-400 font-bold">✕</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({
  onClick, active, title, children, disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors disabled:opacity-30 ${
        active
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5 self-center" />;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 220 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write your description…' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'outline-none prose prose-sm max-w-none',
      },
    },
  });

  // Sync external value only on mount / external reset
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (!editor || value === prevValueRef.current) return;
    prevValueRef.current = value;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '');
    }
  }, [editor, value]);

  if (!editor) return null;

  const e = editor;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
      {/* Toolbar — sticky so it stays visible while scrolling long content */}
      <div className="flex items-center flex-wrap gap-0.5 px-3 py-2 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
        {/* Undo/Redo */}
        <ToolbarBtn onClick={() => e.chain().focus().undo().run()} title="Undo" disabled={!e.can().undo()}>
          <Undo size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().redo().run()} title="Redo" disabled={!e.can().redo()}>
          <Redo size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Headings */}
        <ToolbarBtn
          onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}
          active={e.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}
          active={e.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Text formatting */}
        <ToolbarBtn onClick={() => e.chain().focus().toggleBold().run()} active={e.isActive('bold')} title="Bold">
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().toggleItalic().run()} active={e.isActive('italic')} title="Italic">
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().toggleUnderline().run()} active={e.isActive('underline')} title="Underline">
          <UnderlineIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().toggleStrike().run()} active={e.isActive('strike')} title="Strikethrough">
          <Strikethrough size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Lists */}
        <ToolbarBtn
          onClick={() => e.chain().focus().toggleBulletList().run()}
          active={e.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => e.chain().focus().toggleOrderedList().run()}
          active={e.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Alignment */}
        <ToolbarBtn onClick={() => e.chain().focus().setTextAlign('left').run()} active={e.isActive({ textAlign: 'left' })} title="Align Left">
          <AlignLeft size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().setTextAlign('center').run()} active={e.isActive({ textAlign: 'center' })} title="Align Center">
          <AlignCenter size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().setTextAlign('right').run()} active={e.isActive({ textAlign: 'right' })} title="Align Right">
          <AlignRight size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Colors */}
        <ColorPicker
          colors={TEXT_COLORS}
          title="Text Color"
          icon={Palette}
          onSelect={(c) => {
            if (!c) e.chain().focus().unsetColor().run();
            else e.chain().focus().setColor(c).run();
          }}
        />
        <ColorPicker
          colors={HIGHLIGHT_COLORS}
          title="Highlight"
          icon={Highlighter}
          onSelect={(c) => {
            if (!c) e.chain().focus().unsetHighlight().run();
            else e.chain().focus().setHighlight({ color: c }).run();
          }}
        />

        <Divider />

        {/* Clear formatting */}
        <ToolbarBtn onClick={() => e.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">
          <RemoveFormatting size={14} />
        </ToolbarBtn>
      </div>

      {/* Editor content — grows with text; page scrolls, not this div */}
      <div
        className="px-4 py-3 bg-white cursor-text"
        style={{ minHeight }}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
