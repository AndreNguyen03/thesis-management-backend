import { Module, Global } from '@nestjs/common'
import { ConfigModule, ConfigType } from '@nestjs/config'
import { redisConfig } from 'src/config/redis.config'
import Redis from 'ioredis'
import { CacheService } from './providers/cache.service'

@Global() // để module này có thể được inject ở bất kỳ đâu mà không cần import nhiều lần
@Module({
    imports: [ConfigModule.forFeature(redisConfig)],
    providers: [
        {
            provide: 'REDIS_CLIENT',
            inject: [redisConfig.KEY],
            useFactory: (config: ConfigType<typeof redisConfig>) => {
                return new Redis({
                    host: config.host,
                    port: config.port
                })
            }
        },
        CacheService
    ],
    exports: ['REDIS_CLIENT', CacheService]
})
export class RedisModule {}
