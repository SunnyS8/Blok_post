import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, role, full_name } = body;

  if (!userId || !role) {
    return NextResponse.json({ error: 'userId и role обязательны.' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase server environment not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, role, full_name }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
