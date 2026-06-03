import { BankParser, ParseResult, RawTransaction } from './types';

// Utility to safely parse dates like '2026.04.30 15:53' or '2026-04-01' into 'YYYY-MM-DD'
function parseDate(raw: string): string | null {
  if (!raw) return null;
  const match = raw.match(/(\d{4})[-.](\d{2})[-.](\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return null;
}

// Utility to safely parse numbers with commas like '1,566,849' or 1566849
function parseAmount(raw: any): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const num = parseInt(raw.replace(/[^\d-]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export const WooriBankParser: BankParser = {
  name: '우리은행',
  canParse: (headers) => headers.includes('찾으신금액') && headers.includes('맡기신금액'),
  parse: (data) => {
    const result: ParseResult = { transactions: [] };
    const headerRowIdx = data.findIndex(row => row.includes('찾으신금액'));
    if (headerRowIdx === -1) return result;

    const headers = data[headerRowIdx];
    const dateIdx = headers.indexOf('거래일시');
    const contentIdx = headers.indexOf('적요');
    const merchantIdx = headers.indexOf('기재내용');
    const withdrawIdx = headers.indexOf('찾으신금액');
    const depositIdx = headers.indexOf('맡기신금액');

    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 5) continue;

      const dateRaw = row[dateIdx];
      if (!dateRaw) continue;

      const withdraw = parseAmount(row[withdrawIdx]);
      const deposit = parseAmount(row[depositIdx]);
      
      const type = deposit > 0 ? 'INCOME' : 'EXPENSE';
      const amount = deposit > 0 ? deposit : withdraw;

      if (amount === 0) continue;

      result.transactions.push({
        date: parseDate(dateRaw) || '',
        content: row[contentIdx],
        merchant: row[merchantIdx],
        amount,
        type,
        orderNo: null,
        paymentMethod: '우리은행',
        businessNum: null,
        note: null,
      });
    }
    return result;
  }
};

export const HanaBankParser: BankParser = {
  name: '하나은행',
  canParse: (headers) => headers.includes('출금액') && headers.includes('입금액'),
  parse: (data) => {
    const result: ParseResult = { transactions: [] };
    const headerRowIdx = data.findIndex(row => row.includes('출금액'));
    if (headerRowIdx === -1) return result;

    const headers = data[headerRowIdx];
    const dateIdx = headers.indexOf('거래일시');
    const merchantIdx = headers.indexOf('적요');
    const contentIdx = headers.indexOf('구분');
    const withdrawIdx = headers.indexOf('출금액');
    const depositIdx = headers.indexOf('입금액');

    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 4) continue;

      const dateRaw = row[dateIdx];
      if (!dateRaw) continue;

      const withdraw = parseAmount(row[withdrawIdx]);
      const deposit = parseAmount(row[depositIdx]);
      
      const type = deposit > 0 ? 'INCOME' : 'EXPENSE';
      const amount = deposit > 0 ? deposit : withdraw;

      if (amount === 0) continue;

      // Note: Hana bank uses "카카오페이     " padded strings
      const merchant = typeof row[merchantIdx] === 'string' ? row[merchantIdx].trim() : row[merchantIdx];

      result.transactions.push({
        date: parseDate(dateRaw) || '',
        content: row[contentIdx],
        merchant,
        amount,
        type,
        orderNo: null,
        paymentMethod: '하나은행',
        businessNum: null,
        note: null,
      });
    }
    return result;
  }
};

