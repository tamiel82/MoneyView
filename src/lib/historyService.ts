import { google } from 'googleapis';
import { TransactionData, ExchangeData, ExchangeSummary, ExchangeTotalSummary } from '@/types/portfolio';

export interface HistoryDataResponse {
  transactions: TransactionData[];
  exchanges: ExchangeData[];
  exchangeSummary?: ExchangeSummary;
  exchangeTotalSummary?: ExchangeTotalSummary;
}

export async function getHistoryData(): Promise<HistoryDataResponse> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error('Google Sheets 환경 변수가 설정되지 않았습니다.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: ['거래기록!A2:C1000', '환전기록!A3:H1000'],
  });

  const txRows = response.data.valueRanges?.[0]?.values || [];
  const exRows = response.data.valueRanges?.[1]?.values || [];

  const transactions: TransactionData[] = [];
  for (let i = 0; i < txRows.length; i++) {
    const row = txRows[i];
    if (!row[0] || row[0].trim() === '') continue; // Skip empty dates
    transactions.push({
      rowIndex: i + 2, // A2 is index 0 -> row 2
      date: row[0].trim(),
      amount: row[1] || '',
      memo: row[2] || '',
    });
  }

  transactions.reverse();

  const exchanges: ExchangeData[] = [];
  let markerIndex = -1;
  
  for (let i = 0; i < exRows.length; i++) {
    const row = exRows[i];
    
    // Stop parsing if we hit the summary marker
    if (row[1]?.includes('이 위에 작성')) {
      markerIndex = i;
      break;
    }

    const hyunjuDate = row[0]?.trim() || '(미상)';
    const hyunjuRate = row[1]?.trim();
    const hyunjuKrw = row[2]?.trim();
    const hyunjuUsd = row[3]?.trim();

    if (hyunjuRate || hyunjuKrw || hyunjuUsd) {
      exchanges.push({
        rowIndex: i + 3, // A3 is index 0 -> row 3
        user: '현주 환전',
        date: hyunjuDate,
        rate: hyunjuRate || '-',
        krw: hyunjuKrw || '-',
        usd: hyunjuUsd || '-',
      });
    }

    const dongminDate = row[4]?.trim() || hyunjuDate;
    const dongminRate = row[5]?.trim();
    const dongminKrw = row[6]?.trim();
    const dongminUsd = row[7]?.trim();

    if (dongminRate || dongminKrw || dongminUsd) {
      exchanges.push({
        rowIndex: i + 3,
        user: '동민 환전',
        date: dongminDate,
        rate: dongminRate || '-',
        krw: dongminKrw || '-',
        usd: dongminUsd || '-',
      });
    }
  }

  exchanges.reverse();

  let exchangeSummary: ExchangeSummary | undefined;
  let exchangeTotalSummary: ExchangeTotalSummary | undefined;

  // Parse Summary Data if marker was found
  if (markerIndex !== -1 && exRows.length > markerIndex + 7) {
    exchangeSummary = {
      hyunjuKrw: exRows[markerIndex + 1]?.[2] || '-',
      hyunjuUsd: exRows[markerIndex + 1]?.[3] || '-',
      hyunjuAvgRate: exRows[markerIndex + 2]?.[3] || '-',
      dongminKrw: exRows[markerIndex + 1]?.[6] || '-',
      dongminUsd: exRows[markerIndex + 1]?.[7] || '-',
      dongminAvgRate: exRows[markerIndex + 2]?.[7] || '-',
    };

    exchangeTotalSummary = {
      totalKrw: exRows[markerIndex + 4]?.[6] || '-',
      totalUsd: exRows[markerIndex + 4]?.[7] || '-',
      avgRate: exRows[markerIndex + 5]?.[7] || '-',
      currentRate: exRows[markerIndex + 6]?.[7] || '-',
      diff: exRows[markerIndex + 7]?.[7] || '-',
    };
  }

  return { transactions, exchanges, exchangeSummary, exchangeTotalSummary };
}
