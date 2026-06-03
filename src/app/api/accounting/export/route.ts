import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM
    
    if (!month) {
      return NextResponse.json({ error: 'month parameter is required' }, { status: 400 });
    }

    const { data: rows, error } = await supabase
      .from('transactions')
      .select('*')
      .like('date', `${month}-%`)
      .order('date', { ascending: true });

    if (error) throw error;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No data found for this month' }, { status: 404 });
    }

    // Format for Excel
    const formattedRows = rows.map(r => ({
      '거래일': r.date,
      '내용': r.content,
      '금액': r.amount,
      '유형': r.type === 'INCOME' ? '수입' : '지출',
      '분류': r.category,
      '매출처': r.merchant,
      '결제수단': r.paymentMethod,
      '주문번호': r.orderNo,
      '사업자': r.businessNum,
      '비고': r.note
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '거래내역');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="집계내역-${month.replace('-', '')}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: '엑셀 내보내기 중 오류 발생' }, { status: 500 });
  }
}
