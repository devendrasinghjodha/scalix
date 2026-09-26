import { User as PrismaUser, Role } from '@prisma/client';

declare global {
  namespace Express {
    interface User extends PrismaUser {}
    interface Request {
      user?: PrismaUser;
      organizationId?: string;
      memberRole?: Role;
    }
  }
}

export {};
