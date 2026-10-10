const bcryptjs = require('bcryptjs');
const User = require('../models/User');
const RevokedToken = require('../models/RevokedToken');
const { generateToken } = require('../utils/jwt');

const INVALID_CREDENTIALS = 'Invalid email/username or password';

// A real bcrypt hash of a throwaway value. When a login names an account
// that does not exist, the password is still compared against this, so the
// reply takes about as long as it does for a real account. Otherwise the
// response time would reveal which usernames are registered.
const DUMMY_HASH = bcryptjs.hashSync('not-a-real-password', 12);

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

const duplicateResponse = (res, field) => {
  const message = `${capitalize(field)} already exists`;
  return res.status(409).json({
    success: false,
    message,
    fields: { [field]: message },
  });
};

/**
 * POST /api/auth/register
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.validatedData;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return duplicateResponse(res, existingUser.email === email ? 'email' : 'username');
    }

    // Create new user. The pre-save hook in the model replaces the plain
    // password with its bcrypt hash before anything is written.
    const user = new User({
      username,
      email,
      passwordHash: password,
    });

    await user.save();

    // Return success response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    // Two registrations for the same account arrived together and the other
    // one won: the unique index in MongoDB caught it.
    if (error.code === 11000) {
      return duplicateResponse(res, Object.keys(error.keyPattern || { email: 1 })[0]);
    }

    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.validatedData;

    // Find user by email or username
    const user = await User.findByEmailOrUsername(email);

    // Compare password (against a dummy hash when there is no such user)
    const isPasswordValid = user
      ? await user.comparePassword(password)
      : await bcryptjs.compare(password, DUMMY_HASH).then(() => false);

    // One message for both cases, so the reply never says whether the account exists
    if (!user || !isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: INVALID_CREDENTIALS,
      });
    }

    // Generate JWT token
    const token = generateToken(user._id.toString());

    // Return success response with token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 * The protect middleware has already verified the token and loaded the user.
 */
const getCurrentUser = (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user.toJSON(),
  });
};

/**
 * POST /api/auth/logout
 * Logout user and revoke the token that was used for this request
 *
 * The token's id (jti) is saved in the denylist until the token would have
 * expired. From then on the protect middleware refuses it, so a copy of the
 * token is useless after logout.
 */
const logout = async (req, res, next) => {
  try {
    const { jti, exp } = req.tokenPayload;

    await RevokedToken.updateOne(
      { jti },
      { $setOnInsert: { jti, expiresAt: new Date(exp * 1000) } },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
};
