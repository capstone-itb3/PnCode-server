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

const { setMemberInfo } = require('../utils/setInfo');

const jwt = require('jsonwebtoken');
const middlewareAdmin = require('./adminMiddleware');
const generateNanoId = require('../utils/generateNanoId');
const generateRoomName = require('../utils/generateRoomName');

const regexEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

const express = require('express');
const bcrypt = require('bcryptjs');
const adminRouter = express.Router();

//*POST function when admin logs in
adminRouter.post('/api/login/admin', async (req, res) => {
    try {
        const user = await adminModel.findOne({ email: req.body.email });
        if (!user) {
            return res.status(401).json({   status: false,
                                            message: 'Email or password is incorrect.'});
        }

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.status(401).json({  status: false,
                                            message: 'Email or password is incorrect.'});
        }

        const token = jwt.sign({
            admin_uid: user.admin_uid,
            first_name: user.first_name,
            last_name: user.last_name            
        }, process.env.JWT_SECRET_ADMIN, { expiresIn: '1d' });

        res.cookie('token', token, {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            domain: process.env.DOMAIN,
            secure: process.env.SECURE,
            httpOnly: true
        });

        return res.status(200).json({   status: 'ok',
                                        message: 'Logged in successfully.' });

    } catch (err) {
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Logging in failed.' });
    }
});

//*POST function to verify if admin
adminRouter.post('/api/admin/verify-token', middlewareAdmin, async (req, res) => {
    try {
        const auth = {
            admin_uid: req.user.admin_uid,
            first_name: req.user.first_name,
            last_name: req.user.last_name,
        }

        return res.status(200).json({   status: 'ok', auth: auth, message: 'Admin verified successfully.' });
    } catch(e) {
        return res.status(500).json({   status: false,
                                        message: err.message });
    }
});

