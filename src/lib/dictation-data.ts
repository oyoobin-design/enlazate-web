import type { PatternId } from '@/types';

export interface DictationSentence {
  id: string;
  text: string;
  difficulty: 1 | 2 | 3;
  patterns: PatternId[];
  hint_ko: string;
}

export const DICTATION_SENTENCES: DictationSentence[] = [

  // ── 보통 (2): B1 수준, 비즈니스/실생활 ───────────────────────────────────
  {
    id: 'd2-01',
    text: 'Necesitamos que nos envíen el presupuesto antes del viernes',
    difficulty: 2,
    patterns: ['sinalefa', 'resilabificacion', 'espirantizacion'],
    hint_ko: '금요일 전에 견적서를 보내주셔야 합니다',
  },
  {
    id: 'd2-02',
    text: 'La verdad es que no estoy de acuerdo con esa propuesta',
    difficulty: 2,
    patterns: ['elision_d_final', 'sinalefa', 'espirantizacion'],
    hint_ko: '사실 그 제안에 동의하지 않아요',
  },
  {
    id: 'd2-03',
    text: 'Me han dicho que van a reestructurar el departamento entero',
    difficulty: 2,
    patterns: ['sinalefa', 'resilabificacion', 'espirantizacion'],
    hint_ko: '부서 전체를 구조조정할 거라고 들었어요',
  },
  {
    id: 'd2-04',
    text: 'Todavía no hemos recibido la confirmación del cliente',
    difficulty: 2,
    patterns: ['sinalefa', 'perdida_d', 'resilabificacion'],
    hint_ko: '아직 고객으로부터 확인을 받지 못했어요',
  },
  {
    id: 'd2-05',
    text: 'Quedamos en vernos el próximo martes por la mañana',
    difficulty: 2,
    patterns: ['sinalefa', 'resilabificacion', 'espirantizacion'],
    hint_ko: '다음 주 화요일 오전에 만나기로 했어요',
  },
  {
    id: 'd2-06',
    text: 'El abogado nos ha recomendado revisar las cláusulas del contrato',
    difficulty: 2,
    patterns: ['espirantizacion', 'sinalefa', 'resilabificacion'],
    hint_ko: '변호사가 계약 조항을 검토하라고 권했어요',
  },
  {
    id: 'd2-07',
    text: 'Estaba pensando en cambiar de trabajo desde hace tiempo',
    difficulty: 2,
    patterns: ['espirantizacion', 'sinalefa', 'asimilacion_nasal'],
    hint_ko: '오래전부터 이직을 생각하고 있었어요',
  },
  {
    id: 'd2-08',
    text: 'No creo que podamos cumplir con el plazo establecido',
    difficulty: 2,
    patterns: ['sinalefa', 'resilabificacion', 'espirantizacion'],
    hint_ko: '정해진 기한을 맞출 수 있을 것 같지 않아요',
  },
  {
    id: 'd2-09',
    text: 'Han aprobado el nuevo presupuesto para el proyecto',
    difficulty: 2,
    patterns: ['sinalefa', 'resilabificacion', 'perdida_d'],
    hint_ko: '프로젝트 신규 예산이 승인됐어요',
  },
  {
    id: 'd2-10',
    text: 'Me gustaría agendar una reunión para la semana que viene',
    difficulty: 2,
    patterns: ['sinalefa', 'resilabificacion', 'espirantizacion'],
    hint_ko: '다음 주에 회의를 잡고 싶어요',
  },

  // ── 어려움 (3): B1-B2 수준, 복합 패턴, 비즈니스/사회 ─────────────────────
  {
    id: 'd3-01',
    text: 'Habría que revisar los términos del contrato antes de firmarlo',
    difficulty: 3,
    patterns: ['espirantizacion', 'sinalefa', 'resilabificacion', 'elision_d_final'],
    hint_ko: '서명하기 전에 계약 조건을 검토해야 할 것 같아요',
  },
  {
    id: 'd3-02',
    text: 'Aunque no estaba previsto hemos conseguido cerrar el acuerdo',
    difficulty: 3,
    patterns: ['sinalefa', 'resilabificacion', 'espirantizacion', 'perdida_d'],
    hint_ko: '예정에 없었지만 합의를 이끌어냈어요',
  },
  {
    id: 'd3-03',
    text: 'El resultado ha sido bastante decepcionante para todo el equipo',
    difficulty: 3,
    patterns: ['sinalefa', 'resilabificacion', 'perdida_d', 'espirantizacion'],
    hint_ko: '결과가 팀 전체에게 꽤 실망스러웠어요',
  },
  {
    id: 'd3-04',
    text: 'En Barcelona están implementando un programa de movilidad urbana',
    difficulty: 3,
    patterns: ['asimilacion_nasal', 'sinalefa', 'resilabificacion', 'espirantizacion'],
    hint_ko: '바르셀로나에서 도시 교통 프로그램을 시행 중이에요',
  },
  {
    id: 'd3-05',
    text: 'Si hubiera sabido la verdad habría actuado de otra manera',
    difficulty: 3,
    patterns: ['espirantizacion', 'elision_d_final', 'sinalefa', 'resilabificacion'],
    hint_ko: '진실을 알았더라면 다르게 행동했을 거예요',
  },
  {
    id: 'd3-06',
    text: 'Desde que empezó la pandemia hemos adaptado nuestro modelo de negocio',
    difficulty: 3,
    patterns: ['sinalefa', 'resilabificacion', 'perdida_d', 'espirantizacion'],
    hint_ko: '팬데믹이 시작된 이후 비즈니스 모델을 적응시켰어요',
  },
  {
    id: 'd3-07',
    text: 'Tendrían que habernos avisado con un poco más de antelación',
    difficulty: 3,
    patterns: ['sinalefa', 'resilabificacion', 'asimilacion_nasal', 'espirantizacion'],
    hint_ko: '좀 더 미리 알려줬어야 했어요',
  },
  {
    id: 'd3-08',
    text: 'El delegado ha confirmado que asistirá a la conferencia en Madrid',
    difficulty: 3,
    patterns: ['perdida_d', 'sinalefa', 'resilabificacion', 'asimilacion_nasal'],
    hint_ko: '대표가 마드리드 컨퍼런스에 참석할 것을 확인했어요',
  },
  {
    id: 'd3-09',
    text: 'No es posible avanzar sin la aprobación del comité de dirección',
    difficulty: 3,
    patterns: ['sinalefa', 'resilabificacion', 'elision_d_final', 'espirantizacion'],
    hint_ko: '운영위원회의 승인 없이는 진행할 수 없어요',
  },
  {
    id: 'd3-10',
    text: 'A pesar de los obstáculos hemos logrado aumentar las ventas un veinte por ciento',
    difficulty: 3,
    patterns: ['sinalefa', 'resilabificacion', 'espirantizacion', 'perdida_d', 'asimilacion_nasal'],
    hint_ko: '장애물에도 불구하고 매출을 20% 올렸어요',
  },
];

export function getSentencesByDifficulty(
  difficulty: 1 | 2 | 3 | 'all',
): DictationSentence[] {
  if (difficulty === 'all') return DICTATION_SENTENCES;
  return DICTATION_SENTENCES.filter((s) => s.difficulty === difficulty);
}

export function shuffleSentences(
  sentences: DictationSentence[],
): DictationSentence[] {
  return [...sentences].sort(() => Math.random() - 0.5);
}
