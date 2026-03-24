export type PatternId =
  | 'sinalefa'
  | 'resilabificacion'
  | 'espirantizacion'
  | 'perdida_d'
  | 'asimilacion_nasal'
  | 'elision_d_final'
  | 'encadenamiento';

export type SegmentType =
  | 'normal'
  | 'space'
  | 'deleted'
  | 'weakened'
  | 'linked'
  | 'assimilated';

export interface Segment {
  original: string;
  display: string;
  type: SegmentType;
  patternId?: PatternId;
  tooltip?: string;
}

export interface EnlaceAnalysis {
  original: string;
  segments: Segment[];
  transformed: string;
  appliedPatterns: PatternId[];
}

export type PatternFreq = 'always' | 'often' | 'sometimes';

export const FREQ_META: Record<PatternFreq, { label: string; color: string }> = {
  always:    { label: '거의 항상 >90%', color: 'text-green-700' },
  often:     { label: '자주 ~60%',      color: 'text-yellow-700' },
  sometimes: { label: '상황따라 ~30%',  color: 'text-gray-500' },
};

export const PATTERN_META: Record<
  PatternId,
  { name_ko: string; icon: string; colorClass: string; bgClass: string; description: string; freq: PatternFreq }
> = {
  sinalefa: {
    name_ko: '모음 연결',
    icon: '🟢',
    colorClass: 'text-green-700',
    bgClass: 'bg-green-100',
    description: '단어 경계에서 모음끼리 하나의 음절로 융합',
    freq: 'always',
  },
  resilabificacion: {
    name_ko: '재음절화',
    icon: '🔵',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-100',
    description: '어말 자음이 다음 단어 모음의 초성으로 이동',
    freq: 'always',
  },
  espirantizacion: {
    name_ko: '마찰음화',
    icon: '🟣',
    colorClass: 'text-purple-700',
    bgClass: 'bg-purple-100',
    description: 'b/d/g가 모음 사이에서 [β/ð/ɣ]로 약화',
    freq: 'always',
  },
  perdida_d: {
    name_ko: 'd 탈락',
    icon: '🔴',
    colorClass: 'text-red-700',
    bgClass: 'bg-red-100',
    description: '-ado/-ada 어미에서 d가 탈락',
    freq: 'always',
  },
  asimilacion_nasal: {
    name_ko: '비음 동화',
    icon: '🩵',
    colorClass: 'text-cyan-700',
    bgClass: 'bg-cyan-100',
    description: 'n이 뒤따르는 양순음(b/p/m) 앞에서 m으로 동화',
    freq: 'always',
  },
  elision_d_final: {
    name_ko: '어말 d 탈락',
    icon: '🟠',
    colorClass: 'text-orange-700',
    bgClass: 'bg-orange-100',
    description: '단어 끝 d가 약화되어 탈락',
    freq: 'often',
  },
  encadenamiento: {
    name_ko: '연쇄 축약',
    icon: '⚫',
    colorClass: 'text-gray-800',
    bgClass: 'bg-gray-100',
    description: '여러 연음 규칙이 동시에 적용되어 연쇄 축약 발생',
    freq: 'always',
  },
};
