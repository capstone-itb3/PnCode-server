const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const sectionModel = require('../models/sections.model');
const tokenizer = require('./tokenizer');
const { client }  = require('../database');

const express = require('express');
const accountRouter = express.Router();

//*Firebase connection
const firebaseApp = require('../firebase');
const { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } = require('firebase/auth');

//*POST function when user registers
accountRouter.post('/api/register', async (req, res) => {
    if (req.body.password.length < 8) {
        return res.json({ status: 'error', message: 'Password must have more than 8 characters'});

    } else if (req.body.password !== req.body.conf_password) {
        return res.json({ status: 'error', message: 'Password and Re-typed Password doesn\'t match.'});

    } else {
        if (await studentModel.findOne({email: req.body.email})) {
            return res.json({status: 'error', message: 'The email address you entered is already registered. ' 
                                                       + 'If you think this is a mistake, please contact the MISD.'});
    
        } else {            
            try {
                const auth = getAuth(firebaseApp);
                await createUserWithEmailAndPassword(auth, req.body.email, req.body.password)

                .then((credential) => {
                    const user = credential.user;

                    async function createUser() {
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

                        await studentModel.create({
                            uid: user.uid,
                            email: req.body.email,
                            first_name: req.body.first_name,
                            last_name: req.body.last_name,
                            section: `${req.body.year}${req.body.section}`,
                            position: 'Student',
                            enrolled_courses: enrolled_courses(),
                            preferences: {} 
                        });
                    }                    
                    createUser();

                    return res.json({ status: 'ok', message: 'Sign up successful. You can now log in.'});
                    
                }).catch((err) => {
                    return res.json({ status: err.code, message: err.message})
                })

            } catch (err) {
                return res.json({status: err.code, message: err.message});
            }
        }
    }
 })//.patch((err) => { console.error(err); });

//*POST function when user logs in
accountRouter.post('/api/login', async (req, res) => {
    try {
        const auth = getAuth(firebaseApp);
        const user_data = await studentModel.findOne({ email: req.body.email });

        await signInWithEmailAndPassword(auth, req.body.email, req.body.password)
        .then(() => {

            if (user_data) {
                const token = tokenizer(user_data);

                return res.json({   status: 'ok', 
                                    token: token,
                                    starting_course: user_data.enrolled_courses[0].course_code,
                                    message: 'Logged in successfully.'});
    
            } else {
                return res.json({ status: 'error', message: 'Internal Server Error. User data couldn\'t be retrived.' });
            }  
            
        }).catch((err) => {
            return res.json({ status: err.code, message: 'Invalid credentials.' });
        });    
    } catch (err) {
        return res.json({ status: err.code, message: err.message });
    }
});

//*POST function when user logs in
accountRouter.post('/api/login/professor', async (req, res) => {
    try {
        const auth = getAuth(firebaseApp);
        const user_data = await professorModel.findOne({ email: req.body.email });

        await signInWithEmailAndPassword(auth, req.body.email, req.body.password)
        .then(() => {

            if (user_data) {
                const token = tokenizer(user_data);

                return res.json({   status: 'ok', 
                                    token: token, 
                                    starting_course: user_data.assigned_courses[0].course_code,
                                    starting_section: user_data.assigned_courses[0].sections[0].toString(),
                                    message: 'Logged in successfully.'});
    
            } else {
                return res.json({ status: 'error', message: 'Internal Server Error. User data couldn\'t be retrived.' });
            }  
            
        }).catch((err) => {
            return res.json({ status: err.code, message: 'Invalid credentials.' });
        });    
    } catch (err) {
        return res.json({ status: err.code, message: err.message });
    }
});


module.exports = accountRouter;