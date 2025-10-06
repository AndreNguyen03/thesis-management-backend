import { PartialType } from '@nestjs/mapped-types'
import { CreateThesisDto } from './createThesis.dto'

export class PatchThesisDto extends PartialType(CreateThesisDto) {}
