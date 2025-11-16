import { registerAs } from "@nestjs/config";

export const minioConfig = registerAs('minio', () => ({
    isGlobal: true,
    endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    downloadUrlBase: process.env.MINIO_DOWNLOAD_URL ?? 'http://localhost:9000'
}))
