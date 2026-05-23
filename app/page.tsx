import SearchBar from '@/components/SearchBar';

const POPULAR = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'AMZN', 'META'];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl flex flex-col gap-8">

        {/* Brand */}
        <div className="text-center">
          <h1 className="text-white text-4xl font-bold tracking-tight mb-2">StockScope</h1>
          <p className="text-zinc-400 text-base">
            AI-powered forward scenario analysis for any stock
          </p>
        </div>

        {/* Search */}
        <SearchBar />

        {/* Popular tickers */}
        <div className="flex flex-col gap-2">
          <p className="text-zinc-600 text-xs font-semibold tracking-widest uppercase text-center">Popular</p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR.map((t) => (
              <a
                key={t}
                href={`/dashboard/${t}`}
                className="bg-[#1c1c1e] border border-white/8 text-zinc-300 text-sm px-4 py-2 rounded-lg hover:border-white/20 hover:text-white transition-colors"
              >
                {t}
              </a>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-zinc-600 text-xs text-center">
          AI-generated projections only. Not financial advice.
        </p>
      </div>
    </div>
  );
}
