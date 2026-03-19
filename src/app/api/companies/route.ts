import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const body = await request.json();
  const { company_name, domain, tier } = body;

  if (!company_name || !domain || !tier) {
    return NextResponse.json({ error: 'Missing required fields: company_name, domain, tier' }, { status: 400 });
  }

  const angle = Math.floor(Math.random() * 360);

  const { data, error } = await supabase
    .from('target_companies')
    .insert({
      company_name,
      domain,
      tier,
      heat_score: 0,
      recruiting_window: 'closed',
      radar_angle: angle,
      notes: null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('id');

  if (!companyId) {
    return NextResponse.json({ error: 'Missing company id' }, { status: 400 });
  }

  // Delete all signals for this company first
  await supabase.from('signals').delete().eq('company_id', companyId);

  // Delete the company
  const { error } = await supabase.from('target_companies').delete().eq('id', companyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
