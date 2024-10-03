const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const courseModel = require('../models/courses.model');
const classModel = require('../models/classes.model');
const teamModel = require('../models/teams.model');
const activityModel = require('../models/activities.model');
const soloRoomModel = require('../models/solo_rooms.model');
const assignedRoomModel = require('../models/assigned_rooms.model');
const fileModel = require('../models/files.model');
const adminModel = require('./admins.model');

const { setCourseInfoStudent, setCourseInfoProfessor, setMemberInfo } = require('../utils/setInfo');

const jwt = require('jsonwebtoken');
const middlewareAdmin = require('./adminMiddleware');
const generateNanoId = require('../utils/generateNanoId');

const regexEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

const express = require('express');
const bcrypt = require('bcryptjs');
const adminRouter = express.Router();

//*POST function when admin logs in
adminRouter.post('/api/login/admin', async (req, res) => {
    try {
        const user = await adminModel.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).json({  status: false,
                                            message: 'Email or password is incorrect.'});
        }

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.status(400).json({  status: false,
                                            message: 'Email or password is incorrect.'});
        }

        const token = {
            admin_uid: user.admin_uid,
            first_name: user.first_name,
            last_name: user.last_name,
        }

        const signedToken = jwt.sign(token, 'secret123capstoneprojectdonothackimportant0987654321');

        return res.status(200).json({   status: 'ok',
                                        token: signedToken,
                                        message: 'Logged in successfully.' });

    } catch (err) {
        return res.status(500).json({   status: false, 
                                        message: err.message });
    }
});

adminRouter.post('/api/admin/students', middlewareAdmin, async (req, res) => {
    try {
        const students = await studentModel.find({})
        .select('uid first_name last_name email')
        .lean();

        students.sort((a, b) => a.last_name.localeCompare(b.last_name));

        return res.status(200).json({   status: 'ok',
                                        students: students,
                                        message: 'Students retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving students failed.' });
    }
});

adminRouter.post('/api/admin/professors', middlewareAdmin, async (req, res) => {
    try {
        const professors = await professorModel.find({})
        .select('uid first_name last_name email')
        .lean();

        professors.sort((a, b) => a.last_name.localeCompare(b.last_name));

        return res.status(200).json({   status: 'ok',
                                        professors: professors,
                                        message: 'Students retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving professors failed.' });
    }
});

adminRouter.get('/api/admin/courses', middlewareAdmin, async (req, res) => {
    try {
        const courses = await courseModel.find({})
        .lean();

        courses.sort((a, b) => a.course_code.localeCompare(b.course_code));

        return res.status(200).json({   status: 'ok',
                                        courses: courses,
                                        message: 'Students retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving courses failed.' });
    }
});

adminRouter.post('/api/admin/classes', middlewareAdmin, async (req, res) => {
    try {
        let classes = await classModel.find({})
        .select('class_id course_code section professor students requests')
        .lean();

        classes = await Promise.all(classes.map(setCourseInfoAdmin));
        async function setCourseInfoAdmin(class_data) {
            const title = await courseModel.findOne({ course_code: class_data.course_code })
                         .select('course_title');
        
            const students = await studentModel.find({ uid: { $in: class_data.students } })
                             .select('uid first_name last_name')
                             .lean();
            
            const requests = await studentModel.find({ uid: { $in: class_data.requests } })
                             .select('uid first_name last_name')
                             .lean();

            const professor = await professorModel.findOne({ uid: class_data.professor })
                              .select('uid first_name last_name')
                              .lean();
       
            return {
                class_id: class_data.class_id,
                course_code: class_data.course_code,
                section: class_data.section,
                course_title: title.course_title,
                students: students,
                requests: requests,
                professor_uid: professor ? professor.uid : '',
                professor: professor ? `${professor.first_name} ${professor.last_name}` : 'TBA'
            }
        }
        


        return res.status(200).json({   status: 'ok',
                                        classes: classes,
                                        message: 'Students retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving classes failed.' });
    }
});

