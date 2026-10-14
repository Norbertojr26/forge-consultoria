import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | undefined;

function s3() {
  if (!client) {
    const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
    if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      throw new Error("Bucket não configurado: defina S3_ENDPOINT, S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY");
    }
    client = new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION || "auto",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
    });
  }
  return client;
}

function bucket() {
  const name = process.env.S3_BUCKET;
  if (!name) throw new Error("Bucket não configurado: defina S3_BUCKET");
  return name;
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await s3().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  );
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/** URL temporária de leitura (o bucket é privado). */
export async function signedReadUrl(key: string, expiresIn = 600) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn });
}

/** Igual a signedReadUrl, mas devolve null (e loga) se o bucket falhar: a página continua de pé. */
export async function trySignedReadUrl(key: string | null | undefined) {
  if (!key) return null;
  try {
    return await signedReadUrl(key);
  } catch (err) {
    console.error("Falha ao assinar URL da foto", err);
    return null;
  }
}

/** Lê um objeto inteiro (usado para mandar a imagem-mestre como referência à IA). */
export async function getObjectBytes(key: string) {
  const res = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!res.Body) throw new Error(`Objeto vazio: ${key}`);
  return { bytes: await res.Body.transformToByteArray(), mime: res.ContentType ?? "image/png" };
}
