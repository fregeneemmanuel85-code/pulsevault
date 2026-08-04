import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { to, subject, body } = await req.json();
  await resend.emails.send({
    from: "PulseVault <alerts@yourdomain.com>",
    to,
    subject,
    html: body,
  });
  return Response.json({ success: true });
}
