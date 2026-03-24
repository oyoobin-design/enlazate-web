'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Props {
  children: React.ReactNode;
  featureName?: string;
}

function eunNeun(word: string): string {
  const last = word[word.length - 1];
  const code = last.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return '은';
  return (code - 0xAC00) % 28 === 0 ? '는' : '은';
}

export default function LoginGate({ children, featureName }: Props) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthed(!!user);
    });
  }, []);

  // 로딩 중 — 레이아웃 안 깨지게 투명하게 대기
  if (authed === null) {
    return <div className="opacity-0 pointer-events-none">{children}</div>;
  }

  // 로그인 됨 — 그냥 보여줌
  if (authed) return <>{children}</>;

  // 미인증 — 블러 + 오버레이
  return (
    <div className="relative">
      {/* 블러 처리된 콘텐츠 */}
      <div
        className="pointer-events-none select-none"
        style={{ filter: 'blur(6px)', opacity: 0.4 }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* 오버레이 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="mx-4 w-full max-w-sm border-4 border-e-black bg-white p-8 shadow-hard text-center">
          <div className="mb-2 text-2xl">🔒</div>
          <h3 className="mb-2 text-base font-black uppercase tracking-tight">
            {featureName ? `${featureName}${eunNeun(featureName)} 로그인 후 이용 가능해요` : '로그인이 필요해요'}
          </h3>
          <p className="mb-6 text-sm font-bold text-gray-500">
            로그인하시면 더 다양한 기능에<br />접근이 가능해요!
          </p>
          <Link
            href="/login"
            className="block border-4 border-e-black bg-e-yellow py-3 text-sm font-black uppercase tracking-tight text-e-black shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000]"
          >
            로그인하기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
