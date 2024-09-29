const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const courseModel = require('../models/courses.model');
const sectionModel = require('../models/sections.model');
const teamModel = require('../models/teams.model');
const activityModel = require('../models/activities.model');
const soloRoomModel = require('../models/solo_rooms.model');
const assignedRoomModel = require('../models/assigned_rooms.model');
const fileModel = require('../models/files.model');
const adminModel = require('./admins.model');

const { setCourseInfoStudent, setCourseInfoProfessor, setMemberInfo } = require('../utils/setInfo');

const jwt = require('jsonwebtoken');
const middlewareAdmin = require('./adminMiddleware');
let customAlphabet;
import('nanoid').then(nanoid => {
    customAlphabet = nanoid.customAlphabet;
});

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
                                        message: e.message });
    }
});

adminRouter.post('/api/admin/professors', middlewareAdmin, async (req, res) => {
    try {
        const professors = await professorModel.find({})
        .select('uid first_name last_name email')
        .lean();

        return res.status(200).json({   status: 'ok',
                                        professors: professors,
                                        message: 'Students retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
});

adminRouter.get('/api/admin/courses', middlewareAdmin, async (req, res) => {
    try {
        const courses = await courseModel.find({})
        .lean();

        return res.status(200).json({   status: 'ok',
                                        courses: courses,
                                        message: 'Students retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
});

adminRouter.post('/api/admin/sections', middlewareAdmin, async (req, res) => {
    try {
        let sections = await sectionModel.find({})
        .select('course_code section professor_uid')
        .lean();

        sections = await Promise.all(sections.map(setCourseInfoStudent));

        return res.status(200).json({   status: 'ok',
                                        sections: sections,
                                        message: 'Students retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: e.message });
    }
});

adminRouter.post('/api/admin/teams', middlewareAdmin, async (req, res) => {
    try {
        let teams = await teamModel.find({})
        .select('team_id team_name course section')
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
    



module.exports = adminRouter;