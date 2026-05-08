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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const names   = (searchParams.get('names')   || '').split(',').filter(Boolean);
  const markets = (searchParams.get('markets') || '').split(',').filter(Boolean);

  const result: Record<string, number | null> = {};

  result['USDKRW'] = await fetchYahoo('USDKRW=X');

  await Promise.all(
    names.map(async (name, i) => {
      const market = markets[i] || '';
      let ticker: string | null = null;
      if (market === '미국') ticker = name.trim();
      else if (market === '한국') ticker = KR_TICKERS[name.trim()] || null;
      result[name] = ticker ? await fetchYahoo(ticker) : null;
    })
  );

  return NextResponse.json(result);
}
