// Authentication API tests.
// They run the real Express app against a real MongoDB database that is used
// only by the tests (see tests/setupEnv.js) and is deleted afterwards.
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

const createApp = require('../app');
const connectDB = require('../config/db');
const { findConfigProblems, JWT_SECRET_PLACEHOLDER } = require('../config/env');
const User = require('../models/User');
const RevokedToken = require('../models/RevokedToken');

// Rate limits are set high here so they do not interfere; they have their own tests below.
const app = createApp({ loginRateLimit: 1000, registerRateLimit: 1000, apiRateLimit: 100000 });

const VALID_USER = {
  username: 'dana_ruiz',
  email: 'dana.ruiz@example.com',
  password: 'Harbor2026',
  confirmPassword: 'Harbor2026',
};

const register = (overrides = {}, target = app) =>
  request(target).post('/api/auth/register').send({ ...VALID_USER, ...overrides });

const login = (email = VALID_USER.username, password = VALID_USER.password, target = app) =>
  request(target).post('/api/auth/login').send({ email, password });

const me = (token) => request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

const registerAndLogin = async () => {
  await register();
  const response = await login();
  return response.body.token;
};

// Signs a token the same way the app does, with any payload or options.
const signToken = (payload, options = {}, secret = process.env.JWT_SECRET) =>
  jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '15m', jwtid: 'test-token-id', ...options });

beforeAll(async () => {
  // Safety check: these tests delete data, so refuse to run on anything but a test database.
  expect(process.env.MONGODB_URI).toMatch(/_test$/);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await connectDB();
});

