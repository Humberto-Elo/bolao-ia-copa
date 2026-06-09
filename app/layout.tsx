import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bolão IA da Copa',
  description: 'Bolão inteligente com palpites, ranking e análise por IA.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
