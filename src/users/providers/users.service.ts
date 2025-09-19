import { BadRequestException, Injectable, RequestTimeoutException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from '../schemas/user.schema'
import { CreateUserDto } from '../dtos/create-user.dto'
import { CreateUserProvider } from './create-user.provider'
import { FindOneUserByEmailProvider } from './find-one-user-by-email.provider'

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        private readonly createUserProvider: CreateUserProvider,
        private readonly findOneUserByEmailProvider: FindOneUserByEmailProvider
    ) {}

    /**
     * Tìm user theo _id
     */
    public async findOneById(userId: string): Promise<UserDocument> {
        let user: UserDocument | null = null

        try {
            user = await this.userModel.findById(userId).exec()
        } catch (error) {
            throw new RequestTimeoutException('Unable to process your request at the moment, please try again later', {
                description: 'Error connecting to the database'
            })
        }

        if (!user) {
            throw new BadRequestException('The user id does not exist')
        }

        return user
    }

    /**
     * Tạo user mới
     */
    public async createUser(createUserDto: CreateUserDto): Promise<UserDocument> {
        return this.createUserProvider.createUser(createUserDto)
    }

    /**
     * Tìm user theo email
     */
    public async findOneByEmail(email: string): Promise<UserDocument> {
        return this.findOneUserByEmailProvider.findOneByEmail(email)
    }
}
