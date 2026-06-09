import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    
    let allRows: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
      const { data: rows, error } = await supabase
        .from('transactions')
        .select('*')
        .like('date', `${year}-%`)
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

    return NextResponse.json({ transactions: allRows });
  } catch (error: any) {
    return NextResponse.json({ error: '데이터 조회 중 오류: ' + error.message }, { status: 500 });
  }
}
