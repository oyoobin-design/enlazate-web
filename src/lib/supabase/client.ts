import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// 싱글톤: 매 렌더마다 새 인스턴스가 생성되지 않도록
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
