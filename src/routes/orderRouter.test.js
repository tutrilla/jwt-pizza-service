const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

const adminUser = { email: 'a@jwt.com', password: 'admin' };
let adminAuthToken;

let testMenuItemId;
let testOrderId;
let testFranchiseId;
let testStoreId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);

  const adminLoginRes = await request(app).put('/api/auth').send(adminUser);
  adminAuthToken = adminLoginRes.body.token;
  expectValidJwt(adminAuthToken);

  // Test franchise
  const franchise = {
    name: 'Test Pizza Franchise',
    admins: [{ email: adminUser.email }]
  };
  const franchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(franchise);
  testFranchiseId = franchiseRes.body.id;

  const store = { name: 'Test Store' };
  const storeRes = await request(app)
    .post(`/api/franchise/${testFranchiseId}/store`)
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(store);
  testStoreId = storeRes.body.id;
});

test('get menu', async () => {
  const menuRes = await request(app).get('/api/order/menu');
  expect(menuRes.status).toBe(200);
  expect(Array.isArray(menuRes.body)).toBe(true);
});

test('add menu item', async () => {
  const newMenuItem = {
    title: 'Test Pizza',
    description: 'A test pizza',
    image: 'test.png',
    price: 0.05
  };

  const addMenuRes = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(newMenuItem);

  expect(addMenuRes.status).toBe(403);
  expect(addMenuRes.body.message).toBe('unable to add menu item');
});

test('add menu item - admin', async () => {
  const newMenuItem = {
    title: 'Admin Special',
    description: 'Only admins can add this',
    image: 'admin.png',
    price: 0.1
  };

  const addMenuRes = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(newMenuItem);

  expect(addMenuRes.status).toBe(200);
  expect(Array.isArray(addMenuRes.body)).toBe(true);
  
  // Verify the new item is in the menu
  const menuItem = addMenuRes.body.find(item => item.title === 'Admin Special');
  expect(menuItem).toBeDefined();
  expect(menuItem.description).toBe('Only admins can add this');
  testMenuItemId = menuItem.id;
});

test('add menu item', async () => {
  const newMenuItem = {
    title: 'Unauthorized Pizza',
    description: 'Should fail',
    image: 'fail.png',
    price: 0.01
  };

  const addMenuRes = await request(app)
    .put('/api/order/menu')
    .send(newMenuItem);

  expect(addMenuRes.status).toBe(401);
});

// Order tests
test('get orders - authenticated', async () => {
  const ordersRes = await request(app)
    .get('/api/order')
    .set('Authorization', `Bearer ${testUserAuthToken}`);

  expect(ordersRes.status).toBe(200);
  expect(ordersRes.body).toHaveProperty('dinerId');
  expect(ordersRes.body).toHaveProperty('orders');
  expect(ordersRes.body).toHaveProperty('page');
  expect(Array.isArray(ordersRes.body.orders)).toBe(true);
});

test('get orders', async () => {
  const ordersRes = await request(app).get('/api/order');
  expect(ordersRes.status).toBe(401);
});

test('get orders with pagination', async () => {
  const ordersRes = await request(app)
    .get('/api/order?page=1')
    .set('Authorization', `Bearer ${testUserAuthToken}`);

  expect(ordersRes.status).toBe(200);
  expect(ordersRes.body.page).toBe('1');
});

test('create order - authenticated', async () => {
  const orderReq = {
    franchiseId: testFranchiseId,
    storeId: testStoreId,
    items: [
      { menuId: testMenuItemId, description: 'Admin Special', price: 0.1 }
    ]
  };

  const createOrderRes = await request(app)
    .post('/api/order')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(orderReq);

  expect(createOrderRes.status).toBe(200);
  expect(createOrderRes.body).toHaveProperty('order');
  expect(createOrderRes.body.order).toHaveProperty('id');
  expect(createOrderRes.body.order.franchiseId).toBe(testFranchiseId);
  expect(createOrderRes.body.order.storeId).toBe(testStoreId);
  testOrderId = createOrderRes.body.order.id;
});

test('create order', async () => {
  const orderReq = {
    franchiseId: testFranchiseId,
    storeId: testStoreId,
    items: [
      { menuId: testMenuItemId, description: 'Admin Special', price: 0.1 }
    ]
  };

  const createOrderRes = await request(app)
    .post('/api/order')
    .send(orderReq);

  expect(createOrderRes.status).toBe(401);
});

test('verify order was created', async () => {
  const ordersRes = await request(app)
    .get('/api/order')
    .set('Authorization', `Bearer ${testUserAuthToken}`);

  expect(ordersRes.status).toBe(200);
  const order = ordersRes.body.orders.find(o => o.id === testOrderId);
  expect(order).toBeDefined();
  expect(order.franchiseId).toBe(testFranchiseId);
  expect(order.storeId).toBe(testStoreId);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}