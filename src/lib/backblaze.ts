import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const b2Client = new S3Client({
  endpoint: "https://s3.eu-central-003.backblazeb2.com",
  region: "eu-central-003",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID || "",
    secretAccessKey: process.env.B2_APPLICATION_KEY || "",
  },
});

export const B2_BUCKET_NAME = "pulsevault-uploads";

// Upload file to B2
export async function uploadToB2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
) {
  const command = new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await b2Client.send(command);
  return `https://s3.eu-central-003.backblazeb2.com/${B2_BUCKET_NAME}/${key}`;
}

// Get signed URL for private files
export async function getSignedB2Url(key: string, expiresIn: number = 3600) {
  const command = new GetObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(b2Client, command, { expiresIn });
}

// Delete file from B2
export async function deleteFromB2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
  });
  await b2Client.send(command);
}
