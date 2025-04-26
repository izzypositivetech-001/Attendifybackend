import express from 'express';
import { check } from 'express-validator';
import { registerUser, loginUser, getCurrentUser } from '../controllers/userController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  ],
  registerUser
);

// @route   POST api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  loginUser
);

// @route   GET api/users/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, getCurrentUser);

export default router;
