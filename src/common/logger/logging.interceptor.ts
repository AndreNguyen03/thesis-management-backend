import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common'
import { Observable, tap } from 'rxjs'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP')

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest()
        const { method, originalUrl } = req
        const startTime = Date.now()

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - startTime
                this.logger.log(`${method} ${originalUrl} - ${duration}ms`)
            })
        )
    }
}
