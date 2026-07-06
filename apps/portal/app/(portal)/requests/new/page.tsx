import Link from 'next/link';
import { NewRequestForm } from '@/components/NewRequestForm';
import { requireBrandClient } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Submit New Request (Brief §13.2) — two steps: pick the activation type,
// then the type's form.
export default async function NewRequestPage() {
  const client = await requireBrandClient();
  const brands = client.brands.length > 0 ? client.brands : [client.company_name];

  return (
    <div>
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Submit New Request</h1>
      <p className="mt-1 text-sm text-gray-500">
        Tell us what you need — our team reviews every request and follows up with a quote.
      </p>
      <div className="mt-6">
        <NewRequestForm brands={brands} />
      </div>
    </div>
  );
}
