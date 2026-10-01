import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lemdiklat Polri — Portal Executive',
  description:
    'Portal pemantauan eksekutif LMS PRESISI Lemdiklat Polri — capaian, laporan, dan analitik pendidikan.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
