import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    
    const step = 1000;
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .like('date', `${year}-%`);

    if (countError) throw countError;

    const total = count || 0;
    const promises = [];

    for (let from = 0; from < total; from += step) {
      promises.push(
        supabase
          .from('transactions')
          .select('*')
          .like('date', `${year}-%`)
          .order('date', { ascending: true })
          .range(from, from + step - 1)
      );
    }

    const results = await Promise.all(promises);
    let allRows: any[] = [];
    for (const res of results) {
      if (res.error) throw res.error;
      if (res.data) allRows = allRows.concat(res.data);
    }

    return NextResponse.json({ transactions: allRows });
  } catch (error: any) {
    return NextResponse.json({ error: '데이터 조회 중 오류: ' + error.message }, { status: 500 });
  }
}
