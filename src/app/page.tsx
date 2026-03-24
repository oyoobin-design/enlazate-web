import Link from 'next/link';
import AuthHeader from '@/components/auth/AuthHeader';
import LandingQuiz from '@/components/landing/LandingQuiz';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-e-white">
      {/* 헤더 */}
      <header className="border-b-4 border-e-black bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <span className="text-xl font-black uppercase tracking-tighter sm:text-2xl">Enlázate</span>
          <div className="flex items-center gap-3">
            <Link href="/learn" className="hidden border-2 border-e-black px-3 py-1.5 text-xs font-black uppercase transition-colors hover:bg-e-yellow sm:block">
              앱 열기
            </Link>
            <AuthHeader />
          </div>
        </div>
      </header>

      {/* 퀴즈 */}
      <LandingQuiz />

      {/* 히어로 */}
      <section className="border-b-4 border-e-black bg-e-black text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-4 inline-block border-2 border-e-red bg-e-red px-3 py-1 text-xs font-black uppercase tracking-widest">
            스페인어 연음 트레이너
          </div>
          <h1 className="mb-6 text-4xl font-black uppercase leading-none tracking-tighter sm:text-6xl lg:text-7xl">
            스페인어가<br />
            <span className="text-e-red">안 들리는 건</span><br />
            당신 잘못이<br />
            아니에요.
          </h1>
          <p className="mb-8 max-w-xl text-base font-bold text-gray-300 sm:text-lg">
            방금 들은 그 소리, 사실 4단어였어요.<br />
            원어민은 단어와 단어 사이를 이어서 말하거든요.<br />
            이게 <strong className="text-white">연음(enlace)</strong>이고, 교과서는 이걸 안 가르칩니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/learn"
              className="border-4 border-e-red bg-e-red px-6 py-3 text-sm font-black uppercase tracking-tight text-white shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#fff]"
            >
              지금 바로 시작 →
            </Link>
            <Link
              href="/login"
              className="border-4 border-white px-6 py-3 text-sm font-black uppercase tracking-tight text-white transition-all hover:bg-white hover:text-e-black"
            >
              로그인
            </Link>
          </div>
        </div>
      </section>

      {/* 문제 제시 */}
      <section className="border-b-4 border-e-black">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-gray-400">The Problem</div>
          <h2 className="mb-8 text-2xl font-black uppercase tracking-tighter sm:text-3xl">
            원어민이 빠른 게 아니에요.<br />소리가 <span className="text-e-red">이어지는</span> 거예요.
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: '교과서',
                example: 'un amigo',
                pronounce: '운 아미고',
                note: '각 단어를 따로따로',
                bad: true,
              },
              {
                label: '실제 원어민',
                example: 'un amigo',
                pronounce: '우나미고',
                note: 'n이 뒤 모음에 붙어서',
                bad: false,
              },
              {
                label: '또 다른 예시',
                example: 'vamos a estar',
                pronounce: '바모사에스따르',
                note: '3단어가 하나처럼',
                bad: false,
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`border-4 p-4 ${item.bad ? 'border-gray-300 bg-gray-50' : 'border-e-black bg-e-yellow'}`}
              >
                <div className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">{item.label}</div>
                <div className="mb-1 font-mono text-sm font-bold text-gray-600">{item.example}</div>
                <div className={`text-xl font-black ${item.bad ? 'text-gray-400 line-through' : 'text-e-black'}`}>
                  {item.pronounce}
                </div>
                <div className="mt-2 text-xs font-bold text-gray-500">{item.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3단계 솔루션 */}
      <section className="border-b-4 border-e-black bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-gray-400">The Solution</div>
          <h2 className="mb-8 text-2xl font-black uppercase tracking-tighter sm:text-3xl">
            3단계로 귀를 뚫어드립니다
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                step: '01',
                icon: '👁️',
                title: 'SEE',
                sub: '연음 시각화',
                desc: '문장을 입력하면 어디서 소리가 바뀌는지 색깔로 바로 보여줘요.',
                color: 'bg-e-black text-white',
              },
              {
                step: '02',
                icon: '👂',
                title: 'HEAR',
                sub: '클립 플레이어',
                desc: 'YouTube 영상을 붙여넣으면 교과서 발음 vs 실제 발음을 비교해서 들어요.',
                color: 'bg-e-red text-white',
              },
              {
                step: '03',
                icon: '✍️',
                title: 'DICTATION',
                sub: '받아쓰기',
                desc: '실제 속도로 듣고 받아쓰기. 약점 패턴을 자동으로 진단해드려요.',
                color: 'bg-e-yellow text-e-black',
              },
            ].map((s) => (
              <div key={s.step} className={`border-4 border-e-black p-5 shadow-hard ${s.color}`}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-3xl">{s.icon}</span>
                  <div>
                    <div className="text-[9px] font-black uppercase opacity-60">STEP {s.step}</div>
                    <div className="text-sm font-black uppercase tracking-tight">{s.title} — {s.sub}</div>
                  </div>
                </div>
                <p className="text-xs font-bold leading-relaxed opacity-80">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/learn"
              className="inline-block border-4 border-e-black bg-e-black px-8 py-3 text-sm font-black uppercase tracking-tight text-white shadow-hard transition-all hover:-translate-y-0.5 hover:bg-e-red hover:shadow-[6px_6px_0_#000]"
            >
              SEE부터 시작하기 →
            </Link>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t-4 border-e-black bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-xs font-bold uppercase text-gray-400">Enlázate — MVP v1.0</span>
          <span className="text-xs font-bold uppercase text-gray-400">Castellano (Madrid) 기준</span>
        </div>
      </footer>
    </div>
  );
}
