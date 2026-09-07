import { useEffect, useRef, useState } from 'react';
import { publicApi } from '../api/endpoints.js';
import type { FailureType } from '../types.js';
import { SearchIcon, ChevronRight, LayersIcon } from './icons.js';

interface SearchBarProps {
  onSelect: (ft: FailureType) => void;
  large?: boolean;
}

// Free-text search over failure-type names with a live results dropdown.
export function SearchBar({ onSelect, large }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FailureType[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      publicApi
        .search(q)
        .then((r) => {
          setResults(r);
          setActive(0);
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  // Close dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = (ft: FailureType) => {
    onSelect(ft);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const dark = !large; // header variant sits on the dark bar

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <SearchIcon
          size={large ? 22 : 18}
          className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${
            dark ? 'text-slate-400' : 'text-slate-400'
          }`}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search a failure type…"
          aria-label="Search failure types"
          className={
            large
              ? 'w-full rounded-xl2 border border-slate-200 bg-white py-4 pl-12 pr-4 text-base text-slate-800 shadow-card outline-none transition placeholder:text-slate-400 focus:border-accent focus:shadow-focus'
              : 'w-full rounded-lg border border-white/10 bg-white/10 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-white/30 focus:bg-white/15'
          }
        />
        {loading && (
          <span
            className={`absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-current border-t-transparent ${
              dark ? 'text-slate-400' : 'text-accent'
            }`}
          />
        )}
      </div>

      {open && (results.length > 0 || (query.trim() && !loading)) && (
        <div className="absolute z-40 mt-2 w-full animate-slide-up overflow-hidden rounded-xl2 border border-slate-200 bg-white shadow-pop">
          {results.length > 0 ? (
            <ul className="max-h-[22rem] overflow-auto py-1.5">
              {results.map((ft, i) => (
                <li key={ft.id}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={() => choose(ft)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                      active === i ? 'bg-accent-soft' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      <LayersIcon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {ft.name}
                      </span>
                      {ft.categoryName && (
                        <span className="block text-xs text-slate-400">{ft.categoryName}</span>
                      )}
                    </span>
                    <span className="id-tag">{ft.code}</span>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-5 text-center text-sm text-slate-500">
              No failure type matches “{query.trim()}”.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
