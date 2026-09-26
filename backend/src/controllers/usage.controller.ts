import { Request, Response, NextFunction } from 'express';
import { usageService } from '../services/usage.service';

export class UsageController {
  async current(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await usageService.current(req.organizationId!) }); } catch (error) { next(error); }
  }

  async history(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await usageService.history(req.organizationId!) }); } catch (error) { next(error); }
  }
}

export const usageController = new UsageController();
