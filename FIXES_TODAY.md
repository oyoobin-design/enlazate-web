# Enlázate — 오늘 완성 수정 목록

> PRD 평가 문서(`enlazate_prd_evaluation.md`)와 실제 코드베이스를 대조해 도출한 수정 목록.
> Claude CLI가 이 파일을 읽고 코드를 수정할 수 있도록 파일/라인/방법까지 구체적으로 작성.

---

## 0. 먼저 해야 할 것 — `.env.local` 생성

`enlazate-web/.env.local` 파일이 없음. 앱이 작동하려면 반드시 필요.

```
# enlazate-web/.env.local

# Google Cloud TTS (콘솔 → API & Services → Credentials → API Key)
GOOGLE_TTS_API_KEY=여기에_실제_키

# OpenAI (platform.openai.com → API keys)
OPENAI_API_KEY=여기에_실제_키

# Supabase (supabase.com → 프로젝트 → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key
```

**Google API Key 발급 시 주의:**
- Cloud Console → API & Services → Library에서 "Cloud Text-to-Speech API" 활성화 필요
- API Key 제한: HTTP referrer 또는 IP 제한 설정 권장

---

## 🔴 CRITICAL — 앱이 이상하게 동작하는 버그

### BUG 1: TTS 교과서 발음 속도가 잘못됨

**파일:** `src/app/api/tts/route.ts`
**라인:** 21
**현재:** `speakingRate: style === 'textbook' ? 1.0 : 1.05`
**수정:** `speakingRate: style === 'textbook' ? 0.75 : 1.05`

교과서 발음은 "또박또박 느리게"가 핵심인데, 현재 1.0배속은 자연 속도와 차이가 없음.
player 페이지 주석에 "교과서(여성/0.75x)"로 의도가 명시돼 있으나 실제 코드는 1.0.

```ts
// src/app/api/tts/route.ts — line 20-21
// 수정 전
const speakingRate = style === 'textbook' ? 1.0 : 1.05;
// 수정 후
const speakingRate = style === 'textbook' ? 0.75 : 1.05;
```

---

### BUG 2: AudioPlayer 하단 라벨이 잘못된 정보 표시

**파일:** `src/components/audio/AudioPlayer.tsx`
**라인:** 415-417
**현재:** `TTS: OpenAI · 교과서(alloy 0.75x) vs 실제(nova 1.0x)`
**수정:** `TTS: Google Cloud · 교과서(Neural2-A, 0.75x) vs 실제(Neural2-B, 1.05x)`

실제로는 Google Cloud TTS를 사용하는데 OpenAI로 표기됨.

```tsx
// 수정 전
<div className="px-4 py-2 text-xs font-bold uppercase text-gray-400">
  TTS: OpenAI · 교과서(alloy 0.75x) vs 실제(nova 1.0x)
</div>
// 수정 후
<div className="px-4 py-2 text-xs font-bold uppercase text-gray-400">
  TTS: Google Cloud · 교과서(Neural2-A, 0.75x) vs 실제(Neural2-B, 1.05x)
</div>
```

---

## 🟡 HIGH — UX/학습효과에 직접 영향

### ISSUE 3: seseo/yeísmo 안내 배너 없음

**파일:** `src/app/page.tsx`
**위치:** `<main>` 안, `<EnlaceVisualizer />` 바로 위에 추가

PRD 평가자(Dr. María): "마드리드 Castellano '만' 배우면 실전에서 더 혼란" — 중남미 스페인어와 다를 수 있음을 명시해야 함.

```tsx
// src/app/page.tsx — EnlaceVisualizer 바로 위에 삽입
<div className="mb-4 flex items-start gap-3 border-4 border-e-black bg-e-yellow p-3 sm:p-4">
  <span className="shrink-0 text-lg">🗺️</span>
  <div>
    <div className="text-xs font-black uppercase">마드리드 Castellano 기준</div>
    <div className="text-xs font-bold text-gray-700">
      이 앱은 마드리드 표준 발음(Castellano)을 기준으로 합니다.
      중남미 스페인어(seseo, yeísmo 등)는 일부 발음이 다를 수 있어요.
    </div>
  </div>
</div>
```

