import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { appMiddleware } from './app.middleware'
async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    app.enableCors({
        origin: 'http://localhost:3000', // Địa chỉ của frontend
        credentials: true // Cho phép gửi cookie và thông tin xác thực
    })
    appMiddleware(app)

    await app.listen(process.env.PORT ?? 3001)
}
bootstrap()
