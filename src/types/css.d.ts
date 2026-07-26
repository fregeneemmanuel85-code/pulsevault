declare module "*.css" {
  const content: string;
  export default content;
}

declare module "nodemailer" {
  export interface Transporter {
    sendMail(mailOptions: SendMailOptions): Promise<SentMessageInfo>;
  }

  export interface SendMailOptions {
    from?: string;
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    attachments?: Array<{
      filename?: string;
      content?: Buffer | string;
      path?: string;
      [key: string]: any;
    }>;
    [key: string]: any;
  }

  export interface SentMessageInfo {
    messageId: string;
    envelope: any;
    accepted: string[];
    rejected: string[];
    pending: string[];
    response: string;
    [key: string]: any;
  }

  export function createTransport(options: any): Transporter;
}
