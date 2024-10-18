const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const { tokenizer } = require('../utils/tokenizer');
const generateNanoId = require('../utils/generateNanoId');

const express = require('express');
const bcrypt = require('bcryptjs');

const accountRouter = express.Router();

//*POST function when user registers
accountRouter.post('/api/register', async (req, res) => {
    try {
        //only acccpet space a-Z dash and dots 
        const name_regex = /^[a-zA-Z-.\s]+$/;
    
        if (!name_regex.test(req.body.first_name) || !name_regex.test(req.body.last_name)) {
            return res.status(400).json({   status: false,
                                            message: 'Name inputs only accepts alphabets, dashes, and dots.'});
        }

        req.body.first_name = req.body.first_name.trim();
        req.body.last_name = req.body.last_name.trim();
    
        const email_regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    
        if (!email_regex.test(req.body.email)) {
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
        if (await studentModel.findOne({ email: req.body.email })) {
                return res.status(400).json({   status: false, 
                                                message: 'The email address you entered is already registered. ' 
                                                    + 'If you think this is a mistake, please contact the MISD.'});
        } 

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(req.body.password, salt);                

        let new_id = 0, already_exists = true;
        while (already_exists) {
            new_id = generateNanoId();
            already_exists = await studentModel.findOne({ uid: new_id });
            !already_exists ? already_exists = await professorModel.findOne({ uid: new_id }) : null;            
        }

        await studentModel.create({
            uid: new_id,
            email: req.body.email,
            password: passwordHash,
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            notifications: [],
            infoChangeable: false,
        });

        return res.status(200).json({   status: 'ok', 
                                        message: 'Sign up successful. You can now log in.'});
    } catch (err) {
        return res.status(500).json({   status: false, 
                                        message: 'Error occured while processing sign up. Please try again.'});
    }
});

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
                
        const token = tokenizer(user_data, 'Student');

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

        const token = tokenizer(user_data, 'Professor');

        return res.status(200).json({   status: 'ok',
                                        token: token,
                                        message: 'Logged in successfully.' });

    } catch (err) {
        return res.status(500).json({   status: false, 
                                        message: err.message });
    }
});

module.exports = accountRouter;