import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    position: {
        type: String,
        required: true,
    },
    department: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    employeeId: {
        type: String,
        required: true,
        unique: true,
    },
    profileImage: {
        type: String,
        required: true,
    },
    faceDescriptor: {
        type: Array
    },
    isActive: {
        type: Boolean,
        default: true,
    }
});

const Employee = mongoose.model("Employee", EmployeeSchema);

export default Employee;