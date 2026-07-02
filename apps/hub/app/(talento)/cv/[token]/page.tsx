import type { Metadata } from 'next';
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <p className="mb-4 text-center text-sm font-semibold tracking-wide text-gray-400">CiMA TALENTO</p>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}

export default async function CvUploadPage({ params }: { params: { token: string } }) {
  const candidate = await getCandidateByUploadToken(params.token);

  if (!candidate) {
    return (
      <Shell>
        <h1 className="text-lg font-bold text-gray-900">Enlace no válido</h1>
        <p className="mt-2 text-sm text-gray-600">
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
