import { createClient } from '@supabase/supabase-js';
import type { PatternId } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DictationResultRow {
  id: string;
  created_at: string;
  sentence_id: string;
  sentence_original: string;
  user_input: string;
  correct_count: number;
  word_count: number;
  score: number;
  applied_patterns: string[];
  difficulty: number;
  play_count: number;
}

export interface PatternAccuracy {
  pattern: string;
  totalWords: number;
  correctWords: number;
  accuracy: number;
  attempts: number;
}

export async function saveDictationResult(params: {
  sentenceId: string;
  sentenceOriginal: string;
  userInput: string;
  correctCount: number;
  wordCount: number;
  score: number;
  appliedPatterns: string[];
  difficulty: number;
  playCount: number;
}): Promise<boolean> {
  const { error } = await supabase.from('dictation_results').insert({
    sentence_id: params.sentenceId,
    sentence_original: params.sentenceOriginal,
    user_input: params.userInput,
    correct_count: params.correctCount,
    word_count: params.wordCount,
    score: params.score,
    applied_patterns: params.appliedPatterns,
    difficulty: params.difficulty,
    play_count: params.playCount,
  });
  return !error;
}

export async function fetchPatternAccuracy(): Promise<PatternAccuracy[]> {
  const { data, error } = await supabase
    .from('dictation_results')
    .select('applied_patterns, correct_count, word_count');

  if (error || !data) return [];

  const map = new Map<string, { totalWords: number; correctWords: number; attempts: number }>();

  for (const row of data) {
    const patterns: string[] = row.applied_patterns ?? [];
    for (const p of patterns) {
      const existing = map.get(p) ?? { totalWords: 0, correctWords: 0, attempts: 0 };
      existing.totalWords += row.word_count;
      existing.correctWords += row.correct_count;
      existing.attempts += 1;
      map.set(p, existing);
    }
  }

  return Array.from(map.entries()).map(([pattern, stats]) => ({
    pattern,
    totalWords: stats.totalWords,
    correctWords: stats.correctWords,
    accuracy: stats.totalWords > 0 ? Math.round((stats.correctWords / stats.totalWords) * 100) : 0,
    attempts: stats.attempts,
  }));
}

export async function fetchRecentResults(limit = 20): Promise<DictationResultRow[]> {
  const { data, error } = await supabase
    .from('dictation_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as DictationResultRow[];
}

export async function fetchWeakPatterns(
  threshold = 70,
  minAttempts = 2,
): Promise<PatternId[]> {
  const accuracies = await fetchPatternAccuracy();
  if (accuracies.length === 0) {
    return ['sinalefa', 'resilabificacion', 'espirantizacion'];
  }

  const weak = accuracies
    .filter((a) => a.attempts >= minAttempts && a.accuracy < threshold)
    .sort((a, b) => a.accuracy - b.accuracy)
    .map((a) => a.pattern as PatternId);

  if (weak.length === 0) {
    const sorted = [...accuracies].sort((a, b) => a.accuracy - b.accuracy);
    return sorted.slice(0, 3).map((a) => a.pattern as PatternId);
  }

  return weak.slice(0, 4);
}

export async function fetchDifficultyStats(): Promise<
  { difficulty: number; avgScore: number; count: number }[]
> {
  const { data, error } = await supabase
    .from('dictation_results')
    .select('difficulty, correct_count, word_count');

  if (error || !data) return [];

  const map = new Map<number, { totalScore: number; count: number }>();

  for (const row of data) {
    const d = row.difficulty ?? 1;
    const existing = map.get(d) ?? { totalScore: 0, count: 0 };
    const score = row.word_count > 0 ? (row.correct_count / row.word_count) * 100 : 0;
    existing.totalScore += score;
    existing.count += 1;
    map.set(d, existing);
  }

  return Array.from(map.entries())
    .map(([difficulty, stats]) => ({
      difficulty,
      avgScore: stats.count > 0 ? Math.round(stats.totalScore / stats.count) : 0,
      count: stats.count,
    }))
    .sort((a, b) => a.difficulty - b.difficulty);
}