beforeEach(async () => {
  await User.deleteMany({});
  await RevokedToken.deleteMany({});
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI);
  expect(mongoose.connection.name).toMatch(/_test$/);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ==================== HEALTH ====================

describe('GET /api/health', () => {
  it('reports the server and the database', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('connected');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('uses the isolated test database', () => {
    expect(mongoose.connection.name).toBe('authentication_system_mern_test');
  });
});

// ==================== REGISTER ====================

describe('POST /api/auth/register', () => {
  it('creates an account and returns only safe fields', async () => {
    const response = await register().expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('User registered successfully');
    expect(Object.keys(response.body.user).sort()).toEqual(['createdAt', 'email', 'id', 'username']);
    expect(response.body.user.username).toBe('dana_ruiz');
    expect(response.body.user.email).toBe('dana.ruiz@example.com');
    // Registering does not log the user in.
    expect(response.body.token).toBeUndefined();
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await register().expect(201);

    const stored = await User.findOne({ username: 'dana_ruiz' }).select('+passwordHash').lean();
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
    expect(stored.passwordHash).not.toContain(VALID_USER.password);
    expect(stored.password).toBeUndefined();
    expect(JSON.stringify(stored)).not.toContain(VALID_USER.password);
    expect(await bcryptjs.compare(VALID_USER.password, stored.passwordHash)).toBe(true);
  });

  it('gives two users with the same password different hashes (salted)', async () => {
    await register();
    await register({ username: 'second_user', email: 'second@example.com' });

    const users = await User.find().select('+passwordHash').lean();
    expect(users).toHaveLength(2);
    expect(users[0].passwordHash).not.toBe(users[1].passwordHash);
  });

  it('never returns the password or its hash', async () => {
    const response = await register();
    const body = JSON.stringify(response.body);

    expect(body).not.toContain(VALID_USER.password);
    expect(body).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('normalises the username and email (trim, lower case)', async () => {
    const response = await register({ username: '  Dana_Ruiz ', email: '  Dana.Ruiz@Example.COM ' }).expect(201);

    expect(response.body.user.username).toBe('dana_ruiz');
    expect(response.body.user.email).toBe('dana.ruiz@example.com');
  });

  it('rejects an empty body with a message for every field', async () => {
    const response = await request(app).post('/api/auth/register').send({}).expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.fields).toEqual({
      username: 'Username is required',
      email: 'Email is required',
      password: 'Password is required',
      confirmPassword: 'Confirm password is required',
    });
    expect(await User.countDocuments()).toBe(0);
  });

  it.each([
    ['ab', 'at least 3 characters'],
    ['a'.repeat(31), 'not exceed 30 characters'],
    ['dana ruiz', 'letters, numbers, underscores, and hyphens'],
    ['dana<script>', 'letters, numbers, underscores, and hyphens'],
    ['dana.ruiz', 'letters, numbers, underscores, and hyphens'],
  ])('rejects the username "%s"', async (username, expected) => {
    const response = await register({ username }).expect(400);
    expect(response.body.fields.username).toContain(expected);
  });

  it.each(['not-an-email', 'dana@', '@example.com', 'dana@example', 'da na@example.com'])(
    'rejects the email "%s"',
    async (email) => {
      const response = await register({ email }).expect(400);
      expect(response.body.fields.email).toBe('Please provide a valid email address');
    }
  );

  it.each([
    ['Ab1', 'at least 8 characters'],
    ['harbor2026', 'uppercase letter'],
    ['HARBOR2026', 'lowercase letter'],
    ['HarborHarbor', 'one number'],
    ['Aa1' + 'x'.repeat(70), 'not exceed 72 characters'],
  ])('rejects the weak or oversized password "%s"', async (password, expected) => {
    const response = await register({ password, confirmPassword: password }).expect(400);
    expect(response.body.fields.password).toContain(expected);
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects a confirmation that does not match', async () => {
    const response = await register({ confirmPassword: 'Harbor2027' }).expect(400);
    expect(response.body.fields.confirmPassword).toBe('Passwords do not match');
  });

  it('rejects query-operator objects sent in place of text (no crash, no account)', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ username: { $ne: '' }, email: { $gt: '' }, password: { $ne: '' }, confirmPassword: ['x'] })
      .expect(400);

    expect(Object.keys(response.body.fields).sort()).toEqual(['confirmPassword', 'email', 'password', 'username']);
    expect(await User.countDocuments()).toBe(0);
  });

  it('ignores extra fields such as a role or an id', async () => {
    const response = await register({ role: 'admin', isAdmin: true, _id: '507f1f77bcf86cd799439011' }).expect(201);
    const stored = await User.findOne({ username: 'dana_ruiz' }).lean();

    expect(response.body.user.id).not.toBe('507f1f77bcf86cd799439011');
    expect(stored.role).toBeUndefined();
    expect(stored.isAdmin).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    await register();
    const response = await register({ username: 'someone_else', email: 'DANA.RUIZ@example.com' }).expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Email already exists');
    expect(response.body.fields).toEqual({ email: 'Email already exists' });
    expect(await User.countDocuments()).toBe(1);
  });

  it('rejects a duplicate username with 409, whatever its letter case', async () => {
    await register();
    const response = await register({ username: 'DANA_RUIZ', email: 'other@example.com' }).expect(409);

    expect(response.body.message).toBe('Username already exists');
    expect(await User.countDocuments()).toBe(1);
  });

  it('has unique indexes in MongoDB for email and username', async () => {
    const indexes = await User.collection.indexes();

    expect(indexes.find((index) => index.key.email === 1).unique).toBe(true);
    expect(indexes.find((index) => index.key.username === 1).unique).toBe(true);
  });

  it('creates only one account when the same registration arrives twice at once', async () => {
    const responses = await Promise.all([register(), register(), register(), register()]);
    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([201, 409, 409, 409]);
    expect(await User.countDocuments()).toBe(1);
  });
});

