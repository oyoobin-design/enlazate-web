/**
 * 랜딩 페이지용 오디오 파일 1회 생성 스크립트
 * 실행: node scripts/generate-landing-audio.mjs
 * .env.local의 GOOGLE_TTS_API_KEY 필요
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env.local 수동 파싱
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKey = envContent
  .split('\n')
  .find((l) => l.startsWith('GOOGLE_TTS_API_KEY='))
  ?.split('=')
  .slice(1)
  .join('=')
  .trim();

if (!apiKey) {
  console.error('GOOGLE_TTS_API_KEY not found in .env.local');
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function generateAudio(text, filename, style) {
  const voiceName = style === 'textbook' ? 'es-ES-Neural2-A' : 'es-ES-Neural2-B';
  const speakingRate = style === 'textbook' ? 1.0 : 1.25;

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'es-ES', name: voiceName },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate,
          pitch: 0,
          effectsProfileId: ['headphone-class-device'],
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message ?? 'Google TTS 실패');
  }

  const { audioContent } = await res.json();
  const buffer = Buffer.from(audioContent, 'base64');
  const outPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ 저장 완료: public/audio/${filename}`);
}

// 자연스러운 속도 (원어민처럼)
await generateAudio('¿Qué vas a hacer?', 'que-vas-a-hacer.mp3', 'natural');
