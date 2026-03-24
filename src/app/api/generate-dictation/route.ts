import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { PatternId } from '@/types';
import { requireAuth } from '@/lib/supabase/require-auth';
import { checkRateLimit } from '@/lib/supabase/rate-limit';

interface GenerateRequest {
  weakPatterns: PatternId[];
  count?: number;
}

interface GeneratedSentence {
  id: string;
  text: string;
  difficulty: 2 | 3;
  patterns: PatternId[];
  hint_ko: string;
}

const PATTERN_DESCRIPTIONS: Record<PatternId, string> = {
  sinalefa:
    'Sinalefa: 단어 경계에서 모음끼리 하나의 음절로 융합. 예: "vamos a encontrarnos" → "vamoa encontrarnos"',
  resilabificacion:
    'Resilabificación: 어말 자음이 다음 단어 모음의 초성으로 이동. 예: "¿Tienen alguna oferta?" → "tie-ne-nal-gu-na-o-fer-ta"',
  espirantizacion:
    'Espirantización: b/d/g가 모음 사이에서 [β/ð/ɣ]로 약화. 예: "abogado" → "a[β]o[ɣ]a[ð]o"',
  perdida_d:
    'Pérdida de /d/: -ado/-ada 어미에서 d가 탈락. 예: "El contrato ha sido aprobado" → "aprobao"',
  asimilacion_nasal:
    'Asimilación nasal: n이 양순음(b/p/m) 앞에서 m으로 동화. 예: "en Barcelona" → "em Barcelona"',
  elision_d_final:
    'Elisión de /d/ final: 단어 끝 d가 약화/탈락. 예: "la verdad es que" → "la verdá es que"',
  encadenamiento:
    'Encadenamiento: 여러 연음 규칙이 동시에 적용되어 연쇄 축약 발생',
};

function buildSystemPrompt(): string {
  return `Eres un generador de frases de dictado para estudiantes coreanos de español de nivel B1-B2 (MCER).

REGLAS OBLIGATORIAS:
1. Nivel B1-B2 MÍNIMO. NUNCA generes frases de nivel A1-A2 como "un amigo", "qué hora es", "un poco de agua".
2. Contextos REALES: negocios, trabajo, reuniones, negociaciones, vida cotidiana adulta, noticias, opiniones.
3. Cada frase debe tener entre 6 y 15 palabras.
4. Las frases deben sonar NATURALES, como las diría un hablante nativo en conversación real o en contexto profesional.
5. Incluye vocabulario de nivel B1-B2: subjuntivo, condicional, perífrasis verbales, conectores discursivos.
6. NUNCA repitas frases. Cada una debe ser única y diferente.

EJEMPLOS de nivel correcto:
- "Necesitamos que nos envíen el presupuesto antes del viernes"
- "La verdad es que no estoy de acuerdo con esa propuesta"
- "Habría que revisar los términos del contrato antes de firmarlo"
- "Me han dicho que van a reestructurar el departamento entero"
- "Aunque no estaba previsto, hemos conseguido cerrar el acuerdo"

EJEMPLOS de nivel INCORRECTO (NO generar):
- "un amigo" (demasiado corto, A1)
- "¿Dónde está el hotel?" (A1)
- "un poco de agua" (A1)
- "vamos a estar" (A1-A2)

Responde SOLO en JSON válido.`;
}

function buildUserPrompt(
  weakPatterns: PatternId[],
  count: number,
): string {
  const patternDetails = weakPatterns
    .map((p) => `- ${PATTERN_DESCRIPTIONS[p]}`)
    .join('\n');

  return `Genera ${count} frases de dictado en español (nivel B1-B2) que contengan estos patrones de enlace fonético donde el estudiante tiene DEBILIDAD:

${patternDetails}

Cada frase DEBE activar al menos uno de los patrones indicados de forma natural.

Responde en JSON con este formato exacto:
{
  "sentences": [
    {
      "text": "la frase en español con ortografía correcta",
      "patterns": ["pattern_id_1", "pattern_id_2"],
      "hint_ko": "자연스러운 한국어 번역",
      "difficulty": 2 o 3 (2=보통, 3=어려움)
    }
  ]
}

RECUERDA:
- Mínimo 6 palabras por frase
- Contexto de negocios, trabajo, vida real adulta
- Nivel B1-B2 obligatorio
- Los patterns deben ser del listado: sinalefa, resilabificacion, espirantizacion, perdida_d, asimilacion_nasal, elision_d_final, encadenamiento`;
}

export async function POST(req: NextRequest) {
  const { user, response: authError } = await requireAuth();
  if (authError) return authError;

  const { response: limitError, increment } = await checkRateLimit(req, user!.id, 'generate-dictation');
  if (limitError) return limitError;

  try {
    const body = (await req.json()) as GenerateRequest;
    const { weakPatterns, count = 5 } = body;

    if (!weakPatterns || weakPatterns.length === 0) {
      return NextResponse.json(
        { error: '약점 패턴이 필요합니다' },
        { status: 400 },
      );
    }

    const validPatterns: PatternId[] = [
      'sinalefa',
      'resilabificacion',
      'espirantizacion',
      'perdida_d',
      'asimilacion_nasal',
      'elision_d_final',
      'encadenamiento',
    ];
    const filtered = weakPatterns.filter((p) =>
      validPatterns.includes(p),
    );
    if (filtered.length === 0) {
      return NextResponse.json(
        { error: '유효한 패턴이 없습니다' },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY 없음' },
        { status: 500 },
      );
    }

    const openai = new OpenAI({ apiKey });
    const clampedCount = Math.min(Math.max(count, 1), 10);

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(filtered, clampedCount) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.8,
    });

    const raw = JSON.parse(res.choices[0].message.content ?? '{}') as {
      sentences?: Array<{
        text: string;
        patterns: PatternId[];
        hint_ko: string;
        difficulty: 2 | 3;
      }>;
    };

    if (!raw.sentences || !Array.isArray(raw.sentences)) {
      return NextResponse.json(
        { error: 'GPT 응답 형식 오류' },
        { status: 500 },
      );
    }

    const timestamp = Date.now();
    const sentences: GeneratedSentence[] = raw.sentences.map(
      (s, i) => ({
        id: `ai-${timestamp}-${i}`,
        text: s.text,
        difficulty: s.difficulty === 3 ? 3 : 2,
        patterns: s.patterns.filter((p) => validPatterns.includes(p)),
        hint_ko: s.hint_ko,
      }),
    );

    await increment();
    return NextResponse.json({ sentences });
  } catch (err) {
    const message = err instanceof Error ? err.message : '문장 생성 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
