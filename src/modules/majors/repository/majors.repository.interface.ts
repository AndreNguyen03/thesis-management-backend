import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { Major } from '../schemas/majors.schemas'

export interface IMajorRepository extends BaseRepositoryInterface<Major> {
    getMajorsOfFacultyOwner(facultyId: string, query: PaginationQueryDto): Promise<Paginated<Major>>
}
