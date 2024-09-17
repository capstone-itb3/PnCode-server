const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');

async function setTeamInfo(member) {
    const user = await studentModel.findOne({ uid: member }).lean();
    
    return {
        uid: user.uid,
        first_name: user.first_name,
        last_name: user.last_name
    };
}

async function setContributionInfo(contribution) {
    const user = await studentModel.findOne({ uid: contribution.uid }).lean();

    return {
        uid: user.uid,
        first_name: user.first_name,
        last_name: user.last_name,
        edit_count: contribution.edit_count
    };
}

async function setMessageInfo(message) {
    const user = await studentModel.findOne({ uid: message.sender_uid });

    return {
        sender_uid: user.uid,
        first_name: user.first_name,
        last_name: user.last_name,
        chat_body: message.chat_body,
        createdAt: message.createdAt
    };
}

async function setFeedbackInfo(feedback) {
    const user = await professorModel.findOne({ uid: feedback.professor_uid });

    return {
        feedback_body: feedback.feedback_body,
        professor_uid: user.uid,
        first_name: user.first_name,
        last_name: user.last_name,
        createdAt: feedback.createdAt
    }
}

module.exports = { setTeamInfo, setContributionInfo, setMessageInfo, setFeedbackInfo };