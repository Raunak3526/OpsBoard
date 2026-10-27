import { beforeEach, expect, jest, test } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const jwtSecret = 'opsboard-test-secret';
process.env.JWT_SECRET = jwtSecret;

class MockUser {
  constructor(data) {
    Object.assign(this, data);
    this._id = '64f000000000000000000001';
  }

  async setPassword() {}

  async save() {
    return this;
  }
}

MockUser.findOne = jest.fn();
MockUser.findById = jest.fn();
MockUser.find = jest.fn();
MockUser.countDocuments = jest.fn();

jest.unstable_mockModule('./models/User.js', () => ({ default: MockUser }));
jest.unstable_mockModule('./models/Activity.js', () => ({
  default: { create: jest.fn().mockResolvedValue({}) },
}));

const { default: app } = await import('./app.js');
const { default: User } = await import('./models/User.js');
const { default: Activity } = await import('./models/Activity.js');

const makeUser = (role = 'ENGINEER', overrides = {}) => ({
  _id: '64f000000000000000000001',
  name: 'Workspace member',
  email: 'member@example.com',
  role,
  active: true,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const authenticateAs = (user) => {
  User.findById.mockReturnValue({
    select: jest.fn().mockResolvedValue(user),
  });
  return jwt.sign({ id: String(user._id) }, jwtSecret);
};

const listUsersQuery = (users) => {
  const query = {
    select: jest.fn(() => query),
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(users),
  };
  User.find.mockReturnValue(query);
  User.countDocuments.mockResolvedValue(users.length);
};

beforeEach(() => {
  jest.clearAllMocks();
  User.findOne.mockResolvedValue(null);
  User.countDocuments.mockResolvedValue(0);
});

test('health endpoint reports that the API is running', async () => {
  const response = await request(app).get('/api/health');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'ok' });
});

test('current-user endpoint requires authentication', async () => {
  const response = await request(app).get('/api/auth/me');

  expect(response.status).toBe(401);
  expect(response.body).toEqual({ error: 'Not authorized, token missing' });
});

test('public registration ignores role and creates an ENGINEER', async () => {
  const response = await request(app).post('/api/auth/register').send({
    name: 'New member',
    email: 'member@example.com',
    password: 'password123',
    role: 'ADMIN',
  });

  expect(response.status).toBe(201);
  expect(response.body.user.role).toBe('ENGINEER');
  expect(response.body.user).not.toHaveProperty('isAdmin');
});

test('public registration ignores a lowercase admin role value', async () => {
  const response = await request(app).post('/api/auth/register').send({
    name: 'New member',
    email: 'member@example.com',
    password: 'password123',
    role: 'admin',
  });

  expect(response.status).toBe(201);
  expect(response.body.user.role).toBe('ENGINEER');
});

test('public registration ignores isAdmin and other privileged fields', async () => {
  const response = await request(app).post('/api/auth/register').send({
    name: 'New member',
    email: 'member@example.com',
    password: 'password123',
    isAdmin: true,
    permissions: ['*'],
  });

  expect(response.status).toBe(201);
  expect(response.body.user.role).toBe('ENGINEER');
  expect(response.body.user).not.toHaveProperty('isAdmin');
  expect(response.body.user).not.toHaveProperty('permissions');
});

test('a normal user cannot promote themselves through user-management APIs', async () => {
  const member = makeUser('ENGINEER');
  const token = authenticateAs(member);

  const response = await request(app)
    .patch(`/api/admin/users/${member._id}/role`)
    .set('Cookie', `token=${token}`)
    .send({ role: 'ADMIN' });

  expect(response.status).toBe(403);
  expect(response.body).toEqual({ error: 'Forbidden: insufficient role' });
});

test('a normal user receives 403 for admin-only user listing', async () => {
  const token = authenticateAs(makeUser('ENGINEER'));

  const response = await request(app)
    .get('/api/admin/users')
    .set('Cookie', `token=${token}`);

  expect(response.status).toBe(403);
});

test('a normal user receives 403 when creating an admin-only release', async () => {
  const token = authenticateAs(makeUser('ENGINEER'));

  const response = await request(app)
    .post('/api/releases')
    .set('Cookie', `token=${token}`)
    .send({ title: 'Release', version: '1.0.0' });

  expect(response.status).toBe(403);
});

test('an unauthenticated user cannot access protected admin endpoints', async () => {
  const response = await request(app).get('/api/admin/users');

  expect(response.status).toBe(401);
});

test('a manually promoted administrator can access admin endpoints with an id-only JWT', async () => {
  const admin = makeUser('ADMIN', { _id: '64f000000000000000000002' });
  const token = authenticateAs(admin);
  listUsersQuery([makeUser('ENGINEER')]);

  const response = await request(app)
    .get('/api/admin/users')
    .set('Cookie', `token=${token}`);

  expect(response.status).toBe(200);
  expect(response.body.users).toHaveLength(1);
  expect(response.body.users[0].role).toBe('ENGINEER');
});

test('an administrator can change another user role and the change is audited', async () => {
  const admin = makeUser('ADMIN', { _id: '64f000000000000000000002' });
  const target = makeUser('ENGINEER', { _id: '64f000000000000000000003' });
  const token = authenticateAs(admin);
  User.findById
    .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(admin) })
    .mockResolvedValueOnce(target);

  const response = await request(app)
    .patch(`/api/admin/users/${target._id}/role`)
    .set('Cookie', `token=${token}`)
    .send({ role: 'ADMIN' });

  expect(response.status).toBe(200);
  expect(target.role).toBe('ADMIN');
  expect(target.save).toHaveBeenCalledTimes(1);
  expect(Activity.create).toHaveBeenCalledWith(expect.objectContaining({
    subject: target._id,
    action: 'USER_ROLE_UPDATE',
    previousValue: 'ENGINEER',
    newValue: 'ADMIN',
  }));
});

test('an administrator cannot change their own role using a differently cased user ID', async () => {
  const admin = makeUser('ADMIN', { _id: '64f0000000000000000000ab' });
  const token = authenticateAs(admin);

  const response = await request(app)
    .patch(`/api/admin/users/${admin._id.toUpperCase()}/role`)
    .set('Cookie', `token=${token}`)
    .send({ role: 'ENGINEER' });

  expect(response.status).toBe(400);
  expect(response.body).toEqual({ error: 'You cannot change your own role' });
});

test('disabled accounts cannot access protected endpoints', async () => {
  const token = authenticateAs(makeUser('ADMIN', { active: false }));

  const response = await request(app)
    .get('/api/admin/users')
    .set('Cookie', `token=${token}`);

  expect(response.status).toBe(403);
  expect(response.body).toEqual({ error: 'This account has been disabled' });
});
