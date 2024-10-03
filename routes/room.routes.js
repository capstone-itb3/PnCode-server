const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const soloRoomModel = require('../models/solo_rooms.model');
const assignedRoomModel = require('../models/assigned_rooms.model');
const teamModel = require('../models/teams.model');
const activityModel = require('../models/activities.model');
const fileModel = require('../models/files.model');
const classModel = require('../models/classes.model');
const { setMemberInfo } = require('../utils/setInfo');
const middlewareAuth = require('../middleware');
const { verifyStudent, verifyProfessor } = require('../utils/verifyAccess');
const generateNanoId = require('../utils/generateNanoId');

const express = require('express');
const roomRouter = express.Router();
const { v4: uuid } = require('uuid');

//*POST function to get assigned room details for students
//TODO 1:   Apply activity's access timeframes
roomRouter.post('/api/get-assigned-room-details/', middlewareAuth, async (req, res) => {
    try {
        let access = 'write';

        let assigned_room = await assignedRoomModel.findOne({ room_id: req.body.room_id })
        .select('room_id room_name activity_id owner_id recorded_members')
        .lean();
        
        if (!assigned_room) {
            return res.status(404).json({ status: false, message: 'Room not found.'});
        }

        const activity = await activityModel.findOne({ activity_id: assigned_room.activity_id }).lean();


        const team = await teamModel.findOne({ team_id: assigned_room.owner_id }).lean();
        if (!team || !activity) {
            return res.status(404).json({ status: false, message: 'Room not found.'});
        }

        if (req.user.position === 'Student') {
            if (!verifyStudent(team.members, req.user.uid)) {
                return res.status(403).json({ status: false, message: 'Not a part of this room.'});
            }

        } else if (req.user.position === 'Professor') {
            if (!verifyProfessor(activity.class_id, req.user.uid)) {
                return res.status(403).json({ status: false, message: 'Not a part of this room.'});
            }
        }

        function compareRecorded(current, recorded) {
            if (current.length !== recorded.length) {
                return false;
            }
            return current.slice().sort().every((member, index) => member === recorded.slice().sort()[index]);
        }

        if (!compareRecorded(team.members, assigned_room.recorded_members)) {
            console.log(3);

            assigned_room = await assignedRoomModel.findOneAndUpdate({ room_id: req.body.room_id }, { 
                $set: { recorded_members: team.members }
            }, { new: true })
            .select('room_id room_name activity_id owner_id recorded_members')
            .lean();

            console.log('assigned_room', assigned_room)
        };

        team.members = await Promise.all(team.members.map(setMemberInfo));
        team.members.sort((a, b) => a.last_name.localeCompare(b.last_name));
        
        console.log(4)

        const files = await fileModel.find({ room_id: req.body.room_id }).lean();
        console.log(5)
        return res.status(200).json({   status: 'ok', 
                                        room: assigned_room,
                                        files: files,
                                        activity: activity, 
                                        members: team.members,
                                        access: access,
                                        message: 'Assigned room details retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: '500 Internal Server Error.' });
    }   
});

roomRouter.get('/api/get-solo-room-details', middlewareAuth, async (req, res) => {
    try {
        const room = await soloRoomModel.findOne({ room_id: req.query.room_id }).lean();

        if (room && room.owner_id === req.user.uid) {
            return res.status(200).json({ status: 'ok', room: room, message: 'Room found.' });

        } else {
            return res.status(404).json({ status: false, message: 'Room not found.' });
        }
 
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: '500 Internal Server Error.' });
    }   
});

roomRouter.get('/api/view-output', middlewareAuth, async (req, res) => {
    try {
        let room = await assignedRoomModel.findOne({ room_id: req.query.room_id });

        //*is assigned room
        if (room) {
            const files = await fileModel.find({ room_id: req.query.room_id });
            const file = files.find(f => f.name === req.query.file_name);
    
            if (!file) {
                return res.status(404).json({ status: false, message: 'File not found.'});
            }
    
            if (req.user.position === 'Student') {
                if (!verifyStudent(room.recorded_members, req.user.uid)) {
                    return res.status(403).json({ status: false, message: 'Not a part of this room.'});
                }
                
            } if (req.user.position === 'Professor') {
                const activity = await activityModel.findOne({ activity_id: room.activity_id });
                
                if (!verifyProfessor(activity.class_id, req.user.uid)) {
                    return res.status(403).json({ status: false, message: 'Not a part of this room.'});
                }
            }

            return res.status(200).json({   status: 'ok', 
                                            files: files, 
                                            active: file,
                                            message: 'Files retrieved successfully.' });
        }


        //*is solo room
        room = await soloRoomModel.findOne({ room_id: req.query.room_id });
        if (room) {
            files = room.files
            file = files.find(f => f.name === req.query.file_name);

            if (!file) {
                return res.status(404).json({ status: false, message: 'File not found.'});
            }

            if (room.owner_id === req.user.uid) {
                return res.status(200).json({   status: 'ok',
                                                files: files,
                                                active: file,
                                                message: 'Files retrieved successfully.' });
            } else {
                return res.status(403).json({ status: false, message: 'Not a part of this room.'});
            }
        } 

        //*no room exists
        if (!room) {
            return res.status(404).json({ status: false, message: 'Room not found.'});
        }

    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: '500 Internal Server Error.' });
    }   
});

//*POST function when user creates a solo room
roomRouter.post('/api/create-room-solo', middlewareAuth, async (req, res) => {
    try {
        let already_exists = true,
        new_id = 0;

        while (already_exists) {
            new_id = generateNanoId();
           
            already_exists = await soloRoomModel.findOne({
                room_id: new_id
            });
        }

        const created_solos = await soloRoomModel.find({ owner_id: req.user.uid });

        const generateRoomName = () => {
            const baseRoomName = `${req.user.first_name}'s Room ${new Date().toISOString().slice(5, 10)}`;
            let suffix = '', counter = 1;
        
            while (created_solos.some(room => room.room_name === `${baseRoomName}${suffix}`)) {
                suffix = `-${counter}`;
                counter++;
            } 
            return `${baseRoomName}${suffix}`;
        };
        
        if (created_solos.length >= 3) {
            return res.status(400).json({ status: false, message: 'You can\'t create more than three (3) solo rooms.'})
        
        } else {
            await soloRoomModel.create({
                room_id: new_id,
                room_name: generateRoomName(),
                owner_id: req.user.uid,
            });    
        }
                            
        return res.status(200).json({ status: 'ok', room_id: new_id, message: 'Room Success' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: '500 Internal Server Error.' });
    }   
});

//*POST function to get solo rooms for all users
roomRouter.get('/api/get-solo-rooms', middlewareAuth, async (req, res) => {
    try {
        const solo_rooms = await soloRoomModel.find({ owner_id: req.user.uid });
        const convertOffset = req.body.timezone_diff * 60 * 1000;

        for (let i = 0; i < solo_rooms.length; i++) {
            solo_rooms[i].updatedAt = new Date(solo_rooms[i].updatedAt.getTime() + convertOffset);
        }
        solo_rooms.sort((a, b) => b.updatedAt - a.updatedAt);
        
        return res.status(200).json({ status: 'ok', solo_rooms: solo_rooms});
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: '500 Internal Server Error.' });
    }   
});

roomRouter.post('/api/delete-room-solo', middlewareAuth, async (req, res) => {
    try {
        await soloRoomModel.deleteOne({ room_id: req.body.room_id });

        return res.status(200).json({ status: 'ok', message: 'Room deleted successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: '500 Internal Server Error.' });
    }
});


module.exports = roomRouter;