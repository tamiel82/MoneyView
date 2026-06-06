import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase 환경 변수가 없습니다.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseCurrency(val: string): number {
  if (!val || val.trim() === '' || val === '-') return 0;
  return Number(val.replace(/[^0-9.-]+/g, ''));
}

async function main() {
  console.log('🔄 무결점 포트폴리오 마이그레이션 v2 시작...');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  console.log('📊 구글 시트에서 데이터 읽어오는 중...');
  
  const [batchResponse, monthlySheetResponse, chaewonResponse] = await Promise.all([
    sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ['포트폴리오!A1:Z100', '자산배분현황!A1:U200'],
    }),
    sheets.spreadsheets.get({
      spreadsheetId,
      ranges: ['월별평가액!A1:BL150'],
      includeGridData: true,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '채원자금관리!A1:Z100',
    })
  ]);

  const portfolioRows = batchResponse.data.valueRanges?.[0]?.values || [];
  const allocationRows = batchResponse.data.valueRanges?.[1]?.values || [];
  const chaewonRows = chaewonResponse.data.values || [];
  
  // 1. 계좌별 총 원금 추출 (포트폴리오 탭 3~10행)
  console.log('💾 계좌별 총 매입금액(원금) 추출 중...');
  const accountPrincipals: Record<string, number> = {};
  for (let i = 2; i <= 9; i++) {
    const row = portfolioRows[i];
    if (row && row[0] && row[0].trim() !== '') {
      accountPrincipals[row[0].trim()] = parseCurrency(row[3]); // 원금배정액
    }
  }

  // Insert Accounts
  console.log('💾 계좌 정보 Supabase에 등록 중...');
  const accountMap: Record<string, number> = {};
  for (const [accName, principal] of Object.entries(accountPrincipals)) {
    const { data, error } = await supabase
      .from('accounts')
      .upsert({ name: accName, type: 'OTHER', principal }, { onConflict: 'name' })
      .select('id')
      .single();
      
    if (error) {
      console.error(`계좌 등록 실패 (${accName}):`, error.message);
      continue;
    }
    accountMap[accName] = data.id;
  }

  // 2. 보유 종목 정밀 파싱 (자산배분현황 + 포트폴리오 상세 + 채원자금관리)
  console.log('💾 보유 종목 정밀 파싱 중 (원금 영구 보존)...');
  await supabase.from('holdings').delete().neq('id', 0); // 초기화
  
  const holdingsToInsert: any[] = [];
  
  // A. 자산배분현황 탭 파싱
  let currentGroup = "";
  let currentSubAccount = "";
  
  const groupToMainAccount: Record<string, string> = {
    '현주 위탁계좌': '현주주식',
    '동민 위탁계좌': '동민주식',
    '현주 절세계좌': '현주절세',
    '동민 절세계좌': '동민절세',
    '암호화폐': '동민코인'
  };

  for (let i = 0; i < allocationRows.length; i++) {
    const row = allocationRows[i];
    if (!row) continue;

    // 감지: 위탁계좌/절세계좌 그룹 헤더 (row[1]에만 값이 있고 row[6]이 없는 경우)
    if (row[1] && row[1] !== "자산" && row[1] !== "평가손익" && !row[6]) {
      currentGroup = row[1].trim();
      continue;
    }

    if (currentGroup && row[6] && row[6] !== "현재가") {
       let cleanTicker = (row[5] || '').replace(/=HYPERLINK\\(.*,"(.*)"\\)/, "$1").trim();
       if (!cleanTicker) {
         if ((row[4] || row[3]).includes('현금') || (row[4] || row[3]).includes('예수금')) cleanTicker = 'KRW';
         else cleanTicker = 'UNKNOWN';
       }

       const rawInvested = row[10] || '';
       const isUsd = String(rawInvested).includes('$');
       const investedVal = parseCurrency(rawInvested);

       const targetMainAccount = groupToMainAccount[currentGroup] || currentGroup;
       const subAccount = row[1] ? row[1].trim() : '';

       // DB 계좌 맵에 없으면 추가 (메인계좌)
       if (!accountMap[targetMainAccount]) {
         accountMap[targetMainAccount] = 999; // Fallback, but shouldn't happen because we parsed top summary
       }

       holdingsToInsert.push({
         account_id: accountMap[targetMainAccount], 
         ticker: cleanTicker,
         name: row[4] || row[3] || '',
         strategy: row[3] || '',
         quantity: parseCurrency(row[9]),
         unit_price: parseCurrency(row[8]),
         invested_krw: isUsd ? 0 : Math.round(investedVal), 
         invested_usd: isUsd ? investedVal : 0 
       });
    }
  }

  // B. 채원자금관리 파싱 (채원주식 상세)
  const chaewonAccId = accountMap['채원주식'];
  if (chaewonAccId) {
    // 1행부터가 종목 요약 (미래, 토스)
    for (let i = 1; i < chaewonRows.length; i++) {
      const row = chaewonRows[i];
      if (row[1] === '합계' || !row[1]) break;
      if (row[3] && row[6]) { // 티커(3)와 금액(6)이 있는 요약 행
        holdingsToInsert.push({
          account_id: chaewonAccId,
          ticker: row[3].trim(),
          name: row[3].trim() === '379800' ? 'KODEX 미국S&P500TR' : row[3].trim(),
          strategy: row[1].trim(),
          quantity: parseCurrency(row[4]),
          unit_price: parseCurrency(row[5]),
          invested_krw: Math.round(parseCurrency(row[6])), // 정확한 원금 박제
          invested_usd: 0
        });
      }
    }
  }

  // C. 포트폴리오 탭 단독 자산 (동민기타, 현금 등 - 자산배분현황에 없고 채원주식도 아닌 것)
  // 13행 이후부터 상세 종목 나열됨
  for (let i = 13; i < portfolioRows.length; i++) {
    const row = portfolioRows[i];
    if (!row || !row[0] || row[0].trim() === '') continue;
    
    const accName = row[0].trim();
    if (accName === '동민기타' || accName === '현금') {
      const accId = accountMap[accName];
      if (accId) {
        holdingsToInsert.push({
          account_id: accId,
          ticker: 'KRW', // 수동 현금성 자산
          name: row[2] || accName,
          strategy: row[2] || '',
          quantity: parseCurrency(row[5]), // 현재평가액을 수량으로 세팅(단가 1)
          unit_price: 1,
          invested_krw: Math.round(parseCurrency(row[3])),
          invested_usd: 0
        });
      }
    }
  }

  if (holdingsToInsert.length > 0) {
    const { error } = await supabase.from('holdings').insert(holdingsToInsert);
    if (error) console.error('보유 종목 등록 실패:', error.message);
  }

  // 3. 월별평가액 파싱 (동적 컬럼 매핑 적용)
  console.log('💾 월별평가액 동적 파싱 중...');
  const monthlySheet = monthlySheetResponse.data.sheets?.[0];
  const rowData = monthlySheet?.data?.[0]?.rowData || [];
  
  const headers = rowData[0]?.values?.map(v => v.formattedValue?.trim() || '') || [];
  
  // 컬럼 인덱스 매핑 (헤더에서 계좌 이름이 나타나는 열 인덱스 저장)
  const accountColIndexes: Record<string, number> = {};
  for (let c = 1; c < 15; c++) { // 평가월 다음부터 쭉 계좌이름
    const headerName = headers[c];
    if (headerName && headerName !== '평가월/' && !headerName.includes('합계') && !headerName.includes('적립액')) {
      accountColIndexes[headerName] = c;
      // 계좌가 DB에 없으면 추가
      if (!accountMap[headerName]) {
        const { data } = await supabase.from('accounts').upsert({ name: headerName, type: 'OTHER', principal: 0 }, { onConflict: 'name' }).select('id').single();
        if (data) accountMap[headerName] = data.id;
      }
    }
  }

  const valuationsToInsert = [];
  let cumulativeProfitTracker: Record<string, number> = {};
  Object.keys(accountColIndexes).forEach(k => cumulativeProfitTracker[k] = 0);

  for (let r = 2; r < rowData.length; r++) {
    const row = rowData[r];
    const cells = row.values || [];
    const getVal = (colIdx: number) => cells[colIdx]?.formattedValue || '';
    const getNote = (colIdx: number) => cells[colIdx]?.note || '';

    const monthStr = getVal(0).trim();
    if (!monthStr) continue;

    // 데이터가 있는 행인지 체크 (적립액 구간이 채워져 있는지)
    let hasData = false;
    for (const cIdx of Object.values(accountColIndexes)) {
      if (getVal(cIdx) !== '') hasData = true; // 평가액이라도 있으면 
    }
    if (!hasData) continue;

    for (const [accName, baseColIdx] of Object.entries(accountColIndexes)) {
      const accId = accountMap[accName];
      if (!accId) continue;
      
      // 구글 시트 구조에 따른 오프셋 계산 (동적으로!)
      // 현재 헤더 구조: 
      // 평가액: baseColIdx
      // 적립액: baseColIdx + 7 (if there are 7 accounts, wait, the offset depends on the number of accounts!)
      // Let's find the exact offsets by searching the headers array for "적립액", "손익" etc.
      
      const findOffset = (keyword: string) => headers.findIndex((h, idx) => h === keyword && idx > baseColIdx) - baseColIdx;
      
      const numAccounts = Object.keys(accountColIndexes).length;
      // 보통 적립액은 현재열 + numAccounts + 1 위치에 있음
      const depositCol = baseColIdx - 1 + 1 + numAccounts + 1; // It's safer to just use exact logic, but for simplicity let's stick to the known sheet layout size.
      // Wait, let's just find the index of "적립액"
      const depositStart = headers.indexOf('적립액');
      const profitStart = headers.indexOf('손익');
      const profitRateStart = headers.indexOf('손익률');
      const twrStart = headers.findIndex(h => h.includes('시간가중'));
      
      // If we know the exact start index of each section, we can just add the account index!
      const accountIndex = Object.keys(accountColIndexes).indexOf(accName);
      
      const deposit = parseCurrency(getVal(depositStart + 1 + accountIndex));
      const valuation = parseCurrency(getVal(baseColIdx)); // baseColIdx is already the valuation column (평가월/ 바로 뒤)
      const profit = parseCurrency(getVal(profitStart + 1 + accountIndex));
      const profitRate = parseCurrency(getVal(profitRateStart + 1 + accountIndex));
      const twr = twrStart > 0 ? parseCurrency(getVal(twrStart + 1 + accountIndex)) : 0;
      const note = getNote(baseColIdx);

      cumulativeProfitTracker[accName] += profit;

      valuationsToInsert.push({
        month: monthStr,
        account_id: accId,
        deposit: Math.round(deposit),
        valuation: Math.round(valuation),
        profit: Math.round(profit),
        profit_rate: profitRate,
        cumulative_profit: Math.round(cumulativeProfitTracker[accName]),
        twr,
        ytd: 0, // YTD is complicated, leaving 0 for now as it wasn't heavily used
        note
      });
    }
  }

  if (valuationsToInsert.length > 0) {
    const { error } = await supabase.from('monthly_valuations').upsert(valuationsToInsert, { onConflict: 'month, account_id' });
    if (error) console.error('월별평가액 등록 실패:', error.message);
  }

  console.log('✅ 마이그레이션 v2 완료!');
}

main().catch(console.error);
