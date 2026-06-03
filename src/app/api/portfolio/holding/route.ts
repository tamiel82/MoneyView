import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// PUT: Edit existing holding (quantity & unitPrice)
export async function PUT(request: Request) {
  try {
    const { rowIndex, unitPrice, quantity } = await request.json();

    if (!rowIndex || unitPrice === undefined || quantity === undefined) {
      return NextResponse.json({ error: 'rowIndex, unitPrice, and quantity are required' }, { status: 400 });
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

    // Column I: unitPrice (매수가), Column J: quantity (보유수)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `자산배분현황!I${rowIndex}:J${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [unitPrice, quantity]
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Holding edit error:', error);
    return NextResponse.json({ error: error.message || '수정 실패' }, { status: 500 });
  }
}

// POST: Add new holding (insert row & write values/formulas)
export async function POST(request: Request) {
  try {
    const { insertRowIndex, subAccount, strategy, name, ticker, unitPrice, quantity } = await request.json();

    if (!insertRowIndex || !subAccount || !name || !ticker || unitPrice === undefined || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // 1. Get Sheet ID
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === '자산배분현황');
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      return NextResponse.json({ error: '자산배분현황 시트를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2. Insert row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: insertRowIndex - 1, // 0-indexed
                endIndex: insertRowIndex,
              },
              inheritFromBefore: true,
            },
          },
        ],
      },
    });

    // 3. Write row values (using formulas for calculated cells)
    const rowValues = [
      "", // Column A
      subAccount, // Column B (자산)
      "", // Column C (구성)
      strategy, // Column D (자산 상세)
      name, // Column E (종목명)
      ticker, // Column F (티커)
      `=text(googlefinance(F${insertRowIndex}),"#,###.00")`, // Column G (현재가)
      "", // Column H (추가주문수)
      unitPrice, // Column I (매수가)
      quantity, // Column J (보유수)
      `=J${insertRowIndex}*I${insertRowIndex}`, // Column K (매수평가액)
      `=G${insertRowIndex}*J${insertRowIndex}`, // Column L (현재평가액)
      `=L${insertRowIndex}*'포트폴리오'!$S$9`, // Column M (평가액(원화))
      `=iferror(L${insertRowIndex}/K${insertRowIndex}-1,0)`, // Column N (수익률)
      "", // Column O (비율)
      `=googlefinance(F${insertRowIndex}, "changepct")/100` // Column P (일변동)
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `자산배분현황!A${insertRowIndex}:P${insertRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Holding add error:', error);
    return NextResponse.json({ error: error.message || '추가 실패' }, { status: 500 });
  }
}
