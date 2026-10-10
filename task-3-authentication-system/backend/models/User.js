const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const validator = require('validator');

// bcrypt work factor: each step up doubles the time needed to hash (and to guess).
// The tests lower it through BCRYPT_ROUNDS so they run quickly.
const DEFAULT_BCRYPT_ROUNDS = 12;
const getBcryptRounds = () => Number(process.env.BCRYPT_ROUNDS) || DEFAULT_BCRYPT_ROUNDS;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      // "unique" creates a unique index, so MongoDB refuses a duplicate even
      // if two registrations arrive at the same moment.
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username must not exceed 30 characters'],
      match: [
        /^[a-z0-9_-]+$/,
        'Username can only contain letters, numbers, underscores, and hyphens'
      ],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Don't include passwordHash by default in queries
    },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// ==================== METHODS ====================

/**
 * Hash password before saving
 * The controller puts the plain password in passwordHash; it is replaced by
 * the bcrypt hash here, so the plain password never reaches the database.
 */
userSchema.pre('save', async function (next) {
  // Only hash if password is modified or new
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcryptjs.genSalt(getBcryptRounds());
    this.passwordHash = await bcryptjs.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare provided password with stored hash
 * @param {string} candidatePassword - Password to verify
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcryptjs.compare(candidatePassword, this.passwordHash);
};

/**
 * Return safe user profile
 * Only these fields ever leave the API; the password hash is never included.
 */
userSchema.methods.toJSON = function () {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    createdAt: this.createdAt,
  };
};

// ==================== STATIC METHODS ====================

/**
 * Find user by email or username (case-insensitive)
 * Includes password hash for authentication
 */
userSchema.statics.findByEmailOrUsername = async function (identifier) {
  const value = String(identifier).toLowerCase();
  return this.findOne({
    $or: [{ email: value }, { username: value }]
  }).select('+passwordHash');
};

// ==================== MODEL ====================

module.exports = mongoose.model('User', userSchema);