// ==================== LOGIN ====================

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('logs in with the username and returns a token', async () => {
    const response = await login('dana_ruiz').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.token.split('.')).toHaveLength(3);
    expect(Object.keys(response.body.user).sort()).toEqual(['createdAt', 'email', 'id', 'username']);
  });

  it('logs in with the email, ignoring case and surrounding spaces', async () => {
    await login('  DANA.RUIZ@Example.com ').expect(200);
    await login('DANA_RUIZ').expect(200);
  });

  it('never returns the password or its hash', async () => {
    const response = await login();
    const body = JSON.stringify(response.body);

    expect(body).not.toContain(VALID_USER.password);
    expect(body).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('puts only the user id, a token id and timestamps in the token', async () => {
    const response = await login();
    const payload = jwt.decode(response.body.token);

    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'jti', 'userId']);
    expect(payload.userId).toBe(response.body.user.id);
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });

  it('gives every login its own token id', async () => {
    const first = jwt.decode((await login()).body.token);
    const second = jwt.decode((await login()).body.token);

    expect(first.jti).not.toBe(second.jti);
  });

  it('rejects a wrong password and a nonexistent user with the same response', async () => {
    const wrongPassword = await login('dana_ruiz', 'Harbor2027').expect(401);
    const unknownUser = await login('nobody_here', VALID_USER.password).expect(401);

    expect(wrongPassword.body).toEqual({ success: false, message: 'Invalid email/username or password' });
    expect(unknownUser.body).toEqual(wrongPassword.body);
    expect(wrongPassword.body.token).toBeUndefined();
  });

  it('rejects missing fields with 400', async () => {
    const response = await request(app).post('/api/auth/login').send({}).expect(400);

    expect(response.body.fields).toEqual({
      email: 'Email or username is required',
      password: 'Password is required',
    });
  });

  it('rejects query-operator objects sent in place of text', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: { $ne: null } })
      .expect(400);

    expect(response.body.token).toBeUndefined();

    const passwordOnly = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dana_ruiz', password: { $regex: '.*' } })
      .expect(400);
    expect(passwordOnly.body.token).toBeUndefined();
  });
});

// ==================== PROTECTED ROUTE ====================

describe('GET /api/auth/me', () => {
  it('returns the profile for a valid token', async () => {
    const token = await registerAndLogin();
    const response = await me(token).expect(200);

    expect(response.body.success).toBe(true);
    expect(Object.keys(response.body.user).sort()).toEqual(['createdAt', 'email', 'id', 'username']);
    expect(response.body.user.username).toBe('dana_ruiz');
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('rejects a request with no token', async () => {
    const response = await request(app).get('/api/auth/me').expect(401);

    expect(response.body).toEqual({ success: false, message: 'No token provided', code: 'TOKEN_MISSING' });
  });

  it.each([
    ['a header without "Bearer"', 'Token abc'],
    ['an empty bearer token', 'Bearer '],
    ['a token that is not a JWT', 'Bearer not-a-jwt'],
    ['a truncated JWT', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxIn0'],
  ])('rejects %s', async (name, header) => {
    const response = await request(app).get('/api/auth/me').set('Authorization', header).expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.user).toBeUndefined();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await registerAndLogin();
    const { userId } = jwt.decode(token);
    const forged = signToken({ userId }, {}, 'a-completely-different-secret-value-000000');

    const response = await me(forged).expect(401);
    expect(response.body.code).toBe('TOKEN_INVALID');
  });

  it('rejects a token whose payload was altered', async () => {
    const token = await registerAndLogin();
    const [header, payload, signature] = token.split('.');
    const altered = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), userId: '507f1f77bcf86cd799439011' })
    ).toString('base64url');

    await me(`${header}.${altered}.${signature}`).expect(401);
  });

  it('rejects an unsigned token (algorithm "none")', async () => {
    const token = await registerAndLogin();
    const { userId } = jwt.decode(token);
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ userId, jti: 'x', exp: Math.floor(Date.now() / 1000) + 600 })
    ).toString('base64url');

    await me(`${header}.${payload}.`).expect(401);
  });

  it('rejects an expired token', async () => {
    const token = await registerAndLogin();
    const { userId } = jwt.decode(token);
    const expired = signToken({ userId }, { expiresIn: -10 });

    const response = await me(expired).expect(401);
    expect(response.body).toEqual({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
  });

  it('rejects a correctly signed token without a token id or with a malformed user id', async () => {
    const token = await registerAndLogin();
    const { userId } = jwt.decode(token);

    await me(jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' })).expect(401);
    await me(signToken({ userId: 'not-an-object-id' })).expect(401);
    await me(signToken({ userId: { $ne: null } })).expect(401);
  });

  it('rejects a valid token once its account has been deleted', async () => {
    const token = await registerAndLogin();
    await User.deleteMany({});

    const response = await me(token).expect(401);
    expect(response.body.code).toBe('TOKEN_INVALID');
  });
});

// ==================== LOGOUT ====================

describe('POST /api/auth/logout', () => {
  const logout = (token) => request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);

  it('requires a token', async () => {
    await request(app).post('/api/auth/logout').expect(401);
  });

  it('logs out and then rejects the same token on protected routes', async () => {
    const token = await registerAndLogin();
    await me(token).expect(200);

    const response = await logout(token).expect(200);
    expect(response.body).toEqual({ success: true, message: 'Logout successful' });

    const after = await me(token).expect(401);
    expect(after.body).toEqual({ success: false, message: 'Token has been revoked', code: 'TOKEN_REVOKED' });

    // The revoked token cannot be used to log out again either.
    await logout(token).expect(401);
  });

  it('stores only the token id and its expiry, never the token', async () => {
    const token = await registerAndLogin();
    await logout(token).expect(200);

    const records = await RevokedToken.find().lean();
    const payload = jwt.decode(token);

    expect(records).toHaveLength(1);
    expect(records[0].jti).toBe(payload.jti);
    expect(records[0].expiresAt.getTime()).toBe(payload.exp * 1000);
    expect(JSON.stringify(records)).not.toContain(token);
  });

  it('removes revoked-token records automatically after they expire (TTL index)', async () => {
    const indexes = await RevokedToken.collection.indexes();
    const ttl = indexes.find((index) => index.key.expiresAt === 1);

    expect(ttl.expireAfterSeconds).toBe(0);
    expect(indexes.find((index) => index.key.jti === 1).unique).toBe(true);
  });

  it('revokes only that token: another session of the same user keeps working', async () => {
    const first = await registerAndLogin();
    const second = (await login()).body.token;

    await logout(first).expect(200);

    await me(first).expect(401);
    await me(second).expect(200);
  });

  it('allows a fresh login after logout', async () => {
    const token = await registerAndLogin();
    await logout(token).expect(200);

    const fresh = (await login().expect(200)).body.token;
    await me(fresh).expect(200);
  });
});

