import { BadRequestException, Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common'
import { UploadFilesService } from './application/upload-files.service'
import { FilesInterceptor } from '@nestjs/platform-express'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { Roles } from '../../auth/decorator/roles.decorator'
import { UserRole } from '../../users/enums/user-role'
@Controller('uploadfiles')
export class UploadFilesController {
    constructor(private readonly uploadFilesService: UploadFilesService) {}
   
}
