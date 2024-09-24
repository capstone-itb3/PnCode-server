const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const activityModel = require('../models/activities.model');
const teamModel = require('../models/teams.model');
const sectionModel = require('../models/sections.model');
const { setMemberInfo } = require('../utils/setInfo');
const { verifyStudent, verifyProfessor } = require('../utils/verifyAccess');
const middlewareAuth = require('../middleware');

const express = require('express');
const teamRouter = express.Router();
const { v4: uuid } = require('uuid');

teamRouter.get('/api/get-teams', middlewareAuth, async (req, res) => {
    try {
        const teams = await teamModel.find({ course: req.query.course, section: req.query.section });

        for (let i = 0; i < teams.length; i++) {
            teams[i].members = await Promise.all(teams[i].members.map(setMemberInfo));
        }
        
        return res.status(200).json({ status: 'ok', teams: teams });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Error. Retrieving teams failed.' });
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
                course: req.body.course,
                section: req.body.section
            });

            if (team) {
                return res.status(200).json({ status: false, message: 'You already are in a team.', reload: true});
            } else {
                members.push(req.user.uid);
            }
        }
        
        const new_id = uuid().toString();

        await teamModel.create({
            team_id: new_id,
            team_name: req.body.name,
            course: req.body.course,
            section: req.body.section,
            members: members
        });
        
        return res.json({ status: 'ok', team_id: new_id, message: 'Team created successfully.' });

    } catch (e) {
        res.status(500).json({ status: false, message: 'Error in creating team.' });
        console.log(e);
    }
});

teamRouter.post('/api/get-team-details', middlewareAuth, async (req, res) => {
    try {
        const team = await teamModel.findOne({ team_id: req.body.team_id });
        
        if (!team) {
            return res.status(404).json({ status: false, message: 'Team not found.' });

        }

        const section = await sectionModel.findOne({
            course_code: team.course,
            section: team.section
        }).select('professor students').lean();

        let access = false;

        if (req.user.position === 'Professor' && req.user.uid === section.professor) {
            access = 'write';

        } else if (req.user.position === 'Student') {
            if (verifyStudent(team.members, req.user.uid)) {
                access = 'write';
            } else if (!verifyStudent(team.members, req.user.uid) && verifyStudent(section.students, req.user.uid)) {
                access = 'read';
            }
        }

        team.members = await Promise.all(team.members.map(setMemberInfo));
        team.members.sort((a, b) => a.last_name.localeCompare(b.last_name));

        return res.status(200).json({ status: 'ok', team: team, access: access });
    } catch(e) {
        res.status(500).json({ status: false, message: 'Error in retrieving team details.' });
        console.log(e);
    }
});

teamRouter.post('/api/add-member', middlewareAuth, async (req, res) => {
    try {  
        const team = await teamModel.findOne({ 
            members: req.body.student_uid,  
            course: req.body.course,
            section: req.body.section
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
        res.status(500).json({ status: false, message: 'Error in adding a member.' });
        console.log(e);
    }
});

teamRouter.post('/api/remove-member', middlewareAuth, async (req, res) => {
    try {
        // const hasOngoingAct = await checkOngoingActivity(req.body.course, req.body.section, res)

        // if (hasOngoingAct) {
        //     return res.status(400).json({ status: false, message: 'You can\'t remove a member because there is an ongoing activity.' });
        // } else {
            await teamModel.updateOne({ team_id: req.body.team_id }, 
                { $pull: { members: req.body.student_uid }
            });

            return res.status(200).json({ status: 'ok', message: 'Student is removed from the  team.' });
        // }
    } catch(e) {
        res.status(500).json({ status: false, message: 'Error in removing a member.' });
        console.log(e)
    }
});

teamRouter.post('/api/delete-team', middlewareAuth, async (req, res) => {
    try {
        // const hasOngoingAct = await checkOngoingActivity(req.body.course, req.body.section, res);

        // if (hasOngoingAct) {
        //     return res.status(400).json({ status: false, message: 'You can\'t remove a team because there is an ongoing activity.' });

        // } else {
            await teamModel.deleteOne({ team_id: req.body.team_id });
            
            return res.status(200).json({ status: 'ok', message: 'Team deleted successfully.' });
        // }
    } catch (e) {
        res.status(500).json({ status: false, message: 'Error in deleting team.' });
        console.log(e);
    }
});

// async function checkOngoingActivity(course, section, res) {
//     try {
//         const activities = await activityModel.find({
//             course_code: course,
//             section: section,
//         });   
        
//         for (let act of activities) {
//             if (new Date(act.deadline) >= Date.now()) {
         
//                 return true;
//             }
//         }
//         return false;

//     } catch (e) {
//         res.status(500).json({ status: false, message: 'Internal Server Error.' });
//         console.log(e);
//     }
// }

module.exports = teamRouter;