// ==================== ERRORS AND HEADERS ====================

describe('Errors and security headers', () => {
  it('answers 400 for a body that is not valid JSON', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400);

    expect(response.body).toEqual({ success: false, message: 'Request body is not valid JSON' });
  });

  it('answers 413 for a body over the size limit', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, padding: 'x'.repeat(20 * 1024) })
      .expect(413);

    expect(response.body.success).toBe(false);
  });

  it('answers 404 as JSON for an unknown route', async () => {
    const response = await request(app).get('/api/nothing-here').expect(404);
    expect(response.body).toEqual({ success: false, message: 'Route not found' });
  });

  it('hides the details of an unexpected database error', async () => {
    const spy = jest
      .spyOn(User, 'findOne')
      .mockImplementationOnce(() => {
        throw new Error('E-SECRET: connection string mongodb://admin:hunter2@internal-host');
      });

    const response = await register().expect(500);
    spy.mockRestore();

    expect(response.body).toEqual({ success: false, message: 'Internal server error' });
    expect(JSON.stringify(response.body)).not.toMatch(/hunter2|internal-host|stack|at /);
  });

  it('sends security headers and hides the framework', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

});

// ==================== CORS ====================

describe('CORS', () => {
  const FRONTEND = 'http://localhost:5173';

  // The request a browser sends before a cross-origin POST with JSON or a token.
  const preflight = (path, origin, target = app) =>
    request(target)
      .options(path)
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,authorization');

  it('answers the preflight for a JSON POST from the configured frontend', async () => {
    for (const path of ['/api/auth/register', '/api/auth/login', '/api/auth/logout']) {
      const response = await preflight(path, FRONTEND);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(FRONTEND);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers'].toLowerCase()).toContain('content-type');
      expect(response.headers['access-control-allow-headers'].toLowerCase()).toContain('authorization');
    }
  });

  it('answers the preflight for the protected GET', async () => {
    const response = await request(app)
      .options('/api/auth/me')
      .set('Origin', FRONTEND)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(FRONTEND);
    expect(response.headers['access-control-allow-methods']).toContain('GET');
  });

  it('gives no CORS permission to any other origin, on the preflight or the request', async () => {
    for (const origin of ['http://evil.example', 'http://localhost:5174', 'http://127.0.0.1:5173', 'https://localhost:5173']) {
      const pre = await preflight('/api/auth/login', origin);
      const post = await request(app).post('/api/auth/login').set('Origin', origin).send({});

      expect(pre.headers['access-control-allow-origin']).toBeUndefined();
      expect(post.headers['access-control-allow-origin']).toBeUndefined();
    }
  });

  it('never answers with a wildcard origin', async () => {
    const responses = [
      await preflight('/api/auth/register', FRONTEND),
      await request(app).get('/api/health').set('Origin', FRONTEND),
      await request(app).get('/api/health'),
    ];

    for (const response of responses) {
      expect(response.headers['access-control-allow-origin']).not.toBe('*');
    }
  });

  it('adds the header to real responses, including errors', async () => {
    await register();

    const ok = await request(app).get('/api/health').set('Origin', FRONTEND);
    const created = await register({ username: 'cors_user', email: 'cors@example.com' }).set('Origin', FRONTEND);
    const invalid = await request(app).post('/api/auth/register').set('Origin', FRONTEND).send({});
    const duplicate = await register().set('Origin', FRONTEND);
    const wrongPassword = await login(VALID_USER.username, 'Wrong2026').set('Origin', FRONTEND);
    const noToken = await request(app).get('/api/auth/me').set('Origin', FRONTEND);
    const badJson = await request(app)
      .post('/api/auth/login')
      .set('Origin', FRONTEND)
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    const unknown = await request(app).get('/api/nothing-here').set('Origin', FRONTEND);

    expect([ok, created, invalid, duplicate, wrongPassword, noToken, badJson, unknown].map((r) => r.status)).toEqual([
      200, 201, 400, 409, 401, 401, 400, 404,
    ]);
    for (const response of [ok, created, invalid, duplicate, wrongPassword, noToken, badJson, unknown]) {
      expect(response.headers['access-control-allow-origin']).toBe(FRONTEND);
    }
  });

  it('keeps the header on rate-limited (429) responses, and preflights are not counted', async () => {
    const limited = createApp({ loginRateLimit: 1, registerRateLimit: 1000, apiRateLimit: 100000 });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await preflight('/api/auth/login', FRONTEND, limited)).status).toBe(200);
    }

    await login('nobody_here', 'Wrong2026', limited).set('Origin', FRONTEND).expect(401);
    const blocked = await login('nobody_here', 'Wrong2026', limited).set('Origin', FRONTEND).expect(429);

    expect(blocked.headers['access-control-allow-origin']).toBe(FRONTEND);
    // A preflight still succeeds while the limit is in force.
    expect((await preflight('/api/auth/login', FRONTEND, limited)).headers['access-control-allow-origin']).toBe(FRONTEND);
  });

  describe('FRONTEND_URL', () => {
    const original = process.env.FRONTEND_URL;

    afterEach(() => {
      process.env.FRONTEND_URL = original;
    });

    const appFor = (value) => {
      process.env.FRONTEND_URL = value;
      return createApp({ loginRateLimit: 1000, registerRateLimit: 1000, apiRateLimit: 100000 });
    };

    it('is the only thing that decides which origin is allowed', async () => {
      const other = appFor('http://localhost:5174');

      expect((await preflight('/api/auth/login', 'http://localhost:5174', other)).headers['access-control-allow-origin']).toBe(
        'http://localhost:5174'
      );
      expect((await preflight('/api/auth/login', FRONTEND, other)).headers['access-control-allow-origin']).toBeUndefined();
    });

    it('still matches when written with a trailing slash or spaces', async () => {
      const response = await preflight('/api/auth/register', FRONTEND, appFor('  http://localhost:5173/  '));

      expect(response.headers['access-control-allow-origin']).toBe(FRONTEND);
    });

    it('accepts several origins separated by commas, and only those', async () => {
      const several = appFor('http://localhost:5173, https://nexus.example.com/');

      expect((await preflight('/api/auth/login', FRONTEND, several)).headers['access-control-allow-origin']).toBe(FRONTEND);
      expect(
        (await preflight('/api/auth/login', 'https://nexus.example.com', several)).headers['access-control-allow-origin']
      ).toBe('https://nexus.example.com');
      expect(
        (await preflight('/api/auth/login', 'http://evil.example', several)).headers['access-control-allow-origin']
      ).toBeUndefined();
    });
  });
});

