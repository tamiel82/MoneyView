import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: Request) {
  try {
    const { date, amount, memo } = await req.json();

    if (!date || !amount) {
      return NextResponse.json({ error: 'Date and amount are required' }, { status: 400 });
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      throw new Error('Google Sheets credentials are missing');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: '거래기록!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, amount, memo || ""]],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('History API POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { rowIndex, date, amount, memo } = await req.json();

    if (!rowIndex || !date || !amount) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      throw new Error('Google Sheets credentials are missing');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `거래기록!A${rowIndex}:C${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, amount, memo || ""]],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Transactions API PUT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
