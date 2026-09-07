import { Fragment, type ReactNode } from 'react';

// Renders **bold** and *italic* inline within a line.
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    if (m[2] !== undefined) {
      nodes.push(<strong key={key++} className="font-semibold text-slate-900">{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      nodes.push(<em key={key++}>{m[3]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return nodes;
}

// Minimal, safe markdown-lite renderer: paragraphs, "- " bullets and "N." lists,
// plus inline **bold** / *italic*. No raw HTML is ever interpreted.
export function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((it, i) => (
      <li key={i} className="ml-4 list-outside">
        {renderInline(it)}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={key++} className="list-decimal space-y-0.5 pl-2">{items}</ol>
      ) : (
        <ul key={key++} className="list-disc space-y-0.5 pl-2">{items}</ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const bullet = line.match(/^\s*-\s+(.*)$/);
    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (bullet) {
      if (list && list.ordered) flush();
      list = list ?? { ordered: false, items: [] };
      list.items.push(bullet[1]);
    } else if (numbered) {
      if (list && !list.ordered) flush();
      list = list ?? { ordered: true, items: [] };
      list.items.push(numbered[1]);
    } else {
      flush();
      blocks.push(
        <p key={key++} className="leading-relaxed">
          {renderInline(line)}
        </p>,
      );
    }
  }
  flush();

  return <div className="space-y-2 text-sm text-slate-700">{blocks}</div>;
}
