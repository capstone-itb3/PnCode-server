const jwt = require('jsonwebtoken');
const adminModel = require('./admins.model');

const middlewareAdmin = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ status: false, message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_ADMIN);
        const user = await adminModel.findOne({ admin_uid: decoded.admin_uid }).lean();

        if (user) {
            req.user = user;
        } else {
            return res.status(401).json({ status: false, message: 'Invalid token.' });
        }
        next();        
    } catch (err) {
        return res.status(401).json({ status: false, message: 'Token is not valid.' });
    }
};

module.exports = middlewareAdmin;
