import { NextResponse } from 'next/server';

const SHEET_ID = '1IoA9kTlpndIRNEOX-F7s8D9BimLqEGlhQDmsCqaTa8E';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

function parseNum(v: string): number {
  if (!v) return 0;
  return parseFloat(v.replace(/[^0-9.\-]/g, '')) || 0;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

export async function GET() {
  try {
    const res = await fetch(CSV_URL, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return NextResponse.json([]);

    const trades = [];
    for (let i = 1; i < lines.length; i++) {
      const c = parseCSVLine(lines[i]);
      if (!c[0] || !c[0].trim() || isNaN(parseInt(c[0]))) continue;

      const entryStr  = c[7]  || '';
      const stopStr   = c[8]  || '';
      const exitStr   = c[10] || '';
      const profitStr = c[14] || '';
      const noteStr   = c[17] || '';
      const market    = c[3]  || '';
      const isUS      = market === '미국';

      trades.push({
        num:        parseInt(c[0]) || 0,
        date:       c[1]  || '',
        name:       c[2]  || '',
        market,
        sector:     c[4]  || '',
        direction:  c[5]  || '',
        amountKRW:  parseNum(c[6] || ''),
        entryStr,
        entryPrice: parseNum(entryStr),
        entryIsUSD: isUS ? !entryStr.includes('원') : (entryStr.includes('달러') || entryStr.includes('$')),
        stopStr,
        stopPrice:  parseNum(stopStr),
        stopIsUSD:  isUS ? !stopStr.includes('원') : (stopStr.includes('달러') || stopStr.includes('$')),
        exitStr,
        result:     c[11] || '',
        holdDays:   c[13] || '',
        profitKRW:  Math.round(parseNum(profitStr)),
        isOpen:     !exitStr.trim(),
        isPaper:    noteStr.includes('페이퍼'),
      });
    }

    return NextResponse.json(trades);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
