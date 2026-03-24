'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (!data.user) window.location.href = '/login';
    });

    // linked=true 파라미터 확인 (Google 연동 완료 후 리다이렉트)
    const params = new URLSearchParams(window.location.search);
    if (params.get('linked') === 'true') {
      setMessage('Google 계정이 성공적으로 연동됐습니다!');
      window.history.replaceState({}, '', '/account');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-e-white">
        <div className="text-sm font-bold text-gray-400">불러오는 중...</div>
      </div>
    );
  }

  if (!user) return null;

  const identities = user.identities ?? [];
  const hasEmail = identities.some((id) => id.provider === 'email');
  const hasGoogle = identities.some((id) => id.provider === 'google');
  const createdAt = new Date(user.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  async function handleLinkGoogle() {
    setActionLoading(true);
    setError('');
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/account?linked=true` },
    });
    if (error) { setError(error.message); setActionLoading(false); }
  }

  async function handleUnlinkGoogle() {
    if (!hasEmail) {
      setError('이메일/비밀번호 로그인이 없으면 Google 연동을 해제할 수 없습니다. 먼저 비밀번호를 설정해주세요.');
      return;
    }
    const googleIdentity = identities.find((id) => id.provider === 'google');
    if (!googleIdentity) return;
    setActionLoading(true);
    setError('');
    const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
    if (error) {
      setError(error.message);
    } else {
      setMessage('Google 연동이 해제됐습니다.');
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }
    setActionLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 border-b-4 border-e-black pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tighter">👤 내 계정</h1>
      </div>
        {message && (
          <div className="mb-4 border-2 border-green-600 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            ✅ {message}
          </div>
        )}
        {error && (
          <div className="mb-4 border-2 border-e-red bg-red-50 px-4 py-3 text-sm font-bold text-e-red">
            {error}
          </div>
        )}

        {/* 기본 정보 */}
        <div className="mb-4 border-4 border-e-black bg-white shadow-hard">
          <div className="border-b-4 border-e-black px-5 py-3">
            <h2 className="text-sm font-black uppercase tracking-tight">기본 정보</h2>
          </div>
          <div className="space-y-3 p-5">
            <div>
              <div className="mb-0.5 text-xs font-bold uppercase text-gray-400">이메일</div>
              <div className="font-black">{user.email}</div>
            </div>
            <div>
              <div className="mb-0.5 text-xs font-bold uppercase text-gray-400">가입일</div>
              <div className="font-bold text-gray-700">{createdAt}</div>
            </div>
          </div>
        </div>

        {/* 로그인 방식 */}
        <div className="mb-4 border-4 border-e-black bg-white shadow-hard">
          <div className="border-b-4 border-e-black px-5 py-3">
            <h2 className="text-sm font-black uppercase tracking-tight">연동된 로그인 방식</h2>
          </div>
          <div className="divide-y-2 divide-gray-100">
            {/* 이메일/비밀번호 */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">✉️</span>
                <div>
                  <div className="text-sm font-black">이메일 / 비밀번호</div>
                  <div className="text-xs font-bold text-gray-400">{user.email}</div>
                </div>
              </div>
              {hasEmail ? (
                <span className="border-2 border-green-600 bg-green-50 px-2 py-0.5 text-xs font-black text-green-700">
                  연동됨
                </span>
              ) : (
                <span className="border-2 border-gray-300 px-2 py-0.5 text-xs font-black text-gray-400">
                  미연동
                </span>
              )}
            </div>

            {/* Google */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <GoogleIcon />
                <div>
                  <div className="text-sm font-black">Google</div>
                  <div className="text-xs font-bold text-gray-400">
                    {hasGoogle ? user.email : '연동 안 됨'}
                  </div>
                </div>
              </div>
              {hasGoogle ? (
                <button
                  onClick={handleUnlinkGoogle}
                  disabled={actionLoading}
                  className="border-2 border-gray-300 px-2 py-0.5 text-xs font-black text-gray-500 transition-colors hover:border-e-red hover:text-e-red disabled:opacity-50"
                >
                  연동 해제
                </button>
              ) : (
                <button
                  onClick={handleLinkGoogle}
                  disabled={actionLoading}
                  className="border-2 border-e-black px-2 py-0.5 text-xs font-black transition-colors hover:bg-e-yellow disabled:opacity-50"
                >
                  연동하기
                </button>
              )}
            </div>
          </div>

          {hasEmail && hasGoogle && (
            <div className="border-t-2 border-gray-100 px-5 py-3 text-xs font-bold text-gray-400">
              💡 두 방식 모두 로그인 가능합니다. 같은 계정으로 연결되어 있어요.
            </div>
          )}
        </div>

        {/* 로그아웃 */}
        <button
          onClick={handleSignOut}
          className="w-full border-4 border-e-black bg-white py-3 text-sm font-black uppercase tracking-tight shadow-hard-sm transition-all hover:-translate-y-0.5 hover:bg-e-red hover:text-white hover:shadow-hard"
        >
          로그아웃
        </button>
    </main>
  );
}
