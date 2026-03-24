/**
 * Spanish → Korean phonetic transcription (rule-based, Castilian Madrid)
 * Used to compute junction_points.sounds_like server-side
 * instead of relying on GPT (which hallucinates Korean phonetics)
 */

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u')
    .replace(/[¿¡?!.,;:'"()\-«»]/g, '');
}

const isV = (c: string) => 'aeiou'.includes(c);

// ── Syllable helpers ────────────────────────────────────────────────────────

// Korean syllable: onset(자음) + vowel
const CV: Record<string, Record<string, string>> = {
  '': { a:'아', e:'에', i:'이', o:'오', u:'우' },
  b: { a:'바', e:'베', i:'비', o:'보', u:'부' },
  p: { a:'빠', e:'뻬', i:'삐', o:'뽀', u:'뿌' },   // p → fortis
  d: { a:'다', e:'데', i:'디', o:'도', u:'두' },
  t: { a:'따', e:'떼', i:'띠', o:'또', u:'뚜' },   // t → fortis
  g: { a:'가', e:'게', i:'기', o:'고', u:'구' },
  k: { a:'까', e:'께', i:'끼', o:'꼬', u:'꾸' },   // c/k/q → fortis
  m: { a:'마', e:'메', i:'미', o:'모', u:'무' },
  n: { a:'나', e:'네', i:'니', o:'노', u:'누' },
  l: { a:'라', e:'레', i:'리', o:'로', u:'루' },
  r: { a:'라', e:'레', i:'리', o:'로', u:'루' },
  s: { a:'사', e:'세', i:'시', o:'소', u:'수' },
  f: { a:'파', e:'페', i:'피', o:'포', u:'푸' },
  j: { a:'하', e:'헤', i:'히', o:'호', u:'후' },   // j/ge/gi → 흐-
  ch:{ a:'차', e:'체', i:'치', o:'초', u:'추' },
  ny:{ a:'냐', e:'녜', i:'니', o:'뇨', u:'뉴' },   // ñ
  ll:{ a:'야', e:'예', i:'이', o:'요', u:'유' },   // ll/y
  v: { a:'바', e:'베', i:'비', o:'보', u:'부' },
  z: { a:'사', e:'세', i:'시', o:'소', u:'수' },   // z → s (Castilian θ → ㅅ simplified)
};

// coda (받침) when consonant appears at syllable end
const CODA: Record<string, string> = {
  n: 'ㄴ', m: 'ㅁ', l: 'ㄹ', r: 'ㄹ', s: 'ㅅ',
};

function syllable(onset: string, vowel: string): string {
  return (CV[onset] ?? CV[''])[vowel] ?? '?';
}

// ── Word-level conversion ───────────────────────────────────────────────────

export function wordToKo(rawWord: string): string {
  let w = norm(rawWord);
  if (!w) return '';

  // 1. d-elision: -ado/-ada/-ido/-ida
  w = w.replace(/ado\b/g, 'ao').replace(/ada\b/g, 'aa').replace(/idas?\b/g, 'ia');
  w = w.replace(/ido\b/g, 'io');
  // Word-final d → drop
  w = w.replace(/d$/g, '');

  let result = '';
  let i = 0;

  while (i < w.length) {
    const c = w[i];

    // ── silent h ──────────────────────────────────────────────────────────
    if (c === 'h') { i++; continue; }

    // ── digraphs & special combos ─────────────────────────────────────────
    const two = w.slice(i, i + 2);
    const three = w.slice(i, i + 3);

    // rr → 르르
    if (two === 'rr') { result += '르르'; i += 2; continue; }
    // ch
    if (two === 'ch') {
      const nxt = w[i + 2];
      if (nxt && isV(nxt)) { result += syllable('ch', nxt); i += 3; }
      else { result += '취'; i += 2; }
      continue;
    }
    // ll
    if (two === 'll') {
      const nxt = w[i + 2];
      if (nxt && isV(nxt)) { result += syllable('ll', nxt); i += 3; }
      else { result += '이'; i += 2; }
      continue;
    }
    // ñ
    if (c === 'ñ') {
      const nxt = w[i + 1];
      if (nxt && isV(nxt)) { result += syllable('ny', nxt); i += 2; }
      else { result += '냐'; i++; }
      continue;
    }
    // qu + e/i → ㄲ
    if (two === 'qu' && w[i + 2] && 'ei'.includes(w[i + 2])) {
      result += syllable('k', w[i + 2]); i += 3; continue;
    }
    // gu + e/i → g (u silent)
    if (two === 'gu' && w[i + 2] && 'ei'.includes(w[i + 2])) {
      result += syllable('g', w[i + 2]); i += 3; continue;
    }
    // ge/gi → j (흐 sound)
    if (c === 'g' && w[i + 1] && 'ei'.includes(w[i + 1])) {
      result += syllable('j', w[i + 1]); i += 2; continue;
    }
    // x → ㄱㅅ (before vowel) or 흐
    if (c === 'x') {
      const nxt = w[i + 1];
      if (nxt && isV(nxt)) { result += '흐' + syllable('', nxt); i += 2; }
      else { result += '흐'; i++; }
      continue;
    }

    // ── vowels ────────────────────────────────────────────────────────────
    if (isV(c)) {
      const nxt = w[i + 1];
      // diphthong: ia/ie/io/iu → 야/예/요/유
      if (c === 'i' && nxt && isV(nxt) && nxt !== 'i') {
        const dipMap: Record<string, string> = { a:'야', e:'예', o:'요', u:'유' };
        result += dipMap[nxt] ?? syllable('', nxt);
        i += 2; continue;
      }
      // ua/ue/ui/uo → 와/웨/위/워
      if (c === 'u' && nxt && isV(nxt)) {
        const dipMap: Record<string, string> = { a:'와', e:'웨', i:'위', o:'워' };
        result += dipMap[nxt] ?? syllable('', nxt);
        i += 2; continue;
      }
      result += syllable('', c); i++; continue;
    }

    // ── consonants ────────────────────────────────────────────────────────
    const nxt = w[i + 1];

    // c before a/o/u → ㄲ; c before e/i → s
    if (c === 'c') {
      if (nxt && 'aou'.includes(nxt)) { result += syllable('k', nxt); i += 2; }
      else if (nxt && 'ei'.includes(nxt)) { result += syllable('s', nxt); i += 2; }
      else { result += 'ㄱ'; i++; }
      continue;
    }
    // p → ㅃ (fortis)
    if (c === 'p') {
      if (nxt && isV(nxt)) { result += syllable('p', nxt); i += 2; }
      else { result += '쁘'; i++; }
      continue;
    }
    // t → ㄸ (fortis)
    if (c === 't') {
      if (nxt && isV(nxt)) { result += syllable('t', nxt); i += 2; }
      else { result += '뜨'; i++; }
      continue;
    }
    // j → 흐
    if (c === 'j') {
      if (nxt && isV(nxt)) { result += syllable('j', nxt); i += 2; }
      else { result += '흐'; i++; }
      continue;
    }
    // y → ll-sound
    if (c === 'y') {
      if (nxt && isV(nxt)) { result += syllable('ll', nxt); i += 2; }
      else { result += '이'; i++; }
      continue;
    }
    // z → s
    if (c === 'z') {
      if (nxt && isV(nxt)) { result += syllable('s', nxt); i += 2; }
      else { result += '스'; i++; }
      continue;
    }
    // Standard consonants before vowel
    if (nxt && isV(nxt) && CV[c]) {
      result += syllable(c, nxt); i += 2; continue;
    }
    // Consonant before consonant or end → coda
    if (CODA[c]) {
      // Will be appended to previous syllable as ㄹ/ㄴ etc.
      // Simplified: just append standalone
      result += CODA[c]; i++; continue;
    }
    // Fallback
    if (CV[c]) { result += CV[c]['a'].slice(0, 1); } // rough fallback
    i++;
  }

  return result;
}

// ── Phrase-level: apply inter-word linking ─────────────────────────────────

export function spanishPhraseToKo(phrase: string): string {
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return wordToKo(words[0]);

  const koWords = words.map(wordToKo);
  let result = koWords[0];

  for (let i = 0; i < words.length - 1; i++) {
    const w1 = norm(words[i]);
    const w2 = norm(words[i + 1]);
    if (!w1 || !w2) { result += koWords[i + 1]; continue; }

    // h는 묵음이므로 w2의 실질 첫 글자 확인
    const w2eff = w2.replace(/^h/, '');
    const last1 = w1[w1.length - 1];
    const first2 = w2eff[0];

    // Sinalefa / resilabificacion: 그냥 붙임
    if (isV(last1) || isV(first2)) {
      result += koWords[i + 1]; // already joined (no space)
    } else {
      result += ' ' + koWords[i + 1];
    }
  }

  return result;
}
