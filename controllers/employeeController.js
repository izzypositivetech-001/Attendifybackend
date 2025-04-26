import Employee from '../models/Employee.js';
import { validationResult } from 'express-validator';
import fs from 'fs';


// @route POST /api/employees
// @desc Create a new employee
// @access Private

export const registerEmployee = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, address, position , department, employeeId, faceDescription } = req.body;

    try {
        // Check if employee already exists
        const existingEmployee = await Employee.findOne({ email });
        if (existingEmployee) {
            return res.status(400).json({ message: 'Employee already exists' });
        }

        // Create a new employee
        const newEmployee = new Employee({
            name,
            email,
            phone,
            address,
            position,
            department,
            employeeId,
            faceDescriptor: faceDescription ? JSON.parse(faceDescription) : undefined, 
            profileImage: req.file ? req.file.path : undefined, // Save the path of the uploaded image
        });

        await newEmployee.save();

        res.json({ success: true, newEmployee});
    } catch (error) {
        console.error(error.message);
            res.status(500).send('Server error');
        }
    
};

// @route GET /api/employees
// @desc Get all employees
// @access Private

export const getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee.find().sort({ createdAt: -1 });
        if (!employees) {
            return res.status(404).json({ message: 'No employees found' });
        }
        res.json({ success: true, employees });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
};

// @route GET /api/employees/:id
// @desc Get employee by ID     
// @access Private
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
        res.status(500).send('Server error');
    }
};

// @route PUT /api/employees/:id
// @desc Update employee by ID
// @access Private

export const updateEmployee = async (req, res) => {
    try {
        const { name, email, phone, address, position, department, employeeId , isActive, faceDescription} = req.body;

        const employeeFields = {};
        if (name) employeeFields.name = name;
        if (email) employeeFields.email = email;
        if (phone) employeeFields.phone = phone;
        if (address) employeeFields.address = address;
        if (position) employeeFields.position = position;
        if (department) employeeFields.department = department;
        if (employeeId) employeeFields.employeeId = employeeId; 
        if (isActive !== undefined) employeeFields.isActive = isActive; // Check if isActive is provided
        if (faceDescription) employeeFields.faceDescriptor = JSON.parse(faceDescription); // Parse faceDescription if provided
        if (req.file) employeeFields.profileImage = req.file.path; // Update profile image if a new one is uploaded

        
        // Find the employee by ID and update it    
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { $set: employeeFields },
            { new: true, runValidators: true }
        );
        res.json({ success: true, employee });
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid employee ID' });
        }
        res.status(500).send('Server error');
    }
};

// @route DELETE /api/employees/:id
// @desc Delete employee 
// @access Private

export const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Delete the profile image from the server
        if (employee.profileImage) {
            fs.unlink(employee.profileImage, (err) => {
                if (err) console.error('Error deleting image:', err);
            });
        }

        await Employee.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid employee ID' });
        }
        res.status(500).send('Server error');
    }
};