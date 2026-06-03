import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: Request) {
  try {
    const { user, date, rate, krw, usd } = await req.json();

    if (!user || !date || !rate || (!krw && !usd)) {
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

    // 1. "이 위에 작성 " 위치 찾기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '환전기록!B1:B1000',
    });

    const bRows = response.data.values || [];
    let markerIndex = -1;
    for (let i = 0; i < bRows.length; i++) {
      if (bRows[i][0] && bRows[i][0].includes('이 위에 작성')) {
        markerIndex = i; // 0-indexed relative to row 1
        break;
      }
    }

    if (markerIndex === -1) {
      throw new Error('"이 위에 작성" 기준 행을 찾을 수 없습니다.');
    }

    // To get the actual sheet ID, we need to fetch sheet metadata
    const metaRes = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: ['환전기록'],
    });
    const sheetId = metaRes.data.sheets?.[0]?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error('환전기록 시트 ID를 찾을 수 없습니다.');
    }

    const insertRowIndex = markerIndex; // Insert exactly AT the marker index pushes marker down

    // 2. 행 삽입
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: insertRowIndex,
                endIndex: insertRowIndex + 1,
              },
              inheritFromBefore: true,
            },
          },
        ],
      },
    });

    // 3. 데이터 기록 (삽입된 행은 이제 insertRowIndex + 1 번째 행임. 1-indexed)
    const newRowNumber = insertRowIndex + 1;
    const isHyunju = user === '현주 환전';
    
    // Create an empty array of length 8 (A to H)
    const newRowData = ["", "", "", "", "", "", "", ""];
    
    if (isHyunju) {
      newRowData[0] = date;
      newRowData[1] = rate;
      newRowData[2] = krw;
      newRowData[3] = usd;
    } else {
      newRowData[4] = date;
      newRowData[5] = rate;
      newRowData[6] = krw;
      newRowData[7] = usd;
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `환전기록!A${newRowNumber}:H${newRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRowData],
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
    const { rowIndex, user, date, rate, krw, usd } = await req.json();

    if (!rowIndex || !user || !date || !rate) {
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

    const isHyunju = user === '현주 환전';
    const startCol = isHyunju ? 'A' : 'E';
    const endCol = isHyunju ? 'D' : 'H';

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `환전기록!${startCol}${rowIndex}:${endCol}${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, rate, krw || "", usd || ""]],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('History API PUT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
