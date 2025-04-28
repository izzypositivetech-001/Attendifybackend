import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const authMiddleware = async (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.user.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ msg: 'Unauthorized' });
        }

        req.user = user; // Attach full user object, not just decoded data
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            res.status(401).json({ msg: 'Token expired' });
        } else {
            res.status(401).json({ msg: 'Unauthorized' });
        }
    }
};

export default authMiddleware;