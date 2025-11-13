import { PartialType } from '@nestjs/mapped-types'
import { CreateTopicDto } from './create-topic.dto'

export class PatchTopicDto extends PartialType(CreateTopicDto) {}
