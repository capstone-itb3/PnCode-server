const jwt = require('jsonwebtoken');

function tokenizer(user) {
    let token = null;

    if (user.position === 'Student') {
        token = {
                    uid: user.uid,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    section: user.section,
                    enrolled_courses: user.enrolled_courses,
                    position: user.position,
                    preferences: user.preferences 
                }    

    } else if (user.position === 'Professor') {
        token = {
                    uid: user.uid,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    position: user.position,
                    assigned_courses: user.assigned_courses,
                    preferences: user.preferences
                }
    }

    return jwt.sign(token, 'secret123capstoneprojectdonothackimportant0987654321');
};

module.exports = tokenizer;
