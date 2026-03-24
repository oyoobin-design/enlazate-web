import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const USER_LIMITS: Record<string, number> = {
  'analyze-pronunciation': 15,
  'generate-dictation': 5,
};

const IP_LIMITS: Record<string, number> = {
  'analyze-pronunciation': 150, // 15 × 10명
  'generate-dictation': 50,     // 5  × 10명
};

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * 유저 + IP 일일 쿼터 체크
 * - 둘 중 하나라도 초과 → 429 반환
 * - 통과 → increment() 호출로 카운트 증가 (OpenAI 성공 후 호출)
 */
export async function checkRateLimit(
  req: NextRequest,
  userId: string,
  endpoint: string,
): Promise<{
  response: NextResponse | null;
  increment: () => Promise<void>;
}> {
  const userLimit = USER_LIMITS[endpoint];
  const ipLimit = IP_LIMITS[endpoint];
  if (!userLimit) return { response: null, increment: async () => {} };

  const cookieStore = await cookies();
  // 유저 쿼터: anon 키 (RLS로 본인 데이터만)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  // IP 쿼터: service role 키 (RLS 우회, 서버 전용)
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  const today = new Date().toISOString().slice(0, 10);
  const ip = getIp(req);

  // 유저 + IP 사용량 동시 조회
  const [{ data: userData }, { data: ipData }] = await Promise.all([
    supabase
      .from('api_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('endpoint', endpoint)
      .single(),
    supabaseAdmin
      .from('ip_usage')
      .select('count')
      .eq('ip', ip)
      .eq('date', today)
      .eq('endpoint', endpoint)
      .single(),
  ]);

  const userCount = userData?.count ?? 0;
  const ipCount = ipData?.count ?? 0;

  if (userCount >= userLimit) {
    return {
      response: NextResponse.json(
        {
          error: `일일 사용 한도(${userLimit}회)에 도달했어요. 내일 다시 이용해주세요.`,
          limit: userLimit,
          used: userCount,
        },
        { status: 429 },
      ),
      increment: async () => {},
    };
  }

  if (ipCount >= ipLimit) {
    return {
      response: NextResponse.json(
        {
          error: '이 네트워크에서의 일일 사용 한도에 도달했어요. 내일 다시 이용해주세요.',
          limit: ipLimit,
          used: ipCount,
        },
        { status: 429 },
      ),
      increment: async () => {},
    };
  }

  const increment = async () => {
    await Promise.all([
      supabase
        .from('api_usage')
        .upsert(
          { user_id: userId, date: today, endpoint, count: userCount + 1 },
          { onConflict: 'user_id,date,endpoint' },
        ),
      supabaseAdmin
        .from('ip_usage')
        .upsert(
          { ip, date: today, endpoint, count: ipCount + 1 },
          { onConflict: 'ip,date,endpoint' },
        ),
    ]);
  };

  return { response: null, increment };
}
