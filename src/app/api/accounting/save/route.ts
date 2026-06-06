import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transactions } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Map the JSON output to Supabase table schema
    const insertData = transactions.map((t: any) => ({
      date: t.거래일,
      content: t.지출내용,
      amount: Number(t.지출금액),
      category: t.소비분류 || null,
      type: t.비고 === '입금' ? 'INCOME' : 'EXPENSE',
      merchant: t.매출처 || null,
      orderNo: t.주문번호 || null,
      paymentMethod: t.결제수단 || null,
      businessNum: t.사업자 || null,
      note: t.비고 || null,
      status: 'CONFIRMED'
    }));

    // Filter out errors
    const validData = insertData.filter((t: any) => t.date !== 'ERROR');

    if (validData.length === 0) {
      return NextResponse.json({ error: 'No valid transactions to save' }, { status: 400 });
    }

    const { error } = await supabase
      .from('transactions')
      .insert(validData);

    if (error) throw error;

    return NextResponse.json({ success: true, count: validData.length });
  } catch (error: any) {
    console.error('Accounting Save Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
