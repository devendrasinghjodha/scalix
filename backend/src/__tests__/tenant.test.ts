import request from 'supertest';
import app from '../app';
import prisma from '../config/database';

describe('Tenant Isolation', () => {
  let userAToken: string;
  let userBToken: string;
  let orgAId: string;
  let orgBId: string;
  let projectAId: string;
  let taskAId: string;

  beforeAll(async () => {
    // Clean up
    await prisma.task.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.organizationMember.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'usera@tenanttest.dev',
        password: 'Password123!',
        name: 'User A',
      });
    userAToken = resA.body.data.token;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'userb@tenanttest.dev',
        password: 'Password123!',
        name: 'User B',
      });
    userBToken = resB.body.data.token;

    // User A creates Organization A
    const orgARes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Org A' });
    orgAId = orgARes.body.data.id;

    // User B creates Organization B
    const orgBRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ name: 'Org B' });
    orgBId = orgBRes.body.data.id;

    // User A creates a project in Org A
    const projRes = await request(app)
      .post(`/api/organizations/${orgAId}/projects`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Project Alpha' });
    projectAId = projRes.body.data.id;

    // User A creates a task in Org A
    const taskRes = await request(app)
      .post(`/api/organizations/${orgAId}/tasks`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Task Alpha',
        projectId: projectAId,
      });
    taskAId = taskRes.body.data.id;
  });

  describe('Cross-tenant project access', () => {
    it('should DENY User B from accessing Org A projects', async () => {
      const res = await request(app)
        .get(`/api/organizations/${orgAId}/projects`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
    });

    it('should DENY User B from accessing Org A project by ID', async () => {
      const res = await request(app)
        .get(`/api/organizations/${orgAId}/projects/${projectAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
    });

    it('should DENY User B from creating project in Org A', async () => {
      const res = await request(app)
        .post(`/api/organizations/${orgAId}/projects`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Sneaky Project' });

      expect(res.status).toBe(403);
    });
  });

  describe('Cross-tenant task access', () => {
    it('should DENY User B from listing Org A tasks', async () => {
      const res = await request(app)
        .get(`/api/organizations/${orgAId}/tasks`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
    });

    it('should DENY User B from accessing Org A task by ID', async () => {
      const res = await request(app)
        .get(`/api/organizations/${orgAId}/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
    });

    it('should DENY User B from updating Org A task', async () => {
      const res = await request(app)
        .patch(`/api/organizations/${orgAId}/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ title: 'Hacked Task' });

      expect(res.status).toBe(403);
    });

    it('should DENY User B from deleting Org A task', async () => {
      const res = await request(app)
        .delete(`/api/organizations/${orgAId}/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Cross-tenant member access', () => {
    it('should DENY User B from listing Org A members', async () => {
      const res = await request(app)
        .get(`/api/organizations/${orgAId}/members`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
    });

    it('should DENY User B from inviting to Org A', async () => {
      const res = await request(app)
        .post(`/api/organizations/${orgAId}/members/invite`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ email: 'victim@test.dev', role: 'MEMBER' });

      expect(res.status).toBe(403);
    });
  });

  describe('Cross-tenant organization access', () => {
    it('should DENY User B from viewing Org A details', async () => {
      const res = await request(app)
        .get(`/api/organizations/${orgAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
    });

    it('should DENY User B from updating Org A', async () => {
      const res = await request(app)
        .patch(`/api/organizations/${orgAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Hacked Org' });

      expect(res.status).toBe(403);
    });

    it('should DENY User B from deleting Org A', async () => {
      const res = await request(app)
        .delete(`/api/organizations/${orgAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Proper tenant access', () => {
    it('should ALLOW User A to access their own Org A projects', async () => {
      const res = await request(app)
        .get(`/api/organizations/${orgAId}/projects`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should ALLOW User B to access their own Org B', async () => {
      const res = await request(app)
        .get(`/api/organizations/${orgBId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
    });
  });
});
