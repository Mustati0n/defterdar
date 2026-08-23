import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  message?: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const prismaConflict = this.hasPrismaCode(exception, ['P2002', 'P2034']);
    const payloadTooLarge = this.hasStatus(exception, HttpStatus.PAYLOAD_TOO_LARGE);
    const statusCode = isHttpException
      ? exception.getStatus()
      : prismaConflict
        ? HttpStatus.CONFLICT
        : payloadTooLarge
          ? HttpStatus.PAYLOAD_TOO_LARGE
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;
    const message = payloadTooLarge
      ? 'Payload too large'
      : prismaConflict
      ? 'Request conflicts with current state'
      : this.getMessage(exception, exceptionResponse);

    response.status(statusCode).json({
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private getMessage(
    exception: unknown,
    exceptionResponse: string | object | undefined,
  ): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (exceptionResponse && 'message' in exceptionResponse) {
      const message = (exceptionResponse as ErrorBody).message;

      if (this.isErrorMessage(message)) {
        return message;
      }
    }

    if (exception instanceof Error && !(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    return 'Request failed';
  }

  private isErrorMessage(value: unknown): value is string | string[] {
    return (
      typeof value === 'string' ||
      (Array.isArray(value) && value.every((item) => typeof item === 'string'))
    );
  }

  private hasPrismaCode(exception: unknown, codes: string[]): boolean {
    return typeof exception === 'object' && exception !== null && 'code' in exception &&
      codes.includes(String((exception as { code?: unknown }).code));
  }

  private hasStatus(exception: unknown, status: number): boolean {
    if (typeof exception !== 'object' || exception === null) return false;
    const candidate = exception as { status?: unknown; statusCode?: unknown };
    return candidate.status === status || candidate.statusCode === status;
  }
}
