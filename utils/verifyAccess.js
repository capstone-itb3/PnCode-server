const classModel = require('../models/classes.model');

function verifyStudent(memberArray, uid) {
    console.log(memberArray.some(u => u === uid) === true)
    return memberArray.some(u => u === uid);
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