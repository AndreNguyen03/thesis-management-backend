import mongoose from "mongoose";

export function isObjectId(value: string): boolean {
    return mongoose.Types.ObjectId.isValid(value) && new mongoose.Types.ObjectId(value).toString() === value
}
