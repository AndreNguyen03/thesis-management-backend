import { Inject } from "@nestjs/common";
import { BaseServiceAbstract } from "../../shared/base/service/base.service.abstract";
import { FieldRepositoryInterface } from "../repository/field.repository.interface";
import { Field } from "../schemas/field.schema";

export class FieldService extends BaseServiceAbstract<Field> {
    constructor(
        @Inject('FieldRepositoryInterface')
        private readonly fieldRepository: FieldRepositoryInterface
    ){
        super(fieldRepository);
    }

    async createManyFields(fields: Partial<Field>[]): Promise<boolean> {
        return this.fieldRepository.createMany(fields);
    }
}