import type { Metadata } from 'next';
import { Inter, Playfair_Display, Amiri, Gulzar, Scheherazade_New } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-english-body' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-english-head' });
const amiri = Amiri({ weight: ['400', '700'], subsets: ['arabic'], variable: '--font-arabic' });
const gulzar = Gulzar({ weight: ['400'], subsets: ['latin'], variable: '--font-urdu' });
const scheherazade = Scheherazade_New({ weight: ['400', '700'], subsets: ['arabic'], variable: '--font-arabic-uthmanic' });
// Gulzar subset latin is required arg, though it renders arabic glyphs.

export const metadata: Metadata = {
  title: 'AD Publishing',
  description: 'Interactive formatting tool for Islamic texts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${amiri.variable} ${gulzar.variable} ${scheherazade.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
