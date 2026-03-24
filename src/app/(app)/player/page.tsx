'use client';

import { useState } from 'react';
import Link from 'next/link';
import YouTubePlayer from '@/components/audio/YouTubePlayer';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { EXAMPLE_PHRASES } from '@/lib/enlace-engine';
import LoginGate from '@/components/auth/LoginGate';

type Tab = 'youtube' | 'tts';

interface ChannelInfo {
  icon: string;
  name: string;
  type: string;
  desc: string;
  url: string;
}

const RECOMMENDED_CHANNELS: { vlog: ChannelInfo[]; podcast: ChannelInfo[] } = {
  vlog: [
    {
      icon: '🎬',
      name: 'Lola Lolita',
      type: '라이프스타일 · 여행 · 일상',
      desc: '스페인 Z세대 대표 크리에이터. 빠른 속도, 강한 연음.',
      url: 'https://www.youtube.com/@lolalolita',
    },
    {
      icon: '🎬',
      name: 'Sofía Valencia',
      type: '라이프스타일 · 여행',
      desc: '자연스러운 구어체, 감정 풍부한 발화.',
      url: 'https://www.youtube.com/@SofiaValencia',
    },
    {
      icon: '🎬',
      name: 'Paula Gonu',
      type: '뷰티 · 일상 · 유머',
      desc: '자연스러운 일상 대화체. 유머 + 솔직한 톤.',
      url: 'https://www.youtube.com/@PaulaGonu',
    },
    {
      icon: '🎬',
      name: 'Dulceida',
      type: '패션 · 여행 · 이벤트',
      desc: '에너지 넘치는 빠른 속도.',
      url: 'https://www.youtube.com/@dulceida',
    },
    {
      icon: '🎬',
      name: 'Marta Díaz',
      type: '챌린지 · 댄스 · 일상',
      desc: '매우 빠르고 감정적. Z세대 속도의 까스떼야노.',
      url: 'https://www.youtube.com/@martadiaz1',
    },
  ],
  podcast: [
    {
      icon: '🎙️',
      name: 'Tómatelo con Vino',
      type: '라이프스타일 팟캐스트',
      desc: '2인 대화 + 게스트 인터뷰. 자연스러운 대화 리듬.',
      url: 'https://www.youtube.com/@tomateloconvino.podcast',
    },
    {
      icon: '🎙️',
      name: 'Podium Podcast',
      type: '프로페셔널 팟캐스트',
      desc: '뉴스, 다큐, 사회. 격식체이면서도 자연스러운 연음.',
      url: 'https://www.youtube.com/@podiumpodcast',
    },
  ],
};

