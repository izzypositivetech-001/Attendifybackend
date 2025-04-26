import { parse } from "dotenv";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import { check, validationResult } from "express-validator";
import mongoose from "mongoose";

// @route POST /api/attendance
// @desc mark attendance for an employee
// @access Private
export const markAttendance = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { employeeId, status, note } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" }); // Fixed: Added proper response
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (attendance) {
      if (!attendance.checkOutTime) {
        attendance.checkOutTime = new Date();
        const checkIn = new Date(attendance.checkInTime);
        const checkOut = new Date(attendance.checkOutTime);
        const diffMs = checkOut - checkIn;
        const diffHrs = diffMs / (1000 * 60 * 60);
        attendance.workHours = parseFloat(diffHrs.toFixed(2));

        if (note) attendance.note = note;
        await attendance.save();

        return res.json({
          success: true,
          message: "Checked out successfully",
          attendance,
        });
      }
      return res.status(400).json({ message: "Already checked out for today" });
    }

    // Create new attendance record
    attendance = new Attendance({
      employee: employeeId,
      date: today, // Added missing date field
      checkInTime: new Date(),
      status: status || "Present",
      note: note || "",
    });

    await attendance.save();
    res.json({ success: true, message: "Checked in successfully", attendance });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @route GET /api/attendance/:id
// @desc Get single attendance record
// @access Private
export const getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee');
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    res.json({
      success: true,
      attendance
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @route GET /api/attendance
// @desc Get all attendance records
// @access Private
export const getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, status, department, page = 1, limit = 10 } = req.query;

    const query = {};
    if (employeeId) query.employee = new mongoose.Types.ObjectId(employeeId); // Fixed: Use proper ObjectId
    if (startDate && endDate) {
      query.checkInTime = {
        $gte: new Date(startDate),
        $lt: new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000), // Include full end date
      };
    }
    if (status) query.status = status;

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "employeeDetails",
        },
      },
      { $unwind: "$employeeDetails" },
    ];

    if (department) {
      pipeline.push({
        $match: {
          "employeeDetails.department": department,
        },
      });
    }

    const totalCount = await Attendance.countDocuments(query);

    const attendanceRecords = await Attendance.aggregate([
      ...pipeline,
      { $sort: { checkInTime: -1 } },
      { $skip: (page - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 1,
          employee: 1,
          checkInTime: 1,
          checkOutTime: 1,
          workHours: 1,
          status: 1,
          note: 1,
          date: 1,
          employeeName: "$employeeDetails.name",
          employeeId: "$employeeDetails.employeeId",
          department: "$employeeDetails.department",
        },
      },
    ]);

    res.json({
      success: true,
      count: totalCount,
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      currentPage: parseInt(page),
      records: attendanceRecords,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @route GET /api/attendance/stats
// @desc Get attendance statistics
// @access Private
export const getAttendanceStats = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const matchStage = {
      checkInTime: {
        $gte: start,
        $lt: end,
      },
    };

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "employeeDetails",
        },
      },
      { $unwind: "$employeeDetails" },
    ];

    if (department) {
      pipeline.push({
        $match: {
          "employeeDetails.department": department,
        },
      });
    }

    const statusStats = await Attendance.aggregate([
      ...pipeline,
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const dailyStats = await Attendance.aggregate([
      ...pipeline,
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$checkInTime" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const departmentStats = await Attendance.aggregate([
      ...pipeline,
      {
        $group: {
          _id: "$employeeDetails.department",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalEmployees = await Employee.countDocuments(
      department ? { department } : {}
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const presentToday = await Attendance.countDocuments({
      checkInTime: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      success: true,
      statusStats,
      dailyStats,
      departmentStats,
      totalEmployees,
      presentToday,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @route PUT /api/attendance/:id
// @desc Update attendance record
// @access Private
export const updateAttendance = async (req, res) => {
  try {
    const { status, checkInTime, checkOutTime, note } = req.body;

    let attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    if (status) attendance.status = status;
    if (checkInTime) attendance.checkInTime = checkInTime;
    if (checkOutTime) attendance.checkOutTime = checkOutTime;
    if (note) attendance.note = note;

    if (checkOutTime && attendance.checkInTime) {
      const checkIn = new Date(attendance.checkInTime);
      const checkOut = new Date(attendance.checkOutTime);
      const diffMs = checkOut - checkIn;
      const diffHrs = diffMs / (1000 * 60 * 60);
      attendance.workHours = parseFloat(diffHrs.toFixed(2));
    }

    await attendance.save();
    res.json({
      success: true,
      message: "Attendance record updated successfully",
      attendance,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @route DELETE /api/attendance/:id
// @desc Delete attendance record
// @access Private
export const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id); // Fixed: Use findByIdAndDelete
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    res.json({ success: true, message: "Attendance record deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Export all controller functions
export default {
  markAttendance,
  getAttendance,
  getAttendanceStats,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
};