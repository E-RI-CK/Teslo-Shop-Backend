import { BadRequestException } from "@nestjs/common";
import { Request } from "express";

export const fileFilter = (req: Request, file: Express.Multer.File, callback: Function) => {
    console.log({ file });
    console.log({ zzz: file.mimetype })
    const fileExtension = file.mimetype.split('/')[1];
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    if (validExtensions.includes(fileExtension)) {
        return callback(null, true);
    }
    callback(
        new BadRequestException(`File type ${fileExtension} not allowed`),
        false
    );
}