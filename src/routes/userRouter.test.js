const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testUserId;

const adminUser = { email: 'a@jwt.com', password: 'admin' };
let adminAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
  expectValidJwt(testUserAuthToken);

  const adminLoginRes = await request(app).put('/api/auth').send(adminUser);
  adminAuthToken = adminLoginRes.body.token;
  expectValidJwt(adminAuthToken);
});

// Get user tests
test('get current user - authenticated', async () => {
  const userRes = await request(app)
    .get('/api/user/me')
    .set('Authorization', `Bearer ${testUserAuthToken}`);

  expect(userRes.status).toBe(200);
  expect(userRes.body).toHaveProperty('id');
  expect(userRes.body).toHaveProperty('name');
  expect(userRes.body).toHaveProperty('email');
  expect(userRes.body).toHaveProperty('roles');
  expect(userRes.body.id).toBe(testUserId);
  expect(userRes.body.email).toBe(testUser.email);
});

test('get current user - admin', async () => {
  const userRes = await request(app)
    .get('/api/user/me')
    .set('Authorization', `Bearer ${adminAuthToken}`);

  expect(userRes.status).toBe(200);
  expect(userRes.body.email).toBe('a@jwt.com');
  expect(userRes.body.roles).toContainEqual({ role: 'admin' });
});

test('update own user - email only', async () => {
  const newEmail = Math.random().toString(36).substring(2, 12) + '@test.com';
  const updateData = {
    email: newEmail
  };

  const updateRes = await request(app)
    .put(`/api/user/${testUserId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(updateData);

  expect(updateRes.status).toBe(200);
  expect(updateRes.body.user.email).toBe(newEmail);
  expectValidJwt(updateRes.body.token);

  // Update testUser email for future tests
  testUser.email = newEmail;
});

test('update own user - all fields', async () => {
  const newEmail = Math.random().toString(36).substring(2, 12) + '@test.com';
  const updateData = {
    name: 'Complete Update',
    email: newEmail,
    password: 'anotherpassword'
  };

  const updateRes = await request(app)
    .put(`/api/user/${testUserId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(updateData);

  expect(updateRes.status).toBe(200);
  expect(updateRes.body.user.name).toBe('Complete Update');
  expect(updateRes.body.user.email).toBe(newEmail);

  // Update for future tests
  testUser.email = newEmail;
  testUser.password = 'anotherpassword';
  testUserAuthToken = updateRes.body.token;
});

test('update user - without auth', async () => {
  const updateData = {
    name: 'No Auth Update'
  };

  const updateRes = await request(app)
    .put(`/api/user/${testUserId}`)
    .send(updateData);

  expect(updateRes.status).toBe(401);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}