//*POST function to load all student data
adminRouter.post('/api/admin/students', middlewareAdmin, async (req, res) => {
    try {
        const students = await studentModel.find({})
        .select('uid first_name last_name email createdAt updatedAt')
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

//*POST function to load all professor data
adminRouter.post('/api/admin/professors', middlewareAdmin, async (req, res) => {
    try {
        const professors = await professorModel.find({})
        .select('uid first_name last_name email createdAt updatedAt')
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

//*POST function to load all course data
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

//*POST function to load all class data
adminRouter.post('/api/admin/classes', middlewareAdmin, async (req, res) => {
    try {
        let classes = await classModel.find({})
        .select('class_id course_code section professor students requests createdAt updatedAt')
        .lean();

        classes = await Promise.all(classes.map(setCourseInfoAdmin));
        async function setCourseInfoAdmin(class_data) {
            const title = await courseModel.findOne({ course_code: class_data.course_code })
                         .select('course_title');
        
            const students = await studentModel.find({ uid: { $in: class_data.students } })
                             .select('uid first_name last_name email')
                             .lean();
            students.sort((a, b) => a.last_name.localeCompare(b.last_name));
            
            const requests = await studentModel.find({ uid: { $in: class_data.requests } })
                             .select('uid first_name last_name email')
                             .lean();
            requests.sort((a, b) => a.last_name.localeCompare(b.last_name));

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
                professor: professor ? `${professor.first_name} ${professor.last_name}` : 'TBA',
                createdAt: class_data.createdAt,
                updatedAt: class_data.updatedAt
            }
        }

        classes.sort((a, b) => a.section.localeCompare(b.section));
        
        return res.status(200).json({   status: 'ok',
                                        classes: classes,
                                        message: 'Students retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving classes failed.' });
    }
});

//*POST function to load all team data within a class
adminRouter.post('/api/admin/teams', middlewareAdmin, async (req, res) => {
    try {
        const parent_class = await classModel.findOne({ class_id: req.body.class_id })
                             .select('class_id course_code section')
                             .lean();

        if (!parent_class) {
            return res.status(404).json({ status: false, message: 'Class was not found or is no longer available.' });
        }

        let teams = await teamModel.find({ class_id: req.body.class_id }).lean();

        teams = await Promise.all(teams.map(setTeamInfoAdmin));
        async function setTeamInfoAdmin(team) {
            team.members = await setMemberInfo(team.members);
            team.members.sort((a, b) => a.last_name.localeCompare(b.last_name));

            return team;
        }

        return res.status(200).json({   status: 'ok',
                                        teams: teams,
                                        parent_class: parent_class,       
                                        message: 'Teams retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
});
    
//*GET function to load all activity data within a class
adminRouter.get('/api/admin/activities', middlewareAdmin, async (req, res) => {
    try {
        const parent_class = await classModel.findOne({ class_id: req.query.class_id })
                             .select('class_id course_code section')
                             .lean();

        if (!parent_class) {
            return res.status(404).json({ status: false, message: 'Class was not found or is no longer available.' });
        }

        const activities = await activityModel.find({ class_id: req.query.class_id }).lean();

        return res.status(200).json({   status: 'ok',
                                        activities: activities,
                                        parent_class: parent_class,
                                        message: 'Activities retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving activities failed.' });
    }
});

//*GET function to load all assigned room data within an activity
adminRouter.get('/api/admin/assigned-rooms', middlewareAdmin, async (req, res) => {
    try {
        let rooms = [], parent_team = {}, parent_activity = {}, parent_class = {};

        if (req.query.foreign_name === 'team') {
            rooms = await assignedRoomModel.find({ owner_id: req.query.foreign_key })
                    .select('room_id room_name owner_id activity_id createdAt updatedAt')
                    .lean();

            rooms = await Promise.all(rooms.map(setRoomInfoAdmin));
            async function setRoomInfoAdmin(room) {
                const activity = await activityModel.findOne({ activity_id: room.activity_id })
                                    .select('activity_name');
                return {
                    ...room,
                    activity_name: activity.activity_name,
                }   
            }
            parent_team = await teamModel.findOne({ team_id: req.query.foreign_key })
                          .select('team_id team_name class_id');

            if (!parent_team) {
                parent_team = { team_id: null };
            }
             
            parent_class = await classModel.findOne({ class_id: parent_team.class_id })
                           .select('class_id course_code section')
                           .lean();

        } else if (req.query.foreign_name === 'activity') {
            rooms = await assignedRoomModel.find({ activity_id: req.query.foreign_key })
                    .select('room_id room_name owner_id activity_id createdAt updatedAt')
                    .lean();

            parent_activity = await activityModel.findOne({ activity_id: req.query.foreign_key })
                              .select('activity_id activity_name class_id')
                              .lean();
            
            if (!parent_activity) {
                return res.status(404).json({   status: false,
                                                message: 'Activity was not found or is no longer available.' });
            }

            parent_class = await classModel.findOne({ class_id: parent_activity.class_id })
                           .select('class_id course_code section')
                           .lean();
        } else {
            return res.status(404).json({   status: false,
                                            message: 'Invalid foreign key.' });
        }

        return res.status(200).json({   status: 'ok',
                                        assigned_rooms: rooms,
                                        parent_team: parent_team,
                                        parent_activity: parent_activity,
                                        parent_class: parent_class,
                                        message: 'Assigned rooms retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving assigned rooms failed.' });
    }
})

//*GET function to load all solo room data of a user
adminRouter.get('/api/admin/solo-rooms', middlewareAdmin, async (req, res) => {
    try {
        let rooms = [], parent_user = {};

        if (req.query.foreign_name === 'student') {
            parent_user = await studentModel.findOne({ uid: req.query.foreign_key })
                          .select('uid first_name last_name');
            if (!parent_user) {
                return res.status(404).json({   status: false,
                                                message: 'Student was not found or is no longer available.' });
            }
        } else if (req.query.foreign_name === 'professor') {
            parent_user = await professorModel.findOne({ uid: req.query.foreign_key })
                          .select('uid first_name last_name');
            if (!parent_user) {
                return res.status(404).json({   status: false,
                                                message: 'Teacher was not found or is no longer available.' });
            }
        } else {
            return res.status(404).json({   status: false,
                                            message: 'Invalid foreign key.' });
        }

        rooms = await soloRoomModel.find({ owner_id: req.query.foreign_key })
                .select('room_id room_name owner_id createdAt updatedAt')
                .lean();
        
        return res.status(200).json({   status: 'ok',
                                        solo_rooms: rooms,
                                        parent_user: parent_user,
                                        message: 'Solo rooms retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving solo rooms failed.' });
    }
});

//*GET function to load a particular assigned room data and related data
adminRouter.get('/api/admin/get-assigned-room-details', middlewareAdmin, async (req, res) => {
    try {
        let assigned_room = await assignedRoomModel.findOne({ room_id: req.query.room_id })
        .select('room_id room_name activity_id owner_id')
        .lean();
        
        if (!assigned_room) {
            return res.status(404).json({ status: false, message: 'Room not found.'});
        }
        
        const activity = await activityModel.findOne({ activity_id: assigned_room.activity_id }).lean();
        if (!activity) {
            return res.status(404).json({ status: false, message: 'Room not found.'});
        }

        let team = await teamModel.findOne({ team_id: assigned_room.owner_id })
                   .select('members');


        if (!team) {
            team = { members: null };
        }

        if (team.members) {
            team.members = await setMemberInfo(team.members);
            team.members.sort((a, b) => a.last_name.localeCompare(b.last_name));
        }
        
        const files = await fileModel.find({ room_id: req.query.room_id }).lean();
        
        return res.status(200).json({   status: 'ok', 
                                        room: assigned_room,
                                        files: files,
                                        activity: activity, 
                                        members: team.members,
                                        message: 'Assigned room details retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving assigned room details failed.' });
    }
});

//*GET function to load a particular solo room data
adminRouter.get('/api/admin/get-solo-room-details', middlewareAdmin, async (req, res) => {
    try {
        const room = await soloRoomModel.findOne({ room_id: req.query.room_id })
        .select('room_id room_name owner_id files')
        .lean();

    } catch (e) {
        
    }
});

//*POST function to create a new student
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
            isVerified: true
        });

        return res.status(200).json({   status: 'ok', 
                                        uid: new_id,
                                        message: 'A new student account has been created.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating student failed.' });
    }
});

//*POST function to update a student
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

//*POST function to create a new professor
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

        let new_id = 0, already_exists = true;
        while (already_exists) {
            new_id = generateNanoId();
            already_exists = await studentModel.findOne({ uid: new_id });
            !already_exists ? already_exists = await professorModel.findOne({ uid: new_id }) : null;            
        }

        await professorModel.create({
            uid: new_id,
            email: req.body.email,
            password: passwordHash,
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            notifications: [],
        });

        return res.status(200).json({   status: 'ok', 
                                        uid: new_id,
                                        message: 'A new professor account has been created.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating professor failed.' });
    }
});

