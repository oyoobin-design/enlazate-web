import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/require-auth';

const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export async function POST(req: NextRequest) {
  const { response: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const { text, style } = await req.json() as { text: string; style: 'textbook' | 'natural' | 'dictation' };

    if (!text?.trim()) {
      return NextResponse.json({ error: '텍스트를 입력해주세요' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_TTS_API_KEY가 설정되지 않았습니다' }, { status: 500 });
    }

    // 교과서:  여성 음성 / 1.0x (또박또박)
    // 실제:    남성 음성 / 1.25x (자연스러운 연결)
    // 딕테이션: 남성 음성 / 0.9x (받아쓰기용 약간 느리게)
    const voiceName = style === 'textbook' ? 'es-ES-Neural2-A' : 'es-ES-Neural2-B';
    const speakingRate = style === 'textbook' ? 1.0 : style === 'dictation' ? 1.0 : 1.25;

    const res = await fetch(`${GOOGLE_TTS_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'es-ES',
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate,
          pitch: 0,
          effectsProfileId: ['headphone-class-device'],
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: err?.error?.message ?? 'Google TTS 실패' },
        { status: res.status },
      );
    }

    const { audioContent } = await res.json() as { audioContent: string };
    const buffer = Buffer.from(audioContent, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TTS 생성 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
