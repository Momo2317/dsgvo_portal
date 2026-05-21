import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ownerEmail, fileName, fileSize, portalTitle, workspaceSlug } = body;

    if (!ownerEmail || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase.functions.invoke('send-upload-notification', {
      body: { ownerEmail, fileName, fileSize, portalTitle, workspaceSlug },
    });

    if (error) {
      console.error('Edge function error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('notify-upload route error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