//*POST function to update a professor
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
    
        await professorModel.updateOne({ uid: req.body.uid }, {
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

//*POST function to create a course
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
                                        course_code: req.body.course_code,
                                        message: 'A new course has been created.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating course failed.' });
    }
});

//*POST function to update a course
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

//*POST function to create a class
adminRouter.post('/api/admin/create-class', middlewareAdmin, async (req, res) => {
    req.body.course_code = String(req.body.course_code).toUpperCase();
    req.body.section = String(req.body.section).toUpperCase();

    try {
        const section = await classModel.findOne({ course_code: req.body.course_code, section: req.body.section })
                        .select('course_code section');
        if (section) {
            return res.status(400).json({   status: false,
                                            message: 'The course code and section you entered already has an exsisting class.'});
        }

        const professor = await professorModel.findOne({ uid: req.body.professor_uid }).select('uid');
        if (!professor) {
            return res.status(400).json({   status: false,
                                            message: 'You have not selected a professor yet.'});
        } 

        let new_id = '', alreadyExists = true;
        while (alreadyExists) {
            new_id = generateNanoId();
            alreadyExists = await classModel.findOne({ class_id: new_id });
        }

        await classModel.create({
            class_id: new_id,
            course_code: req.body.course_code,
            section: req.body.section,
            professor: req.body.professor_uid,
            students: [],
            requests: []
        }); 

        return res.status(200).json({   status: 'ok',
                                        class_id: new_id,
                                        message: 'A new class has been created.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating class failed.' });
    }
});

