const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const soloRoomModel = require('../models/solo_rooms.model');
const assignedRoomModel = require('../models/assigned_rooms.model');
const teamModel = require('../models/teams.model');
const activityModel = require('../models/activities.model');
const fileModel = require('../models/files.model');
const { setTeamInfo } = require('./setInfo');

const express = require('express');
const roomRouter = express.Router();
const { v4: uuid } = require('uuid');

//*POST function to get assigned room details for students
//TODO 1:   Apply activity's access timeframes
//TODO 2.1: Apply activity's deadline 
//TODO 2.2: Add a function to check if the recorded members of the room instead of the team
roomRouter.post('/api/get-assigned-room-details/', async (req, res) => {
    try {
        let access = 'write';
        let assigned_room = await assignedRoomModel.findOne({ room_id: req.body.room_id }).lean();

        if (!assigned_room) {
            return res.status(400).json({ status: false, message: 'Room does not exist.'});
        }

        const activity = await activityModel.findOne({ activity_id: assigned_room.activity_id });


        const team = await teamModel.findOne({ team_id: assigned_room.owner_id }).lean();
        if (!team || !activity) {
            return res.status(400).json({ status: false, message: 'Room does not exist.'});
        }

        if (req.body.user.position === 'Student') {
            if (!team.members.includes(req.body.user.uid)) {
                return res.status(400).json({ status: false, message: 'Not a part of this room.'});
            }

        } else if (req.body.user.position === 'Professor') {
            const isAssigned = (c) => {
                return c.course_code === activity.course_code && c.sections.includes(activity.section);
            };

            if (!req.body.user.assigned_courses.find(isAssigned)) {
                return res.status(400).json({ status: false, message: 'Not a part of this room.'});
            }
        }

        function compareRecorded(current, recorded) {
            if (current.length !== recorded.length) {
                return false;
            }
            return current.slice().sort().every((member, index) => member === recorded.slice().sort()[index]);
        }

        if (!compareRecorded(team.members, assigned_room.recorded_members)) {
            assigned_room = assignedRoomModel.findOneAndUpdate({ room_id: req.body.room_id }, { 
                recorded_members: team.members 
            }, { new: true }).lean();
        };

        team.members = await Promise.all(team.members.map(setTeamInfo));
        team.members.sort((a, b) => a.last_name.localeCompare(b.last_name));

        const files = await fileModel.find({ room_id: req.body.room_id });

        return res.status(200).json({   status: 'ok', 
                                        room: assigned_room,
                                        files: files,
                                        activity: activity, 
                                        members: team.members,
                                        access: access,
                                        message: 'Assigned room details retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: e });
    }
});

roomRouter.post('/api/view-output', async (req, res) => {
    try {
        const room = await assignedRoomModel.findOne({ room_id: req.body.room_id });
        if (!room) {
            return res.status(400).json({ status: false, message: 'Room does not exist.'});
        }

        const files = await fileModel.find({ room_id: req.body.room_id });
        const file = files.find(f => f.name === req.body.file_name);

        if (!file) {
            return res.status(400).json({ status: false, message: 'File does not exist.'});
        }

        if (req.body.position === 'Student') {
            if (!room.recorded_members.includes(req.body.uid)) {
                return res.status(400).json({ status: false, message: 'Not a part of this room.'});
            }
            
        } if (req.body.position === 'Professor') {
            const activity = await activityModel.findOne({ activity_id: room.activity_id });
            const professor = await professorModel.findOne({ uid: req.body.uid,
                assigned_courses: { $elemMatch: {
                                        course_code: activity.course_code,
                                        sections: activity.section
                                    }
                }
            });
            if (!professor) {
                return res.status(400).json({ status: false, message: 'Not a part of this room.'});
            }
        }

        return res.status(200).json({   status: 'ok', 
                                        files: files, 
                                        active: file,
                                        message: 'Files retrieved successfully.' });

    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: e });
    }
});







//*POST function when user creates a solo room
roomRouter.post('/api/create-room-solo', async (req, res) => {
    try {
        let already_exists = true,
        new_id = 0;

        while (already_exists) {
            new_id = uuid().toString();
           
            already_exists = await soloRoomModel.findOne({
                room_id: new_id
            });
        }

        const created_solos = await soloRoomModel.find({ owner_id: req.body.uid });

        if (created_solos.length > 3) {
            return res.status(400).json({ status: false, message: 'You cannot create more than three (3) solo rooms.'})
        } else {
            await soloRoomModel.create({
                room_id: new_id,
                room_name: `Solo #${created_solos.length + 1}`,
                room_type: 'solo',
                owner_id: req.body.uid,
            });    
        }
                    
        return res.status(200).json({ status: 'ok', room_id: new_id, message: 'Room Success' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: e });
    }
});

//*POST function to get solo rooms for all users
roomRouter.post('/api/get-solo-rooms', async (req, res) => {
    try {
        const solo_rooms = await soloRoomModel.find({ owner_id: req.body.uid });
        const convertOffset = req.body.timezone_diff * 60 * 1000;

        for (let i = 0; i < solo_rooms.length; i++) {
            solo_rooms[i].updatedAt = new Date(solo_rooms[i].updatedAt.getTime() + convertOffset);
        }
        solo_rooms.sort((a, b) => b.updatedAt - a.updatedAt);
        
        return res.status(200).json({ status: 'ok', solo_rooms: solo_rooms});
    } catch (err) {
        console.log(err);
        return res.status(500).json({ status: false, message: err });
    }
});

roomRouter.get('/api/get-solo-room-details', async (req, res) => {
    try {
        const solo_room = await soloRoomModel.findOne({ room_id: req.query.room_id });
 
        if (solo_room) {
            return res.status(200).json({ status: 'ok', solo_room: solo_room, message: 'Room found' });
        } else {
            return res.status(400).json({ status: false, message: 'Room not found' });
        }
 
    } catch (err) {
        console.log(err);
        return res.status(500).json({ status: false, message: err });
    }   
});

roomRouter.post('/api/solo-update-code', async (req, res) => {
    try {
        await soloRoomModel.updateOne({ room_id: req.body.room_id }, {
            code: req.body.code
        });    
        console.log(code);

        return res.status(200).json({status: 'ok', message: 'Code Updated'});
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: 'Internal Server Error'})
    }
});

module.exports = roomRouter;