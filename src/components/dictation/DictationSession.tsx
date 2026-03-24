'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { PATTERN_META } from '@/types';
import type { PatternId } from '@/types';
import { analyzeEnlace } from '@/lib/enlace-engine';
import {
  DICTATION_SENTENCES,
  getSentencesByDifficulty,
  shuffleSentences,
} from '@/lib/dictation-data';
import type { DictationSentence } from '@/lib/dictation-data';
import { saveDictationResult, fetchWeakPatterns } from '@/lib/supabase';

// ── 단어 비교 유틸 ─────────────────────────────────────────────────────────

function normalize(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿¡?!.,;:'"()]/g, '')
    .trim();
}

function editDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp: number[][] = [];
  for (let i = 0; i <= a.length; i++) dp[i] = [i];
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function isWordMatch(correct: string, user: string): boolean {
  const nc = normalize(correct);
  const nu = normalize(user);
  if (nc === nu) return true;
  if (nc.length <= 3 || nu.length <= 3) return false;
  return editDistance(nc, nu) <= 1;
}

interface WordResult {
  correct: string;
  userWord: string | null;
  isCorrect: boolean;
}

function compareWords(correct: string, userAnswer: string): WordResult[] {
  const correctWords = correct.split(/\s+/).filter(Boolean);
  const userWords = userAnswer.split(/\s+/).filter(Boolean);
  return correctWords.map((cWord, i) => {
    const userWord = i < userWords.length ? userWords[i] : null;
    const isCorrect = userWord !== null && isWordMatch(cWord, userWord);
    return { correct: cWord, userWord, isCorrect };
  });
}

// ── 타입 ───────────────────────────────────────────────────────────────────

type Phase = 'ready' | 'listening' | 'result';
type Difficulty = 1 | 2 | 3 | 'all';
type SessionMode = 'static' | 'ai';

interface JunctionPoint {
  original: string;
  sounds_like: string;
  explanation: string;
}

interface PronunciationAnalysis {
  junction_points: JunctionPoint[];
  listening_tip: string;
}

// ── 연음 포인트 분석 컴포넌트 ──────────────────────────────────────────────

