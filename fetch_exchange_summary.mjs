import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

async function getSummaryRows() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    console.error('Missing credentials');
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ['환전기록!A60:H70'],
    });

    console.log('\n=== 환전기록 Summary Rows (60-70) ===');
    console.log(JSON.stringify(response.data.valueRanges[0].values, null, 2));
  } catch (e) {
    console.error('Error fetching from Google Sheets:', e.message);
  }
}

getSummaryRows();
