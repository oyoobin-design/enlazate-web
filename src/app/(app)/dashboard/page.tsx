'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PATTERN_META } from '@/types';
import type { PatternId } from '@/types';
import {
  fetchPatternAccuracy,
  fetchRecentResults,
  fetchDifficultyStats,
} from '@/lib/supabase';
import type { PatternAccuracy, DictationResultRow } from '@/lib/supabase';

const ALL_PATTERNS: PatternId[] = [
  'sinalefa',
  'resilabificacion',
  'espirantizacion',
  'perdida_d',
  'asimilacion_nasal',
  'elision_d_final',
  'encadenamiento',
];

const MIN_FOR_LEVEL = 5;

const RELIABILITY = (count: number): { stars: number; label: string } => {
  if (count >= 30) return { stars: 3, label: '높은 신뢰도' };
  if (count >= 15) return { stars: 2, label: '중간 신뢰도' };
  return { stars: 1, label: '초기 측정' };
};

const LEVEL_META = (accuracy: number, weakCount: number): { label: string; icon: string; desc: string; color: string } => {
  if (accuracy >= 85 && weakCount <= 1) return { label: '상급', icon: '👑', desc: '연음을 자연스럽게 인식하고 있어요', color: 'text-green-700' };
  if (accuracy >= 70) return { label: '중고급', icon: '📈', desc: '대부분의 연음을 잘 캐치하고 있어요', color: 'text-blue-700' };
  if (accuracy >= 55) return { label: '중급', icon: '📚', desc: '기본 연음 패턴을 익혀가고 있어요', color: 'text-yellow-700' };
  if (accuracy >= 40) return { label: '초중급', icon: '🌱', desc: '연음 훈련을 꾸준히 이어가고 있어요', color: 'text-orange-600' };
  return { label: '입문', icon: '🔰', desc: '지금부터 연음에 귀를 열어가는 단계예요', color: 'text-red-600' };
};

const DIFF_LABELS: Record<number, { label: string; icon: string }> = {
  1: { label: '쉬움', icon: '🟢' },
  2: { label: '보통', icon: '🟡' },
  3: { label: '어려움', icon: '🔴' },
};

function barColor(accuracy: number): string {
  if (accuracy >= 80) return 'bg-green-600';
  if (accuracy >= 60) return 'bg-e-yellow';
  if (accuracy >= 40) return 'bg-orange-500';
  return 'bg-e-red';
}

