const authService = require('./auth.service');

async function register(req, res, next) {
  try {
    const { name, email, phone, password } = req.body;
    const result = await authService.register(name, email, phone, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.me(req.user.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    res.json({ message: 'Password updated.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, forgotPassword, resetPassword };
