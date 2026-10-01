'use client';

import { useEffect, useState } from 'react';

export default function LocalTime({ ms }: { ms: number }) {
  const [text, setText] = useState('');

  useEffect(() => {
    setText(
      new Date(ms).toLocaleString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
    );
  }, [ms]);

  return (
    <time dateTime={new Date(ms).toISOString()} suppressHydrationWarning>
      {text || '\u00A0'}
    </time>
  );
}