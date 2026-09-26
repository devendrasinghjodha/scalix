import prisma from '../config/database';
import { ConflictError, NotFoundError } from '../utils/errors';

export class TeamService {
  async create(organizationId: string, name: string) {
    try {
      return await prisma.team.create({ data: { organizationId, name }, include: { members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } } } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictError('A team with this name already exists');
      throw error;
    }
  }

  async list(organizationId: string) {
    return prisma.team.findMany({ where: { organizationId }, include: { _count: { select: { members: true } } }, orderBy: { name: 'asc' } });
  }

  async get(id: string, organizationId: string) {
    const team = await prisma.team.findFirst({ where: { id, organizationId }, include: { members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } } } });
    if (!team) throw new NotFoundError('Team not found');
    return team;
  }

  async update(id: string, organizationId: string, name: string) {
    await this.get(id, organizationId);
    return prisma.team.update({ where: { id }, data: { name } });
  }

  async delete(id: string, organizationId: string) {
    await this.get(id, organizationId);
    await prisma.team.delete({ where: { id } });
  }

  async addMember(teamId: string, organizationId: string, userId: string) {
    await this.get(teamId, organizationId);
    const member = await prisma.organizationMember.findUnique({ where: { userId_organizationId: { userId, organizationId } } });
    if (!member) throw new NotFoundError('User is not a member of this organization');
    return prisma.teamMember.create({ data: { teamId, userId }, include: { user: { select: { id: true, name: true, email: true, avatar: true } } } });
  }

  async removeMember(teamId: string, organizationId: string, userId: string) {
    await this.get(teamId, organizationId);
    await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
  }
}

export const teamService = new TeamService();
