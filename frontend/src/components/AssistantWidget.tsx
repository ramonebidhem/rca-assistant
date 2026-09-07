import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicApi } from '../api/endpoints.js';
import { apiErrorMessage } from '../api/client.js';
import { RichText } from './RichText.js';
import { SparklesIcon, SendIcon, XIcon, ArrowRight, ChevronRight } from './icons.js';
import type { AssistantResponse } from '../types.js';

interface Msg {
  role: 'user' | 'assistant';
  text?: string;
  response?: AssistantResponse;
}

const EXAMPLES = [
  'How do I fix strands out of the crimp?',
  'What checks should I do?',
  'List all defects',
];

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const response = await publicApi.ask(q);
      setMessages((m) => [...m, { role: 'assistant', response }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          response: { matched: false, answer: apiErrorMessage(err), sources: [] },
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const goto = (url: string) => {
    navigate(url);
    setOpen(false);
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close assistant' : 'Ask the assistant'}
        className={`fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full px-4 text-white shadow-pop transition-all hover:scale-105 ${
          open ? 'bg-slate-800' : 'bg-accent'
        }`}
      >
        {open ? <XIcon size={22} /> : <SparklesIcon size={22} />}
        {!open && <span className="pr-1 text-sm font-semibold">Ask AI</span>}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[min(34rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-2.5rem))] animate-slide-up flex-col overflow-hidden rounded-xl2 border border-slate-200 bg-white shadow-pop">
          {/* Header */}
          <div className="flex items-center gap-3 bg-ink px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <SparklesIcon size={18} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold">AI Assistant</div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                Local · grounded in platform data
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-surface p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="card p-3.5 text-sm text-slate-600">
                  Ask me about any documented defect and I'll answer from this platform's
                  root-cause library — steps, checks and references included.
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => send(ex)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-accent hover:text-accent"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3.5 py-2 text-sm text-white shadow-sm">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="space-y-2">
                  <div className="card p-3.5">
                    <RichText text={m.response!.answer} />
                  </div>

                  {m.response!.sources.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Sources
                      </div>
                      {m.response!.sources.map((s, j) => (
                        <button
                          key={j}
                          onClick={() => goto(s.url)}
                          className="card flex w-full items-center gap-2 p-2.5 text-left transition hover:border-accent hover:shadow-card-hover"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                              {s.label}
                            </span>
                            {s.sublabel && (
                              <span className="block truncate text-xs text-slate-400">
                                {s.sublabel}
                              </span>
                            )}
                          </span>
                          <ArrowRight size={16} className="shrink-0 text-accent" />
                        </button>
                      ))}
                    </div>
                  )}

                  {m.response!.suggestions && m.response!.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.response!.suggestions.map((s, j) => (
                        <button
                          key={j}
                          onClick={() => goto(s.url)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-accent hover:text-accent"
                        >
                          {s.label}
                          <ChevronRight size={13} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}

            {busy && (
              <div className="flex items-center gap-1.5 px-1 text-slate-400">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a defect…"
              aria-label="Ask the assistant"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-accent focus:shadow-focus"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition hover:bg-accent-hover disabled:opacity-40"
            >
              <SendIcon size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
