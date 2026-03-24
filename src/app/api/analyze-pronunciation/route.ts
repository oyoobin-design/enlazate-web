import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import enlaceRules from '@/lib/enlace-rules.json';
import { spanishPhraseToKo } from '@/lib/spanish-to-ko';
import { requireAuth } from '@/lib/supabase/require-auth';
import { checkRateLimit } from '@/lib/supabase/rate-limit';

interface AnalysisRequest {
  text: string;
  transformed: string;
  patternIds: string[];
}

interface JunctionPoint {
  original: string;
  sounds_like: string;
  explanation: string;
}

interface PronunciationResult {
  textbook_ko: string;
  real_ko: string;
  explain: string;
  translation_ko: string;
  junction_points: JunctionPoint[];
  listening_tip: string;
}

interface GptResult {
  textbook_ko: string;
  explain: string;
  translation_ko: string;
  junction_points: JunctionPoint[];
  listening_tip: string;
}

interface DbExample {
  text: string;
  textbook_ko: string;
  real_ko: string;
  applied_rules: string[];
}

interface DbPattern {
  id: string;
  examples: DbExample[];
}

// 앱 패턴 ID → DB 패턴 ID 매핑
const PATTERN_ID_MAP: Record<string, string> = {
  sinalefa: 'sinalefa',
  resilabificacion: 'resilabificacion',
  espirantizacion: 'espirantizacion',
  perdida_d: 'd_elision',
  asimilacion_nasal: 'asimilacion_nasal',
  elision_d_final: 'elision_final',
  encadenamiento: 'encadenamiento',
};

function getFewShotExamples(patternIds: string[]): string {
  const patterns = enlaceRules.patterns as DbPattern[];
  const patternMap = new Map(patterns.map((p) => [p.id, p]));

  const lines: string[] = [];

  for (const appId of patternIds) {
    const dbId = PATTERN_ID_MAP[appId] ?? appId;
    const pattern = patternMap.get(dbId);
    if (!pattern) continue;

    const examples = pattern.examples
      .filter((e) => e.textbook_ko && e.real_ko && !e.real_ko.includes('('))
      .slice(0, 2);

    for (const ex of examples) {
      lines.push(
        `  입력: "${ex.text}" → textbook_ko: "${ex.textbook_ko}"`,
      );
    }
  }

  return lines.join('\n');
}

// ── real_ko 서버사이드 생성 ─────────────────────────────────────────────────
// GPT에 맡기지 않고, 스페인어 단어 경계 규칙으로 직접 계산

const VOWELS = /[aeiouáéíóúü]/i;

