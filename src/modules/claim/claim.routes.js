const express = require('express');
const { z } = require('zod');
const { verifyToken } = require('../../middleware/auth');
const claimService = require('./claim.service');

const router = express.Router();

const requestSchema = z.object({
  businessId: z.string().uuid(),
  email: z.string().email(),
});

/** POST /api/claim/request – request a claim link (no auth) */
router.post('/request', async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const result = await claimService.requestClaim(parsed.data.businessId, parsed.data.email);
    res.json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
});

/** GET /api/claim/verify?token=xxx – returns business name/slug if token valid (no auth) */
router.get('/verify', async (req, res, next) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const data = await claimService.verifyClaimToken(token);
    if (!data) return res.status(404).json({ error: 'Invalid or expired claim link' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** POST /api/claim – complete claim (auth required) */
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : null;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const business = await claimService.completeClaim(token, req.user.id);
    res.json(business);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