function AccuracyBar({ accuracy, label }: { accuracy: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-right text-sm font-black">{accuracy}%</span>
      <div className="relative h-5 flex-1 border-2 border-e-black bg-gray-100">
        <div
          className={`h-full transition-all duration-500 ${barColor(accuracy)}`}
          style={{ width: `${accuracy}%` }}
        />
      </div>
      <span className="hidden text-xs font-bold text-gray-400 sm:inline">{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [patternStats, setPatternStats] = useState<PatternAccuracy[]>([]);
  const [recentResults, setRecentResults] = useState<DictationResultRow[]>([]);
  const [diffStats, setDiffStats] = useState<{ difficulty: number; avgScore: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [patterns, recent, diff] = await Promise.all([
      fetchPatternAccuracy(),
      fetchRecentResults(30),
      fetchDifficultyStats(),
    ]);
    setPatternStats(patterns);
    setRecentResults(recent);
    setDiffStats(diff);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalAttempts = recentResults.length;
  const totalCorrect = recentResults.reduce((s, r) => s + r.correct_count, 0);
  const totalWordCount = recentResults.reduce((s, r) => s + r.word_count, 0);
  const overallAccuracy = totalWordCount > 0 ? Math.round((totalCorrect / totalWordCount) * 100) : 0;

  const sortedPatterns = ALL_PATTERNS.map((pid) => {
    const stat = patternStats.find((s) => s.pattern === pid);
    return {
      pid,
      accuracy: stat?.accuracy ?? -1,
      attempts: stat?.attempts ?? 0,
      totalWords: stat?.totalWords ?? 0,
      correctWords: stat?.correctWords ?? 0,
    };
  }).sort((a, b) => {
    if (a.attempts === 0 && b.attempts === 0) return 0;
    if (a.attempts === 0) return 1;
    if (b.attempts === 0) return -1;
    return a.accuracy - b.accuracy;
  });

  const weakPatterns = sortedPatterns.filter((p) => p.attempts > 0 && p.accuracy < 70);

  return (
    <div className="min-h-screen bg-e-white">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {loading ? (
          <div className="py-20 text-center">
            <div className="mb-4 text-5xl">📊</div>
            <div className="text-sm font-bold text-gray-500">데이터 불러오는 중...</div>
          </div>
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
            <Link
              href="/drill"
              className="border-4 border-e-black bg-e-red px-8 py-3 font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard"
            >
              딕테이션 시작 →
            </Link>
          </div>
        ) : (
          <>
            {/* ── 레벨 측정 카드 ── */}
            <div className="mb-6 border-4 border-e-black bg-white shadow-hard">
              <div className="border-b-4 border-e-black px-5 py-3">
                <h2 className="text-sm font-black uppercase tracking-tight">🎖️ 내 연음 레벨</h2>
              </div>
              <div className="px-5 py-4">
                {totalAttempts < MIN_FOR_LEVEL ? (
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🔒</span>
                    <div>
                      <div className="font-black text-gray-700">레벨 측정 대기 중</div>
                      <div className="mt-0.5 text-xs font-bold text-gray-400">
                        딕테이션 {MIN_FOR_LEVEL}회 이상 완료하면 측정이 시작돼요
                        <span className="ml-1 font-black text-e-red">({totalAttempts}/{MIN_FOR_LEVEL})</span>
                      </div>
                      <div className="mt-1 text-xs font-bold text-gray-400">
                        💡 많이 할수록 더 정확한 레벨을 알 수 있어요
                      </div>
                    </div>
                  </div>
                ) : (() => {
                  const lv = LEVEL_META(overallAccuracy, weakPatterns.length);
                  const rel = RELIABILITY(totalAttempts);
                  const stars = '★'.repeat(rel.stars) + '☆'.repeat(3 - rel.stars);
                  return (
                    <div>
                      <div className="flex items-center gap-4">
                        <div className="text-5xl">{lv.icon}</div>
                        <div>
                          <div className={`text-2xl font-black ${lv.color}`}>{lv.label}</div>
                          <div className="text-xs font-bold text-gray-500">{lv.desc}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs font-bold text-gray-400">
                            <span className="text-yellow-500">{stars}</span>
                            <span>{rel.label} · {totalAttempts}회 완료 기준</span>
                          </div>
                        </div>
                      </div>
                      {rel.stars < 3 && (
                        <div className="mt-3 border-t border-gray-100 pt-2 text-xs font-bold text-gray-400">
                          💡 딕테이션을 더 많이 할수록 레벨이 정확해져요
                          {rel.stars === 1 && <span className="ml-1">(★★★ 달성까지 {15 - totalAttempts}회 남음)</span>}
                          {rel.stars === 2 && <span className="ml-1">(★★★ 달성까지 {30 - totalAttempts}회 남음)</span>}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ── 전체 요약 카드 ── */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {[
                { label: '총 시도', value: totalAttempts, sub: '문장', icon: '📝' },
                { label: '총 정답률', value: `${overallAccuracy}%`, sub: `${totalCorrect}/${totalWordCount}`, icon: '🎯' },
                { label: '약점 패턴', value: weakPatterns.length, sub: `${ALL_PATTERNS.length}개 중`, icon: '🔥' },
                { label: '연습 일수', value: new Set(recentResults.map((r) => r.created_at.slice(0, 10))).size, sub: '일', icon: '📅' },
              ].map((card) => (
                <div key={card.label} className="border-3 border-e-black bg-white p-3 shadow-hard-sm sm:border-4 sm:p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-400 sm:gap-2 sm:text-xs">
                    <span>{card.icon}</span>
                    {card.label}
                  </div>
                  <div className="text-2xl font-black sm:text-3xl">{card.value}</div>
                  <div className="text-[10px] font-bold text-gray-400 sm:text-xs">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* ── 패턴별 정답률 ── */}
            <div className="mb-8 border-4 border-e-black bg-white shadow-hard">
              <div className="flex items-center justify-between border-b-4 border-e-black px-5 py-3">
                <h2 className="text-sm font-black uppercase tracking-tight">
                  패턴별 정답률
                </h2>
                <span className="text-xs font-bold text-gray-400">
                  낮은 순서부터 표시
                </span>
              </div>
              <div className="space-y-3 p-5">
                {sortedPatterns.map(({ pid, accuracy, attempts }) => {
                  const meta = PATTERN_META[pid as PatternId];
                  return (
                    <div key={pid}>
                      <div className="mb-1 flex items-center gap-2">
                        <span>{meta.icon}</span>
                        <span className="text-sm font-black">{meta.name_ko}</span>
                        <span className="ml-auto text-xs font-bold text-gray-400">
                          {attempts > 0 ? `${attempts}회 연습` : '미연습'}
                        </span>
                      </div>
                      {attempts > 0 ? (
                        <AccuracyBar accuracy={accuracy} label={meta.description} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-8 text-right text-sm font-black text-gray-300">—</span>
                          <div className="h-5 flex-1 border-2 border-dashed border-gray-300 bg-gray-50" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 난이도별 통계 + 약점 알림 ── */}
            <div className="mb-8 grid gap-4 md:grid-cols-2">
              {/* 난이도별 */}
              <div className="border-4 border-e-black bg-white shadow-hard-sm">
                <div className="border-b-4 border-e-black px-5 py-3">
                  <h2 className="text-sm font-black uppercase tracking-tight">난이도별 평균</h2>
                </div>
                <div className="space-y-4 p-5">
                  {[1, 2, 3].map((d) => {
                    const stat = diffStats.find((s) => s.difficulty === d);
                    const meta = DIFF_LABELS[d];
                    return (
                      <div key={d}>
                        <div className="mb-1 flex items-center gap-2">
                          <span>{meta.icon}</span>
                          <span className="text-sm font-black">{meta.label}</span>
                          <span className="ml-auto text-xs font-bold text-gray-400">
                            {stat ? `${stat.count}회` : '미연습'}
                          </span>
                        </div>
                        {stat ? (
                          <AccuracyBar accuracy={stat.avgScore} label={`평균 ${stat.avgScore}%`} />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-right text-sm font-black text-gray-300">—</span>
                            <div className="h-5 flex-1 border-2 border-dashed border-gray-300 bg-gray-50" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 약점 패턴 알림 */}
              <div className="border-4 border-e-black bg-white shadow-hard-sm">
                <div className="border-b-4 border-e-black bg-e-red px-5 py-3">
                  <h2 className="text-sm font-black uppercase tracking-tight text-white">
                    🔥 집중 연습 필요
                  </h2>
                </div>
                <div className="p-5">
                  {weakPatterns.length === 0 ? (
                    <div className="py-6 text-center">
                      <div className="mb-2 text-4xl">🏆</div>
                      <div className="text-sm font-black text-green-700">
                        모든 패턴 정답률 70% 이상!
                      </div>
                      <div className="mt-1 text-xs font-bold text-gray-400">
                        꾸준히 연습하고 있어요
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {weakPatterns.map(({ pid, accuracy, attempts }) => {
                        const meta = PATTERN_META[pid as PatternId];
                        return (
                          <div
                            key={pid}
                            className="flex items-center gap-3 border-2 border-e-black p-3"
                          >
                            <span className="text-xl">{meta.icon}</span>
                            <div className="flex-1">
                              <div className="text-sm font-black">{meta.name_ko}</div>
                              <div className="text-xs text-gray-500">{meta.description}</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-black ${accuracy < 50 ? 'text-e-red' : 'text-orange-500'}`}>
                                {accuracy}%
                              </div>
                              <div className="text-xs font-bold text-gray-400">{attempts}회</div>
                            </div>
                          </div>
                        );
                      })}
                      <Link
                        href="/drill"
                        className="mt-2 block w-full border-4 border-e-black bg-e-black py-3 text-center font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:bg-e-red hover:shadow-hard"
                      >
                        약점 패턴 집중 연습 →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 최근 기록 ── */}
            <div className="border-4 border-e-black bg-white shadow-hard">
              <div className="flex items-center justify-between border-b-4 border-e-black px-5 py-3">
                <h2 className="text-sm font-black uppercase tracking-tight">최근 기록</h2>
                <button
                  onClick={loadData}
                  className="border-2 border-e-black px-2 py-0.5 text-xs font-black transition-colors hover:bg-e-yellow"
                >
                  🔄 새로고침
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-e-black bg-gray-50 text-xs font-black uppercase text-gray-500">
                      <th className="px-2 py-2 sm:px-4">문장</th>
                      <th className="px-2 py-2 text-center sm:px-4">점수</th>
                      <th className="hidden px-2 py-2 text-center md:table-cell sm:px-4">패턴</th>
                      <th className="hidden px-2 py-2 text-center sm:table-cell sm:px-4">난이도</th>
                      <th className="px-2 py-2 text-right sm:px-4">시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentResults.map((r) => {
                      const pct = r.word_count > 0 ? Math.round((r.correct_count / r.word_count) * 100) : 0;
                      return (
                        <tr key={r.id} className="border-b border-gray-200 hover:bg-e-yellow/20">
                          <td className="max-w-[120px] truncate px-2 py-2 text-xs font-bold sm:max-w-[200px] sm:px-4 sm:text-sm">
                            {r.sentence_original}
                          </td>
                          <td className="px-2 py-2 text-center sm:px-4">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-black ${
                                pct >= 80
                                  ? 'bg-green-100 text-green-800'
                                  : pct >= 50
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {pct}%
                            </span>
                          </td>
                          <td className="hidden px-2 py-2 text-center md:table-cell sm:px-4">
                            <div className="flex flex-wrap justify-center gap-0.5">
                              {(r.applied_patterns ?? []).map((pid) => (
                                <span key={pid} className="text-xs" title={PATTERN_META[pid as PatternId]?.name_ko}>
                                  {PATTERN_META[pid as PatternId]?.icon ?? '•'}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="hidden px-2 py-2 text-center sm:table-cell sm:px-4">
                            <span className="text-xs">
                              {DIFF_LABELS[r.difficulty]?.icon ?? ''} {DIFF_LABELS[r.difficulty]?.label ?? ''}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right text-[10px] text-gray-400 sm:px-4 sm:text-xs">
                            {new Date(r.created_at).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

    </div>
  );
}
