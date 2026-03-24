'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { analyzeEnlace } from '@/lib/enlace-engine';
import { PATTERN_META } from '@/types';
// ── YouTube IFrame API types ───────────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (e: { target: YTPlayerInstance }) => void;
            onStateChange?: (e: { data: number }) => void;
          };
        },
      ) => YTPlayerInstance;
      PlayerState: { PLAYING: 1; PAUSED: 2; ENDED: 0 };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(sec: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackRate(rate: number): void;
  getAvailablePlaybackRates(): number[];
  getPlayerState(): number;
  destroy(): void;
}

// ── Singleton API loader ───────────────────────────────────────────────────

let apiLoading = false;
const apiCallbacks: Array<() => void> = [];

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return;
    if (window.YT?.Player) { resolve(); return; }

    apiCallbacks.push(resolve);
    if (apiLoading) return;
    apiLoading = true;

    window.onYouTubeIframeAPIReady = () => {
      apiCallbacks.forEach((cb) => cb());
      apiCallbacks.length = 0;
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}


const YT_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const;
/** 재생바: 앞/뒤 건너뛰기 초 (키보드 ← → 동일) */
const SKIP_SECONDS = 5;
const YT_STATE_PLAYING = 1;
type ScriptMode = 'off' | 'es' | 'es+phonetic';
type TtsStyle = 'textbook' | 'natural';

interface AiPronunciation {
  textbook_ko: string;
  real_ko: string;
  explain: string;
  translation_ko: string;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function YouTubePlayer() {
  const [urlInput, setUrlInput] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);

  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState(false);

  const [scriptText, setScriptText] = useState('');
  const [scriptMode, setScriptMode] = useState<ScriptMode>('es+phonetic');

