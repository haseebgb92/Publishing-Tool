import type { Metadata } from 'next';
import {
  Inter, Playfair_Display, Amiri, Gulzar, Scheherazade_New,
  Cairo, Lateef, Noto_Nastaliq_Urdu, Roboto, Lato, Merriweather
} from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-english-body' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-english-head' });
const amiri = Amiri({ weight: ['400', '700'], subsets: ['arabic'], variable: '--font-arabic' });
const gulzar = Gulzar({ weight: ['400'], subsets: ['latin'], variable: '--font-urdu' });
const scheherazade = Scheherazade_New({ weight: ['400', '700'], subsets: ['arabic'], variable: '--font-arabic-uthmanic' });
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo' });
const lateef = Lateef({ weight: ['400', '600', '800'], subsets: ['arabic'], variable: '--font-lateef' });
const notoNastaliq = Noto_Nastaliq_Urdu({ weight: ['400', '700'], subsets: ['arabic'], variable: '--font-noto-nastaliq' });
const roboto = Roboto({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-roboto' });
const lato = Lato({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-lato' });
const merriweather = Merriweather({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-merriweather' });
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
      <body className={`${inter.variable} ${playfair.variable} ${amiri.variable} ${gulzar.variable} ${scheherazade.variable} 
        ${cairo.variable} ${lateef.variable} ${notoNastaliq.variable} ${roboto.variable} ${lato.variable} ${merriweather.variable} 
        font-sans`}>
        {children}
      </body>
    </html>
  );
}
