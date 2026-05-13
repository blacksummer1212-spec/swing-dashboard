import { NextRequest, NextResponse } from 'next/server';

async function fetchYahoo(ticker: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

async function fetchUpbit(ticker: string): Promise<number | null> {
  try {
    const upper = ticker.toUpperCase();
    const symbol = upper.endsWith('KRW') ? upper.slice(0, -3) : upper;
    const url = `https://api.upbit.com/v1/ticker?markets=KRW-${encodeURIComponent(symbol)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.trade_price ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tickers = (searchParams.get('tickers') || '').split(',').filter(Boolean);
  const markets = (searchParams.get('markets') || '').split(',').filter(Boolean);

  const result: Record<string, number | null> = {};

  result['USDKRW'] = await fetchYahoo('USDKRW=X');

  await Promise.all(
    tickers.map(async (ticker, i) => {
      const market = markets[i] || '';
      const t = ticker.trim();
      if (market === '코인') {
        result[ticker] = await fetchUpbit(t);
      } else if (market === '한국') {
        // suffix 없는 6자리 코드면 .KS → .KQ 순으로 시도
        if (!t.includes('.')) {
          const ks = await fetchYahoo(`${t}.KS`);
          result[ticker] = ks ?? await fetchYahoo(`${t}.KQ`);
        } else {
          result[ticker] = await fetchYahoo(t);
        }
      } else {
        result[ticker] = await fetchYahoo(t);
      }
    })
  );

  return NextResponse.json(result);
}