  // Whisper STT
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);

  // TTS
  const [ttsLoading, setTtsLoading] = useState<Partial<Record<TtsStyle, boolean>>>({});
  const [ttsUrls, setTtsUrls] = useState<Partial<Record<TtsStyle, string>>>({});
  const [ttsActiveStyle, setTtsActiveStyle] = useState<TtsStyle>('textbook');
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const scriptAudioRef = useRef<HTMLAudioElement | null>(null);

  // AI 한국어 발음
  const [aiPronun, setAiPronun] = useState<AiPronunciation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const analysis = useMemo(
    () => (scriptText.trim() ? analyzeEnlace(scriptText.trim()) : null),
    [scriptText],
  );

  const hasLoop = loopA !== null && loopB !== null;

  const playerRef = useRef<YTPlayerInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loopRef = useRef({ a: loopA, b: loopB, active: isLooping });

  useEffect(() => {
    loopRef.current = { a: loopA, b: loopB, active: isLooping };
  }, [loopA, loopB, isLooping]);

  useEffect(() => {
    if (!videoId) return;
    intervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const t = p.getCurrentTime();
      setCurrentTime(t);
      const { a, b, active } = loopRef.current;
      if (active && a !== null && b !== null && t >= b) {
        p.seekTo(a, true);
      }
    }, 150);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [videoId]);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    let destroyed = false;

    loadYouTubeAPI().then(() => {
      if (destroyed || !containerRef.current) return;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      containerRef.current.innerHTML = '';
      const mount = document.createElement('div');
      containerRef.current.appendChild(mount);

      playerRef.current = new window.YT.Player(mount, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (e) => {
            setDuration(e.target.getDuration());
            e.target.setPlaybackRate(speed);
          },
          onStateChange: (e) => {
            setIsPlaying(e.data === 1);
            if (e.data === 1) setDuration(playerRef.current?.getDuration() ?? 0);
          },
        },
      });
    });

    return () => { destroyed = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    playerRef.current?.setPlaybackRate(speed);
  }, [speed]);

  // scriptText 변경 시 캐시 초기화
  useEffect(() => {
    if (ttsUrls.textbook) URL.revokeObjectURL(ttsUrls.textbook);
    if (ttsUrls.natural) URL.revokeObjectURL(ttsUrls.natural);
    setTtsUrls({});
    setTtsPlaying(false);
    setTtsError(null);
    setAiPronun(null);
    setAiError(null);
    if (scriptAudioRef.current) {
      scriptAudioRef.current.pause();
      scriptAudioRef.current.src = '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptText]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleLoad = () => {
    const id = extractVideoId(urlInput.trim());
    if (!id) { setError('유효한 YouTube URL을 입력해주세요'); return; }
    setError(null);
    setLoopA(null);
    setLoopB(null);
    setIsLooping(false);
    setCurrentTime(0);
    setVideoId(id);
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    isPlaying ? p.pauseVideo() : p.playVideo();
  };

  const skipBySeconds = useCallback((delta: number) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    const next = Math.max(0, Math.min(duration, p.getCurrentTime() + delta));
    p.seekTo(next, true);
    setCurrentTime(next);
  }, [duration]);

  // 키보드: 스페이스 재생/일시정지, ← → 5초 이동 (입력창 포커스 시 무시)
  useEffect(() => {
    if (!videoId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) {
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        const p = playerRef.current;
        if (!p) return;
        p.getPlayerState() === YT_STATE_PLAYING ? p.pauseVideo() : p.playVideo();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipBySeconds(-SKIP_SECONDS);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipBySeconds(SKIP_SECONDS);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [videoId, skipBySeconds]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    p.seekTo(t, true);
    setCurrentTime(t);
  };

  const setPoint = (point: 'A' | 'B') => {
    const t = playerRef.current?.getCurrentTime() ?? 0;
    if (point === 'A') setLoopA(t);
    else setLoopB(t);
  };

  const clearLoop = useCallback(() => {
    setLoopA(null);
    setLoopB(null);
    setIsLooping(false);
  }, []);

  // Whisper STT: 탭 오디오 캡처 → OpenAI Whisper
  const fetchCaption = useCallback(async () => {
    if (loopA === null || loopB === null) return;
    setCaptionLoading(true);
    setCaptionError(null);
    try {
      let displayStream: MediaStream;
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true,
        } as DisplayMediaStreamOptions);
      } catch {
        setCaptionError('화면 공유가 취소되었습니다.');
        return;
      }

      const audioTrack = displayStream.getAudioTracks()[0];
      if (!audioTrack) {
        displayStream.getTracks().forEach((t) => t.stop());
        setCaptionError('오디오 트랙이 없습니다. 탭 공유 시 "탭 오디오 공유" 체크를 해주세요.');
        return;
      }
      displayStream.getVideoTracks().forEach((t) => t.stop());

      const audioStream = new MediaStream([audioTrack]);
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(audioStream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      playerRef.current?.seekTo(loopA, true);
      await new Promise((r) => setTimeout(r, 300));
      playerRef.current?.playVideo();
      recorder.start(100);

      const segmentMs = (loopB - loopA) * 1000 + 500;
      await new Promise((r) => setTimeout(r, segmentMs));

      recorder.stop();
      playerRef.current?.pauseVideo();
      audioTrack.stop();
      await new Promise<void>((r) => { recorder.onstop = () => r(); });

      if (chunks.length === 0) {
        setCaptionError('녹음된 오디오가 없습니다.');
        return;
      }

      const audioBlob = new Blob(chunks, { type: mimeType });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'segment.webm');

      const res = await fetch('/api/stt-blob', { method: 'POST', body: formData });
      const data = await res.json() as { text?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? '음성 인식 실패');

      setScriptText(data.text);
      setCaptionError(null);
    } catch (err) {
      setCaptionError(err instanceof Error ? err.message : '인식 실패. 다시 시도해주세요.');
    } finally {
      setCaptionLoading(false);
    }
  }, [loopA, loopB]);

  // TTS 생성
  const generateTts = useCallback(async (style: TtsStyle) => {
    if (!scriptText.trim()) return;
    setTtsLoading((prev) => ({ ...prev, [style]: true }));
    setTtsError(null);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: scriptText.trim(), style }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? `TTS 생성 실패 (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setTtsUrls((prev) => ({ ...prev, [style]: url }));
    } catch (err) {
      setTtsError(err instanceof Error ? err.message : 'TTS 실패');
    } finally {
      setTtsLoading((prev) => ({ ...prev, [style]: false }));
    }
  }, [scriptText]);

  // TTS 재생/정지
  const toggleTtsPlay = useCallback((style: TtsStyle) => {
    const audio = scriptAudioRef.current;
    const url = ttsUrls[style];
    if (!audio || !url) return;
    if (ttsPlaying && ttsActiveStyle === style) {
      audio.pause();
      setTtsPlaying(false);
    } else {
      audio.src = url;
      audio.play().then(() => {
        setTtsActiveStyle(style);
        setTtsPlaying(true);
      }).catch(() => setTtsPlaying(false));
    }
  }, [ttsUrls, ttsPlaying, ttsActiveStyle]);

  // AI 한국어 발음 분석
  const fetchAiPronun = useCallback(async () => {
    if (!analysis || !scriptText.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiPronun(null);
    try {
      const res = await fetch('/api/analyze-pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText.trim(),
          transformed: analysis.transformed,
          patternIds: analysis.appliedPatterns,
        }),
      });
      const data = await res.json() as AiPronunciation & { error?: string };
      if (!res.ok || !data.textbook_ko) throw new Error(data.error ?? '분석 실패');
      setAiPronun(data);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : '분석 실패. 다시 시도해주세요.');
    } finally {
      setAiLoading(false);
    }
  }, [analysis, scriptText]);

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const loopAPct = duration && loopA !== null ? (loopA / duration) * 100 : null;
  const loopBPct = duration && loopB !== null ? (loopB / duration) * 100 : null;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="border-4 border-e-black bg-white shadow-hard">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-e-black p-3 sm:p-4">
        <h2 className="text-base font-black uppercase tracking-tighter sm:text-xl">
          📺 YouTube 클립
        </h2>
        <span className="hidden text-xs font-bold uppercase text-gray-400 sm:inline">
          좋아하는 영상 링크를 붙여넣기
        </span>
      </div>

      {/* URL input */}
      <div className="border-b-4 border-e-black p-3 sm:p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            className="min-w-0 flex-1 border-4 border-e-black px-2 py-2 text-sm font-bold focus:bg-e-yellow focus:outline-none sm:px-3 sm:text-base"
            placeholder="YouTube URL 붙여넣기"
          />
          <button
            onClick={handleLoad}
            className="shrink-0 border-4 border-e-black bg-e-red px-3 py-2 text-sm font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 sm:px-4"
          >
            불러오기
          </button>
        </div>
        {error && <div className="mt-2 text-sm font-bold text-e-red">{error}</div>}
        <div className="mt-2 text-xs font-bold text-gray-400">
          💡 좋아하는 스페인어 영상 URL을 넣으세요 — 브이로그, 팟캐스트, 드라마 뭐든 OK
        </div>
      </div>

      {/* YouTube embed */}
      <div className={`border-b-4 border-e-black ${videoId ? 'block' : 'hidden'}`}>
        <div
          ref={containerRef}
          className="aspect-video w-full bg-black [&_iframe]:h-full [&_iframe]:w-full"
        />
      </div>

      {!videoId && (
        <div className="border-b-4 border-e-black flex aspect-video items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mb-2 text-4xl">📺</div>
            <div className="text-sm font-bold uppercase text-gray-400">
              YouTube URL을 입력하면 여기에 영상이 로드됩니다
            </div>
          </div>
        </div>
      )}

      {/* Player controls */}
      <div className="border-b-4 border-e-black p-3 sm:p-4">
        <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-gray-400 sm:text-xs">
          재생 제어
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4 sm:gap-3">
          <button
            type="button"
            onClick={() => skipBySeconds(-SKIP_SECONDS)}
            disabled={!videoId}
            title={`${SKIP_SECONDS}초 뒤로 (키보드 ←)`}
            aria-label={`${SKIP_SECONDS}초 뒤로`}
            className="flex h-10 min-w-[3.25rem] items-center justify-center border-4 border-e-black bg-white px-2 text-xs font-black shadow-hard-sm transition-all hover:-translate-y-0.5 hover:bg-e-yellow disabled:opacity-30 sm:h-12 sm:min-w-[4rem] sm:px-3 sm:text-sm"
          >
            ⏪ {SKIP_SECONDS}s
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={!videoId}
            title="재생 / 일시정지 (스페이스)"
            aria-label={isPlaying ? '일시정지' : '재생'}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-e-black font-black shadow-hard-sm transition-all hover:-translate-y-0.5 disabled:opacity-30 sm:h-14 sm:w-14 ${
              isPlaying ? 'bg-e-black text-white' : 'bg-e-red text-white'
            }`}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            onClick={() => skipBySeconds(SKIP_SECONDS)}
            disabled={!videoId}
            title={`${SKIP_SECONDS}초 앞으로 (키보드 →)`}
            aria-label={`${SKIP_SECONDS}초 앞으로`}
            className="flex h-10 min-w-[3.25rem] items-center justify-center border-4 border-e-black bg-white px-2 text-xs font-black shadow-hard-sm transition-all hover:-translate-y-0.5 hover:bg-e-yellow disabled:opacity-30 sm:h-12 sm:min-w-[4rem] sm:px-3 sm:text-sm"
          >
            {SKIP_SECONDS}s ⏩
          </button>
          <div className="ml-auto text-right">
            <div className="text-xs font-bold tabular-nums sm:text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            <div className="hidden text-[10px] font-bold text-gray-400 sm:block">
              스페이스 재생 · ←→ {SKIP_SECONDS}초
            </div>
          </div>
        </div>

        <div
          onClick={seek}
          role="slider"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-label="재생 위치"
          className="relative mb-3 h-5 cursor-pointer border-4 border-e-black bg-gray-100 sm:mb-4 sm:h-6"
        >
          <div className="absolute left-0 top-0 h-full bg-e-black" style={{ width: `${progressPct}%` }} />
          {loopAPct !== null && (
            <div className="absolute top-0 h-full w-1 bg-e-green" style={{ left: `${loopAPct}%` }} title={`A: ${formatTime(loopA!)}`} />
          )}
          {loopBPct !== null && (
            <div className="absolute top-0 h-full w-1 bg-e-orange" style={{ left: `${loopBPct}%` }} title={`B: ${formatTime(loopB!)}`} />
          )}
          {loopAPct !== null && loopBPct !== null && (
            <div
              className="absolute top-0 h-full bg-e-yellow opacity-50"
              style={{ left: `${loopAPct}%`, width: `${loopBPct - loopAPct}%` }}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs font-bold uppercase text-gray-500">속도</span>
          <div className="flex flex-wrap gap-1">
            {YT_SPEEDS.map((s) => (
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
      <div className="flex flex-wrap items-center gap-1.5 p-3 sm:gap-2">
        <span className="text-xs font-bold uppercase text-gray-500">A-B 루프</span>
        <button
          onClick={() => setPoint('A')}
          disabled={!videoId}
          className="border-2 border-e-green bg-green-50 px-2 py-1 text-xs font-black text-green-700 hover:bg-green-100 disabled:opacity-30 sm:px-3"
        >
          [A] {loopA !== null ? formatTime(loopA) : '설정'}
        </button>
        <button
          onClick={() => setPoint('B')}
          disabled={!videoId}
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

      {/* ── 구간 스크립트 + 분석 ── */}
      {hasLoop && (
        <div className="border-t-4 border-e-black">

          {/* 스크립트 입력 */}
          <div className="border-b-4 border-e-black p-3 sm:p-4">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-black uppercase tracking-tighter sm:text-sm">
                📝 구간 스크립트
                <span className="ml-2 text-xs font-bold text-gray-400">
                  {formatTime(loopA!)} → {formatTime(loopB!)}
                </span>
              </div>
              <div className="flex shrink-0 gap-1">
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
            </div>

            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              className="w-full resize-none border-4 border-e-black px-2 py-2 text-base font-bold focus:bg-e-yellow focus:outline-none sm:px-3 sm:text-lg"
              rows={2}
              placeholder="이 구간에서 들리는 스페인어를 입력하세요..."
            />

            {/* Whisper 자동 추출 버튼 */}
            <div className="mt-2">
              {/* 사전 안내 (항상 표시) */}
              <div className="mb-2 border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-gray-500">
                <span className="text-gray-700">📋 버튼 클릭 후 브라우저 팝업에서:</span>
                <ol className="mt-1 list-inside list-decimal space-y-0.5">
                  <li><strong className="text-gray-800">Chrome 탭</strong> 선택 (이 탭)</li>
                  <li className="text-e-red"><strong>✅ "탭 오디오 공유" 체크박스 반드시 켜기</strong> ← 이게 핵심!</li>
                  <li>공유 버튼 클릭</li>
                </ol>
              </div>
              <button
                onClick={fetchCaption}
                disabled={captionLoading}
                className="w-full border-2 border-e-black bg-gray-900 py-2 text-xs font-black uppercase text-white transition-all hover:bg-e-black disabled:opacity-50"
              >
                {captionLoading
                  ? '🎙️ 녹음 중... (영상이 재생됩니다)'
                  : '🎙️ 구간 오디오 자동 인식 (Whisper)'}
              </button>
              {captionError && (
                <p className="mt-1 text-xs font-bold text-e-red">⚠️ {captionError}</p>
              )}
            </div>
          </div>

          {/* TTS 발음 패널 */}
          {scriptText.trim() && (
            <div className="border-b-4 border-e-black p-3 sm:p-4">
              <audio
                ref={scriptAudioRef}
                onEnded={() => setTtsPlaying(false)}
                className="hidden"
              />
              <div className="mb-2 text-xs font-bold uppercase text-gray-400">🔈 발음 듣기</div>
              <div className="flex gap-2">
                {(['textbook', 'natural'] as TtsStyle[]).map((style) => {
                  const label = style === 'textbook' ? '📖 교과서' : '🗣️ 실제';
                  const hasUrl = !!ttsUrls[style];
                  const isLoading = !!ttsLoading[style];
                  const isActive = ttsPlaying && ttsActiveStyle === style;
                  return (
                    <button
                      key={style}
                      onClick={() => hasUrl ? toggleTtsPlay(style) : generateTts(style)}
                      disabled={isLoading}
                      className={`flex-1 border-2 border-e-black py-2 text-xs font-black transition-colors disabled:opacity-50 ${
                        isActive ? 'bg-e-yellow' : hasUrl ? 'bg-green-50 hover:bg-e-yellow' : 'hover:bg-gray-50'
                      }`}
                    >
                      {isLoading ? '생성 중...' : isActive ? '⏸ ' + label : hasUrl ? '▶ ' + label : label + ' 생성'}
                    </button>
                  );
                })}
              </div>
              {ttsError && <p className="mt-1 text-xs font-bold text-e-red">⚠️ {ttsError}</p>}
            </div>
          )}

          {/* 연음 분석 결과 */}
          {scriptMode !== 'off' && analysis && (
            <div className="p-3 sm:p-4">

              {/* 원문 텍스트 (깔끔하게) */}
              <div className="mb-3 rounded border-2 border-gray-200 bg-gray-50 px-3 py-2 text-base font-bold leading-relaxed text-gray-700">
                {scriptText.trim()}
              </div>

              {scriptMode === 'es+phonetic' && (
                <>
                  {/* AI 한국어 발음 */}
                  {!aiPronun && !aiLoading && !aiError && (
                    <button
                      onClick={fetchAiPronun}
                      className="w-full border-2 border-e-black bg-e-black py-2.5 text-sm font-black text-white transition-all hover:bg-e-red"
                    >
                      🇰🇷 한국어로 어떻게 들리는지 보기
                    </button>
                  )}

                  {aiLoading && (
                    <div className="flex items-center gap-2 py-3 text-sm font-bold text-gray-400">
                      <span className="animate-pulse">⏳</span> 분석 중...
                    </div>
                  )}

                  {aiError && (
                    <div className="mb-2 rounded border-2 border-e-red bg-red-50 px-3 py-2 text-xs font-bold text-e-red">
                      ⚠️ {aiError}
                      <button onClick={fetchAiPronun} className="ml-3 underline">
                        다시 시도
                      </button>
                    </div>
                  )}

                  {aiPronun && (
                    <div className="border-4 border-e-black">
                      {/* 의역 */}
                      <div className="border-b-4 border-e-black bg-gray-50 px-3 py-2.5">
                        <div className="mb-0.5 text-xs font-bold uppercase text-gray-400">🇰🇷 의역</div>
                        <div className="text-sm font-black text-gray-800">{aiPronun.translation_ko}</div>
                      </div>
                      {/* 발음 비교 */}
                      <div className="grid grid-cols-1 divide-y-4 divide-e-black sm:grid-cols-2 sm:divide-x-4 sm:divide-y-0">
                        <div className="p-3">
                          <div className="mb-1 text-xs font-bold uppercase text-gray-400">또박또박</div>
                          <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-sm font-black leading-relaxed text-gray-700">
                            {aiPronun.textbook_ko.split('/').filter(c => c.trim()).map((chunk, i) => (
                              <span key={i} className="whitespace-nowrap">
                                {i > 0 && <span className="mr-1 text-gray-300">·</span>}
                                {chunk.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-e-yellow p-3">
                          <div className="mb-1 text-xs font-bold uppercase text-gray-600">실제로 들리는</div>
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-black leading-relaxed text-e-black">
                            {aiPronun.real_ko.split(' ').filter(Boolean).map((chunk, i) => (
                              <span key={i} className="whitespace-nowrap">{chunk}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* 설명 */}
                      <div className="border-t-4 border-e-black bg-e-black px-3 py-2 text-xs font-bold text-gray-300">
                        {aiPronun.explain}
                      </div>
                      <button
                        onClick={fetchAiPronun}
                        className="w-full border-t border-gray-200 py-1.5 text-xs font-bold text-gray-400 hover:bg-gray-50"
                      >
                        ↺ 다시 분석
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {scriptMode !== 'off' && !analysis && (
            <div className="flex items-center gap-2 p-4 text-sm font-bold text-gray-400">
              ☝️ 위에서 스크립트를 입력하거나 Whisper로 자동 추출하세요
            </div>
          )}
        </div>
      )}
    </div>
  );
}
