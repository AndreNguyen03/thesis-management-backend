import { IntersectionType } from "@nestjs/swagger";
import { PaginationQueryDto } from "../../../common/pagination-an/dtos/pagination-query.dto";

 class RequestBonusGetFacultyDto {
    
}
export class RequestGetFacultyDto extends IntersectionType(RequestBonusGetFacultyDto, PaginationQueryDto) {}