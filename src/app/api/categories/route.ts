import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('category', { ascending: true })
      .order('merchant', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Categories API GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { merchant, category, note } = body;

    if (!merchant || !category) {
      return NextResponse.json({ error: 'Merchant and Category are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([{ merchant, category, note }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // unique violation
        return NextResponse.json({ error: '이미 등록된 가맹점(키워드)입니다. 목록에서 검색하여 수정해주세요.' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Categories API POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, merchant, category, note } = body;

    if (!id || !merchant || !category) {
      return NextResponse.json({ error: 'ID, Merchant, and Category are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('categories')
      .update({ merchant, category, note, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 가맹점(키워드)입니다.' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Categories API PUT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Categories API DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
