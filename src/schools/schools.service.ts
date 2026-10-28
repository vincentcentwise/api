import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.school.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: 100,
    });
  }
}