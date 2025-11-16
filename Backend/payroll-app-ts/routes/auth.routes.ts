// routes/auth.routes.ts
import { Router } from 'express';
import { loginUser } from '../controllers/auth.controller';

const router = Router();

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', loginUser);

export default router;