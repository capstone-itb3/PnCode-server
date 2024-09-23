const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const sectionModel = require('../models/sections.model');
const { tokenizer } = require('../utils/tokenizer');
const middlewareAuth = require('../middleware');
const { client }  = require('../database');
const { setCourseInfoStudent, setCourseInfoProfessor, setMemberInfo } = require('../utils/setInfo');

let customAlphabet;
import('nanoid').then(nanoid => {
    customAlphabet = nanoid.customAlphabet;
});

const express = require('express');
const bcrypt = require('bcryptjs');

const accountRouter = express.Router();

//*POST function when user registers
accountRouter.post('/api/register', async (req, res) => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

    if (!regex.test(req.body.email)) {
        return res.status(400).json({   status: false,
                                        message: 'Please enter a valid email address.'});
    } else if (req.body.password.length < 8) {
        return res.status(400).json({   status: false, 
                                        message: 'Password must have more than 8 characters'});

    } else if (req.body.password !== req.body.conf_password) {
        return res.status(400).json({   status: false, 
                                        message: 'Password and Re-typed Password doesn\'t match.'});

    } else {
        if (await studentModel.findOne({email: req.body.email})) {
            return res.status(400).json({   status: false, 
                                            message: 'The email address you entered is already registered. ' 
                                                + 'If you think this is a mistake, please contact the MISD.'});
    
        } else {
            try {
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(req.body.password, salt);                
                const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 28);

                await studentModel.create({
                    uid: nanoid(),
                    email: req.body.email,
                    password: passwordHash,
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    position: 'Student',
                    notifications: [],
                    preferences: {} 
                });

                return res.status(200).json({   status: 'ok', 
                                                message: 'Sign up successful. You can now log in.'});
            } catch (err) {
                return res.status(500).json({   status: false, 
                                                message: err.message});
            }
        }
    }
 })

//*POST function when student logs in
accountRouter.post('/api/login', async (req, res) => {
    try {
        const user_data = await studentModel.findOne({ email: req.body.email });
        if (!user_data) {
            return res.status(400).json({  status: false,
                                            message: 'Email or password is incorrect.'});
        }

        const validPassword = await bcrypt.compare(req.body.password, user_data.password);
        if (!validPassword) {
            return res.status(400).json({  status: false,
                                            message: 'Email or password is incorrect.'});
        }
                
        const token = tokenizer(user_data);

        return res.status(200).json({   status: 'ok',
                                        token: token,
                                        message: 'Logged in successfully.' });
    } catch (err) {
        return res.status(500).json({   status: false, 
                                        message: err.message });
    }
});

//*POST function when professor logs in
accountRouter.post('/api/login/professor', async (req, res) => {
    try {
        const user_data = await professorModel.findOne({ email: req.body.email });
        if (!user_data) {
            return res.status(400).json({  status: false,
                                            message: 'Email or password is incorrect.'});
        }

        const validPassword = await bcrypt.compare(req.body.password, user_data.password);
        if (!validPassword) {
            return res.status(400).json({  status: false,
                                            message: 'Email or password is incorrect.'});
        }

        const token = tokenizer(user_data);

        return res.status(200).json({   status: 'ok',
                                        token: token,
                                        message: 'Logged in successfully.' });

    } catch (err) {
        return res.status(500).json({   status: false, 
                                        message: err.message });
    }
});

//*POST function to get student enrolled courses
accountRouter.post('/api/get-enrolled-courses', middlewareAuth, async (req, res) => {
    try {
        let courses = await sectionModel.find({ students: req.user.uid })
        .select('course_code section professor')
        .lean();

        courses = await Promise.all(courses.map(setCourseInfoStudent));

        return res.status(200).json({   status: 'ok', courses: courses });

    } catch (e) {
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
});

//*POST function to get professor assigned courses
accountRouter.post('/api/get-assigned-courses', middlewareAuth, async (req, res) => {
    let courses = [];
    try {
        courses = await sectionModel.find({ professor: req.user.uid })
                  .select('course_code section id_link students requests')
                  .lean();

        courses = await Promise.all(courses.map(setCourseInfoProfessor));

        return res.status(200).json({  status: 'ok', courses: courses });

    } catch (e) {
        console.log(e)
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
})

accountRouter.post('/api/request-course', middlewareAuth, async (req, res) => {
    try {
        const courseCaps = String(req.body.course_code).toUpperCase();
        const sectionCaps = String(req.body.section).toUpperCase();

        console.log(courseCaps);
        console.log(sectionCaps);

        const section = await sectionModel.findOne({ 
            course_code: courseCaps,
            section: sectionCaps
         }).lean();

         if (!section) {
             return res.status(400).json({  status: false,
                                             message: 'Course does not exist.' });
         }

         if (section.students.includes(req.user.uid)) {
             return res.status(400).json({  status: false,
                                             message: 'You are already enrolled in this course.' });
         }

         if (section.requests.includes(req.user.uid)) {
             return res.status(400).json({  status: false,
                                             message: 'You have already requested to join this course.' });
         }

        await sectionModel.updateOne({ course_code: courseCaps, section: sectionCaps }, {
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

accountRouter.post('/api/get-included-students', middlewareAuth, async (req, res) => {
    try {

        const section = await sectionModel.findOne({ course_code: req.body.course_code, section: req.body.section })
        .select('students requests')
        .lean();

        let students = await Promise.all(section.students.map(setMemberInfo));
        let requests = [];
        

        console.log(section)

        if (req.body.list === 'all') {
            requests = await Promise.all(section.requests.map(setMemberInfo));
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

accountRouter.post('/api/accept-request', middlewareAuth, async (req, res) => {
    try {
        await sectionModel.updateOne({ course_code: req.body.course_code, section: req.body.section }, {
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

accountRouter.post('/api/reject-request', middlewareAuth, async (req, res) => {
    try {
        await sectionModel.updateOne({ course_code: req.body.course_code, section: req.body.section }, {
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

accountRouter.post('/api/remove-student', middlewareAuth, async (req, res) => {
    try {
        await sectionModel.updateOne({ course_code: req.body.course_code, section: req.body.section }, {
            $pull: {
                students: req.body.uid
            }
        });

        return res.status(200).json({  status: 'ok', message: 'Student removed successfully.' });
        
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
})

module.exports = accountRouter;