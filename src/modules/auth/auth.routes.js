const express = require('express');
const { z } = require('zod');
const authController = require('./auth.controller');
const { verifyToken } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string(), password: z.string().min(8) });

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.flatten().fieldErrors });
    }
    req.body = result.data;
    next();
  };
}

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/forgot-password', authLimiter, validate(forgotSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetSchema), authController.resetPassword);
router.get('/me', verifyToken, authController.me);

module.exports = router;
