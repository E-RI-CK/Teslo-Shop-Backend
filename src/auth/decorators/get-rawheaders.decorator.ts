import { createParamDecorator, ExecutionContext, InternalServerErrorException } from "@nestjs/common"

export const GetRawHeaders = createParamDecorator((data, ctx: ExecutionContext) => {
    const rawHeaders = ctx.switchToHttp().getRequest().rawHeaders;
    if (!rawHeaders) throw new InternalServerErrorException("Couldn't find rawHeaders");

    return rawHeaders;
})