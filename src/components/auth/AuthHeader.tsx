'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

export default function AuthHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (loading) {
    return <div className="h-8 w-20 animate-pulse bg-gray-200" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="border-2 border-e-black bg-e-yellow px-3 py-1 text-xs font-black uppercase tracking-tight transition-all hover:-translate-y-0.5 hover:shadow-hard-sm"
      >
        로그인
      </Link>
    );
  }

  const displayName =
    user.user_metadata?.display_name || user.email?.split('@')[0] || '사용자';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-gray-600">{displayName}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="border-2 border-e-black px-3 py-1 text-xs font-black uppercase tracking-tight transition-all hover:bg-e-red hover:text-white"
      >
        로그아웃
      </button>
    </div>
  );
}
