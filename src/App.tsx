import { FormEvent, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';

type ConsultantDocumentType = 'DNI' | 'CE' | 'RUC';
type TargetDocumentType = 'DNI' | 'RUC';

type FormState = {
  consultantName: string;
  consultantDocumentType: ConsultantDocumentType;
  consultantDocumentNumber: string;
  whatsapp: string;
  targetDocumentType: TargetDocumentType;
  targetDocumentNumber: string;
  consent: boolean;
};

type SubmissionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

const initialForm: FormState = {
  consultantName: '',
  consultantDocumentType: 'DNI',
  consultantDocumentNumber: '',
  whatsapp: '',
  targetDocumentType: 'DNI',
  targetDocumentNumber: '',
  consent: false,
};

const privacyText =
  'Autorizo el tratamiento de mis datos personales para registrar y atender esta solicitud de consulta informativa de protestos, incluyendo la comunicación del resultado por WhatsApp.';

const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined;
const brandLogoUrl =
  'https://camaraica.org.pe/wp-content/uploads/2026/03/LOGO-FULL-COLOR-scaled.webp';

const fieldClass = 'grid min-w-0 grid-rows-[auto_44px_auto] gap-1.5';
const fieldFullClass = `${fieldClass} md:col-span-2`;
const labelTextClass = 'min-h-5 text-[0.84rem] font-semibold leading-5 text-[#30413b]';
const controlClass =
  'h-11 w-full rounded-md border border-[#dbe2dd] bg-white px-3 py-2 text-[0.95rem] leading-none text-[#0c211c] outline-none transition focus:border-[#0c211c] focus:ring-3 focus:ring-[#0c211c]/10 disabled:cursor-not-allowed disabled:bg-[#f5f7f5] disabled:text-[#63786d] read-only:cursor-not-allowed read-only:bg-[#f5f7f5] read-only:text-[#63786d] aria-invalid:border-[#b42318]';
const errorClass = 'min-h-4 text-[0.8rem] leading-4 text-[#b42318]';
const fieldsetClass =
  'grid grid-cols-1 items-start gap-x-[18px] gap-y-4 border-b border-[#eef1ee] pb-[22px] md:grid-cols-2';
const legendClass =
  'col-span-full mb-0.5 flex items-center gap-2 text-[0.94rem] font-extrabold text-[#0c211c] before:h-[18px] before:w-1.5 before:rounded-full before:bg-[#2a7221] before:content-[""]';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function normalizeWhatsapp(value: string) {
  return value.replace(/[^\d+]/g, '');
}

function validateDocument(type: ConsultantDocumentType | TargetDocumentType, value: string) {
  const cleaned = onlyDigits(value);

  if (type === 'DNI') {
    return cleaned.length === 8;
  }

  if (type === 'RUC') {
    return cleaned.length === 11;
  }

  return /^[a-zA-Z0-9]{8,12}$/.test(value.trim());
}

function validateForm(form: FormState) {
  const errors: Partial<Record<keyof FormState, string>> = {};

  if (form.consultantName.trim().length < 3) {
    errors.consultantName = 'Ingresa el nombre completo del consultor.';
  }

  if (!validateDocument(form.consultantDocumentType, form.consultantDocumentNumber)) {
    errors.consultantDocumentNumber = 'El documento del consultor no tiene un formato válido.';
  }

  if (!/^\+?\d{9,15}$/.test(normalizeWhatsapp(form.whatsapp))) {
    errors.whatsapp = 'Ingresa un WhatsApp válido.';
  }

  if (!validateDocument(form.targetDocumentType, form.targetDocumentNumber)) {
    errors.targetDocumentNumber = 'El documento consultado no tiene un formato válido.';
  }

  if (!form.consent) {
    errors.consent = 'Debes aceptar el tratamiento de datos personales.';
  }

  return errors;
}

function App() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' });
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});

  const errors = useMemo(() => validateForm(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmission({ status: 'idle' });
  }

  function markTouched(field: keyof FormState) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setTouched({
      consultantName: true,
      consultantDocumentNumber: true,
      whatsapp: true,
      targetDocumentNumber: true,
      consent: true,
    });

    if (hasErrors) {
      setSubmission({
        status: 'error',
        message: 'Revisa los campos marcados antes de enviar la solicitud.',
      });
      return;
    }

    if (!webhookUrl) {
      setSubmission({
        status: 'error',
        message: 'Falta configurar el webhook de n8n.',
      });
      return;
    }

    const payload = {
      consultor: {
        nombres: form.consultantName.trim(),
        tipoDocumento: form.consultantDocumentType,
        numeroDocumento: onlyDigits(form.consultantDocumentNumber),
        whatsapp: normalizeWhatsapp(form.whatsapp),
      },
      consultado: {
        tipoDocumento: form.targetDocumentType,
        numeroDocumento: onlyDigits(form.targetDocumentNumber),
      },
      consentimiento: {
        aceptado: form.consent,
        texto: privacyText,
      },
      origen: {
        canal: 'formulario-web',
        producto: 'consulta-protestos-mvp',
        enviadoEn: new Date().toISOString(),
      },
    };

    try {
      setSubmission({ status: 'submitting' });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook respondió con estado ${response.status}`);
      }

      setSubmission({
        status: 'success',
        message: 'Solicitud registrada. Te enviaremos la respuesta por WhatsApp.',
      });
      setForm(initialForm);
      setTouched({});
    } catch {
      setSubmission({
        status: 'error',
        message: 'No pudimos registrar la solicitud. Intenta nuevamente en unos minutos.',
      });
    }
  }

  function errorFor(field: keyof FormState) {
    return touched[field] ? errors[field] : undefined;
  }

  const messageClass =
    submission.status === 'success'
      ? 'border-[#9ccf93] bg-[#f2faef] text-[#2a7221]'
      : submission.status === 'error'
        ? 'border-[#f0b5aa] bg-[#fff1ef] text-[#9f2a1c]'
        : 'border-[#d5c8f7] bg-[#f6f2ff] text-[#2f0e6d]';

  return (
    <main className="min-h-screen bg-[#E1F9F0] px-4 py-8 font-sans text-[#0c211c] antialiased md:py-[34px]">
      <section
        className="mx-auto w-full max-w-[960px] overflow-hidden rounded-lg border border-[#e3e8e4] bg-white shadow-[0_18px_44px_rgba(12,33,28,0.08)]"
        aria-labelledby="page-title"
      >
        <div className="flex flex-col items-start gap-3 border-b border-[#eef1ee] bg-white px-[18px] py-4 md:flex-row md:items-center md:justify-between md:gap-6 md:px-[26px]">
          <img
            className="block h-auto w-[min(236px,60vw)]"
            src={brandLogoUrl}
            alt="Cámara de Comercio de Ica"
          />
          <span className="rounded-full border border-[#2a7221]/20 px-3 py-1 text-[0.72rem] font-extrabold uppercase text-[#2a7221] md:whitespace-nowrap">
            Protestos y moras
          </span>
        </div>

        <div className="border-b border-[#dfe7e2] bg-[#0c211c] px-[18px] pb-6 pt-[22px] md:px-[26px] md:pb-7 md:pt-[26px]">
          <div>
            <p className="mb-2 text-[0.72rem] font-bold uppercase text-[#b6eb66]">
              Consulta informativa
            </p>
            <h1
              className="text-[clamp(1.45rem,2.1vw,1.95rem)] leading-tight text-white"
              id="page-title"
            >
              Solicitud de consulta de protestos
            </h1>
          </div>
        </div>

        <form
          className="grid gap-[22px] px-[18px] pb-6 pt-[18px] md:px-[26px] md:pb-[26px] md:pt-5"
          onSubmit={handleSubmit}
          noValidate
        >
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Datos del consultor</legend>

            <label className={fieldFullClass}>
              <span className={labelTextClass}>Nombres y apellidos</span>
              <input
                className={controlClass}
                autoComplete="name"
                value={form.consultantName}
                onBlur={() => markTouched('consultantName')}
                onChange={(event) => updateField('consultantName', event.target.value)}
                aria-invalid={Boolean(errorFor('consultantName'))}
              />
              {errorFor('consultantName') && (
                <small className={errorClass}>{errorFor('consultantName')}</small>
              )}
            </label>

            <label className={fieldClass}>
              <span className={labelTextClass}>Tipo de documento</span>
              <select
                className={controlClass}
                value={form.consultantDocumentType}
                onChange={(event) =>
                  updateField('consultantDocumentType', event.target.value as ConsultantDocumentType)
                }
              >
                <option value="DNI">DNI</option>
                <option value="CE">CE</option>
                <option value="RUC">RUC</option>
              </select>
            </label>

            <label className={fieldClass}>
              <span className={labelTextClass}>Número</span>
              <input
                className={controlClass}
                inputMode={form.consultantDocumentType === 'CE' ? 'text' : 'numeric'}
                value={form.consultantDocumentNumber}
                onBlur={() => markTouched('consultantDocumentNumber')}
                onChange={(event) => updateField('consultantDocumentNumber', event.target.value)}
                aria-invalid={Boolean(errorFor('consultantDocumentNumber'))}
              />
              {errorFor('consultantDocumentNumber') && (
                <small className={errorClass}>{errorFor('consultantDocumentNumber')}</small>
              )}
            </label>

            <label className={fieldFullClass}>
              <span className={labelTextClass}>WhatsApp</span>
              <input
                className={controlClass}
                autoComplete="tel"
                inputMode="tel"
                placeholder="+51999999999"
                value={form.whatsapp}
                onBlur={() => markTouched('whatsapp')}
                onChange={(event) => updateField('whatsapp', event.target.value)}
                aria-invalid={Boolean(errorFor('whatsapp'))}
              />
              {errorFor('whatsapp') && <small className={errorClass}>{errorFor('whatsapp')}</small>}
            </label>

          </fieldset>

          <fieldset className="grid grid-cols-1 items-start gap-x-[18px] gap-y-4 md:grid-cols-2">
            <legend className={legendClass}>Documento a consultar</legend>

            <label className={fieldClass}>
              <span className={labelTextClass}>Tipo</span>
              <select
                className={controlClass}
                value={form.targetDocumentType}
                onChange={(event) =>
                  updateField('targetDocumentType', event.target.value as TargetDocumentType)
                }
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
              </select>
            </label>

            <label className={fieldClass}>
              <span className={labelTextClass}>Número</span>
              <input
                className={controlClass}
                inputMode="numeric"
                value={form.targetDocumentNumber}
                onBlur={() => markTouched('targetDocumentNumber')}
                onChange={(event) => updateField('targetDocumentNumber', event.target.value)}
                aria-invalid={Boolean(errorFor('targetDocumentNumber'))}
              />
              {errorFor('targetDocumentNumber') && (
                <small className={errorClass}>{errorFor('targetDocumentNumber')}</small>
              )}
            </label>
          </fieldset>

          <div className="grid gap-2.5 border-t border-[#eef1ee] pt-5">
            <label className="grid grid-cols-[18px_1fr] items-start gap-2.5">
              <input
                className="mt-[3px] h-[18px] w-[18px] accent-[#2a7221]"
                type="checkbox"
                checked={form.consent}
                onBlur={() => markTouched('consent')}
                onChange={(event) => updateField('consent', event.target.checked)}
              />
              <span className={labelTextClass}>{privacyText}</span>
            </label>
            {errorFor('consent') && <small className={errorClass}>{errorFor('consent')}</small>}
          </div>

          {submission.status !== 'idle' && (
            <div
              className={`flex min-h-[42px] items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm font-semibold ${messageClass}`}
              role="status"
              aria-live="polite"
            >
              {submission.status === 'success' && <CheckCircle2 className="shrink-0" size={18} aria-hidden="true" />}
              {submission.status === 'error' && <AlertCircle className="shrink-0" size={18} aria-hidden="true" />}
              {submission.status === 'submitting' && (
                <Loader2 className="shrink-0 animate-spin" size={18} aria-hidden="true" />
              )}
              <span>
                {submission.status === 'submitting' ? 'Registrando solicitud...' : submission.message}
              </span>
            </div>
          )}

          <div className="flex justify-stretch pt-0.5 md:justify-end">
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#0c211c] bg-[#0c211c] px-[17px] font-extrabold text-white transition hover:-translate-y-px hover:bg-[#163a32] hover:shadow-[0_10px_22px_rgba(12,33,28,0.18)] disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
              type="submit"
              disabled={submission.status === 'submitting'}
            >
              {submission.status === 'submitting' ? (
                <Loader2 className="shrink-0 animate-spin" size={18} aria-hidden="true" />
              ) : (
                <Send className="shrink-0" size={18} aria-hidden="true" />
              )}
              <span>Enviar solicitud</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default App;
