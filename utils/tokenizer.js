const jwt = require('jsonwebtoken');

function tokenizer(user, position) {
    const token = {
                    uid: user.uid,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    position: position,
                }

    return jwt.sign(token, process.env.JWT_SECRET, { expiresIn: '1d' });
};

module.exports = { tokenizer };
