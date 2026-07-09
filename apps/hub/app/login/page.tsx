import { Suspense } from 'react';
import Image from 'next/image';
import { LoginForm } from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Image src="/cima-logo.png" alt="CiMA" width={148} height={48} priority />
        </div>
        <div className="rounded-2xl border border-stone-200/70 bg-white p-8 shadow-card">
          <h1 className="text-lg font-semibold tracking-tight text-stone-900">CiMA Hub</h1>
          <p className="mt-1 text-sm text-stone-500">Acceso del equipo</p>
          <div className="mt-6">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
