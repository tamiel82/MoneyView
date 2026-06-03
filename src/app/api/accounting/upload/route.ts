import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { findParser } from '@/lib/accounting/parsers';
import { classifyTransactions } from '@/lib/accounting/classifier';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Some bank files might have password or might be disguised HTML. 
    // Usually xlsx can parse standard HTML tables disguised as xls too.
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    const parser = findParser(data);
    if (!parser) {
      return NextResponse.json({ error: '지원하지 않는 양식입니다. (파서를 찾을 수 없음)' }, { status: 400 });
    }

    const parseResult = parser.parse(data);
    if (parseResult.transactions.length === 0) {
      return NextResponse.json({ error: '파일에서 거래 내역을 찾을 수 없습니다.' }, { status: 400 });
    }

    const classified = await classifyTransactions(parseResult.transactions);

    return NextResponse.json({
      parserName: parser.name,
      transactions: classified,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: '파일 처리 중 오류 발생: ' + error.message }, { status: 500 });
  }
}
