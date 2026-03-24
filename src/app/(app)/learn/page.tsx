import EnlaceVisualizer from '@/components/enlace/EnlaceVisualizer';

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      {/* 페이지 제목 */}
      <div className="mb-6 border-b-4 border-e-black pb-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">STEP 01</div>
        <h1 className="text-2xl font-black uppercase tracking-tighter sm:text-3xl">👁️ SEE — 연음 시각화</h1>
        <p className="mt-1 text-sm font-bold text-gray-500">
          스페인어 문장을 입력하면 어디서 소리가 바뀌는지 바로 보여드려요
        </p>
      </div>

      {/* 안내 배너 */}
      <div className="mb-6 flex items-start gap-3 border-4 border-e-black bg-e-yellow p-3 sm:p-4">
        <span className="shrink-0 text-lg">🗺️</span>
        <div>
          <div className="text-xs font-black uppercase">마드리드 Castellano 기준</div>
          <div className="text-xs font-bold text-gray-700">
            이 앱은 마드리드 표준 발음을 기준으로 합니다. 중남미 스페인어는 일부 발음이 다를 수 있어요.
          </div>
        </div>
      </div>

      {/* 연음 시각화 */}
      <EnlaceVisualizer />

      {/* 패턴 카드 */}
      <div className="mt-8">
        <div className="mb-4 border-b-4 border-e-black pb-2">
          <h3 className="text-sm font-black uppercase tracking-tighter">마드리드 활성 패턴 (7개)</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 md:grid-cols-3">
          {[
            { icon: '🟢', name: '모음 연결',   ex: 'de España → desˈpaɲa',  difficulty: 2, freq: '거의 항상' },
            { icon: '🔵', name: '재음절화',    ex: 'un amigo → unaˈmiɣo',   difficulty: 2, freq: '거의 항상' },
            { icon: '🟣', name: '마찰음화',    ex: 'acabado → aca[β]a[ð]o', difficulty: 3, freq: '자주' },
            { icon: '🔴', name: 'd 탈락',      ex: 'cansado → cansao',       difficulty: 2, freq: '거의 항상' },
            { icon: '🩵', name: '비음 동화',   ex: 'un poco → um poco',      difficulty: 1, freq: '거의 항상' },
            { icon: '🟠', name: '어말 d 탈락', ex: 'verdad → verdá',         difficulty: 2, freq: '자주' },
            { icon: '⚫', name: '연쇄 축약',   ex: '규칙 3개+ 동시 적용',    difficulty: 3, freq: '상황에 따라' },
          ].map((p) => (
            <div key={p.name} className="border-2 border-e-black bg-white p-3 shadow-hard-sm">
              <div className="mb-1 flex items-center gap-2">
                <span>{p.icon}</span>
                <span className="text-xs font-black uppercase">{p.name}</span>
              </div>
              <div className="font-mono text-xs text-gray-500">{p.ex}</div>
              <div className="mt-1.5 text-[10px] font-bold text-gray-400">{p.freq}</div>
              <div className="mt-2 flex gap-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`h-1.5 w-4 ${i < p.difficulty ? 'bg-e-black' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 추천 채널 */}
      <div className="mt-8 border-4 border-dashed border-e-black bg-white p-4 sm:p-5">
        <div className="mb-1 text-sm font-black uppercase tracking-tighter">아직 영상을 찾고 있나요?</div>
        <div className="mb-4 text-xs font-bold text-gray-500">
          이런 스페인어 채널로 시작해보세요 💡
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { icon: '🎬', name: 'Lola Lolita',          tag: '라이프스타일', desc: 'Z세대 대표. 빠른 속도, 강한 연음',    url: 'https://www.youtube.com/@lolalolita' },
            { icon: '🎬', name: 'Paula Gonu',            tag: '일상 · 유머',  desc: '자연스러운 일상 대화체',            url: 'https://www.youtube.com/@PaulaGonu' },
            { icon: '🎬', name: 'Dulceida',              tag: '패션 · 여행',  desc: '에너지 넘치는 빠른 속도',           url: 'https://www.youtube.com/@dulceida' },
            { icon: '🎙️', name: 'Tómatelo con Vino',    tag: '팟캐스트',     desc: '2인 대화. 자연스러운 리듬',         url: 'https://www.youtube.com/@tomateloconvino.podcast' },
          ].map((ch) => (
            <a
              key={ch.name}
              href={ch.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 border-2 border-e-black p-2 transition-all hover:-translate-y-0.5 hover:bg-e-yellow"
            >
              <span>{ch.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black">{ch.name}</div>
                <div className="text-[10px] text-gray-400">{ch.tag} · {ch.desc}</div>
              </div>
              <span className="shrink-0 text-xs font-black text-e-red">→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
