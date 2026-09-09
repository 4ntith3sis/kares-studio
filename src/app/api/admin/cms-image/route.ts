import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/admin-auth';

/**
 * Kares Studio — Phase 6 CMS image upload (server, service role).
 * POST FormData { file } → uploads to product-images bucket under
 * cms/ prefix → returns { path }. Caller saves the path into
 * homepage_content.image_url via /api/admin/cms (separate step).
 */
function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad('Expected multipart FormData.');
  }
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return bad('A valid image file is required.');
  }
  if (!file.type.startsWith('image/')) return bad('File must be an image.');
  if (file.size > 5 * 1024 * 1024) return bad('Image must be ≤ 5 MB.');

  try {
    const gate = await requireAdmin();
    if ('response' in gate) return gate.response;
    const supabase = getServiceSupabase();
    const ext = (file.name.split('.').pop() ?? 'jpg')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'jpg';
    const objectPath = `cms/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(objectPath, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return NextResponse.json({ path: objectPath }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
