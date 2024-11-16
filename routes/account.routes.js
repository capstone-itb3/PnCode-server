const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const { tokenizer } = require('../utils/tokenizer');
const generateNanoId = require('../utils/generateNanoId');

const express = require('express');
const bcrypt = require('bcryptjs');
const middlewareAuth = require('../middleware');

const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const accountRouter = express.Router();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.APP_PASSWORD
    }
});

//*POST function when user registers
accountRouter.post('/api/register', async (req, res) => {
    try {
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

        const existingUser = await studentModel.findOne({ email: req.body.email })
                             .select('isVerified');
        
        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({   status: false, 
                                            message: 'The email address you entered is already registered.'});
        }

        const verificationToken = uuidv4();
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(req.body.password, salt);                

        if (existingUser && !existingUser.isVerified) {
            await studentModel.updateOne({ email: req.body.email },
                {
                    password: passwordHash,
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    verificationToken: verificationToken
                }
            );
        } else {
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
                isVerified: false,
                verificationToken: verificationToken
            });
        }

        const verificationLink = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: req.body.email,
            subject: 'Verify Your Email - PnCode',
            html: `
                <p>Hi ${req.body.first_name},</p>
                <p>You've just registered an account to PnCode. To start using your account, please verify your email address by clicking <a href='${verificationLink}'> this link</a>.</p>
                <p>If you did not create an account with PnCode, please do not click the link and ignore this email.</p>
            `
        });

        return res.status(200).json({   status: 'ok', 
                                        message: 'Sign up successful. Please check your email to verify your account.' });
    } catch (err) {
        return res.status(500).json({   status: false, 
                                        message: 'Error occured while processing sign up. Please try again.'});
    }
});

//*POST function when student clicks an email verification link
accountRouter.post('/api/verify-email/:token', async (req, res) => {
    try {
        const student = await studentModel.findOne({ verificationToken: req.params.token });
        if (!student) {
            return res.status(400).json({ status: false, message: 'Invalid verification token' });
        }

        await studentModel.updateOne({ verificationToken: req.params.token },
            { $set: { isVerified: true, verificationToken: null } }
        );

        return res.status(200).json({ status: 'ok', message: 'Email verified successfully' });
    } catch (err) {
        return res.status(500).json({ status: false, message: 'Verification failed' });
    }
});


//*POST function when student logs in
accountRouter.post('/api/login', async (req, res) => {
    try {
        const user_data = await studentModel.findOne({ email: req.body.email });
        if (!user_data || !user_data?.isVerified) {
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

accountRouter.get('/api/get-user-notifications', middlewareAuth, async (req, res) => {
    try {
        return res.status(200).json({   status: 'ok',
                                        notifications: req.user.notifications,
                                        message: 'Retrieved notifications successfully'});

    } catch (e) {
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving user notifications failed.'});
    }  
})

accountRouter.post('/api/update-notifications', middlewareAuth, async (req, res) => {
    try {
        if (req.user.position === 'Student') {
            await studentModel.updateOne({ uid: req.user.uid }, {
                notifications: req.user.notifications.filter(n => !req.body.read_notifs.includes(n.notif_id))
            })

        } else if (req.user.position === 'Professor') {
            await professorModel.updateOne({ uid: req.user.uid }, {
                notifications: req.user.notifications.filter(n => !req.body.read_notifs.includes(n.notif_id))
            })
        }

        return res.status(200).json({   status: 'ok',
                                        message: 'Notifications updated successfully'});
        
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Updating notifications failed.'});
    }
});

accountRouter.post('/api/forgot-password', async (req, res) => {
    try {
        const user = await studentModel.findOne({ email: req.body.email })
                     .select('email first_name')
                     .lean();

        if (!user) {
            return res.status(400).json({ status: false, message: 'Email not found.' });
        }

        const resetToken = uuidv4();
        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        await studentModel.updateOne({ email: req.body.email }, { 
            $set: { 
                resetPasswordToken: resetToken,
                resetPasswordExpires: Date.now() + 3600000 // 1 hour
            } 
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request - PnCode',
            html: `
                <p>Hi ${user.first_name},</p>
                <p>You have sent a request to reset your password on PnCode. You can reset your password by clicking <a href="${resetLink}">this link</a>.
                <p>The link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, please ignore this email.</p>
            `
        });

        return res.status(200).json({ status: 'ok', message: 'Password reset link sent successfully.' });
    } catch (e) {
        console.log(e)
        return res.status(500).json({ status: false, message: 'Failed to process password reset request.' });
    }
});

accountRouter.post('/api/reset-password', async (req, res) => {
    try {
        if (req.body.password.length < 8) {
            return res.status(400).json({   status: false, 
                                            message: 'Password must have more than 8 characters' });
        }

        if (req.body.password !== req.body.conf_password) {
            return res.status(400).json({   status: false, 
                                            message: 'Password and Re-typed Password don\'t match.' });
        }

        const user = await studentModel.findOne({
            resetPasswordToken: req.body.reset_link,
            resetPasswordExpires: { $gt: Date.now() }
        }).select('email').lean();

        if (!user) {
            return res.status(400).json({   status: false, 
                                            message: 'Password reset link is invalid or has expired.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(req.body.password, salt);

        await studentModel.updateOne({ resetPasswordToken: req.body.reset_link }, {
            $set: {
                password: passwordHash,
                resetPasswordToken: null,
                resetPasswordExpires: null
            }
        });

        return res.status(200).json({ status: 'ok', message: 'Password reset successful.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: 'Failed to reset password.' });
    }
});


module.exports = accountRouter;