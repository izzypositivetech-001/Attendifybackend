import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    checkInTime: {
        type: Date,
        required: true,
    },
    checkOutTime: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ["Present", "Absent" , "Leave" , "Half Day", "late"],
        default: "Present",
    },
    workHours: {
        type: Number,
        required: true,
    },
    note: {
        type: String,
    },
});

// create compound index for employee and date to ensure unique attendance record for each employee on a given date

AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", AttendanceSchema);
export default Attendance;  // 👈 ES Modules export