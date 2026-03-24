'use client';

import { useState, useCallback } from 'react';
import { analyzeEnlace, EXAMPLE_PHRASES } from '@/lib/enlace-engine';
import { PATTERN_META, FREQ_META } from '@/types';
import type { EnlaceAnalysis, Segment, PatternId } from '@/types';

// ── Segment rendering ──────────────────────────────────────────────────────

const SEGMENT_STYLE: Record<string, { text: string; bg: string }> = {
  deleted:     { text: 'text-red-700',    bg: 'bg-red-100' },
  weakened:    { text: 'text-purple-700', bg: 'bg-purple-100' },
  linked:      { text: 'text-green-700',  bg: 'bg-green-100' },
  assimilated: { text: 'text-cyan-700',   bg: 'bg-cyan-100' },
};

function OriginalSegment({ segment }: { segment: Segment }) {
  const style = SEGMENT_STYLE[segment.type];
  if (!style) return <span>{segment.original}</span>;

  return (
    <span
      className={`cursor-help rounded-sm px-px ${style.text} ${style.bg}`}
      title={segment.tooltip}
    >
      {segment.original}
    </span>
  );
}

function TransformedSegment({ segment }: { segment: Segment }) {
  // Deleted chars vanish; linked spaces vanish
  if (segment.type === 'deleted') return null;
  if (segment.type === 'linked' && segment.display === '') return null;

  const style = SEGMENT_STYLE[segment.type];
  if (!style) return <span>{segment.display}</span>;

  return (
    <span
      className={`cursor-help rounded-sm px-px ${style.text} ${style.bg}`}
      title={segment.tooltip}
    >
      {segment.display}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

function PatternModal({ pid, onClose }: { pid: PatternId; onClose: () => void }) {
  const meta = PATTERN_META[pid];
  const freq = FREQ_META[meta.freq];
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm border-4 border-e-black bg-white p-5 shadow-hard sm:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-2xl">{meta.icon}</span>
          <button onClick={onClose} className="text-sm font-black text-gray-400 hover:text-e-red">✕</button>
        </div>
        <div className="mb-1 text-lg font-black">{meta.name_ko}</div>
        <div className="mb-3 text-sm font-bold text-gray-600">{meta.description}</div>
        <div className={`text-xs font-black ${freq.color}`}>{freq.label}</div>
      </div>
    </div>
  );
}

export default function EnlaceVisualizer() {
  const [input, setInput] = useState('vamos a estar');
  const [analysis, setAnalysis] = useState<EnlaceAnalysis>(() =>
    analyzeEnlace('vamos a estar'),
  );
  const [activeModal, setActiveModal] = useState<PatternId | null>(null);

  const handleAnalyze = useCallback(() => {
    setAnalysis(analyzeEnlace(input));
  }, [input]);

  const handleExample = (text: string) => {
    setInput(text);
    setAnalysis(analyzeEnlace(text));
  };

  return (
    <div className="border-4 border-e-black bg-white shadow-hard">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-e-black p-3 sm:p-4">
        <h2 className="text-base font-black uppercase tracking-tighter sm:text-xl">👁️ 연음 시각화</h2>
        <span className="hidden text-xs font-bold uppercase text-gray-400 sm:inline">Enlace Visualizer</span>
      </div>

      {/* Input */}
      <div className="border-b-4 border-e-black p-3 sm:p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            className="min-w-0 flex-1 border-4 border-e-black px-2 py-2 text-base font-bold focus:bg-e-yellow focus:outline-none sm:px-3 sm:text-lg"
            placeholder="스페인어 문장 입력..."
          />
          <button
            onClick={handleAnalyze}
            className="shrink-0 border-4 border-e-black bg-e-red px-3 py-2 font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 sm:px-4"
          >
            분석
          </button>
        </div>

        {/* Example buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_PHRASES.map((ex) => (
            <button
              key={ex.text}
              onClick={() => handleExample(ex.text)}
              className="border-2 border-e-black px-2 py-1 text-xs font-bold transition-colors hover:bg-e-yellow"
            >
              {ex.text}
            </button>
          ))}
        </div>
      </div>

      {/* Visualization */}
      <div className="p-3 sm:p-4">
        {/* Original */}
        <div className="mb-3">
          <div className="mb-1 text-xs font-bold uppercase text-gray-400">
            교과서 발음 (텍스트)
          </div>
          <div className="flex flex-wrap items-baseline text-xl font-bold sm:text-2xl">
            {analysis.segments.map((seg, i) => (
              <OriginalSegment key={i} segment={seg} />
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="my-3 text-2xl font-black text-e-red">↓</div>

        {/* Transformed */}
        <div className="mb-4">
          <div className="mb-1 text-xs font-bold uppercase text-gray-400">실제 발음</div>
          <div className="flex flex-wrap items-baseline border-4 border-e-black bg-e-yellow px-2 py-2 text-xl font-bold shadow-hard-sm sm:px-3 sm:text-2xl">
            {analysis.segments.map((seg, i) => (
              <TransformedSegment key={i} segment={seg} />
            ))}
          </div>
        </div>

        {/* Pattern legend */}
        {analysis.appliedPatterns.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {analysis.appliedPatterns.map((pid) => {
              const meta = PATTERN_META[pid];
              const freq = FREQ_META[meta.freq];
              return (
                <button
                  key={pid}
                  onClick={() => setActiveModal(pid)}
                  className="flex flex-col border-2 border-e-black bg-e-white px-2 py-1 text-left transition-colors hover:bg-e-yellow"
                >
                  <span className="text-xs font-bold">{meta.icon} {meta.name_ko}</span>
                  <span className={`text-[10px] font-bold ${freq.color}`}>{freq.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-sm font-bold uppercase text-gray-400">
            적용된 연음 규칙 없음
          </div>
        )}
        {activeModal && (
          <PatternModal pid={activeModal} onClose={() => setActiveModal(null)} />
        )}

        {analysis.appliedPatterns.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <button
              onClick={() => {
                const msg = encodeURIComponent(
                  `[분석 오류 제보]\n입력: "${input}"\n적용된 패턴: ${analysis.appliedPatterns.join(', ')}\n\n어떤 부분이 잘못됐는지 설명해주세요:`
                );
                window.open(`mailto:feedback@enlazate.app?subject=연음 분석 오류 제보&body=${msg}`, '_blank');
              }}
              className="text-xs font-bold text-gray-400 underline hover:text-e-red"
            >
              이 분석이 정확하지 않나요? →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
