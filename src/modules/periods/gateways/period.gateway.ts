import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'

@WebSocketGateway({ namespace: 'period' })
export class PeriodGateway {
    @WebSocketServer()
    server: Server

    emitPeriodDashboardUpdate(payload: any) {
        this.server.emit('periodDashboard:update', payload)
    }
}
