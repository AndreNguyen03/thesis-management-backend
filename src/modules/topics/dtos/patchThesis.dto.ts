import { PartialType } from '@nestjs/mapped-types'
import { CreateTopicDto } from './createThesis.dto'

export class PatchTopicDto extends PartialType(CreateTopicDto) {}
