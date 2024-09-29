const jwt = require('jsonwebtoken');
const adminModel = require('./admins.model');

const middlewareAdmin = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ status: false, message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, 'secret123capstoneprojectdonothackimportant0987654321');

        const user = await adminModel.findOne({ admin_uid: decoded.admin_uid }).lean();

        if (user) {
            req.user = user;
        } else {
            res.status(401).json({ status: false, message: 'Invalid token.' });
        }
        
        next();
        
    } catch (err) {
        res.status(401).json({ status: false, message: 'Token is not valid.' });
    }
};

module.exports = middlewareAdmin;
