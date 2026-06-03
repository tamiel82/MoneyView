import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const depositCols = ['B', 'C', 'D', 'E', 'F', 'G', 'H'];
const valuationCols = ['J', 'K', 'L', 'M', 'N', 'O', 'P'];

// PUT: Edit existing sub-account monthly details (all 7 accounts together)
export async function PUT(request: Request) {
  try {
    const { rowIndex, deposits, valuations, notes } = await request.json();

    if (!rowIndex || !deposits || !valuations || deposits.length !== 7 || valuations.length !== 7 || !notes || notes.length !== 7) {
      return NextResponse.json({ error: 'rowIndex, 7 deposits, 7 valuations, and 7 notes are required' }, { status: 400 });
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

    const parsedDeposits = deposits.map((d: any) => d === "" || d === undefined ? 0 : Number(d));
    const parsedValuations = valuations.map((v: any) => v === "" || v === undefined ? "" : Number(v));

    // 1. Update Cell Values
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `월별평가액!B${rowIndex}:H${rowIndex}`,
            values: [parsedDeposits],
          },
          {
            range: `월별평가액!J${rowIndex}:P${rowIndex}`,
            values: [parsedValuations],
          },
        ],
      },
    });

    // 2. Update Cell Notes
    const metaRes = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: ['월별평가액'],
    });
    const sheetId = metaRes.data.sheets?.[0]?.properties?.sheetId;

    if (sheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              updateCells: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: rowIndex - 1,
                  endRowIndex: rowIndex,
                  startColumnIndex: 1, // B is 1
                  endColumnIndex: 8, // I is 8 (exclusive), covers B to H
                },
                rows: [
                  {
                    values: notes.map((note: string) => ({
                      note: note || "",
                    })),
                  },
                ],
                fields: 'note',
              },
            },
          ],
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Monthly edit error:', error);
    return NextResponse.json({ error: error.message || '수정 실패' }, { status: 500 });
  }
}

