'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/learn',     icon: '👁️', label: 'SEE',        sub: '연음 시각화',  step: '01' },
  { href: '/player',   icon: '👂', label: 'HEAR',       sub: '클립 플레이어', step: '02' },
  { href: '/drill',    icon: '✍️', label: 'DICTATION',  sub: '받아쓰기',     step: '03' },
  { href: '/dashboard',icon: '📊', label: 'DASHBOARD',  sub: '학습 통계',    step: null },
  { href: '/account',  icon: '👤', label: 'ACCOUNT',    sub: '내 계정',      step: null },
];

function NavItem({ item, collapsed }: { item: typeof NAV_ITEMS[0]; collapsed?: boolean }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 border-2 px-3 py-2.5 transition-all ${
        active
          ? 'border-e-black bg-e-red text-white'
          : 'border-transparent hover:border-e-black hover:bg-e-yellow'
      }`}
    >
      <span className="shrink-0 text-lg leading-none">{item.icon}</span>
      {!collapsed && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {item.step && (
              <span className={`text-[9px] font-black uppercase ${active ? 'text-white/70' : 'text-gray-400'}`}>
                {item.step}
              </span>
            )}
            <span className="text-xs font-black uppercase tracking-tight">{item.label}</span>
          </div>
          <div className={`text-[10px] font-bold ${active ? 'text-white/80' : 'text-gray-400'}`}>
            {item.sub}
          </div>
        </div>
      )}
    </Link>
  );
}

// 데스크탑 사이드바
export function Sidebar() {
  return (
    <aside className="hidden w-48 shrink-0 md:block">
      <div className="sticky top-0 flex h-screen flex-col border-r-4 border-e-black bg-white">
        {/* 로고 */}
        <Link href="/" className="block border-b-4 border-e-black px-4 py-4 hover:bg-e-yellow">
          <div className="text-xl font-black uppercase tracking-tighter text-e-black">Enlázate</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">연음 트레이너</div>
        </Link>

        {/* 메인 메뉴 */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          <div className="mb-1 px-3 pt-2 text-[9px] font-black uppercase tracking-widest text-gray-400">
            학습
          </div>
          {NAV_ITEMS.slice(0, 3).map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
          <div className="mb-1 mt-3 px-3 text-[9px] font-black uppercase tracking-widest text-gray-400">
            내 정보
          </div>
          {NAV_ITEMS.slice(3).map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </nav>

        {/* 하단 버전 */}
        <div className="border-t-2 border-gray-100 px-4 py-3 text-[9px] font-bold uppercase text-gray-300">
          MVP v1.0 · Madrid
        </div>
      </div>
    </aside>
  );
}

// 모바일 하단 탭바
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t-4 border-e-black bg-white md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-center transition-colors ${
              active ? 'bg-e-red text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tight">
              {item.step ?? item.label.slice(0, 4)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
