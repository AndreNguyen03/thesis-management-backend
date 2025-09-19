import { registerAs } from '@nestjs/config'
import { MongooseModuleOptions } from '@nestjs/mongoose'

export const mongoConfig = registerAs(
    'mongo_db',
    (): MongooseModuleOptions => ({
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
        dbName: process.env.MONGO_DB_NAME || 'myapp'
    })
)
