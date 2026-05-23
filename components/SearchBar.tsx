'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  initialValue?: string;
}

export default function SearchBar({ initialValue = '' }: Props) {
  const [value, setValue] = useState(initialValue);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialValue) inputRef.current?.focus();
  }, [initialValue]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ticker = value.trim().toUpperCase();
    if (ticker) router.push(`/dashboard/${ticker}`);
  }

  return (
    <form onSubmit={submit} className="w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder="Enter ticker symbol (e.g. NVDA, AAPL, TSLA)"
        className="w-full bg-[#1c1c1e] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30 transition-colors"
        spellCheck={false}
        autoComplete="off"
      />
    </form>
  );
}
