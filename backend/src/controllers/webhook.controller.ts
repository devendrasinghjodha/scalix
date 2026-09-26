import { Request, Response, NextFunction } from 'express';
import { webhookService } from '../services/webhook.service';

export class WebhookController {
  async create(req: Request, res: Response, next: NextFunction) { try { res.status(201).json({ success: true, data: await webhookService.create(req.organizationId!, req.body.url, req.body.events || []) }); } catch (error) { next(error); } }
  async list(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, data: await webhookService.list(req.organizationId!) }); } catch (error) { next(error); } }
  async update(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, data: await webhookService.update(String(req.params.endpointId), req.organizationId!, req.body) }); } catch (error) { next(error); } }
  async delete(req: Request, res: Response, next: NextFunction) { try { await webhookService.delete(String(req.params.endpointId), req.organizationId!); res.json({ success: true, message: 'Webhook endpoint deleted' }); } catch (error) { next(error); } }
  async deliveries(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, data: await webhookService.deliveries(String(req.params.endpointId), req.organizationId!) }); } catch (error) { next(error); } }
}

export const webhookController = new WebhookController();
