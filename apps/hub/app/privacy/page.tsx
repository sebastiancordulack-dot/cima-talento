import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Política de Privacidad — CiMA Talento',
  description:
    'Cómo CiMA Sales Strategies recopila, usa y protege los datos de las personas que se postulan a través de nuestros formularios y anuncios.',
};

// Public page (no auth) — used as the Privacy Policy URL for the Meta app and
// for candidates. This is a starting template; have it reviewed before relying
// on it legally.
const UPDATED = '16 de junio de 2026';
const CONTACT_EMAIL = 'talento@cimasales.com';

const LINK_CLASS = 'font-medium text-brand-700 underline hover:text-brand-800';

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-lg font-semibold text-stone-900">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-6 text-stone-600">{children}</p>;
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex justify-center">
        <Image src="/cima-logo.png" alt="CiMA" width={110} height={36} />
      </div>
      <article className="rounded-2xl border border-stone-200/70 bg-white p-6 shadow-card sm:p-10">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Política de Privacidad
        </h1>
        <p className="mt-1 text-sm text-stone-500">Última actualización: {UPDATED}</p>

        <P>
          Esta Política de Privacidad describe cómo <strong>CiMA Sales Strategies</strong> («CiMA»,
          «nosotros») recopila, usa, comparte y protege la información personal de las personas que
          muestran interés en oportunidades de trabajo con nosotros, ya sea a través de nuestros
          anuncios y formularios en Meta (Facebook e Instagram), nuestros formularios en línea o
          nuestro sitio web.
        </P>

        <H2>Información que recopilamos</H2>
        <P>
          Cuando te postulas o expresas interés, podemos recopilar: tu nombre, correo electrónico,
          número de teléfono, ciudad/estado de residencia y las respuestas que proporcionas en el
          formulario (por ejemplo, disponibilidad o si cuentas con vehículo). No solicitamos
          información sensible ni documentos de identidad a través de estos formularios.
        </P>

        <H2>Cómo recopilamos la información</H2>
        <P>
          Recopilamos esta información directamente de ti cuando completas un formulario de contacto
          de Meta Lead Ads, un formulario en línea o nos contactas por otros medios. Cuando usas un
          formulario de Meta, Meta nos transmite los datos que ingresaste, de acuerdo con sus propias
          políticas.
        </P>

        <H2>Cómo usamos la información</H2>
        <P>
          Usamos tu información únicamente con fines de reclutamiento: para contactarte sobre
          oportunidades de trabajo, evaluar tu candidatura, coordinar entrevistas y, si avanzas,
          incorporarte a nuestra red de talento para futuras activaciones. Al postularte, aceptas ser
          contactada/o sobre estas oportunidades.
        </P>

        <H2>Cómo compartimos la información</H2>
        <P>
          No vendemos tu información personal. La compartimos únicamente con proveedores de servicios
          que nos ayudan a operar nuestra plataforma de reclutamiento —por ejemplo, alojamiento de
          base de datos y envío de correos electrónicos— quienes solo pueden usar los datos para
          prestarnos ese servicio. También podemos divulgar información cuando la ley lo requiera.
        </P>

        <H2>Conservación de los datos</H2>
        <P>
          Conservamos tu información mientras sea necesaria para los fines de reclutamiento descritos o
          hasta que solicites su eliminación. Después, la eliminamos o anonimizamos.
        </P>

        <H2>Tus derechos y eliminación de datos</H2>
        <P>
          Puedes solicitar acceder, corregir o eliminar tu información personal, o dejar de recibir
          nuestras comunicaciones, en cualquier momento. Para hacerlo, escríbenos a{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={LINK_CLASS}>
            {CONTACT_EMAIL}
          </a>{' '}
          con el asunto «Eliminación de datos» e indícanos el correo o teléfono con el que te
          postulaste. Procesaremos tu solicitud en un plazo razonable.
        </P>

        <H2>Contacto</H2>
        <P>
          Si tienes preguntas sobre esta Política de Privacidad o sobre el tratamiento de tus datos,
          contáctanos en{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={LINK_CLASS}>
            {CONTACT_EMAIL}
          </a>
          .
        </P>

        <p className="mt-10 border-t border-stone-200 pt-6 text-xs text-stone-400">
          © {new Date().getFullYear()} CiMA Sales Strategies. Todos los derechos reservados.
        </p>
      </article>
    </main>
  );
}
