import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
import { syncMonthlyStatsToSheet } from '@/lib/googleSheets';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM
    const all = searchParams.get('all') === 'true'; // For fetching all months

    if (all) {
      const { data: rows, error } = await supabase.from('monthly_stats').select('*').order('month', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ stats: rows });
    }

    if (!month) {
      return NextResponse.json({ error: 'Month is required' }, { status: 400 });
    }

    // Get current month
    const { data: statRows, error } = await supabase.from('monthly_stats').select('*').eq('month', month).limit(1);
    if (error) throw error;

    let stat = statRows?.[0];
    
    // If not found, try to get the most recent past month to inherit real estate and liability
    if (!stat) {
      const { data: lastStatRows } = await supabase.from('monthly_stats')
        .select('*')
        .lt('month', month)
        .order('month', { ascending: false })
        .limit(1);

      const lastStat = lastStatRows?.[0];

      if (lastStat) {
        stat = {
          month,
          real_estate: lastStat.real_estate,
          liability_expr: lastStat.liability_expr
        };
      } else {
        stat = {
          month,
          real_estate: 0,
          liability_expr: '224000000+56465188+100000000'
        };
      }
    }

    return NextResponse.json({ stat });
  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch monthly stats: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { month, real_estate, liability_expr } = data;

    if (!month) {
      return NextResponse.json({ error: 'Month is required' }, { status: 400 });
    }

    const { error } = await supabase.from('monthly_stats').upsert({
      month,
      real_estate: real_estate || 0,
      liability_expr: liability_expr || '224000000+56465188+100000000',
      updatedAt: new Date().toISOString()
    }, { onConflict: 'month' });

    if (error) throw error;

    // Trigger async sync
    syncMonthlyStatsToSheet();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save error:', error);
    return NextResponse.json({ error: 'Failed to save monthly stats: ' + error.message }, { status: 500 });
  }
}
