import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase 환경 변수가 없습니다.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔄 포트폴리오 마이그레이션 시작 (Google Sheets -> Supabase)...');

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error('Google Sheets 환경 변수가 없습니다.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  console.log('📊 구글 시트에서 데이터 읽어오는 중...');
  
  const [batchResponse, monthlySheetResponse] = await Promise.all([
    sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ['포트폴리오!A1:Z50', '자산배분현황!A1:U200'],
    }),
    sheets.spreadsheets.get({
      spreadsheetId,
      ranges: ['월별평가액!A1:BL150'],
      includeGridData: true,
    })
  ]);

  const allocationRows = batchResponse.data.valueRanges?.[1]?.values || [];
  
  // 1. 자산배분현황 파싱 (Holdings & Accounts)
  console.log('💾 계좌 및 보유 종목 파싱 중...');
  const allocations: Record<string, any[]> = {};
  let currentAccountId = "";

  for (let i = 0; i < allocationRows.length; i++) {
    const row = allocationRows[i];
    if (!row) continue;

    // Detect Account Header
    if (row[1] && row[1] !== "자산" && row[1] !== "평가손익" && !row[6]) {
       currentAccountId = row[1].trim();
       if (!allocations[currentAccountId]) {
         allocations[currentAccountId] = [];
       }
       continue;
    }

    // Detect Holding
    if (currentAccountId && row[6] && row[6] !== "현재가") {
       allocations[currentAccountId].push({
         subAccount: row[1] || '',
         strategy: row[3] || '',
         name: row[4] || row[3] || '',
         ticker: row[5] || '',
         unitPrice: row[8] || '0',
         quantity: row[9] || '0',
       });
    }
  }

  // Insert Accounts
  console.log('💾 계좌 정보 Supabase에 등록 중...');
  const accountMap: Record<string, number> = {};
  
  for (const accName of Object.keys(allocations)) {
    const { data, error } = await supabase
      .from('accounts')
      .upsert({ name: accName, type: 'OTHER' }, { onConflict: 'name' })
      .select('id')
      .single();
      
    if (error) {
      console.error(`계좌 등록 실패 (${accName}):`, error.message);
      continue;
    }
    accountMap[accName] = data.id;
  }

  // Insert Holdings
  console.log('💾 보유 종목 정보 Supabase에 등록 중...');
  // 먼저 기존 종목 초기화 (중복 방지)
  await supabase.from('holdings').delete().neq('id', 0);

  const holdingsToInsert = [];
  for (const accName of Object.keys(allocations)) {
    const accId = accountMap[accName];
    if (!accId) continue;

    for (const h of allocations[accName]) {
      let cleanTicker = h.ticker.replace(/=HYPERLINK\(.*,"(.*)"\)/, "$1").trim();
      if (!cleanTicker) {
        // 티커가 없는 현금 자산 처리
        if (h.name.includes('현금') || h.name.includes('원화')) cleanTicker = 'KRW';
        else if (h.name.includes('달러') || h.name.includes('USD')) cleanTicker = 'USD';
        else cleanTicker = 'UNKNOWN';
      }

      const qty = Number(String(h.quantity).replace(/[^0-9.-]+/g, '')) || 0;
      const price = Number(String(h.unitPrice).replace(/[^0-9.-]+/g, '')) || 0;

      holdingsToInsert.push({
        account_id: accId,
        ticker: cleanTicker,
        name: h.name,
        strategy: h.strategy,
        quantity: qty,
        unit_price: price
      });
    }
  }

  if (holdingsToInsert.length > 0) {
    const { error } = await supabase.from('holdings').insert(holdingsToInsert);
    if (error) console.error('보유 종목 등록 실패:', error.message);
  }

  // 2. 월별평가액 파싱 및 등록
  console.log('💾 월별평가액 히스토리 파싱 중...');
  const monthlySheet = monthlySheetResponse.data.sheets?.[0];
  const gridData = monthlySheet?.data?.[0];
  const rowData = gridData?.rowData || [];
  
  const monthlyRows: string[][] = [];
  const monthlyNotes: string[][] = [];

  for (let r = 0; r < rowData.length; r++) {
    const row = rowData[r];
    const valRow: string[] = [];
    const noteRow: string[] = [];
    const cells = row.values || [];
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      valRow.push(cell.formattedValue || '');
      noteRow.push(cell.note || '');
    }
    monthlyRows.push(valRow);
    monthlyNotes.push(noteRow);
  }

  const accountNames = ['현금', '현주주식', '동민주식', '동민연금', '현주연금', '동민코인', '기타'];
  
  // 각 계좌별로 누적 수익금을 추적
  let cumulativeProfitTracker: Record<string, number> = {};
  accountNames.forEach(n => cumulativeProfitTracker[n] = 0);

  const valuationsToInsert = [];

  for (let i = 2; i < monthlyRows.length; i++) {
    const row = monthlyRows[i];
    if (!row || !row[0] || row[0].trim() === '') continue;

    const hasDeposits = Array.from({ length: 7 }, (_, idx) => row[1 + idx]).some(val => val !== undefined && val.trim() !== '');
    if (!hasDeposits) continue;

    const monthStr = row[0].trim();
    const parseCurrency = (val: string) => val ? Number(val.replace(/[^0-9.-]+/g, '')) : 0;
    const parsePercent = (val: string) => val ? Number(val.replace(/[^0-9.-]+/g, '')) : 0;

    for (let idx = 0; idx < accountNames.length; idx++) {
      const accName = accountNames[idx];
      let accId = accountMap[accName];
      
      if (!accId) {
        // 계좌가 아직 DB에 없으면 월별평가액 전용으로라도 생성
        const { data, error } = await supabase.from('accounts').upsert({ name: accName, type: 'OTHER' }, { onConflict: 'name' }).select('id').single();
        if (!error && data) {
          accountMap[accName] = data.id;
          accId = data.id;
        } else {
          continue;
        }
      }

      const deposit = parseCurrency(row[1 + idx]);
      const valuation = parseCurrency(row[9 + idx]);
      const profit = parseCurrency(row[18 + idx]);
      const profitRate = (row[26 + idx] && row[26 + idx].trim() !== '') ? parsePercent(row[26 + idx]) : 0;
      const twr = (row[42 + idx] && row[42 + idx].trim() !== '') ? parsePercent(row[42 + idx]) : 0;
      const ytd = (row[50 + idx] && row[50 + idx].trim() !== '') ? parsePercent(row[50 + idx]) : 0;
      const note = monthlyNotes[i]?.[1 + idx] || '';

      cumulativeProfitTracker[accName] += profit;

      valuationsToInsert.push({
        month: monthStr,
        account_id: accId,
        deposit,
        valuation,
        profit,
        profit_rate: profitRate,
        cumulative_profit: cumulativeProfitTracker[accName],
        twr,
        ytd,
        note
      });
    }
  }

  if (valuationsToInsert.length > 0) {
    // Upsert (conflict on month, account_id)
    const { error } = await supabase.from('monthly_valuations').upsert(valuationsToInsert, { onConflict: 'month, account_id' });
    if (error) console.error('월별평가액 등록 실패:', error.message);
  }

  console.log('✅ 마이그레이션 완료!');
}

main().catch(console.error);
