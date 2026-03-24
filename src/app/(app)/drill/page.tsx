import Link from 'next/link';
import DictationSession from '@/components/dictation/DictationSession';
import LoginGate from '@/components/auth/LoginGate';

export default function DictationPage() {
  return (
    <LoginGate featureName="받아쓰기">
    <div className="min-h-screen bg-e-white">
      {/* Header */}
      <header className="border-b-4 border-e-black bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href="/"
            className="text-xl font-black uppercase tracking-tighter hover:text-e-red sm:text-2xl"
          >
            ← Enlázate
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="bg-e-black px-1.5 py-0.5 text-[10px] font-bold uppercase text-white sm:px-2 sm:py-1 sm:text-xs">
              STEP 03
            </span>
            <span className="text-xs font-black uppercase sm:text-sm">✍️ 딕테이션</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Intro */}
        <div className="mb-6 border-4 border-e-black bg-e-black p-4 text-e-white">
          <div className="text-xs font-bold uppercase text-gray-400">딕테이션 안내</div>
          <div className="mt-1 text-sm font-bold">
            자연스러운 속도의 스페인어를 듣고 받아쓰세요.
            <br />
            <span className="text-e-yellow">연음 때문에 놓친 단어</span>가 자동으로 표시되고,{' '}
            <span className="text-e-yellow">연음 구조</span>를 바로 확인할 수 있습니다.
          </div>
        </div>

        <DictationSession />
      </main>
    </div>
    </LoginGate>
  );
}