// ==================== RATE LIMITING ====================

describe('Rate limiting', () => {
  it('blocks repeated failed logins, without counting successful ones', async () => {
    await register();
    const limited = createApp({ loginRateLimit: 3, registerRateLimit: 1000, apiRateLimit: 100000 });

    // Successful logins do not use up the allowance.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login(VALID_USER.username, VALID_USER.password, limited).expect(200);
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await login(VALID_USER.username, 'Wrong2026', limited).expect(401);
    }

    const blocked = await login(VALID_USER.username, 'Wrong2026', limited).expect(429);
    expect(blocked.body).toEqual({
      success: false,
      message: 'Too many attempts. Please try again in a few minutes.',
    });

    // While blocked, even the correct password is refused.
    await login(VALID_USER.username, VALID_USER.password, limited).expect(429);
  });

  it('limits registrations from one address', async () => {
    const limited = createApp({ loginRateLimit: 1000, registerRateLimit: 2, apiRateLimit: 100000 });

    await register({ username: 'user_one', email: 'one@example.com' }, limited).expect(201);
    await register({ username: 'user_two', email: 'two@example.com' }, limited).expect(201);
    await register({ username: 'user_three', email: 'three@example.com' }, limited).expect(429);

    expect(await User.countDocuments()).toBe(2);
  });

  it('does not rate limit the profile check like a login', async () => {
    const token = await registerAndLogin();
    const limited = createApp({ loginRateLimit: 2, registerRateLimit: 2, apiRateLimit: 100000 });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(limited).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    }
  });
});