//*POST function to update a class
adminRouter.post ('/api/admin/update-class', middlewareAdmin, async (req, res) => {
    req.body.course_code = String(req.body.course_code).toUpperCase();
    req.body.section = String(req.body.section).toUpperCase();

    console.log(req.body);

    try {
        const class_data = await classModel.findOne({ class_id: req.body.class_id })
                           .select('class_id course_code section');
            
        console.log(class_data);                   
        
        if (class_data.course_code !== req.body.course_code || class_data.section !== req.body.section) {
            const duplicate = await classModel.findOne({ 
                class_id: { $ne: req.body.class_id },
                course_code: req.body.course_code,
                section: req.body.section
            }).select('class_id');
            

            if (duplicate) {
                return res.status(400).json({ status: false,  
                                              message: 'The new course code and section you entered already has an exsisting class.'});
            } else {
                console.log('2')
            }
        }
        console.log('1')

        const professor = await professorModel.findOne({ uid: req.body.professor_uid }).select('uid');
        if (!professor) {
            return res.status(400).json({   status: false,
                                            message: 'You have not selected a professor yet.'});
        } 

        await classModel.updateOne({ class_id: req.body.class_id }, {
            $set: {
                course_code: req.body.course_code,
                section: req.body.section,
                professor: req.body.professor_uid
            }
        });
            

        return res.status(200).json({   status: 'ok',
                                        message: 'The class has been updated.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating class failed.' });
    }
})

//*POST function to add a student to a class
adminRouter.post('/api/admin/add-student', middlewareAdmin, async (req, res) => {
    try {
        const class_data = await classModel.findOne({ class_id: req.body.class_id })
                           .select('course_code students');

        if (!class_data) {
            return res.status(400).json({   status: false,
                                            message: 'The class does not exist.'});
        }

        const joined_another = await classModel.findOne({
            class_id: { $ne: req.body.class_id },
            course_code: class_data.course_code,
            students: req.body.uid
        }).select('class_id');

        if (joined_another) {
            return res.status(400).json({   status: false,
                                            message: 'The student has already joined another class with the same course code.'});
        }

        if (class_data.students.includes(req.body.uid)) {
            return res.status(400).json({   status: false,
                                            message: 'The student has already joined the class.'});
        }

        await classModel.updateOne({ class_id: req.body.class_id }, {
            $push: {
                students: req.body.uid
            },
            $pull: {
                requests: req.body.uid
            }
        });

        return res.status(200).json({   status: 'ok',
                                        message: 'The student has been added to the class.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Adding student to class failed.' });

    }
});

//*POST function to remove a student from a class
adminRouter.post('/api/admin/remove-student', middlewareAdmin, async (req, res) => {
    try {
        await classModel.updateOne({ class_id: req.body.class_id }, {
            $pull: {
                students: req.body.uid
            }
        });

        await teamModel.updateOne({ 
            class_id: req.body.class_id, 
            members: req.body.uid 
        }, { 
            $pull: { members: req.body.uid }
        });

        return res.status(200).json({  status: 'ok', message: 'Student removed successfully.' });
        
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Removing student from class failed.' });
    }
});

//*POST function to accept a request to join a class
adminRouter.post('/api/admin/accept-request', middlewareAdmin, async (req, res) => {
    try {
        const class_data = await classModel.findOne({ class_id: req.body.class_id })
                           .select('course_code students');

        if (!class_data) {
            return res.status(400).json({   status: false,
                                            message: 'The class does not exist.'});
        }

        if (class_data.students.includes(req.body.uid)) {
            return res.status(400).json({   status: false,
                                            message: 'The student has already joined this class.'});
        }

        const joined_another = await classModel.findOne({
            class_id: { $ne: req.body.class_id },
            course_code: class_data.course_code,
            students: req.body.uid
        }).select('class_id');

        if (joined_another) {
            return res.status(400).json({   status: false,
                                            message: 'The student has already joined another class with the same course code.'});
        }

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
                                        message: 'Server error. Accepting request failed.' });
    }
});

//*POST function to reject a request to join a class
adminRouter.post('/api/admin/reject-request', middlewareAdmin, async (req, res) => {
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
                                        message: 'Server error. Rejecting request failed.' });
    }
});

