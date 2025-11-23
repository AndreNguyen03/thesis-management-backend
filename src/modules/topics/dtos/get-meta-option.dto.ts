import { ResponseMiniActorDto } from "../../../users/dtos/lecturer.dto";
import { GetMiniMiniMajorDto } from "../../majors/dtos/get-major.dto";

export class GetMetaOptionsForCreateDto {
    lecturers: ResponseMiniActorDto[]
    majors: GetMiniMiniMajorDto[]
}