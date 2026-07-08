import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import type { AdminActivityQueryDto } from './dto/admin-shared-query.dto.js';

export type AdminActivityInput = {
  adminId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AdminActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AdminActivityInput) {
    await this.prisma.adminActivityLog.create({
      data: {
        adminId: input.adminId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        description: input.description,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    }).catch(() => undefined);
  }

  async list(query: AdminActivityQueryDto) {
    const where: Prisma.AdminActivityLogWhereInput = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { action: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { entityType: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { admin: { email: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ];
    }

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.adminActivityLog.count({ where }),
      this.prisma.adminActivityLog.findMany({
        where,
        include: { admin: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
        admin: log.admin ? {
          id: log.admin.id,
          email: log.admin.email,
          name: `${log.admin.firstName} ${log.admin.lastName}`,
        } : null,
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(Math.ceil(total / query.pageSize), 1),
      },
    };
  }
}
