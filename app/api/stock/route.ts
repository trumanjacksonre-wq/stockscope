import { getOHLC, getTickerDetails } from '@/lib/polygon';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker')?.toUpperCase();
  if (!ticker) {
    return Response.json({ error: 'ticker is required' }, { status: 400 });
  }

  // Validate ticker format — letters and dots only (e.g. BRK.B)
  if (!/^[A-Z.]{1,10}$/.test(ticker)) {
    return Response.json({ error: 'invalid ticker' }, { status: 400 });
  }

  try {
    // Fetch full year for 52w range + 30d change derivation; slice to 90d for the chart
    const ohlcFull = await getOHLC(ticker, 365);
    if (ohlcFull.length === 0) {
      return Response.json({ error: `No market data found for ${ticker}` }, { status: 404 });
    }

    const details = await getTickerDetails(ticker, ohlcFull);
    const ohlc = ohlcFull.slice(-90); // last 90 trading days for the chart

    return Response.json({ ohlc, details });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
