import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/supabase/require-auth';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { response: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY 없음' }, { status: 500 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: '오디오 파일이 없습니다' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es',
      prompt: '스페인어 구어체 대화입니다. 연음, 축약, 빠른 발화를 포함합니다.',
    });

    const text = transcription.text.trim();
    if (!text) {
      return NextResponse.json({ error: '음성을 인식하지 못했습니다. 볼륨을 높이고 다시 시도해주세요.' }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
