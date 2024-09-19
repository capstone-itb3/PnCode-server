const jwt = require('jsonwebtoken');

const middlewareAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ status: false, message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, 'secret123capstoneprojectdonothackimportant0987654321');
    req.body.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ status: false, message: 'Token is not valid.' });
  }
};

module.exports = middlewareAuth;
