const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

const adminUser = { email: 'a@jwt.com', password: 'admin' };
let adminAuthToken;

const franchiseAdminUser = { name: 'franchise admin', email: 'franchiseadmin@test.com', password: 'franchise' };
let franchiseAdminAuthToken;
let franchiseAdminUserId;

let testFranchiseId;
let testStoreId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);

  const adminLoginRes = await request(app).put('/api/auth').send(adminUser);
  console.log('Admin login response:', adminLoginRes.body);
  adminAuthToken = adminLoginRes.body.token;
  // console.log(adminAuthToken);
  expectValidJwt(adminAuthToken);

  franchiseAdminUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const franchiseAdminRes = await request(app).post('/api/auth').send(franchiseAdminUser);
  franchiseAdminAuthToken = franchiseAdminRes.body.token;
  franchiseAdminUserId = franchiseAdminRes.body.user.id;
  expectValidJwt(franchiseAdminAuthToken);
});

test('create franchise', async () => {
  const newFranchise = {
    name: 'Test Franchise',
    admins: [{ email: franchiseAdminUser.email }]
  };
  
  const createRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(newFranchise);
  
  expect(createRes.status).toBe(403);
});

test('create franchise - admin', async () => {
  const newFranchise = {
    name: 'Test Franchise',
    admins: [{ email: franchiseAdminUser.email }]
  };
  
  const createRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(newFranchise);
  
  expect(createRes.status).toBe(200);
  expect(createRes.body).toHaveProperty('id');
  expect(createRes.body.name).toBe('Test Franchise');
  testFranchiseId = createRes.body.id;
});

// test('list all the franchises', async() => {
//     const franchiseRes = await request(app).get('/api/franchise?page=0&limit=10&name=*');
//     expect(franchiseRes.status).toBe(200);
//     console.log(franchiseRes.body);
// });

test('get user franchises', async () => {
  const userFranchisesRes = await request(app)
    .get(`/api/franchise/${franchiseAdminUserId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`);
  
  expect(userFranchisesRes.status).toBe(200);
  expect(userFranchisesRes.body).toEqual([]);
});

test('create store', async () => {
  const newStore = { name: 'Test Store' };
  
  const createStoreRes = await request(app)
    .post(`/api/franchise/${testFranchiseId}/store`)
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(newStore);
  
  expect(createStoreRes.status).toBe(403);
});

test('delete store', async () => {
  const deleteStoreRes = await request(app)
    .delete(`/api/franchise/${testFranchiseId}/store/${testStoreId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`);
  
  expect(deleteStoreRes.status).toBe(403);
});

test('delete franchise', async () => {
  const deleteFranchiseRes = await request(app)
    .delete(`/api/franchise/${testFranchiseId}`)
    .set('Authorization', `Bearer ${adminAuthToken}`);
  
  expect(deleteFranchiseRes.status).toBe(200);
  expect(deleteFranchiseRes.body.message).toBe('franchise deleted');
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}