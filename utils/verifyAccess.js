const classModel = require('../models/classes.model');

async function verifyStudent(memberArray, uid) {
    return memberArray.includes(uid);
}

async function verifyProfessor(class_id, professor) {
    return await classModel.findOne({ 
        class_id,
        professor 
    }).select('course_code').lean();
}

module.exports = {
                    verifyStudent,
                    verifyProfessor
                }