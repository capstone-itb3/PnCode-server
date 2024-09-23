const jwt = require('jsonwebtoken');
const studentModel = require('./models/students.model');
const professorModel = require('./models/professors.model'); 

const middlewareAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ status: false, message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, 'secret123capstoneprojectdonothackimportant0987654321');

    if (decoded.position === 'Professor') {
      const user = await professorModel.findOne({ uid: decoded.uid }).lean();

      if (user) {
        req.user = user;
      } else {
        res.status(401).json({ status: false, message: 'Invalid token.' });
       }

    } else if (decoded.position === 'Student') {
      const user = await studentModel.findOne({ uid: decoded.uid }).lean();

      if (user) {
        req.user = user;
      } else {
        res.status(401).json({ status: false, message: 'Invalid token.' });
      }
      
    } else {
      res.status(401).json({ status: false, message: 'Invalid token.' });
    }
    
    next();
    
  } catch (err) {
    res.status(401).json({ status: false, message: 'Token is not valid.' });
  }
};

module.exports = middlewareAuth;
