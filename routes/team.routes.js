const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const teamModel = require('../models/teams.model');
const tokenizer = require('./tokenizer');

const express = require('express');
const teamRouter = express.Router();
const { v4: uuid } = require('uuid');

teamRouter.get('/api/get-teams', async (req, res) => {
    try {
        const teams = await teamModel.find({ course: req.query.course, section: req.query.section });

        for (let i = 0; i < teams.length; i++) {
            teams[i].members = await Promise.all(teams[i].members.map(setInfo));
        }

        async function setInfo(member) {
            const user = await studentModel.findOne({ uid: member });
            
            return {
                image: user.image,
                uid: user.uid,
                first_name: user.first_name,
                last_name: user.last_name
            };
        }
        
        res.status(200).json({ status: 'ok', teams: teams });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Error. Retrieving teams failed.' });
    }
});

teamRouter.post('/api/get-included-students', async (req, res) => {
    try {
        const student_array = await studentModel.find({uid: {$ne: req.body.uid}});
        const filtered_array = [];

        student_array.forEach((student) => {    
            student.enrolled_courses.forEach((course) => {

                if (course.course_code === req.body.course && course.section === req.body.section) {
                    filtered_array.push({ 
                        uid: student.uid,
                        first_name: student.first_name,
                        last_name: student.last_name
                    });
                }
            });
        });

        return res.json({ status: 'ok', students: filtered_array, message: 'Reloaded students within the course.' });
    } catch (e) {
        res.status(500).json({ status: false, message: e });
        console.log(e);
    }
});

teamRouter.post('/api/create-team', async (req, res) => {
    try {
        const members_id = req.body.members.map(member => member.uid);

        let new_id = 0;
        let already_exists = true;

        while (already_exists) {
            new_id = uuid().toString();
            already_exists = await teamModel.findOne({
                team_id: new_id
            });
        }

        await teamModel.create({
            team_id: new_id,
            team_name: req.body.name,
            course: req.body.course,
            section: req.body.section,
            members: members_id,
        });
        
        return res.json({ status: 'ok', message: 'Team created successfully.' });

    } catch (e) {
        res.status(500).json({ status: false, message: 'Error in creating team.' });
        console.log(e);
    }
});

module.exports = teamRouter;