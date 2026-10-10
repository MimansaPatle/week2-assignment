// Small checks that run before a controller.
const mongoose = require('mongoose');
const { isConnected } = require('../config/db');
const { HttpError, DATABASE_UNAVAILABLE } = require('./errorHandler');

// Answers 503 at once when MongoDB is not connected.
function requireDatabase(req, res, next) {
  if (!isConnected()) throw new HttpError(503, DATABASE_UNAVAILABLE);
  next();
}

// Rejects an :id that is not a MongoDB ObjectId before any query runs.
function validateObjectId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid employee id.');
  next();
}

module.exports = { requireDatabase, validateObjectId };
