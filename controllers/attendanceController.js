import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import { validationResult } from "express-validator";
import mongoose from "mongoose";

export const markAttendance = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { employeeId, status, note } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
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
        
        if (diffMs < 0) {
          return res.status(400).json({ message: "Invalid check-out time" });
        }

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

    attendance = new Attendance({
      employee: employeeId,
      date: today,
      checkInTime: new Date(),
      status: status || "Present",
      note: note || "",
    });

    await attendance.save();
    res.json({ success: true, message: "Checked in successfully", attendance });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id).populate('employee');
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    res.json({
      success: true,
      attendance
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, status, department } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

    const query = {};
    if (employeeId) query.employee = new mongoose.Types.ObjectId(employeeId);
    if (startDate && endDate) {
      query.checkInTime = {
        $gte: new Date(startDate),
        $lt: new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000),
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
      { $skip: (page - 1) * limit },
      { $limit: limit },
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
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      records: attendanceRecords,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

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

    const [statusStats, dailyStats, departmentStats] = await Promise.all([
      Attendance.aggregate([...pipeline, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Attendance.aggregate([
        ...pipeline,
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$checkInTime" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Attendance.aggregate([...pipeline, { $group: { _id: "$employeeDetails.department", count: { $sum: 1 } } }]),
    ]);

    const totalEmployees = await Employee.countDocuments(department ? { department } : {});

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
    res.status(500).json({ message: "Server Error" });
  }
};

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
      
      if (diffMs < 0) {
        return res.status(400).json({ message: "Invalid check-out time" });
      }

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
    res.status(500).json({ message: "Server Error" });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    res.json({ success: true, message: "Attendance record deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};