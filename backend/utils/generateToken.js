const jwt = require('jsonwebtoken');

function generateToken(userId, role = 'user') {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET non configuré');
  }

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

module.exports = generateToken;