//*POST function to create a team
adminRouter.post('/api/admin/create-team', middlewareAdmin, async (req, res) => {
    try {
        if (req.body.team_name.length > 30) {
            return res.status(400).json({ status: false, message: 'Team name must be less than 30 characters.' });
        
        } else if (req.body.team_name.length < 3) {
            return res.status(400).json({ status: false, message: 'Team name must be at least 3 characters.' });
        }

        let new_id = '', alreadyExists = true;
        while (alreadyExists) {
            new_id = generateNanoId();
            alreadyExists = await teamModel.findOne({ team_id: new_id });
        }

        await teamModel.create({
            team_id: new_id,
            team_name: req.body.team_name,
            class_id: req.body.class_id,
            members: []
        });

        return res.status(200).json({   status: 'ok', 
                                        team_id: new_id,
                                        message: 'Team created successfully.' });

    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating team failed.' });
    }
});

//*POST function to update a team
adminRouter.post('/api/admin/update-team', middlewareAdmin, async (req, res) => {
    try {
        const team = await teamModel.findOne({ team_id: req.body.team_id });

        if (!team) {
            return res.status(404).json({ status: false, message: 'Team was not found or is no longer available.' });
        }

        if (req.body.team_name.length > 30) {
            return res.status(400).json({ status: false, message: 'Team name must be less than 30 characters.' });

        } else if (req.body.team_name.length < 3) {
            return res.status(400).json({ status: false, message: 'Team name must be at least 3 characters.' });
        }

        await teamModel.updateOne({ team_id: req.body.team_id }, {
            $set: { team_name: req.body.team_name }
        });

        await assignedRoomModel.updateMany({ owner_id: req.body.team_id }, {
            $set: { room_name: `${req.body.team_name}'s Room` }
        });

        return res.status(200).json({ status: 'ok', message: 'Team updated successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Updating team failed.' });
    }
});

//*POST function to get students in a class 
adminRouter.post('/api/admin/get-class-students', middlewareAdmin, async (req, res) => {
    try {
        const class_data = await classModel.findOne({ class_id: req.body.class_id })
                           .select('students');

        if (!class_data) {
            return res.status(404).json({ status: false, message: 'Class was not found or is no longer available.' });
        }

        const students = await setMemberInfo(class_data.students);
        students.sort((a, b) => a.last_name.localeCompare(b.last_name));
        

        return res.status(200).json({   status: 'ok',
                                        students: students,
                                        message: 'Retrieved class studentts successfully.',})
    }  catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving class students failed.' });

    }
})

//*POST function to add a member to a team
adminRouter.post('/api/admin/add-member', middlewareAdmin, async (req, res) => {
    try {
        const team = await teamModel.findOne({ team_id: req.body.team_id })
                     .select('class_id members');
        if (!team) {
            return res.status(404).json({ status: false, message: 'Team was not found or is no longer available.' });
        } else if (team.members.includes(req.body.uid)) {
            return res.status(400).json({ status: false, message: 'Student has already joined this team.' });
        }

        const class_data = await classModel.findOne({ class_id: team.class_id })
                           .select('students');
        if (!class_data) {
            return res.status(404).json({ status: false, message: 'Class was not found or is no longer available.' });
        } else if (!class_data.students.includes(req.body.uid)) {
            return res.status(400).json({ status: false, message: 'Student does not belong in the class.' });
        }

        const another_team = await teamModel.findOne({ 
            class_id: team.class_id, 
            members: req.body.uid 
        }).select('members');
        if (another_team) {
            return res.status(400).json({ status: false, message: 'Student has already join another team of its class.' });
        }

        await teamModel.updateOne({ team_id: req.body.team_id }, {
            $push: { members: req.body.uid }
        });

        return res.status(200).json({   status: 'ok',
                                        message: 'Student added to the team successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Adding member failed.' });
    }
})

//*POST function to remove a member of a team
adminRouter.post('/api/admin/remove-member', middlewareAdmin, async (req, res) => {
    try {
        const team = await teamModel.findOne({ team_id: req.body.team_id });
        if (!team) {
            return res.status(404).json({ status: false, message: 'Team was not found or is no longer available.' });
        }

        await teamModel.updateOne({ team_id: req.body.team_id }, {
            $pull: { members: req.body.uid }
        });

        return res.status(200).json({   status: 'ok',
                                        message: 'Student removed from the team successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Removing member failed.' });
    }
});

