import { getNewsHeadlines } from '@/lib/news';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ticker = searchParams.get('ticker')?.toUpperCase();
  const companyName = searchParams.get('name') ?? undefined;

  if (!ticker) {
    return Response.json({ error: 'ticker is required' }, { status: 400 });
  }

  if (!/^[A-Z.]{1,10}$/.test(ticker)) {
    return Response.json({ error: 'invalid ticker' }, { status: 400 });
  }

  try {
    const headlines = await getNewsHeadlines(ticker, companyName);
    return Response.json({ headlines });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Return empty headlines rather than a hard error — news is non-critical
    if (message.includes('NewsAPI error')) {
      return Response.json({ headlines: [], warning: message });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
