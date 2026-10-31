import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quản trị – Giao thông an toàn',
  description: 'Quản lý camera, biển báo, báo cáo cộng đồng',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="h-screen bg-white text-slate-900">{children}</body>
    </html>
  );
}
