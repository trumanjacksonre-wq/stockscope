export default function Loading() {
  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
        <p className="text-amber-400 text-xs">
          AI-generated projections for educational purposes only. Not financial advice.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Search row skeleton */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-11 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-11 w-40 bg-white/5 rounded-lg animate-pulse shrink-0" />
        </div>

        {/* Header skeleton */}
        <div className="flex flex-col gap-2">
          <div className="h-9 w-72 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-96 bg-white/5 rounded animate-pulse" />
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-[#1c1c1e] border border-white/8 rounded-xl p-5">
              <div className="h-3 w-32 bg-white/10 rounded animate-pulse mb-3" />
              <div className="h-9 w-20 bg-white/10 rounded animate-pulse mb-2" />
              <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Chart skeleton */}
        <div className="bg-[#111111] border border-white/8 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex gap-1">
              <div className="h-7 w-16 bg-white/10 rounded animate-pulse" />
              <div className="h-7 w-12 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-7 w-10 bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="h-[380px] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm">Fetching market data + running AI analysis…</p>
            <p className="text-zinc-600 text-xs">This takes 15–30 seconds on first load</p>
          </div>
        </div>

        {/* Scenarios skeleton */}
        <div className="grid grid-cols-[1fr_340px] gap-6 items-start">
          <div className="flex flex-col gap-4">
            <div className="h-3 w-36 bg-white/10 rounded animate-pulse" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1c1c1e] border border-white/8 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full mb-4 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-4/5 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {[120, 160, 200].map((h) => (
              <div
                key={h}
                className="bg-[#1c1c1e] border border-white/8 rounded-xl animate-pulse"
                style={{ height: h }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
