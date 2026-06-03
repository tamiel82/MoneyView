import { NextRequest, NextResponse } from 'next/server';
import { syncTransactionsToSheet, syncMonthlyStatsToSheet, importFromSheetToSupabase } from '@/lib/googleSheets';

export async function GET(req: NextRequest) {
  try {
    // Manually trigger an export from Supabase to Google Sheets
    await syncTransactionsToSheet();
    await syncMonthlyStatsToSheet();
    return NextResponse.json({ success: true, message: 'Exported to Google Sheets successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Manually trigger an import from Google Sheets to Supabase (Restore)
    await importFromSheetToSupabase();
    return NextResponse.json({ success: true, message: 'Imported from Google Sheets successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
