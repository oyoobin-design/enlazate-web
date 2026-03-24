'use client';

import { useState, useCallback } from 'react';
import { PATTERN_META } from '@/types';
import type { PatternId } from '@/types';
import {
  DRILL_QUESTIONS,
  getQuestionsByPattern,
  shuffleQuestions,
} from '@/lib/drill-data';
import type { DrillQuestion } from '@/lib/drill-data';

// ── Pattern filter bar ─────────────────────────────────────────────────────

const FILTER_OPTIONS: { id: PatternId | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: '전체', icon: '🎯' },
  { id: 'sinalefa', label: '모음 연결', icon: '🟢' },
  { id: 'resilabificacion', label: '재음절화', icon: '🔵' },
  { id: 'espirantizacion', label: '마찰음화', icon: '🟣' },
  { id: 'perdida_d', label: 'd 탈락', icon: '🔴' },
  { id: 'asimilacion_nasal', label: '비음 동화', icon: '🩵' },
  { id: 'elision_d_final', label: '어말 d', icon: '🟠' },
  { id: 'encadenamiento', label: '연쇄 축약', icon: '⚫' },
];

// ── Score screen ───────────────────────────────────────────────────────────

function ScoreScreen({
  score,
  total,
  onRestart,
}: {
  score: number;
  total: number;
  onRestart: () => void;
}) {
  const pct = Math.round((score / total) * 100);
  const grade =
    pct >= 90 ? '🏆 완벽!'
    : pct >= 70 ? '👏 잘했어요!'
    : pct >= 50 ? '📚 조금 더 연습!'
    : '💪 다시 도전!';
  const nextMsg =
    pct >= 90 ? '딕테이션으로 귀를 훈련해보세요'
    : pct >= 70 ? '틀린 패턴 위주로 다시 풀어보세요'
    : '예시 문장을 먼저 시각화로 확인해보세요';

  return (
    <div className="border-4 border-e-black bg-white p-6 text-center shadow-hard sm:p-8">
      <div className="mb-2 text-xs font-bold uppercase text-gray-400">결과</div>
      <div className="mb-3 text-5xl font-black sm:mb-4 sm:text-6xl">{pct}%</div>
      <div className="mb-2 text-xl font-black uppercase sm:text-2xl">{grade}</div>
      <div className="mb-3 text-sm font-bold text-gray-500">
        {total}문제 중 {score}개 정답
      </div>
      <div className="mb-6 rounded border-2 border-e-black bg-e-yellow px-4 py-2 text-sm font-bold text-gray-700">
        💡 {nextMsg}
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

// ── Main DrillSession ──────────────────────────────────────────────────────

export default function DrillSession() {
  const [filter, setFilter] = useState<PatternId | 'all'>('all');
  const [questions, setQuestions] = useState<DrillQuestion[]>(() =>
    shuffleQuestions(DRILL_QUESTIONS),
  );
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[idx];
  const isAnswered = selected !== null;
  const isCorrect = selected === q?.correctIndex;

  const startSession = useCallback(
    (newFilter: PatternId | 'all') => {
      const qs = shuffleQuestions(getQuestionsByPattern(newFilter));
      setFilter(newFilter);
      setQuestions(qs);
      setIdx(0);
      setSelected(null);
      setScore(0);
      setDone(false);
    },
    [],
  );

  const handleSelect = (optionIdx: number) => {
    if (isAnswered) return;
    setSelected(optionIdx);
    if (optionIdx === q.correctIndex) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (idx + 1 >= questions.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
    }
  };

  if (done) {
    return (
      <div>
        <FilterBar filter={filter} onSelect={startSession} />
        <ScoreScreen score={score} total={questions.length} onRestart={() => startSession(filter)} />
      </div>
    );
  }

  if (!q) return null;

  const meta = PATTERN_META[q.patternId];

  return (
    <div>
      {/* Filter */}
      <FilterBar filter={filter} onSelect={startSession} />

      {/* Progress */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-bold">
          {idx + 1} / {questions.length}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold uppercase text-gray-400">정답</div>
          <div className="text-sm font-black text-e-green">{score}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-2 border-2 border-e-black bg-gray-100">
        <div
          className="h-full bg-e-black transition-all"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <div className="border-4 border-e-black bg-white shadow-hard">
        {/* Card header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-e-black p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="border-2 border-e-black bg-e-black px-1.5 py-0.5 text-[10px] font-bold uppercase text-white sm:px-2 sm:text-xs">
              {q.type === 'transform' ? '변환 퀴즈' : '패턴 식별'}
            </span>
            <span className="border-2 border-e-black px-1.5 py-0.5 text-[10px] font-bold sm:px-2 sm:text-xs">
              {meta.icon} {meta.name_ko}
            </span>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-4 border border-e-black sm:w-5 ${i < q.difficulty ? 'bg-e-black' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        {/* Question body */}
        <div className="p-4 sm:p-6">
          {q.type === 'transform' ? (
            <div>
              <div className="mb-1 text-xs font-bold uppercase text-gray-400">
                실제로 어떻게 들릴까요?
              </div>
              <div className="mb-4 border-2 border-e-black bg-e-yellow px-3 py-2 text-xl font-black sm:mb-6 sm:px-4 sm:py-3 sm:text-3xl">
                {q.original}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-1 text-xs font-bold uppercase text-gray-400">
                어떤 연음 규칙이 적용됐나요?
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-2 border-2 border-e-black px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-400">원문</div>
                  <div className="text-base font-bold sm:text-xl">{q.original}</div>
                </div>
                <div className="text-lg font-black text-e-red sm:text-xl">→</div>
                <div className="min-w-0">
                  <div className="text-xs text-gray-400">실제 발음</div>
                  <div className="text-base font-bold text-e-red sm:text-xl">{q.transformed}</div>
                </div>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {q.options.map((opt, i) => {
              let cls =
                'border-4 border-e-black p-3 text-left text-xs sm:text-sm font-bold transition-all cursor-pointer';
              if (!isAnswered) {
                cls += ' hover:bg-e-yellow hover:-translate-y-0.5 hover:shadow-hard-sm';
              } else if (i === q.correctIndex) {
                cls += ' bg-green-100 border-e-green text-green-800';
              } else if (i === selected) {
                cls += ' bg-red-100 border-e-red text-red-700';
              } else {
                cls += ' opacity-40';
              }

              return (
                <button key={i} className={cls} onClick={() => handleSelect(i)}>
                  <span className="mr-2 font-black text-gray-400">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt}
                  {isAnswered && i === q.correctIndex && (
                    <span className="ml-1 text-green-600">✓</span>
                  )}
                  {isAnswered && i === selected && i !== q.correctIndex && (
                    <span className="ml-1 text-red-600">✗</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {isAnswered && (
            <div
              className={`mt-4 border-4 p-3 ${
                isCorrect
                  ? 'border-e-green bg-green-50'
                  : 'border-e-red bg-red-50'
              }`}
            >
              <div className="mb-1 text-sm font-black uppercase">
                {isCorrect ? '✓ 정답!' : '✗ 오답'}
              </div>
              <div className="text-sm font-bold text-gray-700">{q.explanation}</div>
              {!isCorrect && (
                <div className="mt-1 text-sm font-bold">
                  정답:{' '}
                  <span className="text-green-700">{q.options[q.correctIndex]}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isAnswered && (
          <div className="border-t-4 border-e-black p-3 sm:p-4">
            <button
              onClick={handleNext}
              className="w-full border-4 border-e-black bg-e-black py-3 font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:bg-e-red hover:shadow-hard"
            >
              {idx + 1 >= questions.length ? '결과 보기 →' : '다음 문제 →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Filter bar (extracted) ─────────────────────────────────────────────────

function FilterBar({
  filter,
  onSelect,
}: {
  filter: PatternId | 'all';
  onSelect: (f: PatternId | 'all') => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5 sm:mb-6 sm:gap-2">
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={`border-2 border-e-black px-2 py-1 text-[10px] font-black uppercase transition-colors sm:px-3 sm:text-xs ${
            filter === opt.id ? 'bg-e-black text-white' : 'bg-white hover:bg-e-yellow'
          }`}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  );
}
