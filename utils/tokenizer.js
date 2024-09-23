const jwt = require('jsonwebtoken');

function tokenizer(user) {
    const token = {
                    uid: user.uid,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    position: user.position,
                    notifications: user.notifications,
                    preferences: user.preferences
                }

    return jwt.sign(token, 'secret123capstoneprojectdonothackimportant0987654321');
};

module.exports = { tokenizer };
