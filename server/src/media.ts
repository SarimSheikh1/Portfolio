import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "./config.js";
import type { Preview } from "../../shared/types.js";
export async function storeImage(
  bytes: Buffer,
  alt: string,
  source: Preview["source"],
): Promise<Preview> {
  if (bytes.length > 12_000_000) throw Error("Image exceeds 12MB");
  const meta = await sharp(bytes, { limitInputPixels: 35_000_000 }).metadata();
  if (!["png", "jpeg", "webp"].includes(meta.format || ""))
    throw Error("Only genuine PNG, JPEG, or WebP images accepted");
  const id = randomUUID();
  const full = await sharp(bytes)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await sharp(full.data)
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  const put = async (name: string, data: Buffer) => {
    if (
      process.env.S3_BUCKET &&
      process.env.S3_REGION &&
      process.env.MEDIA_PUBLIC_URL
    ) {
      await new S3Client({ region: process.env.S3_REGION }).send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: name,
          Body: data,
          ContentType: "image/webp",
          CacheControl: "public,max-age=31536000,immutable",
        }),
      );
      return `${process.env.MEDIA_PUBLIC_URL.replace(/\/$/, "")}/${name}`;
    }
    if (config.NODE_ENV === "production")
      throw Error("Hosted uploads require object storage configuration");
    await mkdir("uploads", { recursive: true });
    await writeFile(`uploads/${name}`, data);
    return `/media/${name}`;
  };
  return {
    url: await put(`${id}.webp`, full.data),
    thumbnail: await put(`${id}-640.webp`, thumb),
    alt,
    capturedAt: new Date().toISOString(),
    width: full.info.width,
    height: full.info.height,
    source,
  };
}
