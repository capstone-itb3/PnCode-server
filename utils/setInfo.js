const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const courseModel = require('../models/courses.model');

async function setCourseInfoStudent(class_data) {
    const data = await courseModel.findOne({ course_code: class_data.course_code })
                 .select('course_title');

    const professor = await professorModel.findOne({ uid: class_data.professor })
                      .select('first_name last_name')
                      .lean();

    return {
        class_id: class_data.class_id,
        course_code: class_data.course_code,
        section: class_data.section, 
        course_title: data.course_title,
        professor: professor ? `${professor.first_name} ${professor.last_name}` : 'TBA'
    }
}

async function setCourseInfoProfessor(class_data) {
    const title = await courseModel.findOne({ course_code: class_data.course_code })
                 .select('course_title');

    const students = await studentModel.find({ uid: { $in: class_data.students } })
                     .select('uid first_name last_name')
                     .lean();
    
    const requests = await studentModel.find({ uid: { $in: class_data.requests } })
                     .select('uid first_name last_name')
                     .lean();

    return {
        class_id: class_data.class_id,
        course_code: class_data.course_code,
        section: class_data.section,
        course_title: title.course_title,
        students: students,
        requests: requests,
    }
}


async function setMemberInfo(member) {
    const user = await studentModel.findOne({ uid: member })
    .select('uid first_name last_name')
    .lean();

    return {
        uid: user.uid,
        first_name: user.first_name,
        last_name: user.last_name
    };
}

async function setContributionInfo(contribution) {
    const user = await studentModel.findOne({ uid: contribution.uid })
    .select('uid first_name last_name')
    .lean();

    return {
        uid: user.uid,
        first_name: user.first_name,
        last_name: user.last_name,
        edit_count: contribution.edit_count
    };
}

async function setMessageInfo(message) {
    const user = await studentModel.findOne({ uid: message.sender_uid })
    .select('uid first_name last_name')
    .lean();

    return {
        sender_uid: user.uid,
        first_name: user.first_name,
        last_name: user.last_name,
        chat_body: message.chat_body,
        createdAt: message.createdAt
    };
}

async function setFeedbackInfo(feedback) {
    const professor = await professorModel.findOne({ uid: feedback.professor_uid })
                      .select('uid first_name last_name')
                      .lean();

    feedback.reacts = await Promise.all(feedback.reacts.map(setMemberInfo));

    return {
        feedback_body: feedback.feedback_body,
        professor_uid: professor.uid,
        reacts: feedback.reacts,
        first_name: professor.first_name,
        last_name: professor.last_name,
        createdAt: feedback.createdAt
    }
}

module.exports = {  
                    setCourseInfoStudent,
                    setCourseInfoProfessor,
                    setMemberInfo, 
                    setContributionInfo, 
                    setMessageInfo, 
                    setFeedbackInfo 
                };