---

### ISSUE 4: 패턴 카드에 적용 빈도 표시 없음

**파일:** `src/app/page.tsx`
**위치:** 패턴 카드 배열 (line 70-78 근처 `{ icon, name, ex, difficulty }` 객체들)

Dr. María 피드백: "이 규칙이 반드시 적용된다"가 아닌 "이 맥락에서 적용될 확률이 높다"로 설명해야 함.
각 패턴 카드에 빈도 레이블을 추가:

```tsx
// src/app/page.tsx — 패턴 배열을 다음으로 교체
{[
  { icon: '🟢', name: '모음 연결', ex: 'de España → [des.ˈpa.ɲa]', difficulty: 2, freq: '거의 항상' },
  { icon: '🔵', name: '재음절화', ex: 'un amigo → [u.na.ˈmi.ɣo]', difficulty: 2, freq: '거의 항상' },
  { icon: '🟣', name: '마찰음화', ex: 'acabado → aca[β]a[ð]o', difficulty: 3, freq: '자주' },
  { icon: '🔴', name: 'd 탈락', ex: 'cansado → cansao', difficulty: 2, freq: '거의 항상 (마드리드)' },
  { icon: '🩵', name: '비음 동화', ex: 'un poco → um poco', difficulty: 1, freq: '거의 항상' },
  { icon: '🟠', name: '어말 d 탈락', ex: 'verdad → verdá', difficulty: 2, freq: '자주' },
  { icon: '⚫', name: '연쇄 축약', ex: '규칙 3개+ 동시 적용', difficulty: 3, freq: '상황에 따라' },
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
```

---

### ISSUE 5: EnlaceVisualizer에 "분석 오류 신고" 버튼 없음

**파일:** `src/components/enlace/EnlaceVisualizer.tsx`
**위치:** pattern legend 아래 (`</div>` 닫기 직전)

PM 박서연: "연음 분석 결과에 '이 분석이 정확하지 않나요?' 피드백 버튼 추가 설계"

```tsx
// src/components/enlace/EnlaceVisualizer.tsx — pattern legend div 바로 아래 추가
{analysis.appliedPatterns.length > 0 && (
  <div className="mt-3 border-t border-gray-100 pt-3">
    <button
      onClick={() => {
        const msg = encodeURIComponent(
          `[분석 오류 제보] 입력: "${input}" / 분석 결과: ${analysis.appliedPatterns.join(', ')}`
        );
        window.open(`mailto:feedback@enlazate.app?subject=연음 분석 오류&body=${msg}`, '_blank');
      }}
      className="text-xs font-bold text-gray-400 underline hover:text-e-red"
    >
      이 분석이 정확하지 않나요? →
    </button>
  </div>
)}
```

> 참고: 이메일 주소는 실제 주소로 교체하거나, mailto 대신 GitHub Issues 링크로 변경 가능.

---

### ISSUE 6: 툴팁 한국어 음운 전사 불일치

**파일:** `src/lib/enlace-engine.ts`

현재 상태:
- rule 1 tooltip: `'-ado/-ada에서 d 탈락 → "cansado" → "cansao"'` (한국어 설명)
- rule 3 tooltip: `` `${chars[i]} → ${fricative}: 모음 사이에서 마찰음화` `` (한국어 + IPA 혼용)
- rule 5/6 tooltip: 한국어만

Dr. María 요청: "한글 근사 (IPA)" 형식으로 통일.

각 tooltip에서 IPA 표기를 병기하도록 수정:

