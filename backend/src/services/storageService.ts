import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import path from 'path'

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const storageService = {
  async uploadFile(buffer: Buffer, originalName: string, mimeType: string, folder: string): Promise<string> {
    const ext = path.extname(originalName) || '.jpg'
    const key = `${folder}/${randomUUID()}${ext}`

    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }))

    return `${process.env.R2_PUBLIC_URL}/${key}`
  },
}