export const KBCardParser: BankParser = {
  name: 'KB카드',
  canParse: (headers) => headers.includes('이용하신곳') && headers.includes('카드번호'),
  parse: (data) => {
    const result: ParseResult = { transactions: [] };
    const headerRowIdx = data.findIndex(row => row.includes('이용하신곳'));
    if (headerRowIdx === -1) return result;

    const headers = data[headerRowIdx];
    const dateIdx = headers.indexOf('이용일');
    const merchantIdx = headers.indexOf('이용하신곳');
    const amountIdx = headers.indexOf('이용금액');
    const cancelIdx = headers.indexOf('취소여부');
    const bizIdx = headers.indexOf('사업자번호');
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 5) continue;
      
      const dateRaw = row[dateIdx];
      if (!dateRaw) continue;

      const isCanceled = row[cancelIdx] === '취소';
      if (isCanceled) continue; // Skip canceled transactions for now, or handle them

      result.transactions.push({
        date: parseDate(dateRaw) || '',
        content: 'KB카드',
        merchant: row[merchantIdx],
        amount: parseAmount(row[amountIdx]),
        type: 'EXPENSE',
        orderNo: null,
        paymentMethod: 'KB카드',
        businessNum: row[bizIdx] || null,
        note: null,
      });
    }
    return result;
  }
};

export const ShinhanCardParser: BankParser = {
  name: '신한카드',
  canParse: (headers) => headers.includes('가맹점명') && headers.includes('상품구분') && !headers.includes('승인번호'),
  parse: (data) => {
    const result: ParseResult = { transactions: [] };
    const headerRowIdx = data.findIndex(row => row.includes('가맹점명') && row.includes('상품구분'));
    if (headerRowIdx === -1) return result;

    const headers = data[headerRowIdx];
    const dateIdx = headers.indexOf('거래일');
    const merchantIdx = headers.indexOf('가맹점명');
    const amountIdx = headers.indexOf('이용금액');
    const bizIdx = headers.indexOf('사업자등록번호');

    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 5) continue;

      const dateRaw = row[dateIdx];
      if (!dateRaw) continue;

      let amount = parseAmount(row[amountIdx]);
      if (amount < 0) continue; // Cancelled

      result.transactions.push({
        date: parseDate(dateRaw) || '',
        content: '신한카드',
        merchant: row[merchantIdx],
        amount,
        type: 'EXPENSE',
        orderNo: null,
        paymentMethod: '신한카드',
        businessNum: row[bizIdx] || null,
        note: null,
      });
    }
    return result;
  }
};

export const HyundaiCardParser: BankParser = {
  name: '현대카드',
  canParse: (headers) => headers.includes('가맹점명') && headers.includes('승인번호'),
  parse: (data) => {
    const result: ParseResult = { transactions: [] };
    const headerRowIdx = data.findIndex(row => row.includes('승인번호'));
    if (headerRowIdx === -1) return result;

    const headers = data[headerRowIdx];
    const dateIdx = headers.indexOf('이용일');
    const merchantIdx = headers.indexOf('가맹점명');
    const amountIdx = headers.indexOf('이용금액');
    const bizIdx = headers.indexOf('사업자번호');

    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 5) continue;

      const dateRaw = row[dateIdx];
      // Hyundai card uses dates like '2026년 04월 30일'
      if (!dateRaw) continue;

      let amount = parseAmount(row[amountIdx]);
      if (amount < 0) continue;

      // Extract yyyy-mm-dd
      const match = typeof dateRaw === 'string' && dateRaw.match(/(\d{4})년\s*(\d{2})월\s*(\d{2})일/);
      let date = '';
      if (match) {
        date = `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        date = parseDate(dateRaw) || '';
      }

      result.transactions.push({
        date,
        content: '현대카드',
        merchant: row[merchantIdx],
        amount,
        type: 'EXPENSE',
        orderNo: null,
        paymentMethod: '현대카드',
        businessNum: row[bizIdx] || null,
        note: null,
      });
    }
    return result;
  }
};

export const AllParsers: BankParser[] = [
  WooriBankParser,
  HanaBankParser,
  KBCardParser,
  ShinhanCardParser,
  HyundaiCardParser
];

export function findParser(data: any[][]): BankParser | null {
  // Check the first 10 rows for headers
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    for (const parser of AllParsers) {
      if (parser.canParse(row)) {
        return parser;
      }
    }
  }
  return null;
}
