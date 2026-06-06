import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error('Google Sheets 환경 변수가 설정되지 않았습니다.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
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

  fs.writeFileSync('scratch/raw_portfolio.json', JSON.stringify(batchResponse.data.valueRanges?.[0]?.values, null, 2));
  fs.writeFileSync('scratch/raw_allocations.json', JSON.stringify(batchResponse.data.valueRanges?.[1]?.values, null, 2));

  // Extract monthly headers
  const monthlySheet = monthlySheetResponse.data.sheets?.[0];
  const gridData = monthlySheet?.data?.[0];
  const rowData = gridData?.rowData || [];
  const headerRow = rowData[0]?.values?.map(v => v.formattedValue || '') || [];
  fs.writeFileSync('scratch/raw_monthly_headers.json', JSON.stringify(headerRow, null, 2));

  console.log('Dump completed');
}

main().catch(console.error);
