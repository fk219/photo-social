const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'mosaic-test-secret';
process.env.IMAGEKIT_PRIVATE_KEY = 'test-imagekit-key';
process.env.MONGOMS_STARTUP_TIMEOUT = '120000';

const app = require('../src/app');

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('mosaic_test'));
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test('health endpoint reports a live API and database', async () => {
  const res = await request(app).get('/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.database, 'connected');
});

test('guest explore feed is public and returns a posts array', async () => {
  const res = await request(app).get('/api/posts/feed?scope=all&limit=5');

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.posts));
});

test('following feed requires a signed-in member', async () => {
  const res = await request(app).get('/api/posts/feed?scope=following');

  assert.equal(res.status, 401);
});

test('registration validates its inputs', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'alice', email: 'alice@example.com' });

  assert.equal(res.status, 400);
});

test('a member can register, log in and load their profile', async () => {
  const register = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'strongpass123',
      name: 'Alice',
    });

  assert.equal(register.status, 201);
  assert.equal(register.body.user.username, 'alice');

  const duplicate = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'strongpass123',
    });

  assert.equal(duplicate.status, 409);

  const wrongPassword = await request(app)
    .post('/api/auth/login')
    .send({ username: 'alice', password: 'wrong-password' });

  assert.equal(wrongPassword.status, 401);

  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'alice', password: 'strongpass123' });

  assert.equal(login.status, 200);

  const profile = await request(app).get('/api/users/alice');

  assert.equal(profile.status, 200);
  assert.equal(profile.body.profile.username, 'alice');
});

test('creating a post requires authentication', async () => {
  const res = await request(app)
    .post('/api/posts')
    .send({ caption: 'No cookie, no post.' });

  assert.equal(res.status, 401);
});

test('search is public and returns the expected collections', async () => {
  const res = await request(app).get('/api/search?q=alice');

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.users));
  assert.ok(Array.isArray(res.body.posts));
  assert.ok(Array.isArray(res.body.tags));
});
