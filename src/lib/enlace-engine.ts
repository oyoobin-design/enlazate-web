import type { PatternId, Segment, SegmentType, EnlaceAnalysis } from '@/types';

const VOWELS = new Set('aeiouáéíóúAEIOUÁÉÍÓÚ');

const isVowel = (c: string): boolean => VOWELS.has(c);
const isLetter = (c: string): boolean => /[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/i.test(c);

export function analyzeEnlace(text: string): EnlaceAnalysis {
  if (!text.trim()) {
    return { original: text, segments: [], transformed: '', appliedPatterns: [] };
  }

  const chars = Array.from(text);
  const segs: Segment[] = chars.map((c) => ({
    original: c,
    display: c,
    type: (c === ' ' ? 'space' : 'normal') as SegmentType,
  }));

  const applied = new Set<PatternId>();

  // ── Rule 1: -ado/-ada d deletion ────────────────────────────────────────
  // e.g. "cansado" → "cansao", "estado" → "estao"
  for (let i = 1; i < chars.length - 1; i++) {
    if (chars[i].toLowerCase() !== 'd') continue;
    if (segs[i].type !== 'normal') continue;

    const prev = chars[i - 1].toLowerCase();
    const next = chars[i + 1].toLowerCase();

    if (prev === 'a' && (next === 'o' || next === 'a')) {
      if (i >= 2 && isLetter(chars[i - 2])) {
        segs[i] = {
          original: chars[i],
          display: '',
          type: 'deleted',
          patternId: 'perdida_d',
          tooltip: '-ado/-ada에서 d 탈락 → "cansado" → "cansao"',
        };
        applied.add('perdida_d');
      }
    }
  }

  // ── Rule 2: Word-final /d/ deletion (after vowel) ───────────────────────
  // e.g. "verdad" → "verdá", "ciudad" → "ciudá"
  for (let i = 0; i < chars.length; i++) {
    if (chars[i].toLowerCase() !== 'd') continue;
    if (segs[i].type !== 'normal') continue;

    if (i > 0 && isVowel(chars[i - 1])) {
      const isWordEnd = i === chars.length - 1 || !isLetter(chars[i + 1]);
      if (isWordEnd) {
        segs[i] = {
          original: chars[i],
          display: '',
          type: 'deleted',
          patternId: 'elision_d_final',
          tooltip: '어말 d 약화/탈락 → "verdad" → "verdá"',
        };
        applied.add('elision_d_final');
      }
    }
  }

  // ── Rule 3: Espirantización — b/d/g between vowels ─────────────────────
  // e.g. "acabado" → "aca[β]a[ð]o", "un amigo" → "un ami[ɣ]o"
  for (let i = 1; i < chars.length - 1; i++) {
    const c = chars[i].toLowerCase();
    if (!['b', 'd', 'g'].includes(c)) continue;
    if (segs[i].type !== 'normal') continue;

    // Find nearest non-deleted neighbour to the left
    let prevIdx = i - 1;
    while (prevIdx >= 0 && segs[prevIdx].type === 'deleted') prevIdx--;

    // Find nearest non-deleted neighbour to the right
    let nextIdx = i + 1;
    while (nextIdx < chars.length && segs[nextIdx].type === 'deleted') nextIdx++;

    if (
      prevIdx >= 0 &&
      nextIdx < chars.length &&
      isVowel(chars[prevIdx]) &&
      isVowel(chars[nextIdx])
    ) {
      const fricative = c === 'b' ? '[β]' : c === 'd' ? '[ð]' : '[ɣ]';
      segs[i] = {
        original: chars[i],
        display: fricative,
        type: 'weakened',
        patternId: 'espirantizacion',
        tooltip: `${chars[i]} → ${fricative}: 모음 사이에서 마찰음으로 약화 (espirantización)`,
      };
      applied.add('espirantizacion');
    }
  }

  // ── Rule 4: Nasal assimilation — n before bilabials at word boundary ────
  // e.g. "un poco" → "um poco", "en Barcelona" → "em Barcelona"
  for (let i = 0; i < chars.length - 1; i++) {
    if (chars[i].toLowerCase() !== 'n') continue;
    if (segs[i].type !== 'normal') continue;

    // Must be at word end (followed by space)
    if (chars[i + 1] !== ' ') continue;

    // Find next non-space letter
    let j = i + 2;
    while (j < chars.length && chars[j] === ' ') j++;

    if (j < chars.length && ['b', 'p', 'm'].includes(chars[j].toLowerCase())) {
      segs[i] = {
        original: chars[i],
        display: 'm',
        type: 'assimilated',
        patternId: 'asimilacion_nasal',
        tooltip: `n → m [m]: '${chars[j]}' 앞에서 양순음 동화 (nasal assimilation)`,
      };
      applied.add('asimilacion_nasal');
    }
  }

  // ── Rule 5: Sinalefa — vowel-ending word + vowel-starting word ──────────
  // e.g. "vamos a estar" space between 'a' and 'estar' → linked
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== ' ') continue;
    if (segs[i].type !== 'space') continue;

    let prevIdx = i - 1;
    while (prevIdx >= 0 && chars[prevIdx] === ' ') prevIdx--;

    let nextIdx = i + 1;
    while (nextIdx < chars.length && chars[nextIdx] === ' ') nextIdx++;

    if (
      prevIdx >= 0 &&
      nextIdx < chars.length &&
      isVowel(chars[prevIdx]) &&
      isVowel(chars[nextIdx]) &&
      segs[prevIdx].type !== 'deleted'
    ) {
      segs[i] = {
        original: ' ',
        display: '',
        type: 'linked',
        patternId: 'sinalefa',
        tooltip: '모음 연결 (Sinalefa): 단어 경계 모음이 이어짐',
      };
      applied.add('sinalefa');
    }
  }

  // ── Rule 6: Resilabificación — consonant-ending word + vowel-starting word
  // e.g. "un amigo" → 'n' flows into 'a' onset
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== ' ') continue;
    if (segs[i].type !== 'space') continue;

    let prevIdx = i - 1;
    while (prevIdx >= 0 && chars[prevIdx] === ' ') prevIdx--;

    let nextIdx = i + 1;
    while (nextIdx < chars.length && chars[nextIdx] === ' ') nextIdx++;

    if (
      prevIdx >= 0 &&
      nextIdx < chars.length &&
      isLetter(chars[prevIdx]) &&
      !isVowel(chars[prevIdx]) &&
      isVowel(chars[nextIdx]) &&
      segs[prevIdx].type === 'normal'
    ) {
      segs[i] = {
        original: ' ',
        display: '',
        type: 'linked',
        patternId: 'resilabificacion',
        tooltip: `재음절화: '${chars[prevIdx]}'이 다음 단어 초성으로 이동`,
      };
      segs[prevIdx] = {
        ...segs[prevIdx],
        type: 'linked',
        patternId: 'resilabificacion',
        tooltip: `재음절화: 이 자음이 다음 단어 '${chars[nextIdx]}'의 초성으로 이동`,
      };
      applied.add('resilabificacion');
    }
  }

  // Mark encadenamiento if 3+ patterns applied simultaneously
  if (applied.size >= 3) {
    applied.add('encadenamiento');
  }

  const transformed = segs.map((s) => s.display).join('');

  return {
    original: text,
    segments: segs,
    transformed,
    appliedPatterns: [...applied],
  };
}

// Quick examples for UI
export const EXAMPLE_PHRASES = [
  { text: 'vamos a estar', label: '모음연결+재음절화' },
  { text: 'un amigo', label: '재음절화+마찰음화' },
  { text: 'cansado', label: 'd 탈락' },
  { text: 'verdad', label: '어말 d 탈락' },
  { text: 'muchas gracias', label: '재음절화' },
  { text: 'Dónde está', label: '모음연결' },
  { text: 'un poco de agua', label: '연쇄 축약' },
];
