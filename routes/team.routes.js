const studentModel = require('../models/students.model');
const teamModel = require('../models/teams.model');
const classModel = require('../models/classes.model');
const activityModel = require('../models/activities.model');
const assignedRoomModel = require('../models/assigned_rooms.model');
const { setMemberInfo } = require('../utils/setInfo');
const middlewareAuth = require('../middleware');
const { verifyStudent } = require('../utils/verifyAccess');
const generateNanoId = require('../utils/generateNanoId');
const { notifyStudents, notifyProfessor } = require('../utils/notifySelector');

const express = require('express');
const teamRouter = express.Router();
const { v4: uuid } = require('uuid');

//*GET method to get teams within a class
teamRouter.get('/api/get-teams', middlewareAuth, async (req, res) => {
    try {
        const teams = await teamModel.find({ class_id: req.query.class_id });

        for (let i = 0; i < teams.length; i++) {
            teams[i].members = await setMemberInfo(teams[i].members);
        }
        
        return res.status(200).json({ status: 'ok', teams: teams });
    } catch (err) {
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Retrieving teams failed.' });
    }
});

//*POST method to create a team
teamRouter.post('/api/create-team', middlewareAuth, async (req, res) => {
    try {
        if (req.body.name.length > 30) {
            return res.status(400).json({ status: false, message: 'Team name must not be more than 30 characters long.' });
        
        } else if (req.body.name.length < 3) {
            return res.status(400).json({ status: false, message: 'Team name must be at least 3 characters long.' });
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

//*POST method to get team details in team page
teamRouter.post('/api/get-team-details', middlewareAuth, async (req, res) => {
    try {
        let access = null, assigned_rooms = [];

        const team = await teamModel.findOne({ team_id: req.body.team_id });
        if (!team) {
            return res.status(404).json({ status: false, message: 'Team not found.' });
        }

        const class_data = await classModel.findOne({ class_id: team.class_id })
        .select('course_code section professor students')
        .lean();

        if (req.user.position === 'Professor' && req.user.uid === class_data.professor) {
            access = 'write';

            assigned_rooms = await assignedRoomModel.find({ owner_id: req.body.team_id })
                    .select('room_id owner_id activity_id')
                    .lean();

            const activities = await activityModel.find({ activity_id: { $in: assigned_rooms.map(room => room.activity_id) } })
                               .select('activity_id activity_name');

            assigned_rooms = assigned_rooms.map(room => {
                const activity = activities.find(act => act.activity_id === room.activity_id);
                return {
                    ...room,
                    activity_name: activity?.activity_name || '[Activity Deleted]',
                };
            });

        } else if (req.user.position === 'Student') {
            if (verifyStudent(team.members, req.user.uid)) {
                access = 'write';
            } else if (verifyStudent(class_data.students, req.user.uid)) {
                access = 'read';
            }
        }

        if (!access) {
            return res.status(403).json({ status: false, message: 'You do not have access to this team.' });
        }

        team.members = await setMemberInfo(team.members);
        team.members.sort((a, b) => a.last_name.localeCompare(b.last_name));

        return res.status(200).json({   status: 'ok', 
                                        team: team, 
                                        course_code: class_data.course_code,
                                        section: class_data.section,
                                        assigned_rooms: assigned_rooms,
                                        access: access });
    } catch(e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Retrieving team details failed.' });
    }
});

//*POST method to update team name
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

//*POST method to check student availability in joining a team
teamRouter.get('/api/check-student-availability', middlewareAuth, async (req, res) => {
    try {
        const result = await checkStudentAvailability(req.query.team_id, req.query.uid, 'This student is');

        if (result) {
            console.log('here');
            return res.status(result.code).json({ status: result.status, message: result.message });
        } else {
            console.log('not here');
            return res.status(500).json({   status: false,
                                            message: 'Server error. Checking student availability failed.' });                
        }
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Checking student availability failed.' });
    }
});

//*POST method to send team invite to student
teamRouter.post('/api/invite-student', middlewareAuth, async (req, res) => {
    try {  
        const student = await studentModel.findOne({ uid: req.body.uid })
                        .select('notifications').lean();
        if (!student) {
            return res.status(404).json({ status: false, message: 'Student was not found or is no longer available.' });
        }

        const already_invited = student.notifications.find(notification => {
            return notification.type === 'invite' && notification.subject_id === req.body.team_id;
        });

        if (already_invited) {
            return res.status(400).json({ status: false, message: 'The student has already been invited to this team.' });
        }

        const team = await teamModel.findOne({ team_id: req.body.team_id })
                     .select('team_name members').lean();
        if (!team) {
            return res.status(404).json({ status: false, message: 'This team was not found or is no longer available.' });
        } else if (team.members.length >= 10) {
            return res.status(400).json({ status: false, message: 'This team is already full.' });
        }

        const notification = {
            notif_id: uuid(),
            source: `${req.user.first_name} ${req.user.last_name}`,
            for: null,
            type: 'invite',
            subject_name: team.team_name,
            subject_id: req.body.team_id,
        }

        await studentModel.updateOne({ uid: req.body.uid }, {
            $push: { notifications: { $each: [notification], $position: 0 } }
        });

        return res.status(200).json({ status: 'ok', message: 'Team invite has been sent to the student.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Adding team member failed.' });
    }
});

//*POST method to accept team invite
teamRouter.post('/api/accept-team-invite', middlewareAuth, async (req, res) => {
    try {
        const student = await studentModel.findOne({ uid: req.user.uid })
                        .select('notifications').lean();
        if (!student) {
            return res.status(404).json({ status: false, message: 'Student was not found or is no longer available.' });
        }

        const result = await checkStudentAvailability(req.body.team_id, req.user.uid, 'You are');

        if (!result) {
            return res.status(500).json({   status: false,
                                            message: 'Server error. Checking availability failed.' });
        } else if (result.status === false) {
            return res.status(result.code).json({ status: result.status, message: result.message });
        }

        await teamModel.updateOne({ team_id: req.body.team_id }, {
            $push: { members: req.user.uid }
        });


        const notification = {
            notif_id: uuid(),
            source: `${req.user.first_name} ${req.user.last_name}`,
            for: 'has joined',
            type: 'team',
            subject_name: result.team.team_name,
            subject_id: req.body.team_id,
        }

        notifyStudents(result.team.members, notification);

        
        return res.status(200).json({   status: 'ok', 
                                        message: 'Student is added to the team.' });

    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false,
                                        message: 'Server error. Adding team member failed.' });
    }        
});

//*POST method to remove student from team
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

//*POST method to delete team
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


//check if student is available to join a team
async function checkStudentAvailability(team_id, uid, checker) {
    const team = await teamModel.findOne({ team_id })
                 .select('team_name class_id members')
                 .lean();
    if (!team) {
        return { status: false, code: 404, message: 'This team was not found or is no longer available.' };
    } else if (team.members.length >= 10) {
        return { status: false, code: 400, message: 'This team is already full.' };
    }

    const class_data = await classModel.findOne({ class_id: team.class_id })
                       .select('students')
                       .lean();

    if (!class_data.students.includes(uid)) {
        return { status: false, code: 400, message: `${checker} not enrolled anymore in this class.` };
    }

    const another_team = await teamModel.findOne({
        members: uid,
        class_id: team.class_id
    }).select('team_id').lean();

    if (another_team && another_team.team_id !== team_id) {
        return { status: false, code: 400, message: `${checker} already a member of another team.` };
    } else if (another_team && another_team.team_id === team_id) {
        return { status: false, code: 400, message: `${checker} already in this team.` };
    }

    return { status: 'ok', code: 200, team, message: `${checker} available.` };
}

module.exports = teamRouter;