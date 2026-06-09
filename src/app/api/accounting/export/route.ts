import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM
    
    if (!month) {
      return NextResponse.json({ error: 'month parameter is required' }, { status: 400 });
    }

    let allRows: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
      const { data: rows, error } = await supabase
        .from('transactions')
        .select('*')
        .like('date', `${month}-%`)
        .order('date', { ascending: true })
        .range(from, from + step - 1);

      if (error) throw error;

      if (rows && rows.length > 0) {
        allRows = allRows.concat(rows);
      }

      if (!rows || rows.length < step) {
        break;
      }

      from += step;
    }
    
    const rows = allRows;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: '해당 월의 데이터가 존재하지 않습니다. 먼저 업로드 후 원장 저장을 완료해주세요.' }, { status: 404 });
    }

    // Format for Excel
    const formattedRows = rows.map(r => ({
      '거래일': r.date,
      '지출내용': r.content,
      '지출금액': r.type === 'INCOME' ? -Number(r.amount) : Number(r.amount),
      '소비분류': r.category,
      '매출처': r.merchant,
      '주문번호': r.orderNo,
      '결제수단': r.paymentMethod,
      '사업자': r.businessNum,
      '비고': r.note
    }));

    // YYYYMMDD string for sheet name
    const d = new Date();
    const sheetName = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`집계내역-${month.replace('-', '')}.xlsx`)}`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: '엑셀 내보내기 중 오류 발생: ' + (error?.message || error) }, { status: 500 });
  }
}