```ts
// Rule 3 tooltip 수정 (line 93)
// 현재
tooltip: `${chars[i]} → ${fricative}: 모음 사이에서 마찰음화`,
// 수정
tooltip: `${chars[i]} → ${fricative} [${c === 'b' ? 'β' : c === 'd' ? 'ð' : 'ɣ'}]: 모음 사이에서 마찰음으로 약화`,

// Rule 4 tooltip 수정 (line 117)
// 현재
tooltip: `n → m: '${chars[j]}' 앞에서 양순음 동화 → "un poco" → "um poco"`,
// 수정
tooltip: `n → m [m]: '${chars[j]}' 앞에서 양순음 동화 (nasal assimilation)`,
```

---

### ISSUE 7: DrillSession ScoreScreen 결과가 너무 단순함

**파일:** `src/components/drill/DrillSession.tsx`
**위치:** `ScoreScreen` 컴포넌트 (line 28-60)

UX 리서처 김도현: "세션 종료 시점의 감정 설계 — '오늘 이만큼 성장했어요' 마이크로 리워드가 리텐션을 크게 좌우"

```tsx
// ScoreScreen 컴포넌트 교체 — 학습 시간 + 다음 단계 안내 추가
function ScoreScreen({ score, total, onRestart }: { score: number; total: number; onRestart: () => void }) {
  const pct = Math.round((score / total) * 100);
  const grade =
    pct >= 90 ? '🏆 완벽!'
    : pct >= 70 ? '👏 잘했어요!'
    : pct >= 50 ? '📚 조금 더 연습!'
    : '💪 다시 도전!';

  const nextMsg =
    pct >= 90 ? '딕테이션으로 귀를 훈련해보세요 →'
    : pct >= 70 ? '틀린 패턴 위주로 다시 풀어보세요 →'
    : '예시 문장을 먼저 시각화로 확인해보세요 →';

  return (
    <div className="border-4 border-e-black bg-white p-6 text-center shadow-hard sm:p-8">
      <div className="mb-2 text-xs font-bold uppercase text-gray-400">결과</div>
      <div className="mb-3 text-5xl font-black sm:mb-4 sm:text-6xl">{pct}%</div>
      <div className="mb-2 text-xl font-black uppercase sm:text-2xl">{grade}</div>
      <div className="mb-2 text-sm font-bold text-gray-500">
        {total}문제 중 {score}개 정답
      </div>
      <div className="mb-6 rounded border-2 border-e-black bg-e-yellow px-4 py-2 text-sm font-bold text-gray-700">
        {nextMsg}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          onClick={onRestart}
          className="border-4 border-e-black bg-e-red px-8 py-3 font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard"
        >
          다시 풀기
        </button>
        <a
          href="/drill"
          className="border-4 border-e-black bg-e-black px-8 py-3 font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:bg-e-red hover:shadow-hard"
        >
          딕테이션 도전
        </a>
      </div>
    </div>
  );
}
```

---

## 🟢 MEDIUM — 출시 전 완료

### ISSUE 8: 홈 3단계 배너 SPEAK 없음 (STT 연결 안 됨)

**파일:** `src/app/page.tsx` — 3단계 배너 (line 32-55)

`/api/stt-blob` 라우트가 있지만 UI가 없음. SPEAK 단계(STT + 발음 평가)가 미구현 상태.
현재 STEP 03이 "DICTATION"인데, 원래 PRD는 "SPEAK"까지 3단계였음.

**옵션 A**: 현재 상태 유지 (DICTATION이 SPEAK 역할 포함이므로 OK)
**옵션 B**: SPEAK 단계를 별도 페이지로 구현 (scope이 커서 오늘은 skip 권장)

→ **권장**: 배너에서 STEP 03을 "SPEAK (말하기 드릴 — 예정)"으로 표기하거나 현행 유지.

---

### ISSUE 9: 로그인 없이 Dashboard 접근 시 빈 화면

**현재 동작**: 로그인 없이 Dashboard 접근 시 Supabase RLS에 따라 데이터 없음 → "아직 기록이 없습니다" 표시됨. 기능상 무방하나 혼란 가능.