//*POST function to create an activity  from a class
adminRouter.post('/api/admin/create-activity', middlewareAdmin, async (req, res) => {
    try {
        if (req.body.activity_name.length > 100) {
            return res.status(400).json({ status: false, message: 'Activity name must be less than 100 characters.' });
        }
        
        if (req.body.open_time === '') {
            return res.status(400).json({ status: false, message: 'Please complete the input for open time.' });
        } else if (req.body.close_time === '') {
            return res.status(400).json({ status: false, message: 'Please complete the input for close time.' });
        }

        const timeToMinutes = (timeString) => {
            const [hours, minutes] = timeString.split(':').map(Number);
            return hours * 60 + minutes;
        };
    
        const openMinutes = timeToMinutes(req.body.open_time);
        const closeMinutes = timeToMinutes(req.body.close_time);
    
        if (closeMinutes <= openMinutes) {
            return res.status(400).json({ status: false, message: 'Close time must be no earlier than open time.' });
        }

        const class_data = await classModel.findOne({ class_id: req.body.class_id })
                           .select('class_id');
        if (!class_data) {
            return res.status(404).json({ status: false, message: 'Class was not found or is no longer available.' });
        }

        let new_id = 0, already_exists = true;

        while (already_exists) {
            new_id = generateNanoId();      
            already_exists = await activityModel.findOne({
                activity_id: new_id
            });
        }
    
        await activityModel.create({
            activity_id: new_id,
            activity_name: req.body.activity_name,
            class_id: req.body.class_id,
            instructions: req.body.instructions,
            open_time: req.body.open_time,
            close_time: req.body.close_time,
        });

        res.status(200).json({  status: 'ok', 
                                activity_id: new_id, 
                                message: 'Activity created successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating activity failed.' });
    }
});

