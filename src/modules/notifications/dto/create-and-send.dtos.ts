import { IsNotEmpty, IsOptional } from 'class-validator'

export class CreateAndSend {
    @IsNotEmpty()
    recipientId: string
    @IsNotEmpty()
    type: string
    @IsNotEmpty()
    content: string
    @IsOptional()
    data?: any
}
