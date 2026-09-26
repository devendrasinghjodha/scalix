import request from 'supertest';
import app from '../app';
import prisma from '../config/database';

describe('Platform modules', () => {
  let token: string;
  let organizationId: string;

  beforeAll(async () => {
    const user = await request(app)
      .post('/api/auth/register')
      .send({ email: 'platform@scalix.dev', password: 'Password123!', name: 'Platform Owner' });
    token = user.body.data.token;

    const organization = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Platform Test Org' });
    organizationId = organization.body.data.id;
  });

  it('creates, lists, and revokes API keys without exposing the hash', async () => {
    const created = await request(app)
      .post(`/api/organizations/${organizationId}/api-keys`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'CI key' });

    expect(created.status).toBe(201);
    expect(created.body.data.secret).toMatch(/^sk_live_/);
    expect(created.body.data.keyHash).toBeUndefined();

    const listed = await request(app)
      .get(`/api/organizations/${organizationId}/api-keys`)
      .set('Authorization', `Bearer ${token}`);

    expect(listed.status).toBe(200);
    expect(listed.body.data[0].secret).toBeUndefined();
    expect(listed.body.data[0].keyHash).toBeUndefined();

    const revoked = await request(app)
      .delete(`/api/organizations/${organizationId}/api-keys/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(revoked.status).toBe(200);
  });

  it('manages teams and keeps team membership tenant-scoped', async () => {
    const created = await request(app)
      .post(`/api/organizations/${organizationId}/teams`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Engineering' });

    expect(created.status).toBe(201);

    const user = await prisma.user.findUnique({ where: { email: 'platform@scalix.dev' } });
    const member = await request(app)
      .post(`/api/organizations/${organizationId}/teams/${created.body.data.id}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: user!.id });

    expect(member.status).toBe(201);

    const team = await request(app)
      .get(`/api/organizations/${organizationId}/teams/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(team.status).toBe(200);
    expect(team.body.data.members).toHaveLength(1);
  });

  it('exposes usage and outbound webhook management for the tenant', async () => {
    const usage = await request(app)
      .get(`/api/organizations/${organizationId}/usage/current`)
      .set('Authorization', `Bearer ${token}`);

    expect(usage.status).toBe(200);
    expect(usage.body.data).toEqual(expect.objectContaining({ apiRequests: expect.any(Number), limit: expect.any(Number) }));

    const webhook = await request(app)
      .post(`/api/organizations/${organizationId}/webhooks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/scalix', events: ['team.created'] });

    expect(webhook.status).toBe(201);
    expect(webhook.body.data.secret).toBeUndefined();

    const listed = await request(app)
      .get(`/api/organizations/${organizationId}/webhooks`)
      .set('Authorization', `Bearer ${token}`);

    expect(listed.status).toBe(200);
    expect(listed.body.data[0].url).toBe('https://example.com/scalix');
  });
});
