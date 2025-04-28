import express from 'express';
import { check } from 'express-validator';
import {
  registerEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee
} from '../controllers/employeeController.js';
import auth from '../middleware/auth.js';
import { uploadProfileImage } from '../middleware/upload.js'; // Import the named export

const router = express.Router();

// @route   POST api/employees
// @desc    Register a new employee
// @access  Private
router.post(
  '/',
  [
    auth,
    uploadProfileImage, // Use the imported middleware
    [
      check('name', 'Name is required').not().isEmpty(),
      check('email', 'Please include a valid email').isEmail(),
      check('department', 'Department is required').not().isEmpty(),
      check('position', 'Position is required').not().isEmpty(),
      check('employeeId', 'Employee ID is required').not().isEmpty()
    ]
  ],
  registerEmployee
);

// ... rest of your routes remain the same ...

export default router;