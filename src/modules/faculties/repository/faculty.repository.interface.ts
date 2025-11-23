import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { CreateFacultyDto } from '../dtos/faculty.dtos'
import { RequestGetFacultyDto } from '../dtos/request-get-faculty.dtos'
import { Faculty } from '../schemas/faculty.schema'

export interface FacultyRepositoryInterface extends BaseRepositoryInterface<Faculty> {
    createFaculty(createFacultyDto: CreateFacultyDto): Promise<Faculty>
    getAllFaculties(query: RequestGetFacultyDto): Promise<Paginated<Faculty>>
    createManyFaculties(createFacultyDto: CreateFacultyDto[]): Promise<number>
    findFacultyIdByName(name:string): Promise<string>
}
