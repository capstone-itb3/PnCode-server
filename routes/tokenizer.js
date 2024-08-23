const jwt = require('jsonwebtoken');

function tokenizeStudent(user, course_list) {
    let token = {
                    image: user.image,
                    uid: user.uid,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    section: user.section,
                    enrolled_courses: course_list,
                    position: user.position,
                    notifications: user.notifications,
                    preferences: user.preferences 
                }    

    return jwt.sign(token, 'secret123capstoneprojectdonothackimportant0987654321');
};

function tokenizeProfessor(user) {
    let token = {
                    image: user.image,
                    uid: user.uid,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    position: user.position,
                    assigned_courses: user.assigned_courses,
                    notifications: user.notifications,
                    preferences: user.preferences
                }

    return jwt.sign(token, 'secret123capstoneprojectdonothackimportant0987654321');
};


module.exports = { tokenizeStudent, tokenizeProfessor };
