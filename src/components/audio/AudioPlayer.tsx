'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeEnlace } from '@/lib/enlace-engine';
import { PATTERN_META } from '@/types';
import type { EnlaceAnalysis, Segment } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────

type Style = 'textbook' | 'natural';
type ScriptMode = 'off' | 'es' | 'es+phonetic';
const SPEEDS = [0.7, 0.85, 1.0, 1.2] as const;
type Speed = (typeof SPEEDS)[number];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function TransformedInline({ segments }: { segments: Segment[] }) {
  const STYLE: Record<string, string> = {
    deleted: 'text-red-600 line-through opacity-60',
    weakened: 'text-purple-700 font-bold',
    linked: 'text-green-700 font-bold',
    assimilated: 'text-cyan-700 font-bold',
  };
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'deleted') return null;
        if (seg.type === 'linked' && seg.display === '') return null;
        const cls = STYLE[seg.type] ?? '';
        return (
          <span key={i} className={cls} title={seg.tooltip}>
            {seg.display}
          </span>
        );
      })}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface AudioPlayerProps {
  text: string;
}

export default function AudioPlayer({ text }: AudioPlayerProps) {
  // Audio state
  const [activeStyle, setActiveStyle] = useState<Style>('textbook');
  const [urls, setUrls] = useState<Partial<Record<Style, string>>>({});
  const [loading, setLoading] = useState<Partial<Record<Style, boolean>>>({});
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1.0);

  // A-B loop state
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState(false);

  // Script state
  const [scriptMode, setScriptMode] = useState<ScriptMode>('es');
  const [analysis] = useState<EnlaceAnalysis>(() => analyzeEnlace(text));

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // ── Audio setup ────────────────────────────────────────────────────────

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      // A-B loop
      if (
        isLooping &&
        loopA !== null &&
        loopB !== null &&
        audio.currentTime >= loopB
      ) {
        audio.currentTime = loopA;
      }
    });
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', () => setIsPlaying(false));
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.src = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update A-B loop refs without rebuilding listener
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handler = () => {
      setCurrentTime(audio.currentTime);
      if (isLooping && loopA !== null && loopB !== null && audio.currentTime >= loopB) {
        audio.currentTime = loopA;
      }
    };
    audio.addEventListener('timeupdate', handler);
    return () => audio.removeEventListener('timeupdate', handler);
  }, [isLooping, loopA, loopB]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // Switch active style
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const url = urls[activeStyle];
    if (url) {
      const wasPlaying = isPlaying;
      audio.pause();
      audio.src = url;
      audio.playbackRate = speed;
      if (wasPlaying) audio.play();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStyle, urls]);

  // ── TTS generation ─────────────────────────────────────────────────────

  const generate = useCallback(
    async (style: Style) => {
      if (loading[style] || urls[style]) return;
      setLoading((p) => ({ ...p, [style]: true }));
      setError(null);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, style }),
        });
        if (!res.ok) {
          const { error: msg } = await res.json();
          throw new Error(msg ?? 'TTS 실패');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setUrls((p) => ({ ...p, [style]: url }));

        // Auto-load into audio element if this is the active style
        if (style === activeStyle && audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.playbackRate = speed;
          audioRef.current.load();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'TTS 오류');
      } finally {
        setLoading((p) => ({ ...p, [style]: false }));
      }
    },
    [loading, urls, text, activeStyle, speed],
  );

  const generateBoth = () => {
    generate('textbook');
    generate('natural');
  };

  // ── Playback controls ──────────────────────────────────────────────────

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !urls[activeStyle]) return;
    if (isPlaying) audio.pause();
    else audio.play();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const ratio = getRatioFromEvent(e);
    if (ratio !== null) seekToRatio(ratio);
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    if (!isPlaying) audio.play();
  };

  const setLoopPoint = (point: 'A' | 'B') => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    if (point === 'A') {
      setLoopA(t);
    } else {
      setLoopB(t);
      // B가 설정되고 A도 있으면 자동으로 루프 ON
      if (loopA !== null) setIsLooping(true);
    }
  };

  const clearLoop = () => {
    setLoopA(null);
    setLoopB(null);
    setIsLooping(false);
  };

  // 진행바에서 위치 비율 계산 (마우스/터치 공통)
  const getRatioFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent | TouchEvent) => {
    const el = progressRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX : e.clientX;
    if (clientX === undefined) return null;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const seekToRatio = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = ratio * duration;
  };

  const hasAudio = !!urls[activeStyle];

  // 드래그 시크 (마우스 + 터치)
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const ratio = getRatioFromEvent(e);
      if (ratio !== null) seekToRatio(ratio);
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, duration]);

  // 키보드 단축키: Space(재생/정지), ←→(5초 이동)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowLeft') { e.preventDefault(); if (audioRef.current) audioRef.current.currentTime -= 5; }
      if (e.code === 'ArrowRight') { e.preventDefault(); if (audioRef.current) audioRef.current.currentTime += 5; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, hasAudio]);

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const loopAPercent = duration && loopA !== null ? (loopA / duration) * 100 : null;
  const loopBPercent = duration && loopB !== null ? (loopB / duration) * 100 : null;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="border-4 border-e-black bg-white shadow-hard">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-e-black p-3 sm:p-4">
        <h2 className="text-base font-black uppercase tracking-tighter sm:text-xl">👂 클립 플레이어</h2>
        <button
          onClick={generateBoth}
          disabled={!!loading.textbook && !!loading.natural}
          className="border-4 border-e-black bg-e-black px-3 py-1.5 text-xs font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:bg-e-red disabled:opacity-40 sm:px-4 sm:py-2 sm:text-sm"
        >
          {loading.textbook || loading.natural ? '생성 중...' : '🎙️ 음성 생성'}
        </button>
      </div>

      {error && (
        <div className="border-b-4 border-e-black bg-e-red px-4 py-2 text-sm font-bold text-white">
          ⚠️ {error} — .env.local에 GOOGLE_TTS_API_KEY를 확인하세요
        </div>
      )}

      {/* Style toggle */}
      <div className="flex border-b-4 border-e-black">
        {(['textbook', 'natural'] as Style[]).map((s) => (
          <button
            key={s}
            onClick={() => setActiveStyle(s)}
            className={`flex flex-1 items-center justify-center gap-1 border-r-4 border-e-black py-2.5 text-xs font-black uppercase last:border-r-0 transition-colors sm:gap-2 sm:py-3 sm:text-sm ${
              activeStyle === s ? 'bg-e-yellow' : 'hover:bg-gray-100'
            }`}
          >
            {s === 'textbook' ? '📖 교과서' : '🗣️ 실제'}<span className="hidden sm:inline"> 발음</span>
            {urls[s] && <span className="text-xs text-green-600">✓</span>}
            {loading[s] && <span className="text-xs text-gray-400">...</span>}
          </button>
        ))}
      </div>

      {/* Player controls */}
      <div className="border-b-4 border-e-black p-3 sm:p-4">
        {/* Play button + restart + time */}
        <div className="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
          <button
            onClick={togglePlay}
            disabled={!hasAudio}
            className={`flex h-11 w-11 items-center justify-center rounded-full border-4 border-e-black font-black shadow-hard-sm transition-all hover:-translate-y-0.5 disabled:opacity-30 sm:h-14 sm:w-14 ${
              isPlaying ? 'bg-e-black text-white' : 'bg-e-red text-white'
            }`}
            title="재생/정지 (Space)"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={restart}
            disabled={!hasAudio}
            className="flex h-8 w-8 items-center justify-center border-2 border-e-black text-sm transition-all hover:bg-e-yellow disabled:opacity-30"
            title="처음부터 (⟳)"
          >
            ⟳
          </button>
          <div className="ml-1 text-xs font-bold tabular-nums sm:text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          <div className="ml-auto text-[10px] font-bold text-gray-300 hidden sm:block">
            Space · ← →
          </div>
        </div>

        {/* Progress bar — 클릭 + 드래그 시크, hover 시간 미리보기 */}
        <div
          ref={progressRef}
          onMouseDown={(e) => { seek(e); setIsDragging(true); }}
          onMouseMove={(e) => {
            const ratio = getRatioFromEvent(e);
            if (ratio !== null && duration) setHoverTime(ratio * duration);
          }}
          onMouseLeave={() => setHoverTime(null)}
          onTouchStart={(e) => {
            const el = progressRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const clientX = e.touches[0]?.clientX;
            if (clientX === undefined) return;
            const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            seekToRatio(ratio);
            setIsDragging(true);
          }}
          className="relative h-4 cursor-pointer border-4 border-e-black bg-gray-100 sm:h-5"
        >
          {/* Playhead */}
          <div
            className="absolute left-0 top-0 h-full bg-e-black transition-none"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Loop range highlight */}
          {loopAPercent !== null && loopBPercent !== null && (
            <div
              className="absolute top-0 h-full bg-e-yellow opacity-50"
              style={{ left: `${loopAPercent}%`, width: `${loopBPercent - loopAPercent}%` }}
            />
          )}
          {/* A marker */}
          {loopAPercent !== null && (
            <div
              className="absolute top-0 h-full w-1 bg-green-500"
              style={{ left: `${loopAPercent}%` }}
            />
          )}
          {/* B marker */}
          {loopBPercent !== null && (
            <div
              className="absolute top-0 h-full w-1 bg-orange-500"
              style={{ left: `${loopBPercent}%` }}
            />
          )}
          {/* Hover time tooltip */}
          {hoverTime !== null && duration > 0 && (
            <div
              className="pointer-events-none absolute -top-7 -translate-x-1/2 bg-e-black px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ left: `${(hoverTime / duration) * 100}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Speed control */}
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4 sm:gap-3">
          <span className="text-xs font-bold uppercase text-gray-500">속도</span>
          <div className="flex flex-wrap gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`border-2 border-e-black px-2 py-1 text-xs font-bold transition-colors ${
                  speed === s ? 'bg-e-black text-white' : 'hover:bg-e-yellow'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* A-B loop */}
      <div className="flex flex-wrap items-center gap-1.5 border-b-4 border-e-black p-3 sm:gap-2">
        <span className="text-xs font-bold uppercase text-gray-500">A-B 루프</span>
        <button
          onClick={() => setLoopPoint('A')}
          disabled={!hasAudio}
          className="border-2 border-e-green bg-green-50 px-2 py-1 text-xs font-black text-green-700 hover:bg-green-100 disabled:opacity-30 sm:px-3"
        >
          [A] {loopA !== null ? formatTime(loopA) : '설정'}
        </button>
        <button
          onClick={() => setLoopPoint('B')}
          disabled={!hasAudio}
          className="border-2 border-e-orange bg-orange-50 px-2 py-1 text-xs font-black text-orange-700 hover:bg-orange-100 disabled:opacity-30 sm:px-3"
        >
          [B] {loopB !== null ? formatTime(loopB) : '설정'}
        </button>
        <button
          onClick={() => setIsLooping((v) => !v)}
          disabled={loopA === null || loopB === null}
          className={`border-2 border-e-black px-2 py-1 text-xs font-black transition-colors disabled:opacity-30 sm:px-3 ${
            isLooping ? 'bg-e-yellow' : 'hover:bg-e-yellow'
          }`}
        >
          ♻️ {isLooping ? 'ON' : 'OFF'}
        </button>
        {(loopA !== null || loopB !== null) && (
          <button onClick={clearLoop} className="text-xs font-bold text-gray-400 hover:text-e-red">
            초기화
          </button>
        )}
      </div>

      {/* Script toggle */}
      <div className="border-b-4 border-e-black p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          <span className="mr-2 text-xs font-bold uppercase text-gray-500">스크립트</span>
          {(['off', 'es', 'es+phonetic'] as ScriptMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setScriptMode(m)}
              className={`border-2 border-e-black px-1.5 py-0.5 text-[10px] font-bold transition-colors sm:px-2 sm:text-xs ${
                scriptMode === m ? 'bg-e-black text-white' : 'hover:bg-e-yellow'
              }`}
            >
              {m === 'off' ? '숨김' : m === 'es' ? '스페인어' : '연음 표기'}
            </button>
          ))}
        </div>

        {scriptMode !== 'off' && (
          <div className="border-2 border-e-black bg-gray-50 p-3">
            {/* Spanish text */}
            <div className="text-lg font-bold">{text}</div>

            {/* Phonetic transformed */}
            {scriptMode === 'es+phonetic' && (
              <div className="mt-2 border-t border-gray-200 pt-2">
                <div className="mb-1 text-xs font-bold uppercase text-gray-400">실제 발음</div>
                <div className="flex flex-wrap text-lg font-bold">
                  <TransformedInline segments={analysis.segments} />
                </div>
                {analysis.appliedPatterns.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {analysis.appliedPatterns.map((pid) => {
                      const meta = PATTERN_META[pid];
                      return (
                        <span
                          key={pid}
                          className="border border-e-black px-1.5 py-0.5 text-xs font-bold"
                        >
                          {meta.icon} {meta.name_ko}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-2 text-xs font-bold uppercase text-gray-400">
        TTS: Google Cloud · 교과서(Neural2-A, 0.75x) vs 실제(Neural2-B, 1.05x)
      </div>
    </div>
  );
}
