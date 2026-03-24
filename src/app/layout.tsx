import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Enlázate — 스페인어 연음 귀뚫기',
  description: '교과서 스페인어는 그만. 진짜 소리를 연결하면, 네이티브처럼 들린다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-e-white text-e-black antialiased">{children}</body>
    </html>
  );
}
