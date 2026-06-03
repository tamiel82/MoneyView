import { NextResponse } from 'next/server';
import { getPortfolioData } from '@/lib/portfolioService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getPortfolioData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Sheets API Error:', error);
    return NextResponse.json(
      { error: '데이터를 가져오는 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
