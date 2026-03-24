import type { PatternId } from '@/types';

export type DrillType = 'transform' | 'identify';

export interface DrillQuestion {
  id: string;
  type: DrillType;
  patternId: PatternId;
  // 'transform': 원문 보여주고 실제 발음 고르기
  // 'identify':  변환 결과 보여주고 어떤 패턴인지 고르기
  original: string;
  transformed: string;
  options: string[];      // 4개 보기
  correctIndex: number;
  explanation: string;
  difficulty: 1 | 2 | 3;
}

export const DRILL_QUESTIONS: DrillQuestion[] = [

  // ── 모음 연결 (sinalefa) ────────────────────────────────────────────────
  {
    id: 's1',
    type: 'transform',
    patternId: 'sinalefa',
    original: 'de España',
    transformed: 'deEspaña',
    options: ['데 에스빠냐 (분리)', 'deEspaña (연결)', 'despaña (탈락)', 'd\'España (축약)'],
    correctIndex: 1,
    explanation: 'de의 e와 España의 E가 붙어 하나의 음절 덩어리처럼 들립니다.',
    difficulty: 2,
  },
  {
    id: 's2',
    type: 'transform',
    patternId: 'sinalefa',
    original: 'la iglesia',
    transformed: 'laIglesia',
    options: ['la iglesia (분리)', 'laIglesia (연결)', 'liglesia (융합)', 'la-iglesia (분리유지)'],
    correctIndex: 1,
    explanation: 'la의 a와 iglesia의 i가 연결되어 [la.iˈɣle.sja]처럼 들립니다.',
    difficulty: 2,
  },
  {
    id: 's3',
    type: 'identify',
    patternId: 'sinalefa',
    original: 'vamos a estar',
    transformed: 'vamosaEstar',
    options: ['재음절화', '모음 연결', 'd 탈락', '비음 동화'],
    correctIndex: 1,
    explanation: '"a"와 "estar" 사이 모음이 연결 — a + e = 끊김 없이 이어집니다.',
    difficulty: 2,
  },

  // ── 재음절화 (resilabificacion) ──────────────────────────────────────────
  {
    id: 'r1',
    type: 'transform',
    patternId: 'resilabificacion',
    original: 'un amigo',
    transformed: 'u-na-mi-go',
    options: ['운 아미고 (분리)', 'u-na-mi-go (재음절화)', 'u-na-migo (부분)', 'unamigo (완전융합)'],
    correctIndex: 1,
    explanation: 'un의 n이 amigo의 a 앞으로 이동 → [u.na.ˈmi.ɣo]',
    difficulty: 2,
  },
  {
    id: 'r2',
    type: 'identify',
    patternId: 'resilabificacion',
    original: 'las armas',
    transformed: 'la-sar-mas',
    options: ['모음 연결', '마찰음화', '재음절화', '어말 d 탈락'],
    correctIndex: 2,
    explanation: 'las의 s가 armas의 a 앞으로 이동 → [la.ˈsar.mas]',
    difficulty: 2,
  },
  {
    id: 'r3',
    type: 'transform',
    patternId: 'resilabificacion',
    original: 'el otro',
    transformed: 'e-lo-tro',
    options: ['엘 오트로 (분리)', 'e-lo-tro (재음절화)', 'elotro (완전융합)', 'el-otro (하이픈)'],
    correctIndex: 1,
    explanation: 'el의 l이 otro의 o 앞으로 이동 → [e.ˈlo.tro]',
    difficulty: 2,
  },

  // ── 마찰음화 (espirantizacion) ───────────────────────────────────────────
  {
    id: 'e1',
    type: 'transform',
    patternId: 'espirantizacion',
    original: 'acabado',
    transformed: 'aca[β]a[ð]o',
    options: ['아카바도 (원형)', 'aca[β]a[ð]o (마찰음화)', 'acaao (탈락)', 'aka[p]a[t]o (강화)'],
    correctIndex: 1,
    explanation: '모음 사이 b→[β], d→[ð]로 약화됩니다. 완전히 사라지지 않고 마찰음으로 남습니다.',
    difficulty: 3,
  },
  {
    id: 'e2',
    type: 'identify',
    patternId: 'espirantizacion',
    original: 'una vez',
    transformed: 'una [β]ez',
    options: ['비음 동화', '모음 연결', 'b/d/g 마찰음화', 'd 탈락'],
    correctIndex: 2,
    explanation: '모음(a) 뒤에 오는 v(=b)가 [β]로 약화됩니다.',
    difficulty: 3,
  },
  {
    id: 'e3',
    type: 'transform',
    patternId: 'espirantizacion',
    original: 'todo',
    transformed: 'to[ð]o',
    options: ['토도 (원형)', 'to[ð]o (마찰음화)', 'too (탈락)', 'towo (반모음화)'],
    correctIndex: 1,
    explanation: '모음 사이 d → [ð]로 약화. 비공식 발화에서는 아예 탈락하기도 합니다.',
    difficulty: 3,
  },

  // ── d 탈락 -ado/-ada (perdida_d) ─────────────────────────────────────────
  {
    id: 'p1',
    type: 'transform',
    patternId: 'perdida_d',
    original: 'cansado',
    transformed: 'cansao',
    options: ['칸사도 (원형)', 'cansao (d 탈락)', 'cansaho (h화)', 'cansa (완전탈락)'],
    correctIndex: 1,
    explanation: '-ado에서 d가 탈락하여 "cansao"로. 마드리드에서도 매우 일반적.',
    difficulty: 2,
  },
  {
    id: 'p2',
    type: 'identify',
    patternId: 'perdida_d',
    original: 'hablado',
    transformed: 'hablao',
    options: ['어말 d 탈락', '-ado d 탈락', '재음절화', '마찰음화'],
    correctIndex: 1,
    explanation: '-ado 어미에서 d 탈락 → "hablao"',
    difficulty: 2,
  },
  {
    id: 'p3',
    type: 'transform',
    patternId: 'perdida_d',
    original: 'cansada',
    transformed: 'cansá',
    options: ['칸사다 (원형)', 'cansá (d 탈락)', 'cansaa (모음 연결)', 'kansa (완전약화)'],
    correctIndex: 1,
    explanation: '-ada에서 d가 탈락하여 "cansá"로. a+a가 합쳐져 장음화되는 경우도 있습니다.',
    difficulty: 2,
  },

  // ── 비음 동화 (asimilacion_nasal) ────────────────────────────────────────
  {
    id: 'n1',
    type: 'transform',
    patternId: 'asimilacion_nasal',
    original: 'un poco',
    transformed: 'um poco',
    options: ['운 포코 (원형)', 'um poco (m 동화)', 'ung poco (연구개)', 'u poco (n 탈락)'],
    correctIndex: 1,
    explanation: 'n + p → m + p: 양순음 p 앞에서 n이 m으로 동화됩니다.',
    difficulty: 1,
  },
  {
    id: 'n2',
    type: 'identify',
    patternId: 'asimilacion_nasal',
    original: 'en Barcelona',
    transformed: 'em Barcelona',
    options: ['모음 연결', '재음절화', '비음 동화', '마찰음화'],
    correctIndex: 2,
    explanation: 'n + B(=양순음) → m + B: "em Barcelona"',
    difficulty: 1,
  },
  {
    id: 'n3',
    type: 'transform',
    patternId: 'asimilacion_nasal',
    original: 'un momento',
    transformed: 'um momento',
    options: ['운 모멘토 (원형)', 'um momento (m 동화)', 'un-momento (재음절화)', 'u momento (탈락)'],
    correctIndex: 1,
    explanation: 'n + m → m + m: m 앞에서 n이 m으로 동화됩니다.',
    difficulty: 1,
  },

  // ── 어말 d 탈락 (elision_d_final) ────────────────────────────────────────
  {
    id: 'f1',
    type: 'transform',
    patternId: 'elision_d_final',
    original: 'verdad',
    transformed: 'verdá',
    options: ['베르다드 (원형)', 'verdá (d 탈락)', 'verdaz (θ화)', 'verda (두 음절)'],
    correctIndex: 1,
    explanation: '어말 d가 약화/탈락. 구어체에서 매우 일반적 — "베르다"처럼 들립니다.',
    difficulty: 2,
  },
  {
    id: 'f2',
    type: 'identify',
    patternId: 'elision_d_final',
    original: 'ciudad',
    transformed: 'ciudá',
    options: ['-ado d 탈락', '모음 연결', '어말 d 탈락', '재음절화'],
    correctIndex: 2,
    explanation: '어말 d 탈락 → "ciudá". -dad, -tad, -ud 패턴에서 특히 빈번.',
    difficulty: 2,
  },
  {
    id: 'f3',
    type: 'transform',
    patternId: 'elision_d_final',
    original: 'libertad',
    transformed: 'libertá',
    options: ['리베르타드 (원형)', 'libertá (d 탈락)', 'libertat (폐쇄)', 'libertaz (θ화)'],
    correctIndex: 1,
    explanation: '-tad 어미의 d 탈락 → "libertá"',
    difficulty: 2,
  },

  // ── 연쇄 축약 (encadenamiento) ───────────────────────────────────────────
  {
    id: 'c1',
    type: 'identify',
    patternId: 'encadenamiento',
    original: 'vamos a ver',
    transformed: 'bamosaβer',
    options: ['모음 연결만', '재음절화만', '마찰음화만', '연쇄 축약 (여러 규칙 동시 적용)'],
    correctIndex: 3,
    explanation: 's+a 재음절화 + a+v 모음연결 + v→[β] 마찰음화 — 3개 규칙이 동시에 적용됩니다.',
    difficulty: 3,
  },
  {
    id: 'c2',
    type: 'identify',
    patternId: 'encadenamiento',
    original: '¿Dónde está?',
    transformed: '¿DóndeStá?',
    options: ['어말 d 탈락만', '모음 연결만', '연쇄 축약 (d탈락 + 재음절화)', '비음 동화'],
    correctIndex: 2,
    explanation: 'donde의 e + está의 e → 재음절화, d(onde) 어말 약화가 동시에 일어납니다.',
    difficulty: 3,
  },
];

// 패턴별로 필터링
export function getQuestionsByPattern(patternId: PatternId | 'all'): DrillQuestion[] {
  if (patternId === 'all') return DRILL_QUESTIONS;
  return DRILL_QUESTIONS.filter((q) => q.patternId === patternId);
}

// 랜덤 셔플
export function shuffleQuestions(questions: DrillQuestion[]): DrillQuestion[] {
  return [...questions].sort(() => Math.random() - 0.5);
}