export default function PlayerPage() {
  const [tab, setTab] = useState<Tab>('youtube');
  const [ttsInput, setTtsInput] = useState('Vamos a estar en Barcelona');
  const [ttsActiveText, setTtsActiveText] = useState('Vamos a estar en Barcelona');

  return (
    <LoginGate featureName="클립 플레이어">
    <div className="min-h-screen bg-e-white">
      {/* Header */}
      <header className="border-b-4 border-e-black bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href="/"
            className="text-xl font-black uppercase tracking-tighter hover:text-e-red sm:text-2xl"
          >
            ← Enlázate
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="bg-e-black px-1.5 py-0.5 text-[10px] font-bold uppercase text-white sm:px-2 sm:py-1 sm:text-xs">
              STEP 02
            </span>
            <span className="text-xs font-black uppercase sm:text-sm">👂 HEAR</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Tab selector */}
        <div className="mb-6 flex border-4 border-e-black">
          <button
            onClick={() => setTab('youtube')}
            className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-black uppercase transition-colors sm:gap-2 sm:py-3 sm:text-sm ${
              tab === 'youtube'
                ? 'bg-e-black text-white'
                : 'bg-white hover:bg-e-yellow'
            }`}
          >
            📺 YouTube
            <span className="hidden min-[480px]:inline">클립</span>
            <span className="rounded bg-e-red px-1 py-0.5 text-[10px] text-white sm:px-1.5 sm:text-xs">핵심</span>
          </button>
          <button
            onClick={() => setTab('tts')}
            className={`flex flex-1 items-center justify-center gap-1 border-l-4 border-e-black py-2.5 text-xs font-black uppercase transition-colors sm:gap-2 sm:py-3 sm:text-sm ${
              tab === 'tts'
                ? 'bg-e-black text-white'
                : 'bg-white hover:bg-e-yellow'
            }`}
          >
            🔊 <span className="hidden min-[480px]:inline">교과서 vs 실제</span><span className="min-[480px]:hidden">TTS 비교</span>
          </button>
        </div>

        {/* YouTube tab */}
        {tab === 'youtube' && (
          <div className="space-y-4">
            <YouTubePlayer />

            {/* 사용법 안내 */}
            <div className="border-4 border-e-black bg-e-yellow p-3 text-xs font-bold text-gray-700">
              💡 사용법: 영상 재생 중 어려운 구간에서 <span className="bg-green-100 px-1 text-green-700">[A]</span> →
              듣기 끝 지점에서 <span className="bg-orange-100 px-1 text-orange-700">[B]</span> 설정 →
              구간 스크립트 입력 → 연음 구조 자동 분석
            </div>

            {/* 추천 채널 (폴백) */}
            <div className="border-4 border-dashed border-e-black bg-white p-4">
              <div className="mb-1 text-sm font-black uppercase tracking-tighter">
                아직 영상을 찾고 있나요?
              </div>
              <div className="mb-4 text-xs font-bold text-gray-500">
                이런 스페인어 채널로 시작해보세요 💡 YouTube에서 마음에 드는 영상을 찾아 링크를 붙여넣으세요!
              </div>

              {/* 브이로그 / 라이프스타일 */}
              <div className="mb-3 text-xs font-black uppercase text-gray-400">브이로그 · 라이프스타일</div>
              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {RECOMMENDED_CHANNELS.vlog.map((ch) => (
                  <a
                    key={ch.name}
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 border-2 border-e-black p-3 transition-all hover:-translate-y-0.5 hover:bg-e-yellow"
                  >
                    <span className="text-lg">{ch.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black">{ch.name}</div>
                      <div className="text-xs text-gray-500">{ch.type}</div>
                      <div className="mt-1 text-xs font-bold text-gray-600">{ch.desc}</div>
                    </div>
                    <span className="shrink-0 text-xs font-black text-e-red">→</span>
                  </a>
                ))}
              </div>

              {/* 팟캐스트 */}
              <div className="mb-3 text-xs font-black uppercase text-gray-400">팟캐스트 · 대화형</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {RECOMMENDED_CHANNELS.podcast.map((ch) => (
                  <a
                    key={ch.name}
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 border-2 border-e-black p-3 transition-all hover:-translate-y-0.5 hover:bg-e-yellow"
                  >
                    <span className="text-lg">{ch.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black">{ch.name}</div>
                      <div className="text-xs text-gray-500">{ch.type}</div>
                      <div className="mt-1 text-xs font-bold text-gray-600">{ch.desc}</div>
                    </div>
                    <span className="shrink-0 text-xs font-black text-e-red">→</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TTS Comparison tab */}
        {tab === 'tts' && (
          <div className="space-y-4">
            {/* Text input for TTS */}
            <div className="border-4 border-e-black bg-white p-4 shadow-hard">
              <div className="mb-3 text-sm font-black uppercase tracking-tighter">
                비교할 문장 입력
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ttsInput}
                  onChange={(e) => setTtsInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && ttsInput.trim() && setTtsActiveText(ttsInput.trim())
                  }
                  className="min-w-0 flex-1 border-4 border-e-black px-2 py-2 text-base font-bold focus:bg-e-yellow focus:outline-none sm:px-3 sm:text-lg"
                  placeholder="스페인어 문장..."
                />
                <button
                  onClick={() => ttsInput.trim() && setTtsActiveText(ttsInput.trim())}
                  className="shrink-0 border-4 border-e-black bg-e-red px-3 py-2 font-black uppercase text-white shadow-hard-sm transition-all hover:-translate-y-0.5 sm:px-4"
                >
                  확인
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLE_PHRASES.map((ex) => (
                  <button
                    key={ex.text}
                    onClick={() => {
                      setTtsInput(ex.text);
                      setTtsActiveText(ex.text);
                    }}
                    className="border-2 border-e-black px-2 py-1 text-xs font-bold hover:bg-e-yellow"
                  >
                    {ex.text}
                  </button>
                ))}
              </div>
            </div>

            <AudioPlayer key={ttsActiveText} text={ttsActiveText} />

            <div className="border-4 border-dashed border-e-black p-3 text-xs font-bold text-gray-500">
              🔊 Google Cloud TTS (es-ES-Neural2) 사용 · 교과서(여성/0.75x) vs 실제(남성/1.05x) ·
              .env.local에 GOOGLE_TTS_API_KEY 필요
            </div>
          </div>
        )}
      </main>
    </div>
    </LoginGate>
  );
}
