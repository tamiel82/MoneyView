import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  try {
    const { principal, current } = await request.json();

    if (!principal && !current) {
      return NextResponse.json({ error: 'Principal or current is required' }, { status: 400 });
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      return NextResponse.json({ error: 'Google Sheets 환경 변수가 설정되지 않았습니다.' }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // D31: 원금, F31: 현재가
    const data = [];
    if (principal !== undefined && principal !== '') {
      data.push({
        range: '포트폴리오!D31',
        values: [[principal]]
      });
    }
    if (current !== undefined && current !== '') {
      data.push({
        range: '포트폴리오!F31',
        values: [[current]]
      });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: data
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Dongmin Etc update error:', error);
    return NextResponse.json({ error: error.message || '업데이트 실패' }, { status: 500 });
  }
}
