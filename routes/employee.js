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
import upload from '../middleware/upload.js';

const router = express.Router();

// @route   POST api/employees
// @desc    Register a new employee
// @access  Private
router.post(
  '/',
  [
    auth,
    upload.single('profileImage'),
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

// @route   GET api/employees
// @desc    Get all employees
// @access  Private
router.get('/', auth, getAllEmployees);

// @route   GET api/employees/:id
// @desc    Get employee by ID
// @access  Private
router.get('/:id', auth, getEmployeeById);

// @route   PUT api/employees/:id
// @desc    Update employee
// @access  Private
router.put(
  '/:id',
  [
    auth,
    upload.single('profileImage')
  ],
  updateEmployee
);

// @route   DELETE api/employees/:id
// @desc    Delete employee
// @access  Private
router.delete('/:id', auth, deleteEmployee);

export default router;
