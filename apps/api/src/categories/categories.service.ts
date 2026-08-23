import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerAuthorizationService } from '../ledgers/ledger-authorization.service.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: LedgerAuthorizationService,
  ) {}

  async create(ledgerId: string, actorId: string, dto: CreateCategoryDto) {
    await this.authorization.requireRole(ledgerId, actorId, ['OWNER', 'ADMIN']);
    await this.ensureNameAvailable(ledgerId, dto.name);
    try {
      return await this.prisma.category.create({
        data: { ledgerId, createdById: actorId, name: dto.name.trim(), kind: dto.kind },
      });
    } catch (error: unknown) {
      this.rethrowDuplicate(error);
      throw error;
    }
  }

  async list(ledgerId: string, actorId: string) {
    await this.authorization.requireMember(ledgerId, actorId);
    return this.prisma.category.findMany({ where: { ledgerId }, orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }] });
  }

  async update(id: string, actorId: string, dto: UpdateCategoryDto) {
    const category = await this.find(id, actorId, true);
    if (category.archivedAt) throw new ConflictException('Category is archived');
    if (dto.name !== undefined)
      await this.ensureNameAvailable(category.ledgerId, dto.name, id);
    try {
      return await this.prisma.category.update({
        where: { id },
        data: { name: dto.name?.trim(), kind: dto.kind },
      });
    } catch (error: unknown) {
      this.rethrowDuplicate(error);
      throw error;
    }
  }

  async archive(id: string, actorId: string) {
    const category = await this.find(id, actorId, true);
    if (!category.archivedAt)
      return this.prisma.category.update({ where: { id }, data: { archivedAt: new Date() } });
    return category;
  }

  private async find(id: string, actorId: string, mutation: boolean) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    if (mutation)
      await this.authorization.requireRole(category.ledgerId, actorId, ['OWNER', 'ADMIN']);
    else await this.authorization.requireMember(category.ledgerId, actorId);
    return category;
  }

  private async ensureNameAvailable(ledgerId: string, name: string, exceptId?: string) {
    const duplicate = await this.prisma.category.findFirst({
      where: {
        ledgerId,
        name: { equals: name.trim(), mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Category name already exists');
  }

  private rethrowDuplicate(error: unknown): void {
    if (typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code?: unknown }).code === 'P2002')
      throw new ConflictException('Category name already exists');
  }
}
