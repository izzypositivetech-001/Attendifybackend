import express from 'express';
import { check } from 'express-validator';
import {
  markAttendance,
  getAttendance,
  getAttendanceStats,
  getAttendanceById,
  updateAttendance,
  deleteAttendance
} from '../controllers/attendanceController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   POST api/attendance
// @desc    Mark attendance for an employee
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('employeeId', 'Employee ID is required').not().isEmpty()
    ]
  ],
  markAttendance
);

// @route   GET api/attendance
// @desc    Get all attendance records with filtering options
// @access  Private
router.get('/', auth, getAttendance);

// @route   GET api/attendance/stats
// @desc    Get attendance statistics
// @access  Private
router.get('/stats', auth, getAttendanceStats);

// @route   GET api/attendance/:id
// @desc    Get attendance record by ID
// @access  Private
router.get('/:id', auth, getAttendanceById);

// @route   PUT api/attendance/:id
// @desc    Update attendance record
// @access  Private
router.put('/:id', auth, updateAttendance);

// @route   DELETE api/attendance/:id
// @desc    Delete attendance record
// @access  Private
router.delete('/:id', auth, deleteAttendance);

export default router;
