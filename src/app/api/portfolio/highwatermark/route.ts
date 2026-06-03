import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  try {
    const { currentAsset } = await request.json();

    if (!currentAsset) {
      return NextResponse.json({ error: 'currentAsset is required' }, { status: 400 });
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

    const today = new Date();
    // 포맷: YYYY. M. D
    const formattedDate = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}`;

    // J11: 전고점, L11: 전고점일
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: '포트폴리오!J11:L11',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [currentAsset, null, formattedDate]
        ],
      },
    });

    return NextResponse.json({ success: true, date: formattedDate });
  } catch (error: any) {
    console.error('High watermark update error:', error);
    return NextResponse.json({ error: error.message || '업데이트 실패' }, { status: 500 });
  }
}
