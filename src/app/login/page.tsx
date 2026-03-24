'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

type AuthMode = 'login' | 'signup';

const LINK_PENDING_KEY = 'enlazate_link_google_pending';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasGoogleLinked, setHasGoogleLinked] = useState(false);

  const supabase = createClient();

  // URL 파라미터 확인 + 현재 세션 체크
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');

    if (err === 'identity_exists') {
      setError('이 Google 계정 이메일로 이미 가입된 계정이 있어요. 이메일/비밀번호로 로그인하면 Google 계정이 자동으로 연동됩니다.');
      sessionStorage.setItem(LINK_PENDING_KEY, 'true');
      setMode('login');
    } else if (err === 'auth_failed') {
      setError('로그인에 실패했습니다. 다시 시도해주세요.');
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser(data.user);
        const identities = data.user.identities ?? [];
        setHasGoogleLinked(identities.some((id) => id.provider === 'google'));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogleLogin() {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  // 이미 로그인된 상태에서 Google 연동
  async function handleLinkGoogle() {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login?linked=true` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (mode === 'signup') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage('확인 이메일을 보냈습니다. 이메일을 확인해주세요.');
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
      } else {
        // Google 연동 대기 중이면 연동 먼저 실행
        if (sessionStorage.getItem(LINK_PENDING_KEY)) {
          sessionStorage.removeItem(LINK_PENDING_KEY);
          await supabase.auth.linkIdentity({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/?linked=true` },
          });
          return; // linkIdentity가 리다이렉트 처리
        }
        window.location.href = '/';
      }
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-e-white px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-center">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-e-black">
            Enlázate
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">
            스페인어 연음 귀뚫기
          </p>
        </Link>

        {/* 이미 로그인된 상태 — Google 연동 UI */}
        {currentUser && (
          <div className="mb-4 border-4 border-e-black bg-white p-5 shadow-hard">
            <div className="mb-1 text-xs font-bold uppercase text-gray-400">현재 로그인됨</div>
            <div className="mb-4 truncate text-sm font-black">{currentUser.email}</div>
            {hasGoogleLinked ? (
              <div className="flex items-center gap-2 text-sm font-bold text-green-700">
                <span>✅</span> Google 계정이 연동되어 있습니다
              </div>
            ) : (
              <>
                <div className="mb-3 text-xs font-bold text-gray-500">
                  Google 계정을 연동하면 다음부터 Google로 바로 로그인할 수 있어요
                </div>
                <button
                  onClick={handleLinkGoogle}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 border-2 border-e-black bg-white py-2.5 text-sm font-black shadow-hard-sm transition-all hover:-translate-y-0.5 hover:bg-e-yellow hover:shadow-hard disabled:opacity-50"
                >
                  <GoogleIcon />
                  Google 계정 연동하기
                </button>
              </>
            )}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <Link href="/" className="text-xs font-bold text-gray-400 underline hover:text-e-red">
                ← 앱으로 돌아가기
              </Link>
            </div>
          </div>
        )}

        <div className="border-4 border-e-black bg-white p-6 shadow-hard">
          {/* 모드 탭 */}
          <div className="mb-6 flex border-2 border-e-black">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              className={`flex-1 py-2 text-sm font-black uppercase tracking-tight transition-colors ${
                mode === 'login'
                  ? 'bg-e-black text-white'
                  : 'bg-white text-e-black hover:bg-gray-100'
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
              className={`flex-1 border-l-2 border-e-black py-2 text-sm font-black uppercase tracking-tight transition-colors ${
                mode === 'signup'
                  ? 'bg-e-black text-white'
                  : 'bg-white text-e-black hover:bg-gray-100'
              }`}
            >
              회원가입
            </button>
          </div>

          {/* Google 로그인 */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mb-4 flex w-full items-center justify-center gap-3 border-2 border-e-black bg-white py-3 text-sm font-black shadow-hard-sm transition-all hover:-translate-y-0.5 hover:bg-e-yellow hover:shadow-hard disabled:opacity-50"
          >
            <GoogleIcon />
            Google로 계속하기
          </button>

          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-bold text-gray-400">또는 이메일로</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-tight text-gray-600">
                  이름
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="표시 이름"
                  className="w-full border-2 border-e-black px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-e-red"
                  required
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-tight text-gray-600">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border-2 border-e-black px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-e-red"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-tight text-gray-600">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
                minLength={6}
                className="w-full border-2 border-e-black px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-e-red"
                required
              />
            </div>

            {error && (
              <div className="border-2 border-e-red bg-red-50 px-3 py-2 text-xs font-bold text-e-red">
                {error}
              </div>
            )}
            {message && (
              <div className="border-2 border-green-600 bg-green-50 px-3 py-2 text-xs font-bold text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full border-2 border-e-black bg-e-red py-3 text-sm font-black uppercase tracking-tight text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard disabled:opacity-50"
            >
              {loading
                ? '처리 중...'
                : mode === 'login'
                  ? '로그인'
                  : '회원가입'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
