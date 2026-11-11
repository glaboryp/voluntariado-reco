import nodemailer from 'nodemailer';

export type Mail = { to: string; subject: string; html: string; text: string };
export type Send = (m: Mail) => Promise<void>;

let transporter: nodemailer.Transporter | undefined;

export const smtpSend: Send = async (m) => {
  transporter ??= nodemailer.createTransport({
    service: 'gmail',
    pool: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({ from: { name: 'Recoletos Voluntariado', address: process.env.GMAIL_USER! }, ...m });
};

export async function sendMany(mails: Mail[], send: Send = smtpSend): Promise<{ failed: string[] }> {
  const results = await Promise.allSettled(mails.map(send));
  const failed = mails.filter((_, i) => results[i].status === 'rejected').map((m) => m.to);
  results.forEach((r) => r.status === 'rejected' && console.error('Email failed:', r.reason));
  return { failed };
}
