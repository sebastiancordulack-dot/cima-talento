import type { Metadata } from 'next';
import Image from 'next/image';
import { ResumeUpload } from '@/components/cv/ResumeUpload';
import { getCandidateByUploadToken } from '@/lib/candidates/resume';
import { resolveHmCalendlyLink } from '@/lib/email/calendly';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sube tu currículum — CiMA Talento',
  robots: { index: false, follow: false }, // tokenized, private link
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 flex justify-center">
          <Image src="/cima-logo.png" alt="CiMA" width={130} height={42} priority />
        </div>
        <div className="rounded-2xl border border-stone-200/70 bg-white p-6 shadow-card">{children}</div>
      </div>
    </main>
  );
}

export default async function CvUploadPage({ params }: { params: { token: string } }) {
  const candidate = await getCandidateByUploadToken(params.token);

  if (!candidate) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-stone-900">Enlace no válido</h1>
        <p className="mt-2 text-sm text-stone-600">
          Este enlace no es válido o ya expiró. Si crees que es un error, responde al correo que
          recibiste de CiMA Talento y te ayudamos.
        </p>
      </Shell>
    );
  }

  const calendlyLink = await resolveHmCalendlyLink(candidate.metro_area);

  return (
    <Shell>
      <ResumeUpload
        token={params.token}
        firstName={candidate.first_name}
        alreadyUploaded={!!candidate.resume_uploaded_at}
        filename={candidate.resume_filename}
        calendlyLink={calendlyLink}
      />
    </Shell>
  );
}
