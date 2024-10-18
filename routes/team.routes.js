const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const activityModel = require('../models/activities.model');
const teamModel = require('../models/teams.model');
const classModel = require('../models/classes.model');
const assignedRoomModel = require('../models/assigned_rooms.model');
const { setMemberInfo } = require('../utils/setInfo');
const middlewareAuth = require('../middleware');
const { verifyStudent, verifyProfessor } = require('../utils/verifyAccess');
const generateNanoId = require('../utils/generateNanoId');

const express = require('express');
const teamRouter = express.Router();
const { v4: uuid } = require('uuid');

teamRouter.get('/api/get-teams', middlewareAuth, async (req, res) => {
    try {
        const teams = await teamModel.find({ class_id: req.query.class_id });

        for (let i = 0; i < teams.length; i++) {
            teams[i].members = await Promise.all(teams[i].members.map(setMemberInfo));
        }
        
        return res.status(200).json({ status: 'ok', teams: teams });
    } catch (err) {
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Retrieving teams failed.' });
    }
});

teamRouter.post('/api/create-team', middlewareAuth, async (req, res) => {
    try {
        if (req.body.name.length > 30) {
            return res.status(400).json({ status: false, message: 'Team name must be less than 30 characters.' });
        
        } else if (req.body.name.length < 3) {
            return res.status(400).json({ status: false, message: 'Team name must be at least 3 characters.' });
        
        }
        
        const members = [];
        if (req.user.position === 'Student') {
            const team = await teamModel.findOne({ 
                members: req.user.uid,  
                class_id: req.body.class_id,
            });

            if (team) {
                return res.status(200).json({ status: false, message: 'You already are in a team.', reload: true});
            } else {
                members.push(req.user.uid);
            }
        }
        
        const new_id = generateNanoId();

        await teamModel.create({
            team_id: new_id,
            team_name: req.body.name,
            class_id: req.body.class_id,
            members: members
        });
        
        return res.json({ status: 'ok', team_id: new_id, message: 'Team created successfully.' });

    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Creating team failed.' });
}
});

teamRouter.post('/api/get-team-details', middlewareAuth, async (req, res) => {
    try {
        const team = await teamModel.findOne({ team_id: req.body.team_id });
        
        if (!team) {
            return res.status(404).json({ status: false, message: 'Team not found.' });

        }

        const class_data = await classModel.findOne({ class_id: team.class_id })
        .select('course_code section professor students')
        .lean();

        let access = false;

        if (req.user.position === 'Professor' && req.user.uid === class_data.professor) {
            access = 'write';

        } else if (req.user.position === 'Student') {
            if (verifyStudent(team.members, req.user.uid)) {
                access = 'write';
            } else if (!verifyStudent(team.members, req.user.uid) && verifyStudent(class_data.students, req.user.uid)) {
                access = 'read';
            }
        }

        team.members = await Promise.all(team.members.map(setMemberInfo));
        team.members.sort((a, b) => a.last_name.localeCompare(b.last_name));

        return res.status(200).json({   status: 'ok', 
                                        team: team, 
                                        course_code: class_data.course_code,
                                        section: class_data.section,
                                        access: access });
    } catch(e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Retrieving team details failed.' });
    }
});

teamRouter.post('/api/update-team-name', middlewareAuth, async (req, res) => {
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

        return res.status(200).json({ status: 'ok', message: 'Team name updated successfully.' });

    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Updating team name failed.' });
    }
});

teamRouter.post('/api/add-member', middlewareAuth, async (req, res) => {
    try {  
        const team = await teamModel.findOne({ 
            members: req.body.student_uid,  
            class_id: req.body.class_id,
        });
        if (team) {
            return res.status(400).json({ status: false, message: 'The student already belongs to another team.' });
        
        } else {
            await teamModel.updateOne({ team_id: req.body.team_id }, {
                $push: { members: req.body.student_uid }
            });

            return res.status(200).json({ status: 'ok', message: 'Student added to team.' });
        }
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Adding team member failed.' });
    }
});

teamRouter.post('/api/remove-member', middlewareAuth, async (req, res) => {
    try {
        await teamModel.updateOne({ team_id: req.body.team_id }, 
            { $pull: { members: req.body.student_uid }
        });

        return res.status(200).json({ status: 'ok', message: 'Student is removed from the  team.' });
    } catch(e) {
        console.log(e)
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Removing team member failed.' });
    }
});

teamRouter.post('/api/delete-team', middlewareAuth, async (req, res) => {
    try {
        await teamModel.deleteOne({ team_id: req.body.team_id });
        await assignedRoomModel.updateMany({ owner_id: req.body.team_id }, {
            $set: {
                room_name: `${req.body.team_name} (deleted-team)'s Room`,
                owner_id: ''
            }
        });
        
        return res.status(200).json({ status: 'ok', message: 'Team deleted successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Deleting team failed.' });
    }
});

module.exports = teamRouter;