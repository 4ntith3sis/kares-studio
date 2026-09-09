import type { Metadata } from 'next';
import { DM_Mono, Instrument_Serif, Space_Grotesk } from 'next/font/google';
import { CartProvider } from '@/components/cart/CartStore';
import './globals.css';

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-grotesk',
  display: 'swap',
});

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const mono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kares Studio.',
  description: 'KARES STUDIO — Essential Apparel & Fashion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${grotesk.variable} ${serif.variable} ${mono.variable}`}
    >
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
