import { BaseRepositoryInterface } from "../../shared/base/repository/base.repository.interface";
import { Field } from "../schemas/field.schema";

export interface FieldRepositoryInterface extends BaseRepositoryInterface<Field> {
    createMany(fields: Partial<Field>[]): Promise<boolean>;
}