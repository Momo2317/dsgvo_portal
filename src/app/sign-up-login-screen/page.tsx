import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import AuthPageClient from './components/AuthPageClient';

export default function SignUpLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      }
    >
      <AuthPageClient />
    </Suspense>
  );
}
