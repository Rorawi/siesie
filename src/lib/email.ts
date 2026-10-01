import nodemailer from "nodemailer";

const ownerEmail = process.env.OWNER_EMAIL || process.env.SMTP_USER || "";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

async function deliverMail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.info(`[email] SMTP is not configured. Email skipped for ${to} (subject: ${subject})`);
    return { sent: false, reason: "SMTP not configured" };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to,
    subject,
    text,
    html,
  });

  return { sent: true, messageId: info.messageId };
}

export async function sendWaitlistConfirmation({
  email,
  name,
  city,
}: {
  email: string;
  name?: string;
  city?: string;
}) {
  const displayName = name || "driver";
  const location = city || "Accra";

  return deliverMail({
    to: email,
    subject: "You’re on the Siesie waitlist",
    text: `Hi ${displayName},\n\nYou’re on the Siesie waitlist for ${location}. We’ll email you when Siesie launches in Accra.\n\nThanks for your interest in safer, easier car help.\n\nSiesie team`,
    html: `
    <p>Hi ${escapeHtml(displayName)},</p>
    <p>You’re on the Siesie waitlist for ${escapeHtml(location)}. We’ll email you when Siesie launches in Accra.</p>
      <p>Thanks for your interest in safer, easier car help.</p>
      <p>— The Siesie team</p>
    `,
  });
}

export async function sendOwnerNotification({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  if (!ownerEmail) {
    console.info(`[email] No OWNER_EMAIL configured; notification not sent. ${title}`);
    return { sent: false, reason: "OWNER_EMAIL not configured" };
  }

  return deliverMail({
    to: ownerEmail,
    subject: title,
    text: body,
    html: `<p>${escapeHtml(body).replace(/\n/g, "<br />")}</p>`,
  });
}
