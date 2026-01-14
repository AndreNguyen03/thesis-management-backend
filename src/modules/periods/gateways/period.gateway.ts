import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'

@WebSocketGateway({ namespace: '/period' })
export class PeriodGateway {
    @WebSocketServer()
    server: Server

    emitPeriodDashboardUpdate(payload: any) {
        console.log('detect expired phase, emitting update to clients...', payload)
        this.server.emit('periodDashboard:update', payload)
    }

    emitDetailPeriodUpdate(payload: any) {
        console.log('update detail period to sync data')
        this.server.emit(`periodDetail:update`, payload)
    }

     emitLibraryUpdate(payload: any) {
        console.log('update detail period to sync data')
        this.server.emit(`library:update`, payload)
    }
}