//*POST function to update an activity
adminRouter.post('/api/admin/update-activity', middlewareAdmin, async (req, res) => {
    try {
        if (req.body.activity_name.length < 3) {
            return res.status(400).json({ status: false, message: 'Activity name must be at least 3 characters.' });
        } else if (req.body.activity_name.length > 100) {
            return res.status(400).json({ status: false, message: 'Activity name must be less than 100 characters.' });
        }

        if (req.body.open_time === '') {
            return res.status(400).json({ status: false, message: 'Please complete the input for open time.' });
        } else if (req.body.close_time === '') {
            return res.status(400).json({ status: false, message: 'Please complete the input for close time.' });
        }

        const timeToMinutes = (timeString) => {
            const [hours, minutes] = timeString.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const openMinutes = timeToMinutes(req.body.open_time);
        const closeMinutes = timeToMinutes(req.body.close_time);
    
        if (closeMinutes <= openMinutes) {
            return res.status(400).json({ status: false, message: 'Close time must be no earlier than open time.' });
        }

        const activity = await activityModel.findOne({ activity_id: req.body.activity_id })
                         .select('class_id');
        if (!activity) {
            return res.status(404).json({ status: false, message: 'Activity was not found or is no longer available.' });
        }

        await activityModel.updateOne({ activity_id: req.body.activity_id }, {
            $set: {
                activity_name: req.body.activity_name,
                instructions: req.body.instructions,
                open_time: req.body.open_time,
                close_time: req.body.close_time,
            }
        });

        const rooms = await assignedRoomModel.find({ activity_id: req.body.activity_id })
        .select('room_id')
        .lean();
        
        for (const room of rooms) {
            req.io?.in(room.room_id)?.emit('dates_updated', {
                new_open_time: req.body.open_time,
                new_close_time: req.body.close_time,
            });
        }
    
        for (const room of rooms) {
            req.io?.in(room.room_id)?.emit('instructions_updated', {
                new_instructions: req.body.instructions
            });
        }
    
        return res.status(200).json({ status: 'ok', message: 'Instructions updated!'})
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Updating activity failed.' });
    }
});

//*POST function to create an assigned room from an activity
adminRouter.post('/api/admin/create-assigned-room', middlewareAdmin, async (req, res) => {
    try {
        const hasRoom = await assignedRoomModel.findOne({ 
            activity_id: req.body.activity_id, 
            owner_id: req.body.team_id 
        }).select('room_id').lean();

        if (hasRoom) {
            return res.status(400).json({ status: false, message: 'Team already has a room assigned for this activity.' });
        }

        const activity = await activityModel.findOne({ activity_id: req.body.activity_id })
                         .select('activity_id');
        if (!activity) {
            return res.status(404).json({ status: false, message: 'Activity was not found or is no longer available.' });
        }

        const team = await teamModel.findOne({ team_id: req.body.team_id })
                     .select('team_id team_name members');
        if (!team) {
            return res.status(404).json({ status: false, message: 'Team was not found or is no longer available.' });
        }

        let new_id = 0, already_exists = true;
        while (already_exists) {
            new_id = generateNanoId();
            already_exists = await assignedRoomModel.findOne({ room_id: new_id });
        }

        await assignedRoomModel.create({
            room_id: new_id,
            room_name: `${team.team_name}'s Room`,
            activity_id: activity.activity_id,
            owner_id: team.team_id,
        });

        return res.status(200).json({   status: 'ok',
                                        room_id: new_id,
                                        message: 'Assigned room created successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating assigned room failed.' });
    }
});

//*POST function to create a solo room for a specific user
adminRouter.post('/api/admin/create-solo-room', middlewareAdmin, async (req, res) => {
    try {
        let user;

        if (req.body.position === 'student') {
            user = await studentModel.findOne({ uid: req.body.uid })
                   .select('first_name');

        } else if (req.body.position === 'professor') {
            user = await professorModel.findOne({ uid: req.body.uid })
                   .select('first_name');
        }

        if (!user) {
            return res.status(404).json({ status: false, message: 'User was not found or is no longer available.' });
        }

        const created_solos = await soloRoomModel.find({ owner_id: req.body.uid })
                      .select('room_name');

        if (created_solos.length >= 5) {
            return res.status(400).json({ status: false, message: 'Solo rooms per user cannot exceed more than five rooms.' });
        }

        let new_id = 0, already_exists = true;

        while (already_exists) {
            new_id = generateNanoId();
            already_exists = await soloRoomModel.findOne({ room_id: new_id });
        }

        await soloRoomModel.create({
            room_id: new_id,
            room_name: generateRoomName(created_solos, user.first_name),
            owner_id: req.body.uid,
        });

        return res.status(200).json({   status: 'ok',
                                        room_id: new_id,
                                        message: 'Solo room created successfully.' });

    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Creating solo room failed.' });
    }
});

//*POST function to update solo room name
adminRouter.post('/api/admin/update-solo-room-name', middlewareAdmin, async (req, res) => {
    try {
        const room = await soloRoomModel.findOne({ room_id: req.body.room_id })
                     .select('room_id');
        if (!room) {
            return res.status(404).json({ status: false, message: 'Solo room was not found or is no longer available.' });
        }

        await soloRoomModel.updateOne({ room_id: req.body.room_id }, {
            $set: {
                room_name: req.body.new_room_name,
            },
        });

        return res.status(200).json({   status: 'ok',
                                        message: 'Solo room updated successfully.' });

    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Updating solo room failed.' });
    }
});

//*POST function to delete a student
adminRouter.post('/api/admin/delete-student', middlewareAdmin, async (req, res) => {
    try {
        await studentModel.deleteOne({ uid: req.body.uid });
        
        await classModel.updateMany({}, {
            $pull: {
                students: req.body.uid,
                requests: req.body.uid
            },
        });

        await teamModel.updateMany({ members: req.body.uid }, {
            $pull: {
                members: req.body.uid,
            },
        });

        await soloRoomModel.deleteMany({ owner_id: req.body.uid }); 
        
        return res.status(200).json({   status: 'ok',
                                        message: 'Student deleted successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Deleting student failed.' });

    }
});

//*POST function to delete a professor
adminRouter.post('/api/admin/delete-professor', middlewareAdmin, async (req,res) => {
    try {
        await professorModel.deleteOne({ uid: req.body.uid });

        await classModel.updateMany({ professor: req.body.uid }, {
            professor: ''
        });

        return res.status(200).json({   status: 'ok',
                                        message: 'Professor deleted successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Deleting professor failed.' });
    }
});

//*POST function to delete a course
adminRouter.post('/api/admin/delete-course', middlewareAdmin, async (req, res) => {
    try {
        await courseModel.deleteOne({ course_code: req.body.course_code });

        const classes = await classModel.find({ course_code: req.body.course_code })
                        .select('class_id').lean();

        await classModel.deleteMany({ course_code: req.body.course_code });
        await teamModel.deleteMany({ class_id: { $in: classes.map(c => c.class_id) } });
        
        const activities = await activityModel.find({ 
            class_id: { $in: classes.map(c => c.class_id) } 
        }).select('activity_id').lean();

        const assigned_rooms = await assignedRoomModel.find({ 
            activity_id: { $in: activities.map(a => a.activity_id) } 
        }).select('room_id').lean();

        await activityModel.deleteMany({ class_id: { $in: classes.map(c => c.class_id) }});
        await assignedRoomModel.deleteMany({room_id: { $in: assigned_rooms.map(r => r.room_id) }});
        await fileModel.deleteMany({room_id: { $in: assigned_rooms.map(r => r.room_id) }})

        return res.status(200).json({   status: 'ok',
                                        message: 'The course has been deleted.'});

    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Deleting course failed.' });
    }
});

//*POST function to delete a class
adminRouter.post('/api/admin/delete-class', middlewareAdmin, async (req, res) => {
    try {
        await classModel.deleteOne({ class_id: req.body.class_id });
        await teamModel.deleteMany({ class_id: req.body.class_id });

        const activities = await activityModel.find({ 
            class_id: req.body.class_id 
        }).select('activity_id').lean();

        const assigned_rooms = await assignedRoomModel.find({ 
            activity_id: { $in: activities.map(a => a.activity_id) } 
        }).select('room_id').lean();

        await activityModel.deleteMany({ class_id: req.body.class_id });
        await assignedRoomModel.deleteMany({room_id: { $in: assigned_rooms.map(r => r.room_id) }})
        await fileModel.deleteMany({room_id: { $in: assigned_rooms.map(r => r.room_id) }})
        
        return res.status(200).json({   status: 'ok',
                                        message: 'The class has been deleted.'});

    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Deleting course failed.' });
    }
});

//*POST function to delete a team
adminRouter.post('/api/admin/delete-team', middlewareAdmin, async (req, res) => {
    try {
        await teamModel.deleteOne({ team_id: req.body.team_id });
        await assignedRoomModel.updateMany({ owner_id: req.body.team_id }, {
            $set: {
                room_name: `${req.body.team_name} (deleted-team)'s Room`,
                owner_id: ''
            }
        });

        return res.status(200).json({   status: 'ok',
                                        message: 'The team has been deleted.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Deleting team failed.' });
    }
});

//*POST function to delete an activity
adminRouter.post('/api/admin/delete-activity', middlewareAdmin, async (req, res) => {
    try {
        await activityModel.deleteOne({ activity_id: req.body.activity_id });
        const assigned_rooms = await assignedRoomModel.find({ activity_id: req.body.activity_id })
                               .select('room_id')
                               .lean();

        await assignedRoomModel.deleteMany({ room_id: { $in: assigned_rooms.map(r => r.room_id) } });
        await fileModel.deleteMany({ room_id: { $in: assigned_rooms.map(r => r.room_id) } });
    
        return res.status(200).json({   status: 'ok',
                                        message: 'The activity has been deleted.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Deleting activity failed.' });
    }
});

//*POST function to delete an assigned room
adminRouter.post('/api/admin/delete-assigned-room', middlewareAdmin, async (req, res) => {
    try {
        await assignedRoomModel.deleteOne({ room_id: req.body.room_id });
        await fileModel.deleteMany({ room_id: req.body.room_id });

        return res.status(200).json({   status: 'ok',
                                        message: 'The assigned room has been deleted.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Deleting assigned room failed.' });
    }
});

//*POST function to delete a solo room
adminRouter.post('/api/admin/delete-solo-room', middlewareAdmin, async (req, res) => {
    try {
        await soloRoomModel.deleteOne({ room_id: req.body.room_id });

        return res.status(200).json({   status: 'ok',
                                        message: 'The solo room has been deleted.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Deleting solo room failed.' });
    }
});

module.exports = adminRouter;