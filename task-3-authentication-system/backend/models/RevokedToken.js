const mongoose = require('mongoose');

/**
 * Revoked token (logout denylist)
 *
 * A JWT stays valid until it expires, so deleting it from the browser does
 * not stop a copy of it from working. At logout the token's unique id (jti)
 * is saved here, and the auth middleware refuses any token whose id is listed.
 *
 * Only the random id is stored, never the token itself.
 */
const revokedTokenSchema = new mongoose.Schema({
  jti: {
    type: String,
    required: true,
    unique: true,
  },
  // When the token would have expired anyway. MongoDB deletes the record at
  // that moment (TTL index), so this collection cannot grow without limit.
  expiresAt: {
    type: Date,
    required: true,
    expires: 0,
  },
});

module.exports = mongoose.model('RevokedToken', revokedTokenSchema);
