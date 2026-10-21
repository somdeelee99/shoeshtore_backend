import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '../../generated/prisma/internal/prismaNamespace';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'ເກີດຂໍ້ຜິດພາດພາຍໃນລະບົບ';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      message = body?.message ?? exception.message;
    } else if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta as any)?.target;
        message = `ຂໍ້ມູນຊ້ຳກັນ: ${Array.isArray(target) ? target.join(', ') : target ?? ''}`;
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'ບໍ່ພົບຂໍ້ມູນທີ່ຕ້ອງການ';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message;
      }
    } else if (exception instanceof PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'ຂໍ້ມູນທີ່ສົ່ງມາບໍ່ຖືກຕ້ອງ';
    }

    if (status >= 500) this.logger.error(exception instanceof Error ? exception.stack : String(exception));

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