// ==================== CONFIGURATION ====================

describe('Environment configuration', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env.MONGODB_URI = original.MONGODB_URI;
    process.env.JWT_SECRET = original.JWT_SECRET;
  });

  it('accepts a complete configuration', () => {
    expect(findConfigProblems()).toEqual([]);
  });

  it('reports a missing database address and a missing secret', () => {
    delete process.env.MONGODB_URI;
    delete process.env.JWT_SECRET;

    const problems = findConfigProblems().join('\n');
    expect(problems).toContain('MONGODB_URI is not set');
    expect(problems).toContain('JWT_SECRET is not set');
  });

  it('refuses the placeholder secret and a secret that is too short', () => {
    process.env.JWT_SECRET = JWT_SECRET_PLACEHOLDER;
    expect(findConfigProblems().join()).toContain('placeholder');

    process.env.JWT_SECRET = 'short';
    expect(findConfigProblems().join()).toContain('at least 32 characters');
  });
});

// ==================== DATABASE UNAVAILABLE ====================
// Kept last: it disconnects from MongoDB on purpose.

describe('When the database is unavailable', () => {
  it('answers 503 on the auth routes and says so on the health check', async () => {
    const token = await registerAndLogin();
    await mongoose.disconnect();

    try {
      const expected = { success: false, message: 'Service temporarily unavailable. Please try again shortly.' };

      expect((await register({ username: 'new_user', email: 'new@example.com' }).expect(503)).body).toEqual(expected);
      expect((await login().expect(503)).body).toEqual(expected);
      expect((await me(token).expect(503)).body).toEqual(expected);

      // The browser can only read this error if it still carries the CORS header.
      const fromBrowser = await login().set('Origin', 'http://localhost:5173').expect(503);
      expect(fromBrowser.headers['access-control-allow-origin']).toBe('http://localhost:5173');

      const health = await request(app).get('/api/health').expect(200);
      expect(health.body.database).toBe('disconnected');
    } finally {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    await me(token).expect(200);
  });
});
