import { NextRequest, NextResponse } from 'next/server';

const KR_TICKERS: Record<string, string> = {
  'SK하이닉스':     '000660.KS',
  '삼성전자':       '005930.KS',
  '삼성물산':       '028260.KS',
  'LG화학':         '051910.KS',
  'POSCO홀딩스':    '005490.KS',
  'KB금융':         '105560.KS',
  '현대차':         '005380.KS',
  'NAVER':          '035420.KS',
  '카카오':         '035720.KS',
  'LG에너지솔루션': '373220.KS',
  '셀트리온':       '068270.KS',
  'DB하이텍':       '000990.KS',
};

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

async function fetchUpbit(name: string): Promise<number | null> {
  try {
    const upper = name.toUpperCase();
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
  const names   = (searchParams.get('names')   || '').split(',').filter(Boolean);
  const markets = (searchParams.get('markets') || '').split(',').filter(Boolean);

  const result: Record<string, number | null> = {};

  result['USDKRW'] = await fetchYahoo('USDKRW=X');

  await Promise.all(
    names.map(async (name, i) => {
      const market = markets[i] || '';
      if (market === '미국') {
        result[name] = await fetchYahoo(name.trim());
      } else if (market === '한국') {
        const ticker = KR_TICKERS[name.trim()] || null;
        result[name] = ticker ? await fetchYahoo(ticker) : null;
      } else if (market === '코인') {
        result[name] = await fetchUpbit(name.trim());
      } else {
        result[name] = null;
      }
    })
  );

  return NextResponse.json(result);
}
