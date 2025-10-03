// setupTests.js
const { DB, Role } = require('./src/database/database.js');

beforeAll(async () => {
  // Ensure admin user exists
  try {
    await DB.getUser('a@jwt.com');
  } catch (error) {
    // Admin doesn't exist, create it
    await DB.addUser({
      name: '常用名字',
      email: 'a@jwt.com',
      password: 'admin',
      roles: [{ role: Role.Admin }]
    });
  }
});