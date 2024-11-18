const jwt = require('jsonwebtoken');
const studentModel = require('./models/students.model');
const professorModel = require('./models/professors.model'); 

const middlewareAuth = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ status: false, message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.position === 'Professor') {
      const user = await professorModel.findOne({ uid: decoded.uid }).lean();

      if (user) {
        req.user = user;
        req.user.position = 'Professor';
      } else {
        return res.status(401).json({ status: false, message: 'Invalid token.' });
       }

    } else if (decoded?.position === 'Student') {
      const user = await studentModel.findOne({ uid: decoded.uid }).lean();

      if (user && user.isVerified) {
        req.user = user;
        req.user.position = 'Student';
      } else {
        return res.status(401).json({ status: false, message: 'Invalid token.' });
      }
      
    } else {
      return res.status(401).json({ status: false, message: 'Invalid token.' });
    }
    
    next();
    
  } catch (err) {
    console.log(err);
    return res.status(401).json({ status: false, message: 'Token is not valid.' });
  }
};

module.exports = middlewareAuth;
