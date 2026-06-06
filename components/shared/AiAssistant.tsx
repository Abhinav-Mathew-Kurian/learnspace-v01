'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, Loader2, Bot, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface Props {
  courseId: string;
  videoId?: string;          // when watching a specific video — AI focuses on it
  buttonPosition?: string;
  panelPosition?: string;
}

const RATE_LIMIT = 15;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copy response"
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  );
}

export default function AiAssistant({
  courseId,
  videoId,
  buttonPosition = 'bottom-6 right-6',
  panelPosition  = 'bottom-[5.5rem] right-6',
}: Props) {
  const [open, setOpen]               = useState(false);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [streaming, setStreaming]     = useState(false);
  const [questionsLeft, setQuestionsLeft] = useState(RATE_LIMIT);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || streaming) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setStreaming(true);
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, courseId, ...(videoId ? { videoId } : {}) }),
      });

      if (!res.ok || !res.body) {
        let errMsg = '⚠ Failed to reach AI assistant.';
        try { const d = await res.json() as { error?: string }; if (d?.error) errMsg = `⚠ ${d.error}`; } catch { /* ignore */ }
        setMessages(prev => [...prev.slice(0, -1), { role: 'ai', content: errMsg }]);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      const newLeft = questionsLeft - 1;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data: ')) continue;
          const data = t.slice(6);
          if (data === '[DONE]') { setStreaming(false); setQuestionsLeft(Math.max(0, newLeft)); return; }
          try {
            const delta = JSON.parse(data) as string;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'ai') return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
              return [...prev, { role: 'ai', content: delta }];
            });
          } catch { continue; }
        }
      }
      setQuestionsLeft(Math.max(0, newLeft));
    } catch {
      setMessages(prev => [...prev.slice(0, -1), { role: 'ai', content: '⚠ Connection error. Check your internet and try again.' }]);
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, courseId, videoId, questionsLeft]);

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed ${buttonPosition} z-[9000] flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95`}
        title="AI Course Assistant"
      >
        <Sparkles size={16} />
        <span className="text-sm font-semibold hidden sm:block">AI Assistant</span>
        {open && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          className={`fixed ${panelPosition} z-[9001] w-[420px] max-w-[calc(100vw-16px)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden`}
          style={{ height: 540 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-indigo-600 text-white flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">AI Course Assistant</p>
              {videoId
                ? <p className="text-[11px] text-indigo-200 truncate">Video mode — focused on current video</p>
                : <p className="text-[11px] text-indigo-200">Powered by course materials</p>
              }
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-indigo-300 bg-white/10 px-1.5 py-0.5 rounded-full tabular-nums">
                {questionsLeft}/{RATE_LIMIT} left
              </span>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center pb-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                  <Bot size={28} className="text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  {videoId ? 'Ask about this video' : 'Ask anything about this course'}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-[260px]">
                  I answer from your course videos and PDFs. Off-topic questions will be redirected.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                  {(videoId
                    ? ['Explain what was just covered', 'Give me an example', 'Summarise the key points']
                    : ['Explain this topic', 'Give me an example', 'What are the key concepts?']
                  ).map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="text-[11px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex items-start gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                {m.role === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={11} className="text-indigo-600" />
                  </div>
                )}

                <div className={`group relative max-w-[88%] ${m.role === 'user' ? '' : 'flex items-start gap-1.5'}`}>
                  {m.role === 'user' ? (
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-indigo-600 text-white text-sm leading-relaxed">
                      {m.content}
                    </div>
                  ) : (
                    <>
                      <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-slate-100 text-slate-800 text-sm leading-relaxed min-w-0 overflow-hidden">
                        {m.content === '' && streaming ? (
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Loader2 size={12} className="animate-spin" /> Thinking…
                          </span>
                        ) : (
                          // Render AI response as markdown
                          <div className="prose prose-sm prose-slate max-w-none
                            prose-headings:font-bold prose-headings:text-slate-900 prose-headings:mt-3 prose-headings:mb-1.5
                            prose-h2:text-base prose-h3:text-[13px]
                            prose-p:my-1.5 prose-p:leading-relaxed
                            prose-ul:my-1.5 prose-ul:pl-4 prose-li:my-0.5
                            prose-ol:my-1.5 prose-ol:pl-4
                            prose-strong:text-slate-900
                            prose-code:bg-slate-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[11px] prose-code:font-mono prose-code:text-indigo-700
                            prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-pre:rounded-lg prose-pre:p-3 prose-pre:text-xs prose-pre:overflow-x-auto
                            prose-blockquote:border-l-2 prose-blockquote:border-indigo-400 prose-blockquote:pl-3 prose-blockquote:text-slate-600 prose-blockquote:italic
                            prose-table:text-xs prose-table:w-full
                            prose-th:bg-slate-200 prose-th:px-2 prose-th:py-1 prose-th:text-left prose-th:font-semibold
                            prose-td:px-2 prose-td:py-1 prose-td:border prose-td:border-slate-200
                            prose-hr:border-slate-200">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {/* Copy button — only show when not streaming */}
                      {m.content && !streaming && <CopyButton text={m.content} />}
                    </>
                  )}
                </div>

              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0">
            {questionsLeft === 0 ? (
              <div className="text-center py-2 text-xs text-slate-500 bg-amber-50 rounded-xl px-3 border border-amber-100">
                You&apos;ve used all {RATE_LIMIT} questions for this hour. Check back soon.
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={videoId ? 'Ask about this video…' : 'Ask a course question…'}
                  disabled={streaming}
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-60"
                />
                <button
                  onClick={send}
                  disabled={streaming || !input.trim()}
                  className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