**파일:** `src/app/dashboard/page.tsx`
**수정**: "아직 기록이 없습니다" 화면에 로그인 안내 추가

```tsx
// dashboard/page.tsx — 빈 상태 화면 (line 126-139) 내용 교체
) : totalAttempts === 0 ? (
  <div className="py-20 text-center">
    <div className="mb-4 text-6xl">✍️</div>
    <div className="mb-2 text-2xl font-black">아직 기록이 없습니다</div>
    <div className="mb-2 text-sm font-bold text-gray-500">
      딕테이션을 완료하면 여기서 학습 통계를 확인할 수 있어요
    </div>
    <div className="mb-8 text-xs font-bold text-gray-400">
      💡 로그인하면 학습 기록이 저장됩니다
    </div>
    <Link href="/drill" className="border-4 border-e-black bg-e-red px-8 py-3 font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard">
      딕테이션 시작 →
    </Link>
  </div>
```

---

## 📋 체크리스트 (오늘 완성 목표)

### 환경 세팅
- [ ] `enlazate-web/.env.local` 생성 (GOOGLE_TTS_API_KEY, OPENAI_API_KEY, SUPABASE 2개)
- [ ] `npm run dev` 실행 확인

### 코드 수정
- [ ] **BUG 1**: `src/app/api/tts/route.ts` — textbook speakingRate 1.0 → 0.75
- [ ] **BUG 2**: `src/components/audio/AudioPlayer.tsx` — 하단 라벨 OpenAI → Google Cloud
- [ ] **ISSUE 3**: `src/app/page.tsx` — seseo/yeísmo 배너 추가
- [ ] **ISSUE 4**: `src/app/page.tsx` — 패턴 카드 빈도 레이블 추가
- [ ] **ISSUE 5**: `src/components/enlace/EnlaceVisualizer.tsx` — 오류 신고 버튼
- [ ] **ISSUE 6**: `src/lib/enlace-engine.ts` — tooltip IPA 병기 통일
- [ ] **ISSUE 7**: `src/components/drill/DrillSession.tsx` — ScoreScreen 개선
- [ ] **ISSUE 9**: `src/app/dashboard/page.tsx` — 빈 화면 로그인 안내 추가

### 테스트
- [ ] `/` 홈 — 연음 시각화 분석 작동 확인
- [ ] `/player` — 교과서/실제 발음 TTS 생성 + 0.75x 느린 속도 확인
- [ ] `/drill` (퀴즈) — 패턴 필터 + 채점 확인
- [ ] `/drill` (딕테이션) — TTS 듣기 + 답 제출 + Supabase 저장 확인
- [ ] `/dashboard` — 패턴별 정답률 표시 확인

---

## 🔑 필요한 API 키 목록

| 서비스 | 환경 변수 | 발급 위치 | 용도 |
|--------|-----------|-----------|------|
| Google Cloud TTS | `GOOGLE_TTS_API_KEY` | console.cloud.google.com | 교과서/실제 발음 생성 |
| OpenAI | `OPENAI_API_KEY` | platform.openai.com | 발음 분석(GPT-4o-mini), AI 딕테이션 문장 생성(GPT-4o-mini), STT(Whisper-1) |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` | app.supabase.com | DB/Auth |
| Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app.supabase.com | DB/Auth |

---

## 💡 Claude CLI 프롬프트 예시

```bash
# 전체 수정 실행
claude "FIXES_TODAY.md를 읽고 🔴 CRITICAL 항목 2개(BUG 1, BUG 2)를 먼저 수정해줘"

# 개별 수정
claude "FIXES_TODAY.md의 ISSUE 3을 보고 seseo/yeísmo 배너를 src/app/page.tsx에 추가해줘"

claude "FIXES_TODAY.md의 ISSUE 4, 5, 7을 한 번에 수정해줘"
```
