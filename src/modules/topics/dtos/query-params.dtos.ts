import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/pagination-an/dtos/pagination-query.dto";

export class SubmittedTopicParamsDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    periodId: string
}