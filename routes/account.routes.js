const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const sectionModel = require('../models/sections.model');
const courseModel = require('../models/courses.model');
const { tokenizeStudent, tokenizeProfessor } = require('../utils/tokenizer');
const { client }  = require('../database');

let customAlphabet;
import('nanoid').then(nanoid => {
    customAlphabet = nanoid.customAlphabet;
});

const express = require('express');
const bcrypt = require('bcryptjs');

const accountRouter = express.Router();

//*GET function to retrieve available sections 
accountRouter.get('/api/available-sections', async (req, res) => {
    try {
        const sections = await sectionModel.find().lean();
        sections.sort((a, b) => a.year - b.year);

        const data = sections.map(value => {
            return {
                year: value.year,
                program: value.program,
                sections: value.sections.map(sec => sec.slice(1))
            };
        });

        return res.status(200).json({   status: 'ok',
                                        message: 'Successfully retrieved sections.',
                                        data: data});
    } catch (err) {
        console.log(err);
        return res.status(500).json({   status: false,
                                        message: 'Error occured while retrieving sections:' + err});
    }
});


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

                const config = await client.db().collection('config').findOne({});

                const section = await sectionModel.findOne({
                    year: req.body.year,
                    program: req.body.section.toString().slice(0, -2)
                });

                const enrolled_courses = () => {
                    const enrolled = [];

                    if (config.current_semester === '1st') {
                        section.courses_1stsem.forEach((value) => {
                            enrolled.push({
                                course_code: value,
                                section: req.body.year + req.body.section
                            })
                        });
                    } else if (config.current_semester === '2nd') {
                        section.courses_2ndsem.forEach((value) => {
                            enrolled.push({
                                course_code: value,
                                section: req.body.year + req.body.section
                            })
                        });
                    }

                    return enrolled; 
                };

                const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 28);

                await studentModel.create({
                    uid: nanoid(),
                    email: req.body.email,
                    password: passwordHash,
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    section: `${req.body.year}${req.body.section}`,
                    position: 'Student',
                    enrolled_courses: enrolled_courses(),
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
                
        const token = tokenizeStudent(user_data);

        return res.status(200).json({   status: 'ok', 
                                        token: token,
                                        starting_course: user_data.enrolled_courses[0].course_code,
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

        const token = tokenizeProfessor(user_data);

        return res.status(200).json({   status: 'ok', 
                                        token: token, 
                                        starting_course: user_data.assigned_courses[0].course_code,
                                        starting_section: user_data.assigned_courses[0].sections[0].toString(),
                                        message: 'Logged in successfully.' });

    } catch (err) {
        return res.status(500).json({   status: false, 
                                        message: err.message });
    }
});


module.exports = accountRouter;