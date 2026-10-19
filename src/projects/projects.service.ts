import { Injectable, Logger } from '@nestjs/common';
import { ProjectNotFoundException } from '../exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all projects owned by the current user.
   * @param userId - The ID of the current authenticated user.
   * @returns An array of projects owned by the user, ordered by last update time.
   */
  list(userId: string) {
    return this.prisma.project.findMany({
      where: { userId, archivedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get a project by id, only if owned by the current user.
   * @param userId - The ID of the current authenticated user.
   * @param id - The ID of the project to retrieve.
   * @returns The project with the specified ID, if owned by the user.
   * @throws ProjectNotFoundException if the project does not exist or is not owned by the user.
   */
  async getOwned(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
    });
    if (!project) throw new ProjectNotFoundException();
    return project;
  }

  /**
   * Create a new project owned by the current user.
   * @param userId - The ID of the current authenticated user.
   * @param dto - The data transfer object containing the project title and optional description.
   * @returns The newly created project.
   */
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

  /**
   * Update a project by id, only if owned by the current user.
   * @param userId - The ID of the current authenticated user.
   * @param id - The ID of the project to update.
   * @param dto - The data transfer object containing the updated project title and/or description.
   * @returns The updated project.
   * @throws ProjectNotFoundException if the project does not exist or is not owned by the user.
   */
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

  /**
   * Remove a project by id, only if owned by the current user.
   * @param userId - The ID of the current authenticated user.
   * @param id - The ID of the project to remove.
   * @returns An empty response indicating the project has been deleted.
   * @throws ProjectNotFoundException if the project does not exist or is not owned by the user.
   */
  async remove(userId: string, id: string) {
    await this.getOwned(userId, id);
    await this.prisma.project.delete({ where: { id } });
    this.logger.log(`Project ${id} deleted by user ${userId}`);
  }

  /**
   * Archive a project: hidden from the list, data kept.
   *
   * @param userId - Id of the logged in user.
   * @param id - Project to archive.
   * @returns The updated project.
   * @throws {@link ProjectNotFoundException} When it does not exist or belongs to someone else.
   */
  async archive(userId: string, id: string) {
    await this.getOwned(userId, id);
    const project = await this.prisma.project.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    this.logger.log(`Project ${id} archived by user ${userId}`);
    return project;
  }

  /**
   * Bring an archived project back into the list.
   *
   * @param userId - Id of the logged in user.
   * @param id - Project to restore.
   * @returns The updated project.
   * @throws {@link ProjectNotFoundException} When it does not exist or belongs to someone else.
   */
  async unarchive(userId: string, id: string) {
    await this.getOwned(userId, id);
    return this.prisma.project.update({
      where: { id },
      data: { archivedAt: null },
    });
  }
}
