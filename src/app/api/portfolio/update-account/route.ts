import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  try {
    const { accountName, principal, current } = await request.json();

    if (!accountName) {
      return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
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

    const data = [];
    
    if (accountName === '동민기타') {
      if (principal !== undefined && principal !== '') {
        data.push({ range: '포트폴리오!D31', values: [[principal]] });
      }
      if (current !== undefined && current !== '') {
        data.push({ range: '포트폴리오!F31', values: [[current]] });
      }
    } else if (accountName === '현금') {
      // 현금은 현재가만 수정 (원금은 자동 수식)
      if (current !== undefined && current !== '') {
        data.push({ range: '포트폴리오!F33', values: [[current]] });
      }
    } else {
      return NextResponse.json({ error: 'Unsupported account' }, { status: 400 });
    }

    if (data.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: data
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update account error:', error);
    return NextResponse.json({ error: error.message || '업데이트 실패' }, { status: 500 });
  }
}
