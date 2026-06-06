import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (data && data.date) {
      const monthStr = data.date.substring(0, 7);
      return NextResponse.json({ latestMonth: monthStr });
    }

    return NextResponse.json({ latestMonth: null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
