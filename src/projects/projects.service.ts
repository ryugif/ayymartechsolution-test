import { Injectable, Logger } from '@nestjs/common';
import { ProjectNotFoundException } from '../exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Reused by chat module later: one place for the ownership rule
  async getOwned(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
    });
    if (!project) throw new ProjectNotFoundException();
    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description?.trim() || null,
      },
    });
    this.logger.log(`Project ${project.id} created by user ${userId}`);
    return project;
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.getOwned(userId, id);
    return this.prisma.project.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description:
          dto.description === undefined
            ? undefined
            : dto.description?.trim() || null,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.getOwned(userId, id);
    await this.prisma.project.delete({ where: { id } });
    this.logger.log(`Project ${id} deleted by user ${userId}`);
  }
}
