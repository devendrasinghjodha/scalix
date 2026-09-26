import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create demo users
  const password = await bcrypt.hash('Password123!', 12);

  const user1 = await prisma.user.upsert({
    where: { email: 'rahul@scalix.dev' },
    update: {},
    create: {
      email: 'rahul@scalix.dev',
      password,
      name: 'Rahul Sharma',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'amit@scalix.dev' },
    update: {},
    create: {
      email: 'amit@scalix.dev',
      password,
      name: 'Amit Kumar',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'priya@scalix.dev' },
    update: {},
    create: {
      email: 'priya@scalix.dev',
      password,
      name: 'Priya Singh',
    },
  });

  console.log('✅ Users created');

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      ownerId: user1.id,
    },
  });

  console.log('✅ Organization created');

  // Create memberships
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: user1.id, organizationId: org.id } },
    update: {},
    create: { userId: user1.id, organizationId: org.id, role: 'OWNER' },
  });

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: user2.id, organizationId: org.id } },
    update: {},
    create: { userId: user2.id, organizationId: org.id, role: 'ADMIN' },
  });

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: user3.id, organizationId: org.id } },
    update: {},
    create: { userId: user3.id, organizationId: org.id, role: 'MEMBER' },
  });

  console.log('✅ Memberships created');

  // Create subscription
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      plan: 'FREE',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Subscription created');

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Redesign the company website with modern UI',
      organizationId: org.id,
      createdById: user1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App MVP',
      description: 'Build the first version of our mobile app',
      organizationId: org.id,
      createdById: user2.id,
    },
  });

  console.log('✅ Projects created');

  // Create tasks
  const tasks = [
    { title: 'Design homepage mockup', status: 'DONE' as const, priority: 'HIGH' as const, projectId: project1.id, assigneeId: user3.id },
    { title: 'Implement auth system', status: 'IN_PROGRESS' as const, priority: 'URGENT' as const, projectId: project1.id, assigneeId: user2.id },
    { title: 'Set up CI/CD pipeline', status: 'TODO' as const, priority: 'MEDIUM' as const, projectId: project1.id, assigneeId: user1.id },
    { title: 'Create REST API', status: 'IN_REVIEW' as const, priority: 'HIGH' as const, projectId: project2.id, assigneeId: user2.id },
    { title: 'Write unit tests', status: 'TODO' as const, priority: 'MEDIUM' as const, projectId: project2.id, assigneeId: user3.id },
    { title: 'Deploy to staging', status: 'TODO' as const, priority: 'LOW' as const, projectId: project2.id, assigneeId: user1.id },
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        ...task,
        organizationId: org.id,
        createdById: user1.id,
      },
    });
  }

  console.log('✅ Tasks created');

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      { organizationId: org.id, actorId: user1.id, action: 'PROJECT_CREATED', entity: 'Project', entityId: project1.id, metadata: { name: 'Website Redesign' } },
      { organizationId: org.id, actorId: user1.id, action: 'PROJECT_CREATED', entity: 'Project', entityId: project2.id, metadata: { name: 'Mobile App MVP' } },
      { organizationId: org.id, actorId: user1.id, action: 'USER_INVITED', entity: 'User', entityId: user2.id, metadata: { email: 'amit@scalix.dev', role: 'ADMIN' } },
      { organizationId: org.id, actorId: user1.id, action: 'USER_INVITED', entity: 'User', entityId: user3.id, metadata: { email: 'priya@scalix.dev', role: 'MEMBER' } },
    ],
  });

  console.log('✅ Audit logs created');

  console.log('\n🎉 Seeding complete!');
  console.log('\nDemo accounts:');
  console.log('  rahul@scalix.dev / Password123! (OWNER)');
  console.log('  amit@scalix.dev  / Password123! (ADMIN)');
  console.log('  priya@scalix.dev / Password123! (MEMBER)');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
