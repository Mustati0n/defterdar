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
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;
    const message = this.getMessage(exception, exceptionResponse);

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
}
