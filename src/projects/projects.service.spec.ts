import { Logger } from '@nestjs/common';
import { ProjectNotFoundException } from '../exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const USER = 'user-1';
const FOREIGN_PROJECT = 'project-of-someone-else';

function setup() {
  const prisma = {
    project: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const service = new ProjectsService(prisma as unknown as PrismaService);
  return { prisma, service };
}

describe('ProjectsService', () => {
  beforeAll(() => Logger.overrideLogger(false));

  describe('getOwned', () => {
    it('looks up by id AND owner, so ownership is part of the query', async () => {
      const { prisma, service } = setup();
      prisma.project.findFirst.mockResolvedValue({ id: 'p1', userId: USER });

      await service.getOwned(USER, 'p1');

      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: { id: 'p1', userId: USER },
      });
    });

    it('throws ProjectNotFoundException for a missing or foreign project', async () => {
      const { prisma, service } = setup();
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.getOwned(USER, FOREIGN_PROJECT),
      ).rejects.toBeInstanceOf(ProjectNotFoundException);
    });
  });

  describe('writes on a project the user does not own', () => {
    it('does not update', async () => {
      const { prisma, service } = setup();
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.update(USER, FOREIGN_PROJECT, { title: 'hijack' }),
      ).rejects.toBeInstanceOf(ProjectNotFoundException);
      expect(prisma.project.update).not.toHaveBeenCalled();
    });

    it('does not delete', async () => {
      const { prisma, service } = setup();
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(USER, FOREIGN_PROJECT),
      ).rejects.toBeInstanceOf(ProjectNotFoundException);
      expect(prisma.project.delete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('clears the description when an empty string is sent', async () => {
      const { prisma, service } = setup();
      prisma.project.findFirst.mockResolvedValue({ id: 'p1', userId: USER });
      prisma.project.update.mockResolvedValue({ id: 'p1' });

      await service.update(USER, 'p1', { description: '' });

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { title: undefined, description: null },
      });
    });
  });

  describe('create', () => {
    it('stores a blank description as null', async () => {
      const { prisma, service } = setup();
      prisma.project.create.mockResolvedValue({ id: 'p1' });

      await service.create(USER, { title: 'SUV interior', description: '   ' });

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: { userId: USER, title: 'SUV interior', description: null },
      });
    });
  });

  describe('list', () => {
    it("returns only the user's active projects, newest first", async () => {
      const { prisma, service } = setup();
      prisma.project.findMany.mockResolvedValue([]);

      await service.list(USER);

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: { userId: USER, archivedAt: null },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });
});