adminRouter.post('/api/admin/teams', middlewareAdmin, async (req, res) => {
    try {
        let teams = await teamModel.find({})
        .select('team_id team_name class_id')
        .lean();

        // teams = await Promise.all(teams.map(setMemberInfo));

        return res.status(200).json({   status: 'ok',
                                        teams: teams,       
                                        message: 'Teams retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
});
    





adminRouter.post('/api/admin/create-student', middlewareAdmin, async (req, res) => {
    if (!regexEmail.test(req.body.email)) {
        return res.status(400).json({   status: false,
                                        message: 'Please enter a valid email address.'});
    } 
    if (req.body.password.length < 8) {
        return res.status(400).json({   status: false, 
                                        message: 'Password must have more than 8 characters'});
    } 
    if (req.body.password !== req.body.conf_password) {
        return res.status(400).json({   status: false, 
                                        message: 'Password and Re-typed Password doesn\'t match.'});
    } 

    const email = await studentModel.findOne({email: req.body.email}).select('email');
    if (email) {
        return res.status(400).json({   status: false, 
                                        message: 'The email address you entered is already registered.'});
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(req.body.password, salt);                
     
        await studentModel.create({
            uid: generateNanoId(),
            email: req.body.email,
            password: passwordHash,
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            position: 'Student',
            notifications: [],
        });

        return res.status(200).json({   status: 'ok', 
                                        message: 'A new student account has been created.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating student failed.' });
    }
});

adminRouter.post('/api/admin/update-student', middlewareAdmin, async (req, res) => {
    try {
        if (!regexEmail.test(req.body.email)) {
            return res.status(400).json({   status: false,
                                            message: 'Please enter a valid email address.'});
        } 
     
        const oldEmail = await studentModel.findOne({uid: req.body.uid}).select('email');
        if (req.body.email !== oldEmail.email) {
            const email = await studentModel.findOne({email: req.body.email}).select('email');
            if (email) {
                return res.status(400).json({   status: false,
                                                message: 'The email address you entered is already registered.'});
            }
        }
        
        if (req.body.password !== '' || req.body.conf_password !== '') {
            if (req.body.password !== req.body.conf_password) {
                return res.status(400).json({   status: false,
                                                message: 'Password and Re-typed Password doesn\'t match.'});
            }
    
            if (req.body.password.length < 8) {
                return res.status(400).json({   status: false,
                                                message: 'Password must have more than 8 characters'});
            }
    
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(req.body.password, salt);                

            await studentModel.updateOne({ uid: req.body.uid }, {
                $set: {
                    email: req.body.email,
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    password: passwordHash,
                }
            });
    
            return res.status(200).json({   status: 'ok',
                                            message: 'Student account has been updated.'});
        }
    
        await studentModel.updateOne({ uid: req.body.uid }, {
            $set: {
                email: req.body.email,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
            }
        });
    
        return res.status(200).json({   status: 'ok',
                                        message: 'Student account has been updated.'});
    
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Updating student failed.' });
    }
});

adminRouter.post('/api/admin/create-professor', middlewareAdmin, async (req, res) => {
    if (!regexEmail.test(req.body.email)) {
        return res.status(400).json({   status: false,
                                        message: 'Please enter a valid email address.'});
    } 
    if (req.body.password.length < 8) {
        return res.status(400).json({   status: false, 
                                        message: 'Password must have more than 8 characters'});
    } 
    if (req.body.password !== req.body.conf_password) {
        return res.status(400).json({   status: false, 
                                        message: 'Password and Re-typed Password doesn\'t match.'});
    } 

    const email = await professorModel.findOne({email: req.body.email}).select('email');
    if (email) {
        return res.status(400).json({   status: false, 
                                        message: 'The email address you entered is already registered.'});
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(req.body.password, salt);                

        await professorModel.create({
            uid: generateNanoId(),
            email: req.body.email,
            password: passwordHash,
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            position: 'Professor',
            notifications: [],
        });

        return res.status(200).json({   status: 'ok', 
                                        message: 'A new professor account has been created.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating professor failed.' });
    }
});

adminRouter.post('/api/admin/update-professor', middlewareAdmin, async (req, res) => {
    try {
        if (!regexEmail.test(req.body.email)) {
            return res.status(400).json({   status: false,
                                            message: 'Please enter a valid email address.'});
        } 
     
        const oldEmail = await professorModel.findOne({uid: req.body.uid}).select('email');
        if (req.body.email !== oldEmail.email) {
            const email = await professorModel.findOne({email: req.body.email}).select('email');
            if (email) {
                return res.status(400).json({   status: false,
                                                message: 'The email address you entered is already registered.'});
            }
        }
        
        if (req.body.password !== '' || req.body.conf_password !== '') {
            if (req.body.password !== req.body.conf_password) {
                return res.status(400).json({   status: false,
                                                message: 'Password and Re-typed Password doesn\'t match.'});
            }
    
            if (req.body.password.length < 8) {
                return res.status(400).json({   status: false,
                                                message: 'Password must have more than 8 characters'});
            }
    
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(req.body.password, salt);                

            await professorModel.updateOne({ uid: req.body.uid }, {
                $set: {
                    email: req.body.email,
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    password: passwordHash,
                }
            });
    
            return res.status(200).json({   status: 'ok',
                                            message: 'Professor account has been updated.'});
        }
    
        await studentModel.updateOne({ uid: req.body.uid }, {
            $set: {
                email: req.body.email,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
            }
        });
    
        return res.status(200).json({   status: 'ok',
                                        message: 'Professor account has been updated.'});
    
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Updating professor failed.' });
    }
});

adminRouter.post('/api/admin/create-course', middlewareAdmin, async (req, res) => {
    req.body.course_code = String(req.body.course_code).toUpperCase();

    try {
        const course = await courseModel.findOne({course_code: req.body.course_code}).select('course_code');
        if (course) {
            return res.status(400).json({   status: false,
                                            message: 'The course code you entered is already registered.'});
        }

        await courseModel.create({
            course_code: req.body.course_code,
            course_title: req.body.course_title
        });

        return res.status(200).json({   status: 'ok',
                                        message: 'A new course has been created.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating course failed.' });
    }
});

adminRouter.post('/api/admin/update-course', middlewareAdmin, async (req, res) => {
    req.body.old_course_code = String(req.body.old_course_code).toUpperCase();
    req.body.new_course_code = String(req.body.new_course_code).toUpperCase();

    try {
        if (req.body.old_course_code !== req.body.new_course_code) {
            const course = await courseModel.findOne({course_code: req.body.new_course_code}).select('course_code');
            if (course) {
                return res.status(400).json({   status: false,
                                                message: 'The course code you entered is already registered.'});
            }
        }

        await courseModel.updateOne({ course_code: req.body.old_course_code }, {
            $set: {
                course_code: req.body.new_course_code,
                course_title: req.body.course_title
            }
        });

        await classModel.updateMany({ course_code: req.body.old_course_code }, {
            $set: {
                course_code: req.body.new_course_code
            }
        });

        return res.status(200).json({   status: 'ok',
                                        message: 'The course has been updated.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Updating course failed.' });
    }
});

adminRouter.post('/api/admin/create-class', middlewareAdmin, async (req, res) => {
    req.body.course_code = String(req.body.course_code).toUpperCase();
    req.body.section = String(req.body.section).toUpperCase();

    try {
        const course = await courseModel.findOne({ course_code: req.body.course_code }).select('course_code');
        if (!course) {
            return res.status(400).json({   status: false,
                                            message: 'The course code you entered is not registered.'});
        }

        const professor = await professorModel.findOne({ uid: req.body.professor_uid }).select('uid');
        if (!professor) {
            return res.status(400).json({   status: false,
                                            message: 'You have not selected a professor yet.'});
        }



    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating class failed.' });
    }


});





module.exports = adminRouter;