import type { ReactNode } from 'react';

function renderInline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|==[^=]+==|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  return text.split(pattern).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('==') && part.endsWith('==')) return <mark key={index}>{part.slice(2, -2)}</mark>;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(part);
    if (link) {
      return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="underline underline-offset-2">{link[1]}</a>;
    }
    return part;
  });
}

export default function ReadingPassage({ passage, format }: { passage: string; format?: string }) {
  if (format !== 'markdown') {
    return <div className="whitespace-pre-wrap">{passage}</div>;
  }

  const lines = passage.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={`p-${blocks.length}`}>{paragraph.join(' ')}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-6">
        {list.map((item, index) => <li key={index}>{renderInline(item)}</li>)}
      </ul>,
    );
    list = [];
  };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const listItem = /^\s*[-*]\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const content = renderInline(heading[2]);
      blocks.push(level === 1
        ? <h2 key={`h-${blocks.length}`} className="text-xl font-semibold">{content}</h2>
        : level === 2
          ? <h3 key={`h-${blocks.length}`} className="text-lg font-semibold">{content}</h3>
          : <h4 key={`h-${blocks.length}`} className="font-semibold">{content}</h4>);
    } else if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();

  return <div className="space-y-4">{blocks.map((block, index) => <div key={index}>{block}</div>)}</div>;
}
