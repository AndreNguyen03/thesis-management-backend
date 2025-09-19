import { BadRequestException, forwardRef, Inject, Injectable, RequestTimeoutException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from '../schemas/user.schema'
import { CreateUserDto } from '../dtos/create-user.dto'
import { HashingProvider } from 'src/auth/providers/hashing.provider'
import { MailService } from 'src/mail/providers/mail.service'

@Injectable()
export class CreateUserProvider {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @Inject(forwardRef(() => HashingProvider))
        private readonly hashingProvider: HashingProvider,
        private readonly mailService: MailService
    ) {}

    public async createUser(createUserDto: CreateUserDto): Promise<UserDocument> {
        let existingUser: UserDocument | null = null

        // check if user exists with same email
        try {
            existingUser = await this.userModel
                .findOne({
                    email: createUserDto.email
                })
                .exec()
        } catch (error) {
            throw new RequestTimeoutException('Unable to process your request at the moment, please try again later')
        }

        if (existingUser) {
            throw new BadRequestException('The user already exists, please check your email.')
        }

        // create a new user
        const hashedPassword = await this.hashingProvider.hashPassword(createUserDto.password)

        const newUser = new this.userModel({
            ...createUserDto,
            password_hash: hashedPassword
        })

        try {
            await newUser.save()
        } catch (error) {
            throw new RequestTimeoutException('Unable to process your request at the moment please try later')
        }

        try {
            await this.mailService.sendUserWelcomeMail(newUser)
        } catch (error) {
            throw new RequestTimeoutException(error)
        }

        return newUser
    }
}
