import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const errorParam = searchParams.get('error');
  const errorDesc = searchParams.get('error_description') ?? '';

  // OAuth 에러 처리 (Google 로그인 시 이미 존재하는 이메일 등)
  if (errorParam) {
    const isIdentityConflict =
      errorDesc.toLowerCase().includes('already') ||
      errorDesc.toLowerCase().includes('registered') ||
      errorDesc.toLowerCase().includes('linked');
    const redirectError = isIdentityConflict ? 'identity_exists' : 'auth_failed';
    return NextResponse.redirect(`${origin}/login?error=${redirectError}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