// POST: Add new month row (prefilled deposits, blank valuations, complete formula matrix)
export async function POST(request: Request) {
  try {
    const { month, deposits, valuations, notes } = await request.json();

    if (!month || !deposits || !valuations || deposits.length !== 7 || valuations.length !== 7 || !notes || notes.length !== 7) {
      return NextResponse.json({ error: 'month, 7 deposits, 7 valuations, and 7 notes are required' }, { status: 400 });
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

    // 1. Get current row count to append
    const rangeResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '월별평가액!A1:A',
    });

    const rows = rangeResponse.data.values || [];
    const r = rows.length + 1; // New row index

    // Check if month already exists to prevent duplicate months
    const existingMonthRow = rows.findIndex((row, idx) => idx > 0 && row[0]?.trim() === month.trim());
    if (existingMonthRow !== -1) {
      return NextResponse.json({ error: '이미 존재하는 평가월입니다.' }, { status: 400 });
    }

    // 2. Generate detailed formulas for index r (referencing r-1 for history)
    const rowValues = [
      month.trim(), // Column A
      ...deposits.map((d: any) => d === "" || d === undefined ? 0 : Number(d)), // Columns B to H (Deposits)
      `=SUM(B${r}:H${r})`, // Column I (월 적립액 합계)
      ...valuations.map((v: any) => v === "" || v === undefined ? "" : Number(v)), // Columns J to P (Valuations)
      `=SUM(J${r}:P${r})`, // Column Q (평가액 합계)
      "", // Column R (공란)
      `=J${r}-(J${r-1}+B${r})`, // Column S (현금 월별손익)
      `=K${r}-(K${r-1}+C${r})`, // Column T (현주주식 월별손익)
      `=L${r}-(L${r-1}+D${r})`, // Column U (동민주식 월별손익)
      `=M${r}-(M${r-1}+E${r})`, // Column V (동민연금 월별손익)
      `=N${r}-(N${r-1}+F${r})`, // Column W (현주연금 월별손익)
      `=O${r}-(O${r-1}+G${r})`, // Column X (동민코인 월별손익)
      `=P${r}-(P${r-1}+H${r})`, // Column Y (기타 월별손익)
      `=SUM(S${r}:Y${r})`, // Column Z (월별손익 합계)
      `=iferror(J${r}/(J${r-1}+B${r})-1, 0)`, // Column AA (현금 손익률)
      `=iferror(K${r}/(K${r-1}+C${r})-1, 0)`, // Column AB (현주주식 손익률)
      `=iferror(L${r}/(L${r-1}+D${r})-1, 0)`, // Column AC (동민주식 손익률)
      `=iferror(M${r}/(M${r-1}+E${r})-1, 0)`, // Column AD (동민연금 손익률)
      `=iferror(N${r}/(N${r-1}+F${r})-1, 0)`, // Column AE (현주연금 손익률)
      `=iferror(O${r}/(O${r-1}+G${r})-1, 0)`, // Column AF (동민코인 손익률)
      `=iferror(P${r}/(P${r-1}+H${r})-1, 0)`, // Column AG (기타 손익률)
      `=iferror(Q${r}/(Q${r-1}+I${r})-1, 0)`, // Column AH (손익률 합계)
      `=SUM(S$2:S${r})`, // Column AI
      `=SUM(T$2:T${r})`, // Column AJ
      `=SUM(U$2:U${r})`, // Column AK
      `=SUM(V$2:V${r})`, // Column AL
      `=SUM(W$2:W${r})`, // Column AM
      `=SUM(X$2:X${r})`, // Column AN
      `=SUM(Y$2:Y${r})`, // Column AO
      `=SUM(Z$2:Z${r})`, // Column AP
      `=(AQ${r-1}+1)*(1+AA${r})-1`, // Column AQ
      `=(AR${r-1}+1)*(1+AB${r})-1`, // Column AR
      `=(AS${r-1}+1)*(1+AC${r})-1`, // Column AS
      `=(AT${r-1}+1)*(1+AD${r})-1`, // Column AT
      `=(AU${r-1}+1)*(1+AE${r})-1`, // Column AU
      `=(AV${r-1}+1)*(1+AF${r})-1`, // Column AV
      `=(AW${r-1}+1)*(1+AG${r})-1`, // Column AW
      `=(AX${r-1}+1)*(1+AH${r})-1`, // Column AX
      `=if(month($A${r})=1,AA${r},(AY${r-1}+1)*(1+AA${r})-1)`, // Column AY
      `=if(month($A${r})=1,AB${r},(AZ${r-1}+1)*(1+AB${r})-1)`, // Column AZ
      `=if(month($A${r})=1,AC${r},(BA${r-1}+1)*(1+AC${r})-1)`, // Column BA
      `=if(month($A${r})=1,AD${r},(BB${r-1}+1)*(1+AD${r})-1)`, // Column BB
      `=if(month($A${r})=1,AE${r},(BC${r-1}+1)*(1+AE${r})-1)`, // Column BC
      `=if(month($A${r})=1,AF${r},(BD${r-1}+1)*(1+AF${r})-1)`, // Column BD
      `=if(month($A${r})=1,AG${r},(BE${r-1}+1)*(1+AG${r})-1)`, // Column BE
      `=if(month($A${r})=1,AH${r},(BF${r-1}+1)*(1+AH${r})-1)`, // Column BF
      `=Q${r}-(Q${r-1}+I${r})`, // Column BG
      `=BG${r}/Q${r-1}`, // Column BH
      `=SUM($BG$2:BG${r})`, // Column BI
      `=(BJ${r-1}+1)*(1+BH${r})-1`, // Column BJ
      `=(if(month($A${r})=1,0,BK${r-1})+1)*(1+BH${r})-1`, // Column BK
      `=iferror(index(googlefinance("USDKRW","price",date(year(A${r}),month(A${r}),day(A${r}))),2,2),googlefinance("USDKRW"))` // Column BL
    ];

    // Fetch sheetId first to expand the grid and set notes
    const metaRes = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: ['월별평가액'],
    });
    const sheetId = metaRes.data.sheets?.[0]?.properties?.sheetId;

    if (sheetId !== undefined) {
      // 1. Expand the grid by 1 row at the bottom
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              appendDimension: {
                sheetId: sheetId,
                dimension: 'ROWS',
                length: 1,
              },
            },
          ],
        },
      });
    }

    // 2. Write row values to Google Sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `월별평가액!A${r}:BL${r}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    // 3. Write cell notes to Google Sheet
    if (sheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              updateCells: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: r - 1,
                  endRowIndex: r,
                  startColumnIndex: 1, // B is 1
                  endColumnIndex: 8, // I is 8 (exclusive)
                },
                rows: [
                  {
                    values: notes.map((note: string) => ({
                      note: note || "",
                    })),
                  },
                ],
                fields: 'note',
              },
            },
          ],
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Monthly add error:', error);
    return NextResponse.json({ error: error.message || '추가 실패' }, { status: 500 });
  }
}
