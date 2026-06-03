import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    
    // Fetch all transactions for the year
    const { data: rows, error } = await supabase
      .from('transactions')
      .select('*')
      .like('date', `${year}-%`)
      .order('date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ transactions: rows });
  } catch (error: any) {
    return NextResponse.json({ error: '데이터 조회 중 오류: ' + error.message }, { status: 500 });
  }
}
