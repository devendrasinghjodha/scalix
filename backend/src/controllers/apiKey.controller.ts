import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/apiKey.service';
import { auditLogService } from '../services/auditLog.service';

export class ApiKeyController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const key = await apiKeyService.create(req.organizationId!, req.user!.id, req.body.name, req.body.expiresAt ? new Date(req.body.expiresAt) : undefined);
      await auditLogService.log({ organizationId: req.organizationId!, actorId: req.user!.id, action: 'API_KEY_CREATED', entity: 'ApiKey', entityId: key.id, metadata: { name: key.name }, ipAddress: req.ip });
      res.status(201).json({ success: true, data: key });
    } catch (error) { next(error); }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await apiKeyService.list(req.organizationId!) }); } catch (error) { next(error); }
  }

  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const key = await apiKeyService.revoke(String(req.params.keyId), req.organizationId!);
      await auditLogService.log({ organizationId: req.organizationId!, actorId: req.user!.id, action: 'API_KEY_REVOKED', entity: 'ApiKey', entityId: key.id, ipAddress: req.ip });
      res.json({ success: true, message: 'API key revoked' });
    } catch (error) { next(error); }
  }
}

export const apiKeyController = new ApiKeyController();
