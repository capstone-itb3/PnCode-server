const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const { tokenizer } = require('../utils/tokenizer');
const middlewareAuth = require('../middleware');
const generateNanoId = require('../utils/generateNanoId');

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

                await studentModel.create({
                    uid: generateNanoId(),
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

module.exports = accountRouter;