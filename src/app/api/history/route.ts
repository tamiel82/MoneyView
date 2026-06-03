import { NextResponse } from 'next/server';
import { getHistoryData } from '@/lib/historyService';

export const revalidate = 60; // Cache for 60 seconds (1 minute)

export async function GET() {
  try {
    const data = await getHistoryData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('History API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
