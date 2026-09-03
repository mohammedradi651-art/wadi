import './globals.css';

export const metadata = {
  title: 'منظومة الوادي | تجديد الكروت',
  description: 'استعلام وتجديد كروت منظومة الوادي',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
