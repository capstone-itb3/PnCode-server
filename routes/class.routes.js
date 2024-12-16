const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const classModel = require('../models/classes.model');
const teamModel = require('../models/teams.model');
const middlewareAuth = require('../middleware');
const { setCourseInfoStudent, setCourseInfoProfessor, setMemberInfo } = require('../utils/setInfo');

const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const classRouter = express.Router();


//*POST function to get student's enrolled courses
classRouter.post('/api/get-enrolled-classes', middlewareAuth, async (req, res) => {
    try {
        let classes = await classModel.find({ students: req.user.uid })
        .select('class_id course_code section professor')
        .lean();

        classes = await Promise.all(classes.map(setCourseInfoStudent));

        return res.status(200).json({   status: 'ok', classes: classes });

    } catch (e) {
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving enrolled classes failed.' });;
    }
});

//*POST function to get professor's assigned classes
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
                                        message: 'Server error. Retrieving assigned classes failed.' });;
    }
})

//*POST function to request a class to join
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
                                        message: 'Server error. Requesting course failed.' });;
    }
});

//*POST function to get all students in a class
classRouter.post('/api/get-included-students', middlewareAuth, async (req, res) => {
    try {
        const class_data = await classModel.findOne({ class_id: req.body.class_id })
                           .select('students requests')
                           .lean();

        if (!class_data) {
            return res.status(404).json({  status: false,
                                            message: 'The class you entered does not exist.' });
        }

        let students = await setMemberInfo(class_data.students);
        let requests = [];
        
        if (req.body.list === 'all') {
            requests = await setMemberInfo(class_data.requests);
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
                                        message: 'Server error. Retrieving students failed.' });
    }
});

//*POST function to accept a student's request to join a class
classRouter.post('/api/accept-request', middlewareAuth, async (req, res) => {
    try {
        const class_data = await classModel.findOne({ class_id: req.body.class_id })
                           .select('course_code section students').lean();
        
        if (!class_data) {
            return res.status(404).json({  status: false,
                                            message: 'This class does not anymore exist.' });
        } else if (class_data.students.includes(req.body.uid)) {
            return res.status(400).json({  status: false,
                                            message: 'This student is already in the class.' });
        }

        await classModel.updateOne({ class_id: req.body.class_id }, {
            $pull: { requests: req.body.uid },
            $push: { students: req.body.uid }
        });

        const notification = {
            notif_id: uuid(),
            source: `${req.user.first_name} ${req.user.last_name}`,
            type: 'class',
            for: 'accepted',
            subject_name: `${class_data.course_code} ${class_data.section}`,
            subject_id: req.body.class_id,
        }

        await studentModel.updateOne({ uid: req.body.uid }, {
            $push: {
                notifications: { $each: [notification], $position: 0 }
            }
        });
    
        return res.status(200).json({  status: 'ok', message: 'Request accepted successfully.' });

    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Accepting request failed.' });
    }
});

//*POST function to reject a student's request to join a class
classRouter.post('/api/reject-request', middlewareAuth, async (req, res) => {
    try {
        const class_data = await classModel.findOneAndUpdate({ class_id: req.body.class_id }, {
            $pull: {
                requests: req.body.uid
            }
        }).select('course_code section').lean();
        
        if (!class_data) {
            return res.status(404).json({  status: false,
                                            message: 'This class does not anymore exist.' });
        }

        const notification = {
            notif_id: uuid(),
            source: `${req.user.first_name} ${req.user.last_name}`,
            type: 'class',
            for: 'rejected',
            subject_name: `${class_data.course_code} ${class_data.section}`,
            subject_id: '',
        }

        await studentModel.updateOne({ uid: req.body.uid }, {
            $push: {
                notifications: { $each: [notification], $position: 0 }
            }
        });

        return res.status(200).json({  status: 'ok', message: 'Request rejected successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Rejecting request failed.' });
    }
});

//*POST function to remove a student from a class
classRouter.post('/api/remove-student', middlewareAuth, async (req, res) => {
    try {
        await teamModel.updateOne({ 
            class_id: req.body.class_id, 
            members: req.body.uid 
        }, { 
            $pull: { members: req.body.uid }
        });

        const class_data = await classModel.findOneAndUpdate({ class_id: req.body.class_id }, {
            $pull: { students: req.body.uid }
        }).select('course_code section').lean();

        if (!class_data) {
            return res.status(404).json({  status: false,
                                            message: 'This class does not anymore exist.' });
        }

        const notification = {
            notif_id: uuid(),
            source: `${req.user.first_name} ${req.user.last_name}`,
            type: 'remove',
            for: 'class',
            subject_name: `${class_data.course_code} ${class_data.section}`,
            subject_id: '',
        }

        await studentModel.updateOne({ uid: req.body.uid }, {
            $push: {
                notifications: { $each: [notification], $position: 0 }
            }
        });

        return res.status(200).json({  status: 'ok', message: 'Student removed successfully.' });
        
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Removing student failed.' });
    }
});

//*POST function to get students not belonging to a class
classRouter.post('/api/get-other-students', middlewareAuth, async (req, res) => {
    try {
        if (req.user.position === 'Student') {
            return res.status(403).json({  status: false,
                                            message: 'You are not authorized to perform this action.' });
        }
        const class_data = await classModel.findOne({ class_id: req.body.class_id })
                           .select('students').lean();
        if (!class_data) {
            return res.status(400).json({  status: false,
                                            message: 'This class does not anymore exist.' });
        }

        const students = await studentModel.find({ uid: { $nin: class_data.students } })
                         .select('uid first_name last_name email').lean();

        return res.status(200).json({  status: 'ok', other_students: students });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Removing team failed.' });
    }
});

//*POST function to add a student to a class
classRouter.post('/api/add-student-to-class', middlewareAuth, async (req, res) => {
    try {
        if (req.user.position === 'Student') {
            return res.status(403).json({  status: false,
                                            message: 'You are not authorized to perform this action.' });
        }

        const class_data = await classModel.findOne({ class_id: req.body.class_id })
                           .select('course_code section students').lean();

        if (!class_data) {
            return res.status(400).json({   status: false,
                                            message: 'This class does not anymore exist.' });
        } else if (class_data.students.includes(req.body.uid)) {
            return res.status(400).json({   status: false,
                                            message: 'This student is already in this class.' });
        }

        const student = await studentModel.findOne({ uid: req.body.uid })
                        .select('uid').lean();

        if (!student) {
            return res.status(400).json({   status: false,
                                            message: 'This student does not exist.' });
        }
        
        await classModel.updateOne({ class_id: req.body.class_id }, {
            $push: { students: req.body.uid },
            $pull: { requests: req.body.uid }
        })

        const notification = {
            notif_id: uuid(),
            source: `${req.user.first_name} ${req.user.last_name}`,
            type: 'add',
            for: 'class',
            subject_name: `${class_data.course_code} ${class_data.section}`,
            subject_id: req.body.class_id,
        }

        await studentModel.updateOne({ uid: req.body.uid }, {
            $push: {
                notifications: { $each: [notification], $position: 0 }
            }
        });

        return res.status(200).json({  status: 'ok', message: 'Student added successfully.' });
    } catch(e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Adding student to class failed.' });
    }
});


module.exports = classRouter;