import request from 'supertest';
import app from '../app';
import prisma from '../config/database';

describe('RBAC', () => {
  let ownerToken: string;
  let adminToken: string;
  let managerToken: string;
  let memberToken: string;
  let orgId: string;

  beforeAll(async () => {
    // Clean up
    await prisma.task.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.invitation.deleteMany({});
    await prisma.organizationMember.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});

    // Register owner
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'owner@rbac.dev', password: 'Password123!', name: 'Owner' });
    ownerToken = ownerRes.body.data.token;

    // Create organization
    const orgRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'RBAC Test Org' });
    orgId = orgRes.body.data.id;

    // Register and add admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'admin@rbac.dev', password: 'Password123!', name: 'Admin' });
    adminToken = adminRes.body.data.token;

    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@rbac.dev' } });
    await prisma.organizationMember.create({
      data: { userId: adminUser!.id, organizationId: orgId, role: 'ADMIN' },
    });

    // Register and add manager
    const managerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'manager@rbac.dev', password: 'Password123!', name: 'Manager' });
    managerToken = managerRes.body.data.token;

    const managerUser = await prisma.user.findUnique({ where: { email: 'manager@rbac.dev' } });
    await prisma.organizationMember.create({
      data: { userId: managerUser!.id, organizationId: orgId, role: 'MANAGER' },
    });

    // Register and add member
    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'member@rbac.dev', password: 'Password123!', name: 'Member' });
    memberToken = memberRes.body.data.token;

    const memberUser = await prisma.user.findUnique({ where: { email: 'member@rbac.dev' } });
    await prisma.organizationMember.create({
      data: { userId: memberUser!.id, organizationId: orgId, role: 'MEMBER' },
    });
  });

  describe('Organization delete (OWNER only)', () => {
    it('should DENY MEMBER from deleting org', async () => {
      const res = await request(app)
        .delete(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });

    it('should DENY MANAGER from deleting org', async () => {
      const res = await request(app)
        .delete(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(403);
    });

    it('should DENY ADMIN from deleting org', async () => {
      const res = await request(app)
        .delete(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Invite members (ADMIN+ only)', () => {
    it('should DENY MEMBER from inviting', async () => {
      const res = await request(app)
        .post(`/api/organizations/${orgId}/members/invite`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: 'new@test.dev', role: 'MEMBER' });
      expect(res.status).toBe(403);
    });

    it('should DENY MANAGER from inviting', async () => {
      const res = await request(app)
        .post(`/api/organizations/${orgId}/members/invite`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ email: 'new@test.dev', role: 'MEMBER' });
      expect(res.status).toBe(403);
    });

    it('should ALLOW ADMIN to invite', async () => {
      const res = await request(app)
        .post(`/api/organizations/${orgId}/members/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invited@test.dev', role: 'MEMBER' });
      expect(res.status).toBe(201);
    });
  });

  describe('Create project (MANAGER+ only)', () => {
    it('should DENY MEMBER from creating project', async () => {
      const res = await request(app)
        .post(`/api/organizations/${orgId}/projects`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Test Project' });
      expect(res.status).toBe(403);
    });

    it('should ALLOW MANAGER to create project', async () => {
      const res = await request(app)
        .post(`/api/organizations/${orgId}/projects`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Manager Project' });
      expect(res.status).toBe(201);
    });
  });

  describe('View projects (any member)', () => {
    it('should ALLOW MEMBER to view projects', async () => {
      const res = await request(app)
        .get(`/api/organizations/${orgId}/projects`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(200);
    });
  });
});