function PronunciationGuide({
  analysis: pronAnalysis,
  loading,
  appliedPatterns,
}: {
  analysis: PronunciationAnalysis | null;
  loading: boolean;
  appliedPatterns: PatternId[];
}) {
  if (loading) {
    return (
      <div className="mb-4 border-4 border-e-black">
        <div className="border-b-2 border-e-black bg-gray-50 px-3 py-2 text-xs font-bold uppercase text-gray-400">
          📍 여기서 소리가 변해요
        </div>
        <div className="flex items-center gap-2 p-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-e-black border-t-transparent" />
          <span className="text-sm font-bold text-gray-400">분석 중...</span>
        </div>
      </div>
    );
  }

  if (!pronAnalysis || !pronAnalysis.junction_points?.length) return null;

  return (
    <div className="mb-4 border-4 border-e-black">
      <div className="border-b-2 border-e-black bg-gray-50 px-3 py-2 text-xs font-bold uppercase text-gray-400">
        📍 여기서 소리가 변해요
      </div>
      <div className="p-3">
        {/* 연음 포인트별 분해 */}
        <div className="mb-3 space-y-3">
          {pronAnalysis.junction_points.map((jp, i) => (
            <div key={i} className="rounded border-2 border-gray-200 bg-gray-50 p-2.5">
              <div className="mb-1.5 flex items-baseline gap-2">
                <span className="shrink-0 text-sm font-bold text-gray-400">{i + 1}</span>
                <span className="text-base font-black text-e-black sm:text-lg">
                  {jp.original}
                </span>
              </div>
              <div className="mb-1.5 ml-5 flex items-center gap-2">
                <span className="text-gray-300">→</span>
                <span className="rounded border-2 border-purple-300 bg-purple-50 px-2 py-0.5 text-base font-black text-purple-800 sm:text-lg">
                  {jp.sounds_like}
                </span>
              </div>
              <div className="ml-5 text-sm font-bold text-gray-500">
                {jp.explanation}
              </div>
            </div>
          ))}
        </div>

        {/* 리스닝 팁 */}
        {pronAnalysis.listening_tip && (
          <div className="mb-3 rounded bg-e-yellow px-3 py-2.5">
            <div className="mb-0.5 text-xs font-black uppercase text-gray-500">🎯 리스닝 팁</div>
            <div className="text-sm font-bold text-gray-700">
              {pronAnalysis.listening_tip}
            </div>
          </div>
        )}

        {/* 패턴 태그 */}
        <div className="flex flex-wrap gap-1">
          {appliedPatterns.map((pid) => (
            <span
              key={pid}
              className="border border-e-black px-1.5 py-0.5 text-xs font-bold"
            >
              {PATTERN_META[pid].icon} {PATTERN_META[pid].name_ko}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 난이도 필터 ────────────────────────────────────────────────────────────

const DIFF_OPTIONS: { id: Difficulty; label: string; icon: string }[] = [
  { id: 'all', label: '전체', icon: '🎯' },
  { id: 2, label: '보통', icon: '🟡' },
  { id: 3, label: '어려움', icon: '🔴' },
];

function DifficultyBar({
  selected,
  onSelect,
}: {
  selected: Difficulty;
  onSelect: (d: Difficulty) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {DIFF_OPTIONS.map((opt) => (
        <button
          key={String(opt.id)}
          onClick={() => onSelect(opt.id)}
          className={`border-2 border-e-black px-3 py-1 text-xs font-black uppercase transition-colors ${
            selected === opt.id ? 'bg-e-black text-white' : 'bg-white hover:bg-e-yellow'
          }`}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── 최종 점수 ──────────────────────────────────────────────────────────────

function FinalScore({
  totalCorrect,
  totalWords,
  sentenceCount,
  onRestart,
  mode,
}: {
  totalCorrect: number;
  totalWords: number;
  sentenceCount: number;
  onRestart: () => void;
  mode: SessionMode;
}) {
  const pct = totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 0;
  const grade =
    pct >= 90
      ? '🏆 완벽한 귀!'
      : pct >= 70
        ? '👏 잘 들리고 있어요!'
        : pct >= 50
          ? '📚 연음 구간에 집중!'
          : '💪 다시 도전!';

  return (
    <div className="border-4 border-e-black bg-white p-6 text-center shadow-hard sm:p-8">
      <div className="mb-2 text-xs font-bold uppercase text-gray-400">
        {mode === 'ai' ? 'AI 약점 공략 결과' : '딕테이션 결과'}
      </div>
      <div className="mb-3 text-5xl font-black sm:mb-4 sm:text-6xl">{pct}%</div>
      <div className="mb-2 text-xl font-black sm:text-2xl">{grade}</div>
      <div className="mb-6 text-sm font-bold text-gray-500 sm:mb-8">
        {sentenceCount}문장 · 총 {totalWords}단어 중 {totalCorrect}개 정답
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={onRestart}
          className="border-4 border-e-black bg-e-red px-8 py-3 font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard"
        >
          다시 도전
        </button>
        <Link
          href="/dashboard"
          className="border-4 border-e-black bg-e-yellow px-8 py-3 font-black uppercase shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard"
        >
          📊 대시보드
        </Link>
      </div>
    </div>
  );
}

// ── AI 약점 공략 로딩 ─────────────────────────────────────────────────────

function AiLoadingState({ targetPatterns }: { targetPatterns: PatternId[] }) {
  return (
    <div className="border-4 border-e-black bg-white p-8 text-center shadow-hard">
      <div className="mb-4 text-5xl animate-pulse">🤖</div>
      <div className="mb-3 text-lg font-black">맞춤 문장 생성 중...</div>
      {targetPatterns.length > 0 && (
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {targetPatterns.map((pid) => (
            <span
              key={pid}
              className="border-2 border-e-black px-2 py-1 text-xs font-bold"
            >
              {PATTERN_META[pid].icon} {PATTERN_META[pid].name_ko}
            </span>
          ))}
        </div>
      )}
      <div className="text-sm font-bold text-gray-500">
        {targetPatterns.length > 0
          ? `${targetPatterns.length}개 약점 패턴에 맞는 문장을 생성하고 있어요`
          : '패턴을 골고루 담은 문장을 생성하고 있어요'}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export default function DictationSession() {
  const [difficulty, setDifficulty] = useState<Difficulty>('all');
  const [sentences, setSentences] = useState<DictationSentence[]>(() =>
    shuffleSentences(DICTATION_SENTENCES),
  );
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [userInput, setUserInput] = useState('');
  const [wordResults, setWordResults] = useState<WordResult[]>([]);
  const [playCount, setPlayCount] = useState(0);

  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [done, setDone] = useState(false);

  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [naturalUrl, setNaturalUrl] = useState<string | null>(null);
  const [textbookUrl, setTextbookUrl] = useState<string | null>(null);

  const [mode, setMode] = useState<SessionMode>('static');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [targetPatterns, setTargetPatterns] = useState<PatternId[]>([]);

  const [pronAnalysis, setPronAnalysis] = useState<PronunciationAnalysis | null>(null);
  const [pronLoading, setPronLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sentence = sentences[idx] as DictationSentence | undefined;

  const analysis = useMemo(
    () => (sentence ? analyzeEnlace(sentence.text) : null),
    [sentence],
  );

  // ── 발음 분석 (한국어) ────────────────────────────────────────────────

  const fetchPronunciation = useCallback(async (
    text: string,
    transformed: string,
    patternIds: string[],
  ) => {
    setPronLoading(true);
    setPronAnalysis(null);
    try {
      const res = await fetch('/api/analyze-pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, transformed, patternIds }),
      });
      if (!res.ok) return;
      const data = await res.json() as PronunciationAnalysis;
      setPronAnalysis(data);
    } catch {
      // 발음 분석 실패는 치명적이지 않으므로 무시
    } finally {
      setPronLoading(false);
    }
  }, []);

  // ── TTS ────────────────────────────────────────────────────────────────

  const fetchTts = useCallback(
    async (text: string, style: 'natural' | 'textbook' | 'dictation'): Promise<string | null> => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, style }),
        });
        if (!res.ok) throw new Error('TTS 생성 실패');
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      } catch {
        return null;
      }
    },
    [],
  );

  const playUrl = useCallback((url: string) => {
    if (!audioRef.current) return;
    audioRef.current.src = url;
    audioRef.current.play();
  }, []);

  // ── AI 문장 생성 ──────────────────────────────────────────────────────

  const startAiSession = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    setMode('ai');
    setDone(false);

    try {
      const weakPatterns = await fetchWeakPatterns();
      setTargetPatterns(weakPatterns);

      const res = await fetch('/api/generate-dictation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weakPatterns,
          count: 5,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'AI 문장 생성 실패');
      }

      const { sentences: generated } = await res.json() as {
        sentences: DictationSentence[];
      };

      if (!generated || generated.length === 0) {
        throw new Error('생성된 문장이 없습니다');
      }

      setSentences(generated);
      setIdx(0);
      setPhase('ready');
      setUserInput('');
      setWordResults([]);
      setPlayCount(0);
      setTotalCorrect(0);
      setTotalWords(0);
      setNaturalUrl(null);
      setTextbookUrl(null);
      setTtsError(null);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI 문장 생성에 실패했습니다');
      setMode('static');
    } finally {
      setAiLoading(false);
    }
  }, []);

  // ── 핸들러 ────────────────────────────────────────────────────────────

  const handlePlay = useCallback(async () => {
    if (!sentence) return;
    setTtsError(null);

    if (naturalUrl) {
      playUrl(naturalUrl);
      setPhase('listening');
      setPlayCount((c) => c + 1);
      return;
    }

    setTtsLoading(true);
    const url = await fetchTts(sentence.text, 'dictation');
    setTtsLoading(false);

    if (!url) {
      setTtsError('음성 생성에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    setNaturalUrl(url);
    playUrl(url);
    setPhase('listening');
    setPlayCount((c) => c + 1);
  }, [sentence, naturalUrl, playUrl, fetchTts]);

  const handleSlowPlay = useCallback(async () => {
    if (!sentence) return;
    if (textbookUrl) {
      playUrl(textbookUrl);
      return;
    }
    setTtsLoading(true);
    const url = await fetchTts(sentence.text, 'textbook');
    setTtsLoading(false);
    if (url) {
      setTextbookUrl(url);
      playUrl(url);
    }
  }, [sentence, textbookUrl, playUrl, fetchTts]);

  const handleSubmit = useCallback(() => {
    if (!sentence || !userInput.trim()) return;
    const results = compareWords(sentence.text, userInput.trim());
    setWordResults(results);
    const correct = results.filter((r) => r.isCorrect).length;
    setTotalCorrect((c) => c + correct);
    setTotalWords((c) => c + results.length);
    setPhase('result');

    const enlace = analyzeEnlace(sentence.text);
    if (enlace.appliedPatterns.length > 0) {
      fetchPronunciation(
        sentence.text,
        enlace.transformed,
        enlace.appliedPatterns,
      );
    }

    const score = results.length > 0 ? Math.round((correct / results.length) * 100) : 0;
    saveDictationResult({
      sentenceId: sentence.id,
      sentenceOriginal: sentence.text,
      userInput: userInput.trim(),
      correctCount: correct,
      wordCount: results.length,
      score,
      appliedPatterns: sentence.patterns,
      difficulty: sentence.difficulty,
      playCount,
    });
  }, [sentence, userInput, playCount, fetchPronunciation]);

  const handleNext = useCallback(() => {
    if (idx + 1 >= sentences.length) {
      setDone(true);
      return;
    }
    setNaturalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setTextbookUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setIdx((i) => i + 1);
    setPhase('ready');
    setUserInput('');
    setWordResults([]);
    setPlayCount(0);
    setTtsError(null);
    setPronAnalysis(null);
  }, [idx, sentences.length]);

  const startSession = useCallback((d: Difficulty) => {
    setNaturalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setTextbookUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSentences(shuffleSentences(getSentencesByDifficulty(d)));
    setDifficulty(d);
    setMode('static');
    setIdx(0);
    setPhase('ready');
    setUserInput('');
    setWordResults([]);
    setPlayCount(0);
    setTotalCorrect(0);
    setTotalWords(0);
    setDone(false);
    setTtsError(null);
    setAiError(null);
    setTargetPatterns([]);
    setPronAnalysis(null);
  }, []);

  // ── 렌더링 ────────────────────────────────────────────────────────────

  if (aiLoading) {
    return (
      <div>
        <AiLoadingState targetPatterns={targetPatterns} />
      </div>
    );
  }

  if (done) {
    return (
      <div>
        {mode === 'static' && (
          <DifficultyBar selected={difficulty} onSelect={startSession} />
        )}
        {mode === 'ai' && targetPatterns.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase text-gray-400">타겟 패턴:</span>
            {targetPatterns.map((pid) => (
              <span
                key={pid}
                className="border border-e-black px-1.5 py-0.5 text-xs font-bold"
              >
                {PATTERN_META[pid].icon} {PATTERN_META[pid].name_ko}
              </span>
            ))}
          </div>
        )}
        <FinalScore
          totalCorrect={totalCorrect}
          totalWords={totalWords}
          sentenceCount={sentences.length}
          onRestart={mode === 'ai' ? startAiSession : () => startSession(difficulty)}
          mode={mode}
        />
        <div className="mt-4 flex gap-2">
          {mode === 'ai' && (
            <button
              onClick={() => startSession('all')}
              className="flex-1 border-2 border-e-black py-2 text-xs font-black transition-colors hover:bg-e-yellow"
            >
              📝 일반 딕테이션
            </button>
          )}
          {mode === 'static' && (
            <button
              onClick={startAiSession}
              className="flex-1 border-2 border-e-black bg-gradient-to-r from-purple-500 to-pink-500 py-2 text-xs font-black text-white transition-all hover:-translate-y-0.5"
            >
              🤖 AI 약점 공략
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!sentence) return null;

  const correctCount = wordResults.filter((r) => r.isCorrect).length;
  const isPerfect = wordResults.length > 0 && correctCount === wordResults.length;

  return (
    <div>
      <audio ref={audioRef} className="hidden" />

      {/* 모드 선택 바 */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => startSession('all')}
          className={`flex-1 border-2 border-e-black px-3 py-2 text-xs font-black uppercase transition-colors ${
            mode === 'static' ? 'bg-e-black text-white' : 'bg-white hover:bg-e-yellow'
          }`}
        >
          📝 일반 딕테이션
        </button>
        <button
          onClick={startAiSession}
          className={`flex-1 border-2 border-e-black px-3 py-2 text-xs font-black uppercase transition-colors ${
            mode === 'ai'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              : 'bg-white hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100'
          }`}
        >
          🤖 AI 약점 공략
        </button>
      </div>

      {mode === 'static' && (
        <DifficultyBar selected={difficulty} onSelect={startSession} />
      )}

      {/* AI 타겟 패턴 표시 */}
      {mode === 'ai' && targetPatterns.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 border-2 border-purple-300 bg-purple-50 px-3 py-2">
          <span className="text-xs font-black text-purple-700">약점 타겟:</span>
          {targetPatterns.map((pid) => (
            <span
              key={pid}
              className="border border-purple-400 bg-white px-1.5 py-0.5 text-xs font-bold text-purple-700"
            >
              {PATTERN_META[pid].icon} {PATTERN_META[pid].name_ko}
            </span>
          ))}
        </div>
      )}

      {aiError && (
        <div className="mb-4 border-2 border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {aiError}
        </div>
      )}

      {/* 진행 상황 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-bold text-gray-500">
          {idx + 1} / {sentences.length} 문장
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-400">난이도</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-4 border border-e-black ${
                  i < sentence.difficulty ? 'bg-e-black' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 스텝 도트 프로그레스 */}
      <div className="mb-6 flex items-center gap-1.5">
        {sentences.map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 border-2 border-e-black transition-all ${
              i < idx
                ? 'bg-e-black'
                : i === idx
                  ? 'bg-e-red'
                  : 'bg-gray-100'
            }`}
          />
        ))}
      </div>

      {/* 메인 카드 */}
      <div className="border-4 border-e-black bg-white shadow-hard">
        {/* 카드 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-e-black p-3 sm:p-4">
          <span className={`border-2 px-2 py-0.5 text-xs font-bold uppercase text-white ${
            mode === 'ai'
              ? 'border-purple-700 bg-gradient-to-r from-purple-600 to-pink-600'
              : 'border-e-black bg-e-black'
          }`}>
            {mode === 'ai' ? 'AI 딕테이션' : '딕테이션'}
          </span>
          {phase === 'result' && (
            <div className="flex flex-wrap gap-1">
              {sentence.patterns.map((pid) => (
                <span
                  key={pid}
                  className="border border-e-black px-1 py-0.5 text-[10px] font-bold sm:px-1.5 sm:text-xs"
                >
                  {PATTERN_META[pid].icon} {PATTERN_META[pid].name_ko}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6">
          {/* ── 준비 ── */}
          {phase === 'ready' && (
            <div className="py-6 text-center sm:py-8">
              <div className="mb-3 text-4xl sm:mb-4 sm:text-5xl">{mode === 'ai' ? '🤖' : '🎧'}</div>
              <div className="mb-4 text-sm font-bold text-gray-500 sm:mb-6">
                재생 버튼을 누르고, 들리는 대로 받아쓰세요
              </div>
              <button
                onClick={handlePlay}
                disabled={ttsLoading}
                className="border-4 border-e-black bg-e-red px-6 py-3 text-base font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard disabled:opacity-50 sm:px-8 sm:py-4 sm:text-lg"
              >
                {ttsLoading ? '음성 생성 중...' : '▶ 재생'}
              </button>
              {ttsError && (
                <p className="mt-3 text-sm font-bold text-e-red">{ttsError}</p>
              )}
            </div>
          )}

          {/* ── 듣기 + 입력 ── */}
          {phase === 'listening' && (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={handlePlay}
                  disabled={ttsLoading}
                  className="border-4 border-e-black bg-e-black px-4 py-2 font-black text-white transition-all hover:bg-e-red disabled:opacity-50"
                >
                  {ttsLoading ? '...' : '🔊 다시 듣기'}
                </button>
                <span className="text-xs font-bold text-gray-400">
                  {playCount}회 재생
                </span>
              </div>

              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                className="w-full resize-none border-4 border-e-black px-3 py-2 text-base font-bold focus:bg-e-yellow focus:outline-none sm:px-4 sm:py-3 sm:text-xl"
                rows={2}
                placeholder="들리는 대로 쓰세요..."
                autoFocus
              />

              <button
                onClick={handleSubmit}
                disabled={!userInput.trim()}
                className="mt-3 w-full border-4 border-e-black bg-e-red py-3 font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard disabled:opacity-30"
              >
                확인
              </button>
            </div>
          )}

          {/* ── 결과 ── */}
          {phase === 'result' && (
            <div>
              {/* 점수 */}
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`text-3xl font-black ${
                    isPerfect ? 'text-green-600' : 'text-e-red'
                  }`}
                >
                  {correctCount}/{wordResults.length}
                </div>
                <div className="text-sm font-bold text-gray-500">
                  {isPerfect ? '완벽!' : '단어 정답'}
                </div>
              </div>

              {/* 단어별 비교 */}
              <div className="mb-4 border-4 border-e-black p-3 sm:p-4">
                <div className="mb-2 text-xs font-bold uppercase text-gray-400">
                  정답
                </div>
                <div className="mb-3 flex flex-wrap gap-1 text-base font-bold sm:text-xl">
                  {wordResults.map((wr, i) => (
                    <span
                      key={i}
                      className={`rounded px-1 py-0.5 sm:px-1.5 ${
                        wr.isCorrect
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {wr.correct}
                    </span>
                  ))}
                </div>

                {!isPerfect && (
                  <>
                    <div className="mb-2 text-xs font-bold uppercase text-gray-400">
                      내 답
                    </div>
                    <div className="flex flex-wrap gap-1 text-base font-bold sm:text-xl">
                      {wordResults.map((wr, i) => (
                        <span
                          key={i}
                          className={`rounded px-1 py-0.5 sm:px-1.5 ${
                            wr.isCorrect
                              ? 'text-green-700'
                              : 'bg-red-50 text-red-400 line-through'
                          }`}
                        >
                          {wr.userWord ?? '___'}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 연음 포인트 분석 */}
              {analysis && analysis.appliedPatterns.length > 0 && (
                <PronunciationGuide
                  analysis={pronAnalysis}
                  loading={pronLoading}
                  appliedPatterns={analysis.appliedPatterns}
                />
              )}

              {/* 한국어 의미 */}
              <div className="mb-4 text-sm font-bold text-gray-500">
                💡 {sentence.hint_ko}
              </div>

              {/* 다시 듣기 버튼 */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={handlePlay}
                  disabled={ttsLoading}
                  className="flex-1 border-2 border-e-black py-2 text-xs font-black transition-colors hover:bg-e-yellow disabled:opacity-50"
                >
                  🗣️ 자연 속도
                </button>
                <button
                  onClick={handleSlowPlay}
                  disabled={ttsLoading}
                  className="flex-1 border-2 border-e-black py-2 text-xs font-black transition-colors hover:bg-e-yellow disabled:opacity-50"
                >
                  📖 또박또박
                </button>
              </div>

              {/* 다음 */}
              <button
                onClick={handleNext}
                className="w-full border-4 border-e-black bg-e-black py-3 font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:bg-e-red hover:shadow-hard"
              >
                {idx + 1 >= sentences.length ? '결과 보기 →' : '다음 문장 →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
