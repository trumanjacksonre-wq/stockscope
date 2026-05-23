import { getIntradayOHLC } from '@/lib/polygon';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ticker = searchParams.get('ticker')?.toUpperCase();
  const range  = searchParams.get('range'); // '5D' | '2D'

  if (!ticker || !/^[A-Z.]{1,10}$/.test(ticker)) {
    return Response.json({ error: 'invalid ticker' }, { status: 400 });
  }

  try {
    let ohlc;
    if (range === '5D') {
      // 5-minute bars, look back 8 calendar days to guarantee 5 trading days
      ohlc = await getIntradayOHLC(ticker, 5, 'minute', 8);
    } else if (range === '2D') {
      // 1-hour bars, look back 4 calendar days to guarantee 2 trading days
      ohlc = await getIntradayOHLC(ticker, 1, 'hour', 4);
    } else {
      return Response.json({ error: 'range must be 5D or 2D' }, { status: 400 });
    }

    return Response.json({ ohlc }, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
