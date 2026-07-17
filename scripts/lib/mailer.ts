import nodemailer from "nodemailer";

// Envía un aviso por correo. Requiere SMTP_* y MAIL_TO en el entorno;
// si faltan, solo lo registra en consola (no rompe el scraper).
export async function enviarAviso(asunto: string, cuerpo: string): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_TO) {
    console.warn("[mailer] SMTP no configurado; aviso omitido:", asunto);
    return;
  }
  const transporte = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: Number(SMTP_PORT ?? 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transporte.sendMail({
    from: MAIL_FROM ?? SMTP_USER,
    to: MAIL_TO,
    subject: asunto,
    text: cuerpo,
  });
  console.log(`[mailer] Aviso enviado a ${MAIL_TO}: ${asunto}`);
}
