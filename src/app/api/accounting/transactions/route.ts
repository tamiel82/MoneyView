import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { syncTransactionsToSheet } from '@/lib/googleSheets';
import { RawTransaction } from '@/lib/accounting/types';

export async function POST(req: NextRequest) {
  try {
    const { transactions } = await req.json() as { transactions: (RawTransaction & { category: string | null })[] };
    
    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Insert transactions
    const { error: txError } = await supabase.from('transactions').insert(
      transactions.map(t => ({
        date: t.date,
        content: t.content,
        amount: t.amount,
        category: t.category,
        type: t.type,
        merchant: t.merchant,
        orderNo: t.orderNo,
        paymentMethod: t.paymentMethod,
        businessNum: t.businessNum,
        note: t.note
      }))
    );

    if (txError) throw txError;

    // Update categories map if the user assigned new ones
    const categoryUpdates = transactions
      .filter(t => t.merchant && t.category)
      .map(t => ({ merchant: t.merchant, category: t.category }));

    if (categoryUpdates.length > 0) {
      const uniqueUpdatesMap = new Map();
      categoryUpdates.forEach(u => uniqueUpdatesMap.set(u.merchant, u.category));
      
      const uniqueUpdates = Array.from(uniqueUpdatesMap.entries()).map(([merchant, category]) => ({
        merchant,
        category
      }));

      const { error: catError } = await supabase.from('categories').upsert(uniqueUpdates, { onConflict: 'merchant' });
      if (catError) console.error('Category upsert error:', catError);
    }

    // Trigger async sync without awaiting
    syncTransactionsToSheet();

    return NextResponse.json({ success: true, count: transactions.length });
  } catch (error: any) {
    console.error('Save error:', error);
    return NextResponse.json({ error: '데이터베이스 저장 중 오류: ' + error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM
    
    let query = supabase.from('transactions').select('*');
    
    if (month) {
      query = query.like('date', `${month}-%`).order('date', { ascending: false });
    } else {
      query = query.order('date', { ascending: false }).limit(1000);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    return NextResponse.json({ transactions: rows });
  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: '데이터 조회 중 오류: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const { id, date, content, amount, category, type, merchant, orderNo, paymentMethod, businessNum, note } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID is required for update' }, { status: 400 });
    }

    const { error: txError } = await supabase.from('transactions').update({
      date, content, amount, category, type, merchant, orderNo, paymentMethod, businessNum, note
    }).eq('id', id);

    if (txError) throw txError;

    if (merchant && category) {
      const { error: catError } = await supabase.from('categories').upsert(
        { merchant, category },
        { onConflict: 'merchant' }
      );
      if (catError) console.error('Category upsert error:', catError);
    }

    // Trigger async sync without awaiting
    syncTransactionsToSheet();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update error:', error);
    return NextResponse.json({ error: '수정 중 오류: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required for deletion' }, { status: 400 });
    }

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;

    // Trigger async sync without awaiting
    syncTransactionsToSheet();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: '삭제 중 오류: ' + error.message }, { status: 500 });
  }
}
