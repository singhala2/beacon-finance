import type { ReactNode } from 'react';
import { Footer } from '@/components/legal/Footer';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>{children}</div>
      <Footer />
    </div>
  );
}
