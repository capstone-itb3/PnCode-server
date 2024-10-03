const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const classModel = require('../models/classes.model');
const teamModel = require('../models/teams.model');
const middlewareAuth = require('../middleware');
const { setCourseInfoStudent, setCourseInfoProfessor, setMemberInfo } = require('../utils/setInfo');

let customAlphabet;
import('nanoid').then(nanoid => {
    customAlphabet = nanoid.customAlphabet;
});

const express = require('express');
const bcrypt = require('bcryptjs');

const classRouter = express.Router();


//*POST function to get student enrolled courses
classRouter.post('/api/get-enrolled-classes', middlewareAuth, async (req, res) => {
    try {
        let classes = await classModel.find({ students: req.user.uid })
        .select('class_id course_code section professor')
        .lean();

        classes = await Promise.all(classes.map(setCourseInfoStudent));

        return res.status(200).json({   status: 'ok', classes: classes });

    } catch (e) {
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
});

//*POST function to get professor assigned classes
classRouter.post('/api/get-assigned-classes', middlewareAuth, async (req, res) => {
    let classes = [];
    try {
        classes = await classModel.find({ professor: req.user.uid })
                  .select('class_id course_code section')
                  .lean();

        classes = await Promise.all(classes.map(setCourseInfoProfessor));

        return res.status(200).json({  status: 'ok', classes: classes });

    } catch (e) {
        console.log(e)
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
})

classRouter.post('/api/request-course', middlewareAuth, async (req, res) => {
    try {
        const courseCaps = String(req.body.course_code).toUpperCase();
        const sectionCaps = String(req.body.section).toUpperCase();

        const section = await classModel.findOne({ 
            course_code: courseCaps,
            section: sectionCaps
         }).lean();

         if (!section) {
             return res.status(400).json({  status: false,
                                             message: 'The class you entered does not exist.' });
         }

         if (section.students.includes(req.user.uid)) {
             return res.status(400).json({  status: false,
                                             message: 'You have already joined this class.' });
         }

         if (section.requests.includes(req.user.uid)) {
             return res.status(400).json({  status: false,
                                             message: 'You have already requested to join this class.' });
         }

        await classModel.updateOne({ course_code: courseCaps, section: sectionCaps }, {
            $push: {
                requests: req.user.uid
            }
        });

        return res.status(200).json({  status: 'ok', message: 'Request sent successfully.' });

    } catch (e) {
        console.log(e)
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
});

classRouter.post('/api/get-included-students', middlewareAuth, async (req, res) => {
    try {

        const class_data = await classModel.findOne({ class_id: req.body.class_id })
        .select('students requests')
        .lean();

        let students = await Promise.all(class_data.students.map(setMemberInfo));
        let requests = [];
        
        if (req.body.list === 'all') {
            requests = await Promise.all(class_data.requests.map(setMemberInfo));
        }

        if (req.user.position === 'Student') {
            students = students.filter(student => student.uid !== req.user.uid);
        }

        students.sort((a, b) => a?.last_name.localeCompare(b?.last_name))

        requests.sort((a, b) => a?.last_name.localeCompare(b?.last_name));

        return res.json({   status: 'ok', 
                            students: students, 
                            requests: requests, 
                            message: 'Reloaded students within the course.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: e.message });
    }
});

classRouter.post('/api/accept-request', middlewareAuth, async (req, res) => {
    try {
        await classModel.updateOne({ class_id: req.body.class_id }, {
            $pull: {
                requests: req.body.uid
            },
            $push: {
                students: req.body.uid
            }
        });
        
        return res.status(200).json({  status: 'ok', message: 'Request accepted successfully.' });

    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
});

classRouter.post('/api/reject-request', middlewareAuth, async (req, res) => {
    try {
        await classModel.updateOne({ class_id: req.body.class_id }, {
            $pull: {
                requests: req.body.uid
            }
        });

        return res.status(200).json({  status: 'ok', message: 'Request rejected successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
});

classRouter.post('/api/remove-student', middlewareAuth, async (req, res) => {
    try {
        await classModel.updateOne({ class_id: req.body.class_id }, {
            $pull: {
                students: req.body.uid
            }
        });

        await teamModel.updateOne({ class_id: req.body.class_id }, {
            $pull: {
                members: req.body.uid
            }
        });

        return res.status(200).json({  status: 'ok', message: 'Student removed successfully.' });
        
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
})

module.exports = classRouter;