function cleanWord(w: string): string {
  return w.replace(/[¿¡?!.,;:'"()«»\-]/g, '').toLowerCase();
}

function endsInVowel(word: string): boolean {
  const c = cleanWord(word);
  return c.length > 0 && VOWELS.test(c[c.length - 1]);
}

function startsWithVowelSound(word: string): boolean {
  const c = cleanWord(word);
  if (c.length === 0) return false;
  // h는 묵음이므로 ha/he/hi/ho/hu도 모음 시작으로 처리
  if (c[0] === 'h') return c.length > 1 && VOWELS.test(c[1]);
  return VOWELS.test(c[0]);
}

/** 두 스페인어 단어 사이에 연음(sinalefa / resilabificacion)이 일어나는지 */
function shouldLink(word1: string, word2: string): boolean {
  if (!word1 || !word2) return false;
  // 앞 단어 모음 끝 + 뒤 단어 모음 시작 → sinalefa
  // 앞 단어 자음 끝 + 뒤 단어 모음 시작 → resilabificacion
  return startsWithVowelSound(word2);
}

/**
 * textbook_ko(슬래시 구분) + 원문 스페인어를 받아
 * 연음 경계는 붙이고 그 외는 공백으로 구분된 real_ko 반환
 */
function buildRealKo(spanishText: string, textbookKo: string): string {
  const spWords = spanishText.trim().split(/\s+/).filter(Boolean);
  const koWords = textbookKo.split('/').map((w) => w.trim()).filter(Boolean);

  // 단어 수가 안 맞으면 단순 결합
  if (spWords.length !== koWords.length || koWords.length === 0) {
    return koWords.join(' ');
  }

  let result = koWords[0];
  for (let i = 0; i < spWords.length - 1; i++) {
    if (shouldLink(spWords[i], spWords[i + 1])) {
      result += koWords[i + 1];
    } else {
      result += ' ' + koWords[i + 1];
    }
  }

  return result;
}

function safeParse(raw: string): GptResult | null {
  try {
    return JSON.parse(raw) as GptResult;
  } catch {
    const patched = raw.replace(/,\s*([}\]])/g, '$1');
    try { return JSON.parse(patched) as GptResult; } catch { /* pass */ }

    const partialMatch = raw.match(/"junction_points"\s*:\s*\[/);
    if (partialMatch) {
      const truncated = raw.slice(0, raw.lastIndexOf('}'));
      try { return JSON.parse(truncated + '"}]}') as GptResult; } catch { /* pass */ }
    }
    return null;
  }
}

const MAX_INPUT_LENGTH = 300;

export async function POST(req: NextRequest) {
  const { user, response: authError } = await requireAuth();
  if (authError) return authError;

  const { response: limitError, increment } = await checkRateLimit(req, user!.id, 'analyze-pronunciation');
  if (limitError) return limitError;

  try {
    const { text, transformed, patternIds } = (await req.json()) as AnalysisRequest;

    if (!text?.trim()) {
      return NextResponse.json({ error: '텍스트가 필요합니다' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY 없음' }, { status: 500 });
    }

    const inputText = text.length > MAX_INPUT_LENGTH
      ? text.slice(0, MAX_INPUT_LENGTH).replace(/\s\S*$/, '')
      : text;
    const inputTransformed = transformed.length > MAX_INPUT_LENGTH
      ? transformed.slice(0, MAX_INPUT_LENGTH).replace(/\s\S*$/, '')
      : transformed;

    const fewShotBlock = getFewShotExamples(patternIds);

    const openai = new OpenAI({ apiKey });

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `너는 스페인어 음성학 코치야. 한국인 학습자가 "왜 이 부분이 안 들렸는지" 바로 이해할 수 있도록, 소리가 변하는 지점을 콕 집어서 설명해.

핵심 원칙:
- 소리가 변하는 단어 경계를 2~4개 짚어서, 각각 뭐가 어떻게 바뀌는지 보여줘.
- 설명은 친구한테 말하듯이 구어체로.
- 마지막에 다시 들을 때 실질적으로 도움 되는 리스닝 팁 하나를 줘.
- 반드시 유효한 JSON으로만 응답해.`,
        },
        {
          role: 'user',
          content: `스페인어 문장에서 소리가 변하는 지점을 분석해줘.

원문: "${inputText}"
연음 적용 후: "${inputTransformed}"
적용된 연음 규칙: ${patternIds.length > 0 ? patternIds.join(', ') : '없음'}

${fewShotBlock ? `【DB 기반 textbook_ko 예시】\n${fewShotBlock}\n` : ''}
JSON으로만 답해 (real_ko 필드는 없음):
{
  "textbook_ko": "원문 각 단어를 한국어로 표기, 슬래시(/)로 구분. 단어 수가 원문과 반드시 같아야 함. 예: 'vamos a estar' → '바모스 / 아 / 에스따르'",
  "explain": "어떤 변화가 일어나는지 한 문장 (구어체, 최대 60자)",
  "translation_ko": "한국어 의역 (한 문장, 최대 60자)",
  "junction_points": [
    {
      "original": "변하는 2~3단어 구간 (스페인어 원문)",
      "sounds_like": "해당 구간이 어떻게 들리는지 한글로만. 예: '바모사'",
      "explanation": "왜 이렇게 들리는지 한 줄 (최대 40자)"
    }
  ],
  "listening_tip": "다시 들을 때 실전 팁 한 줄 (최대 60자)"
}

한글 표기 규칙 (반드시 준수):
- textbook_ko: 슬래시(/) 구분, 단어 수 = 원문 단어 수. 한글만.
- sounds_like: 해당 구간이 실제로 어떻게 들리는지 한글만. IPA/스페인어 철자 금지.
  ※ 교과서 발음을 그대로 반복하지 말 것. 반드시 연음이 적용된 실제 소리를 써야 함.
- junction_points 2~4개.

자음 표기:
- p/t/c(k)/qu → ㅃ/ㄸ/ㄲ (예: pero→뻬로, todo→또도, que→께)
- b/v → ㅂ (어두) 또는 거의 안 들림 (모음 사이)
- j/g(e,i) → 흐 (예: gente→헨떼)
- ll/y → 야/예/요/유, ñ → 뇨/냐
- r(단) → ㄹ, rr(강) → 르르

연음 패턴별 sounds_like 규칙 (핵심):
- d 탈락(d_elision/perdida_d): 모음 사이 d 소멸. -ado→-ao, -ido→-io, -ada→-aa(-아)
  예: sido→시오, aprobado→아프로바오, nada→나아(나)
- 연쇄(encadenamiento): 앞 단어 자음이 뒤 모음에 붙어 음절 재구성
  예: por ella→포렐랴, por la→포를라, con él→꼬넬
- 시날레파(sinalefa): 모음+모음 경계가 붙음
  예: va a estar→바아에스따르→바에스따르, lo hago→로아고
- 마찰음화(espirantización): b/d/g가 모음 사이서 약하게 남거나 사라짐
  예: saber→사베르(b 약함), todo→토도(d 약함)`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1200,
      temperature: 0.2,
    });

    const rawContent = res.choices[0].message.content ?? '{}';
    const truncated = res.choices[0].finish_reason === 'length';

    const gpt = safeParse(rawContent);

    if (!gpt) {
      if (truncated) {
        return NextResponse.json(
          { error: '문장이 너무 길어서 분석이 잘렸습니다. 더 짧은 구간을 선택해주세요.' },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { error: '발음 분석 결과를 파싱할 수 없습니다. 다시 시도해주세요.' },
        { status: 500 },
      );
    }

    // real_ko는 서버에서 직접 계산
    const real_ko = buildRealKo(inputText, gpt.textbook_ko);

    // junction_points.sounds_like도 서버에서 직접 계산 (GPT 한글 표기 오류 방지)
    const junction_points = gpt.junction_points.map((jp) => ({
      ...jp,
      sounds_like: spanishPhraseToKo(jp.original),
    }));

    const result: PronunciationResult = {
      ...gpt,
      real_ko,
      junction_points,
    };

    await increment();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '분석 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
