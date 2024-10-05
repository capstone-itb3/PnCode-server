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

//*POST function to load all student data
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

//*POST function to load all professor data
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
        .select('class_id course_code section professor students requests')
        .lean();

        classes = await Promise.all(classes.map(setCourseInfoAdmin));
        async function setCourseInfoAdmin(class_data) {
            const title = await courseModel.findOne({ course_code: class_data.course_code })
                         .select('course_title');
        
            const students = await studentModel.find({ uid: { $in: class_data.students } })
                             .select('uid first_name last_name')
                             .lean();
            students.sort((a, b) => a.last_name.localeCompare(b.last_name));
            
            const requests = await studentModel.find({ uid: { $in: class_data.requests } })
                             .select('uid first_name last_name')
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
                professor: professor ? `${professor.first_name} ${professor.last_name}` : 'TBA'
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

//*POST function to load all team data
adminRouter.post('/api/admin/teams', middlewareAdmin, async (req, res) => {
    try {
        let teams = await teamModel.find({}).lean();

        teams = await Promise.all(teams.map(setTeamInfoAdmin));
        async function setTeamInfoAdmin(team) {
            team.members = await Promise.all(team.members.map(setMemberInfo));
            team.members.sort((a, b) => a.last_name.localeCompare(b.last_name));

            const class_data = await classModel.findOne({ class_id: team.class_id })
                               .select('course_code section');

            return {
                team_id: team.team_id,
                team_name: team.team_name,
                class_id: team.class_id,
                class_name: `${class_data?.course_code} ${class_data?.section}`,
                members: team.members
            }
        }

        return res.status(200).json({   status: 'ok',
                                        teams: teams,       
                                        message: 'Teams retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
});
    
//*GET function to load all activity data
adminRouter.get('/api/admin/activities', middlewareAdmin, async (req, res) => {
    try {
        let activities = await activityModel.find({}).lean();

        activities = await Promise.all(activities.map(setActivityInfoAdmin));
        async function setActivityInfoAdmin(activity) {
            const class_data = await classModel.findOne({ class_id: activity.class_id })
                               .select('course_code section');

            return {
                activity_id: activity.activity_id,
                activity_name: activity.activity_name,
                class_id: activity.class_id,
                class_name: `${class_data?.course_code} ${class_data?.section}`,
                instructions: activity.instructions,
                open_time: activity.open_time,
                close_time: activity.close_time,
                createdAt: activity.createdAt,
            }
        }

        return res.status(200).json({   status: 'ok',
                                        activities: activities,
                                        message: 'Activities retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Retrieving activities failed.' });
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

        await teamModel.updateOne({ class_id: req.body.class_id }, {
            $pull: {
                members: req.body.uid
            }
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

        return res.status(200).json({  status: 'ok', message: 'Team created successfully.' });

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
            return res.status(404).json({ status: false, message: 'Team not found.' });
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
        const class_data = await classModel.findOne({ class_id: req.body.class_id });

        if (!class_data) {
            return res.status(404).json({ status: false, message: 'Class not found.' });
        }

        const students = await Promise.all(class_data.students.map(setMemberInfo));
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
            return res.status(404).json({ status: false, message: 'Team not found.' });
        } else if (team.members.includes(req.body.uid)) {
            return res.status(400).json({ status: false, message: 'Student has already joined this team.' });
        }

        const class_data = await classModel.findOne({ class_id: team.class_id })
                           .select('students');
        if (!class_data) {
            return res.status(404).json({ status: false, message: 'Class not found.' });
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

//*POST function to remove a member from a team
adminRouter.post('/api/admin/remove-member', middlewareAdmin, async (req, res) => {
    try {
        const team = await teamModel.findOne({ team_id: req.body.team_id });
        if (!team) {
            return res.status(404).json({ status: false, message: 'Team not found.' });
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

//*POST function to delete a course
adminRouter.post('/api/admin/delete-course', middlewareAdmin, async (req, res) => {
    try {
        await courseModel.deleteOne({ course_code: req.body.course_code });
        // await classModel.deleteMany({ course_code: req.body.course_code });


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
        // await classModel.deleteMany({ course_code: req.body.course_code });


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
        // await assignedRoomModel.deleteMany({ owner_id: req.body.team_id });

        return res.status(200).json({   status: 'ok',
                                        message: 'The team has been deleted.'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Deleting team failed.' });
    }
});



module.exports = adminRouter;