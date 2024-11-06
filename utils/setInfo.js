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


async function setMemberInfo(members) {
    return await studentModel.find({ uid: { $in: members } })
           .select('uid first_name last_name email')
           .lean();
}

async function setContributionInfo(contributions) {
    const users = await studentModel.find({ uid: { $in: contributions.map(c => c.uid) } })
                  .select('uid first_name last_name')
                  .lean();

    return contributions.map(contri => {
        const user = users.find(u => u.uid === contri.uid);

        return {
            ...contri,
            first_name: user?.first_name || '',
            last_name: user?.last_name || '[Deleted User]',
        };
    })
}

async function setMessageInfo(room_chats) {
    const senders = await studentModel.find({ uid: { $in: room_chats.map(c => c.sender_uid) } })
                    .select('uid first_name last_name')
    
    return room_chats.map(message => {
        let sender = senders.find(s => s.uid === message.sender_uid);

        if (message.sender_uid === 'user_admin') {
            sender = { first_name: 'PnCode Admin', last_name: '' };
        }

        return {
            ...message,
            first_name: sender?.first_name || '[Deleted User]',
            last_name: sender?.last_name || ''
        };
    });
}

async function setFeedbackInfo(room_feedback) {
    const professors = await professorModel.find({ uid: { $in: room_feedback.map(f => f.professor_uid) } })
                       .select('uid first_name last_name')

    // Flatten the array of reacts arrays
    const allReacts = room_feedback.reduce((acc, f) => acc.concat(f.reacts), []);
    const students = await studentModel.find({ uid: { $in: allReacts } })
                     .select('uid first_name last_name')

    return room_feedback.map(f => {
        let professor = professors.find(p => p.uid === f.professor_uid);

        if (f.professor_uid === 'user_admin') {
            professor = { first_name: 'PnCode', last_name: 'Admin' };
        }
        f.reacts = students.filter(s => f.reacts.includes(s.uid));

        return {
            ...f,
            first_name: professor?.first_name || '',
            last_name: professor?.last_name || '[Deleted User]',
        };
    });
}

module.exports = {  
                    setCourseInfoStudent,
                    setCourseInfoProfessor,
                    setMemberInfo, 
                    setContributionInfo, 
                    setMessageInfo, 
                    setFeedbackInfo 
                };