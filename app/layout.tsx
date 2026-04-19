import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BlokPOST Demo',
  description: 'Демо-версия системы управленческой отчетности',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
