import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

interface ExceptionPayload {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
  errorCode?: string;
  [key: string]: unknown;
}

const STATUS_ERROR_CODE_MAP: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.TOO_MANY_REQUESTS]: "TOO_MANY_REQUESTS"
};

const STATUS_MESSAGE_MAP: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: "\u8BF7\u6C42\u53C2\u6570\u9519\u8BEF",
  [HttpStatus.UNAUTHORIZED]: "\u672A\u6388\u6743\u8BBF\u95EE",
  [HttpStatus.FORBIDDEN]: "\u65E0\u6743\u9650\u8BBF\u95EE",
  [HttpStatus.NOT_FOUND]: "\u8BF7\u6C42\u8D44\u6E90\u4E0D\u5B58\u5728",
  [HttpStatus.CONFLICT]: "\u8BF7\u6C42\u51B2\u7A81",
  [HttpStatus.TOO_MANY_REQUESTS]: "\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "\u670D\u52A1\u5185\u90E8\u5F02\u5E38"
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = this.resolveStatusCode(exception);
    const payload = this.resolvePayload(exception);
    const message = this.resolveMessage(payload, exception, statusCode);
    const errorCode = this.resolveErrorCode(payload, statusCode);
    const extras = this.resolveExtras(payload);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const err = exception instanceof Error ? exception : null;
      // Keep client envelope stable, but expose full server-side diagnostics for 5xx debugging.
      console.error("[GlobalExceptionFilter][5xx]", {
        method: request.method,
        path: request.originalUrl || request.url,
        statusCode,
        errorCode,
        message: err?.message ?? payload?.message ?? String(exception),
        stack: err?.stack
      });
    }

    response.status(statusCode).json({
      ...extras,
      statusCode,
      message,
      errorCode,
      code: errorCode,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url
    });
  }

  private resolveStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolvePayload(exception: unknown): ExceptionPayload | null {
    if (!(exception instanceof HttpException)) {
      return null;
    }

    const raw = exception.getResponse();
    if (typeof raw === "string") {
      return { message: raw };
    }

    if (raw && typeof raw === "object") {
      return raw as ExceptionPayload;
    }

    return null;
  }

  private resolveMessage(
    payload: ExceptionPayload | null,
    exception: unknown,
    statusCode: number
  ): string {
    if (statusCode >= 500) {
      return STATUS_MESSAGE_MAP[HttpStatus.INTERNAL_SERVER_ERROR]!;
    }

    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (Array.isArray(payload?.message)) {
      const firstMessage = payload.message.find(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      );
      if (firstMessage) {
        return firstMessage;
      }
    }

    if (exception instanceof Error && exception.message.trim()) {
      return exception.message;
    }

    return STATUS_MESSAGE_MAP[statusCode] ?? "\u8BF7\u6C42\u5931\u8D25";
  }

  private resolveErrorCode(payload: ExceptionPayload | null, statusCode: number): string {
    if (typeof payload?.errorCode === "string" && payload.errorCode.trim()) {
      return payload.errorCode.trim();
    }

    if (typeof payload?.code === "string" && payload.code.trim()) {
      return payload.code.trim();
    }

    if (statusCode === HttpStatus.BAD_REQUEST && Array.isArray(payload?.message)) {
      return "VALIDATION_ERROR";
    }

    if (statusCode >= 500) {
      return "INTERNAL_SERVER_ERROR";
    }

    return STATUS_ERROR_CODE_MAP[statusCode] ?? "HTTP_ERROR";
  }

  private resolveExtras(payload: ExceptionPayload | null): Record<string, unknown> {
    if (!payload || typeof payload !== "object") {
      return {};
    }

    const extras = { ...payload };
    delete extras.statusCode;
    delete extras.message;
    delete extras.error;
    delete extras.code;
    delete extras.errorCode;

    if (Array.isArray(payload.message)) {
      extras.details = payload.message;
    }

    return extras;
  }
}
