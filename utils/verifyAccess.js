const sectionModel = require('../models/sections.model');

async function verifyStudent(memberArray, uid) {
    return memberArray.includes(uid);
}

async function verifyProfessor(course_code, section, professor) {
    return await sectionModel.findOne({ 
        course_code, 
        section, 
        professor 
    }).select('course_code').lean();
}

module.exports = {
                    verifyStudent,
                    verifyProfessor
                }