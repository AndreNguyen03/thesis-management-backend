import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { ConfigModule } from '@nestjs/config'
import { PaginationModule } from './common/pagination/pagination.module'
import appConfig from './config/app.config'
import envValidation from './config/env.validation'
import jwtConfig from './auth/config/jwt.config'
import { JwtModule } from '@nestjs/jwt'
import { AccessTokenGuard } from './auth/guards/access-token/access-token.guard'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { AuthenticationGuard } from './auth/guards/authentication/authentication.guard'
import { DataResponseInterceptor } from './common/interceptors/data-response/data-response.interceptor'
import { MailModule } from './mail/mail.module'
import { mongoConfig } from './config/database.config'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { LoggerMiddleware } from './common/logger/logger.middleware'
import { redisConfig } from './config/redis.config'
import { RedisModule } from './redis/redis.module'
import { ThesisModule } from './thesis/thesis.module'
import { ChatBotModule } from './chatbot/chatbot.module'

const ENV = process.env.NODE_ENV

@Module({
    imports: [
        // ConfigModule global
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: !ENV ? '.env' : `.env.${ENV}`,
            load: [appConfig, mongoConfig, redisConfig],
            validationSchema: envValidation
        }),

        // Mongoose connection
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const mongo = configService.get<MongooseModuleOptions>('mongo_db')
                if (!mongo) {
                    throw new Error('mongoDb configuration (mongo_db) is missing ')
                }
                return mongo
            }
        }),
        // Business modules
        UsersModule,
        AuthModule,
        PaginationModule,
        MailModule,

        // JWT config
        ConfigModule.forFeature(jwtConfig),
        JwtModule.registerAsync(jwtConfig.asProvider()),

        // Redis cache module
        RedisModule,

        ThesisModule,

        ChatBotModule   
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: AuthenticationGuard
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: DataResponseInterceptor
        },
        AccessTokenGuard
    ]
})
// export class AppModule {}
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*')
    }
}
