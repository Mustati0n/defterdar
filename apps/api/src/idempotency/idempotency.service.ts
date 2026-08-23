import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async execute<T>(
    userId: string,
    operation: string,
    key: string | undefined,
    request: unknown,
    handler: () => Promise<T>,
  ): Promise<T> {
    if (key === undefined) return handler();
    const normalizedKey = key.trim();
    if (normalizedKey.length < 1 || normalizedKey.length > 200)
      throw new BadRequestException('Idempotency-Key must be 1-200 characters');
    const requestHash = createHash('sha256').update(this.canonical(request)).digest('hex');
    let ownsRecord = false;
    let recordId: string | undefined;
    try {
      const record = await this.prisma.idempotencyRecord.create({
        data: {
          userId,
          operation,
          key: normalizedKey,
          requestHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        select: { id: true },
      });
      ownsRecord = true;
      recordId = record.id;
    } catch (error: unknown) {
      if (!this.hasCode(error, 'P2002')) throw error;
    }

    if (!ownsRecord) {
      return this.replay<T>(userId, operation, normalizedKey, requestHash);
    }

    try {
      const response = await handler();
      const responseBody = JSON.parse(JSON.stringify(response)) as T;
      await this.prisma.idempotencyRecord.update({
        where: { userId_operation_key: { userId, operation, key: normalizedKey } },
        data: { responseStatus: 201, responseBody: responseBody as object },
      });
      return response;
    } catch (error: unknown) {
      if (recordId)
        await this.prisma.idempotencyRecord.delete({ where: { id: recordId } });
      throw error;
    }
  }

  private async replay<T>(userId: string, operation: string, key: string, requestHash: string): Promise<T> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const record = await this.prisma.idempotencyRecord.findUnique({
        where: { userId_operation_key: { userId, operation, key } },
      });
      if (!record) throw new ConflictException('Idempotent request must be retried');
      if (record.requestHash !== requestHash)
        throw new ConflictException('Idempotency-Key was used with a different request');
      if (record.responseBody !== null) return record.responseBody as T;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new ConflictException('Idempotent request is still processing');
  }

  private canonical(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (Array.isArray(value)) return `[${value.map((item) => this.canonical(item)).join(',')}]`;
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${this.canonical(object[key])}`).join(',')}}`;
  }

  private hasCode(error: unknown, code: string): boolean {
    return typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code?: unknown }).code === code;
  }
}
