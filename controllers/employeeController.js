import Employee from '../models/Employee.js';
import { validationResult } from 'express-validator';
import fs from 'fs/promises';

export const registerEmployee = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, phone, address, position, department, employeeId, faceDescriptor } = req.body;

  try {
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee already exists' });
    }

    const newEmployee = new Employee({
      name,
      email,
      phone,
      address,
      position,
      department,
      employeeId,
      faceDescriptor: faceDescriptor ? JSON.parse(faceDescriptor) : undefined,
      profileImage: req.file ? req.file.path : undefined,
    });

    await newEmployee.save();
    res.status(201).json({ success: true, employee: newEmployee });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json({ success: true, employees });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json({ success: true, employee });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { name, email, phone, address, position, department, employeeId, isActive, faceDescriptor } = req.body;

    const employeeFields = {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(position && { position }),
      ...(department && { department }),
      ...(employeeId && { employeeId }),
      ...(isActive !== undefined && { isActive }),
      ...(faceDescriptor && { faceDescriptor: JSON.parse(faceDescriptor) }),
      ...(req.file && { profileImage: req.file.path }),
    };

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: employeeFields },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ success: true, employee });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employee.profileImage) {
      try {
        await fs.unlink(employee.profileImage);
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }

    await Employee.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};