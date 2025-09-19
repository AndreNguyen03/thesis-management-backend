import { Injectable, RequestTimeoutException, UnauthorizedException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from '../schemas/user.schema'

@Injectable()
export class FindOneUserByEmailProvider {
    constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

    public async findOneByEmail(email: string) {
        let user: UserDocument | null = null

        try {
            user = await this.userModel.findOne({ email }).exec()
        } catch (error) {
            throw new RequestTimeoutException(error, 'Could not fetch the user')
        }

        if (!user) {
            throw new UnauthorizedException('User does not exist')
        }

        return user
    }
}
