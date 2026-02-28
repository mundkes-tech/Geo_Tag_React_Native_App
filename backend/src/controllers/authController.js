const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({ message: 'Email already in use' });
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  const token = signToken(user._id);

  return res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user._id);

  return res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
}

module.exports = {
  register,
  login,
};