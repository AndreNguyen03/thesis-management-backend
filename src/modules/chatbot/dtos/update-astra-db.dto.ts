import { IsNotEmpty, IsString } from "class-validator";

export class UpdateAstraDB {
    @IsNotEmpty()
    @IsString({ each: true })
    urlInputs: {
        addedUrls: string[];
        removedUrls: string[];
    }
}