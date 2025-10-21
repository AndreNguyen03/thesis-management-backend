import { Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { IsNotEmpty, IsString } from 'class-validator'
import slugify from 'slugify'
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'fields', timestamps: true })
export class Field extends BaseEntity {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsString()
    @IsNotEmpty()
    slug: string

    @IsString()
    @IsNotEmpty()
    description: string
}
export const FieldSchema = SchemaFactory.createForClass(Field)
FieldSchema.pre('save', function (next) {
    if (this.isModified('name') || !this.slug) {
        this.slug = slugify(this.name, {
            lower: true,
            strict: true, // bỏ ký tự đặc biệt
            locale: 'vi', // hỗ trợ tiếng Việt
            trim: true
        })
    }
    next()
})
