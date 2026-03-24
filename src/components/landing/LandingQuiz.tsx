'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

type Answer = '2' | '3' | '4' | '5' | null;
const CORRECT: Answer = '4';

export default function LandingQuiz() {
  const [answer, setAnswer] = useState<Answer>(null);
  const [played, setPlayed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (played && !playing) {
      const t = setTimeout(() => setOptionsVisible(true), 100);
      return () => clearTimeout(t);
    } else {
      setOptionsVisible(false);
    }
  }, [played, playing]);

  useEffect(() => {
    if (answer !== null) {
      const t = setTimeout(() => setResultVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setResultVisible(false);
    }
  }, [answer]);

  function playAudio() {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    setPlayed(true);
    setPlaying(true);

    const stopPlaying = () => setPlaying(false);

    // 재생 실패해도 선택지 보이게
    el.play().catch(stopPlaying);

    // onEnded가 안 fires될 경우 대비 타임아웃 (10초)
    const fallback = setTimeout(stopPlaying, 10000);
    el.addEventListener('ended', () => clearTimeout(fallback), { once: true });
  }

  const isCorrect = answer === CORRECT;

  return (
    <section className="border-b-4 border-e-black bg-[#111111] text-white">
      <style>{`
        @keyframes lq-eq {
          0%, 100% { transform: scaleY(0.2); }
          50%       { transform: scaleY(1); }
        }
        .lq-eq-1 { animation: lq-eq 0.6s ease-in-out infinite 0s; }
        .lq-eq-2 { animation: lq-eq 0.6s ease-in-out infinite 0.12s; }
        .lq-eq-3 { animation: lq-eq 0.6s ease-in-out infinite 0.24s; }
        .lq-eq-4 { animation: lq-eq 0.6s ease-in-out infinite 0.08s; }
        .lq-eq-5 { animation: lq-eq 0.6s ease-in-out infinite 0.18s; }
      `}</style>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">

        <audio
          ref={audioRef}
          src="/audio/que-vas-a-hacer.mp3"
          preload="auto"
          onEnded={() => setPlaying(false)}
          onError={() => setPlaying(false)}
        />

        {/* 헤드라인 */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-gray-500">
            Quiz
          </p>
          <h2 className="mb-3 text-3xl font-black uppercase leading-none tracking-tighter text-white sm:text-4xl">
            몇 단어로<br />
            <span className="text-e-yellow">들리나요?</span>
          </h2>
          <p className="text-sm font-bold text-gray-500">
            원어민 발음을 듣고 맞혀보세요 &nbsp;·&nbsp; 스페인어 몰라도 됩니다
          </p>
        </div>

        {/* 재생 버튼 */}
        <div className="mb-10 flex flex-col items-center">
          <button
            onClick={playAudio}
            className="group relative flex h-24 w-24 items-center justify-center border-4 border-e-yellow bg-transparent transition-all hover:-translate-y-1 hover:bg-e-yellow"
          >
            {playing ? (
              <span className="flex items-end gap-[4px]" style={{ height: '28px' }}>
                {['lq-eq-1', 'lq-eq-2', 'lq-eq-3', 'lq-eq-4', 'lq-eq-5'].map((cls, i) => (
                  <span
                    key={i}
                    className={`${cls} inline-block w-[4px] bg-e-yellow group-hover:bg-e-black`}
                    style={{ height: '28px', transformOrigin: 'bottom' }}
                  />
                ))}
              </span>
            ) : (
              <span
                className="text-e-yellow transition-colors group-hover:text-e-black"
                style={{ fontSize: '36px', lineHeight: 1 }}
              >
                {played ? '↺' : '▶'}
              </span>
            )}
          </button>
          <span className="mt-3 text-xs font-black uppercase tracking-widest text-gray-500">
            {playing ? '재생 중' : played ? '다시 듣기' : '눌러서 듣기'}
          </span>
        </div>

        {/* 질문 + 선택지 — 재생 끝난 후에만 렌더 */}
        {played && !playing && answer === null && (
          <div
            className="transition-all duration-500"
            style={{
              opacity: optionsVisible ? 1 : 0,
              transform: optionsVisible ? 'translateY(0)' : 'translateY(12px)',
            }}
          >
            <p className="mb-6 text-center text-base font-bold text-gray-300 sm:text-lg">
              방금 들은 말, <span className="text-white">몇 단어</span>짜리 문장이었을까요?
            </p>
            <div className="grid grid-cols-4 gap-3">
              {(['2', '3', '4', '5'] as const).map((n, i) => (
                <button
                  key={n}
                  onClick={() => setAnswer(n)}
                  className="group border-4 border-gray-600 bg-transparent py-7 text-center transition-all duration-300 hover:-translate-y-1 hover:border-e-yellow hover:bg-e-yellow"
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <div className="text-4xl font-black text-white group-hover:text-e-black">{n}</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 group-hover:text-gray-700">단어</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 결과: 오답 */}
        {answer !== null && !isCorrect && (
          <div
            className="transition-all duration-500"
            style={{
              opacity: resultVisible ? 1 : 0,
              transform: resultVisible ? 'translateY(0)' : 'translateY(16px)',
            }}
          >
            <div className="mb-6 border-4 border-e-red p-5">
              <div className="mb-4">
                <div className="mb-1 text-xs font-black uppercase text-e-red">{answer}단어로 들렸군요</div>
                <div className="text-sm font-bold text-gray-400">대부분이 그렇게 들어요. 귀 탓이 아닙니다.</div>
              </div>
              <div className="mb-4 border-t-2 border-gray-700 pt-4">
                <div className="mb-1 text-xs font-black uppercase text-e-yellow">실제로는 4단어</div>
                <div className="font-mono text-2xl font-black text-e-yellow sm:text-3xl">
                  ¿Qué / vas / a / hacer?
                </div>
              </div>
              <div className="text-sm font-bold text-gray-300">
                모음이 이어지면서 4단어가 <span className="text-white">하나의 소리 덩어리</span>가 돼요.<br />
                이게 <span className="font-black text-e-yellow">연음(enlace)</span>입니다.
                교과서에서 안 가르쳐줬을 뿐, 당신 잘못이 아니에요.
              </div>
            </div>

            <div className="mb-4 bg-e-red p-4 text-center">
              <div className="mb-1 text-base font-black uppercase">이 앱이 딱 필요한 분이에요.</div>
              <div className="text-xs font-bold text-red-100">
                연음 패턴 7가지를 눈으로 보고, 귀로 훈련해서 원어민 소리를 따라잡아요.
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/learn"
                className="flex-1 border-4 border-e-yellow bg-e-yellow py-4 text-center text-sm font-black uppercase tracking-tight text-e-black shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#fff]"
              >
                연음 훈련 시작하기 →
              </Link>
              <button
                onClick={() => { setAnswer(null); setPlayed(false); }}
                className="flex-1 border-4 border-gray-600 py-4 text-sm font-black uppercase text-gray-400 transition-colors hover:border-white hover:text-white"
              >
                다시 해보기
              </button>
            </div>
          </div>
        )}

        {/* 결과: 정답 */}
        {isCorrect && (
          <div
            className="transition-all duration-500"
            style={{
              opacity: resultVisible ? 1 : 0,
              transform: resultVisible ? 'translateY(0)' : 'translateY(16px)',
            }}
          >
            <div className="mb-6 border-4 border-green-500 p-5">
              <div className="mb-4">
                <div className="mb-1 text-xs font-black uppercase text-green-400">정답! 4단어입니다</div>
                <div className="font-mono text-2xl font-black text-e-yellow sm:text-3xl">
                  ¿Qué / vas / a / hacer?
                </div>
              </div>
              <div className="border-t-2 border-gray-700 pt-4 text-sm font-bold text-gray-300">
                모음이 이어지면서 4단어가 하나로 붙어요.<br />
                연음을 이미 감지하고 있군요. 하지만 패턴이 <span className="font-black text-e-yellow">7가지</span>나 됩니다.
              </div>
            </div>

            <div className="mb-4 bg-gray-800 p-4 text-center">
              <div className="mb-1 text-base font-black uppercase">기초는 있어요. 이제 체계를 잡을 때.</div>
              <div className="text-xs font-bold text-gray-400">
                어떤 패턴에서 자주 막히는지 진단하고, 약점만 집중 훈련해요.
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/drill"
                className="flex-1 border-4 border-e-yellow bg-e-yellow py-4 text-center text-sm font-black uppercase tracking-tight text-e-black shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#fff]"
              >
                약점 패턴 진단하기 →
              </Link>
              <button
                onClick={() => { setAnswer(null); setPlayed(false); }}
                className="flex-1 border-4 border-gray-600 py-4 text-sm font-black uppercase text-gray-400 transition-colors hover:border-white hover:text-white"
              >
                다시 해보기
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
