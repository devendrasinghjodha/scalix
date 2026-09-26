import { Request, Response, NextFunction } from 'express';
import { teamService } from '../services/team.service';
import { auditLogService } from '../services/auditLog.service';

export class TeamController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const team = await teamService.create(req.organizationId!, req.body.name);
      await auditLogService.log({ organizationId: req.organizationId!, actorId: req.user!.id, action: 'TEAM_CREATED', entity: 'Team', entityId: team.id, metadata: { name: team.name }, ipAddress: req.ip });
      res.status(201).json({ success: true, data: team });
    } catch (error) { next(error); }
  }
  async list(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await teamService.list(req.organizationId!) }); } catch (error) { next(error); }
  }
  async get(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await teamService.get(String(req.params.teamId), req.organizationId!) }); } catch (error) { next(error); }
  }
  async update(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await teamService.update(String(req.params.teamId), req.organizationId!, req.body.name) }); } catch (error) { next(error); }
  }
  async delete(req: Request, res: Response, next: NextFunction) {
    try { await teamService.delete(String(req.params.teamId), req.organizationId!); res.json({ success: true, message: 'Team deleted' }); } catch (error) { next(error); }
  }
  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = String(req.params.teamId);
      const member = await teamService.addMember(teamId, req.organizationId!, req.body.userId);
      await auditLogService.log({ organizationId: req.organizationId!, actorId: req.user!.id, action: 'TEAM_MEMBER_ADDED', entity: 'Team', entityId: teamId, metadata: { userId: req.body.userId }, ipAddress: req.ip });
      res.status(201).json({ success: true, data: member });
    } catch (error) { next(error); }
  }
  async removeMember(req: Request, res: Response, next: NextFunction) {
    try { await teamService.removeMember(String(req.params.teamId), req.organizationId!, String(req.params.userId)); res.json({ success: true, message: 'Team member removed' }); } catch (error) { next(error); }
  }
}

export const teamController = new TeamController();
