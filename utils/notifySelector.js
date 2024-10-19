const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');

async function notifyStudents(users_id, notif) {
    await studentModel.updateMany({ uid: { $in: users_id } },{ 
        $push: { 
            notifications: { $each: [notif], $position: 0 } 
        } 
    });
}

async function notifyProfessor(user_id, notif) {
    await professorModel.updateMany({ uid: user_id },{
        $push: {
            notifications: { $each: [notif], $position: 0 }
        }
    });
}

module.exports = { notifyStudents, notifyProfessor };