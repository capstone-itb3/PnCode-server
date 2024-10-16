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
const generateRoomName = require('../utils/generateRoomName');

const express = require('express');
const roomRouter = express.Router();
const { v4: uuid } = require('uuid');

//*POST function to get assigned room details
roomRouter.post('/api/get-assigned-room-details/', middlewareAuth, async (req, res) => {
    try {
        let access = 'write';

        let assigned_room = await assignedRoomModel.findOne({ room_id: req.body.room_id })
        .select('room_id room_name activity_id owner_id')
        .lean();
        
        if (!assigned_room) {
            return res.status(404).json({ status: false, message: 'The room was not found or is no longer available.'});
        }
        
        const activity = await activityModel.findOne({ activity_id: assigned_room.activity_id }).lean();
        if (!activity) {
            return res.status(404).json({ status: false, message: 'The room was not found or is no longer available.'});
        }

        let team = await teamModel.findOne({ team_id: assigned_room.owner_id })
                     .select('members');


        if (!team) {
            team = { members: null };
        }

        if (req.user.position === 'Student') {
            if (!team.members || !verifyStudent(team.members, req.user.uid)) {
                return res.status(403).json({ status: false, message: 'Not a part of this room.'});
            }

        } else if (req.user.position === 'Professor') {
            if (!verifyProfessor(activity.class_id, req.user.uid)) {
                return res.status(403).json({ status: false, message: 'Not a part of this room.'});
            }
        }
        if (team.members) {
            team.members = await Promise.all(team.members.map(setMemberInfo));
            team.members.sort((a, b) => a.last_name.localeCompare(b.last_name));
        }
        

        const files = await fileModel.find({ room_id: req.body.room_id }).lean();
        return res.status(200).json({   status: 'ok', 
                                        room: assigned_room,
                                        files: files,
                                        activity: activity, 
                                        members: team.members,
                                        access: access,
                                        message: 'Assigned room details retrieved successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: 'Server error. Retrieving assigned room details failed.' });
    }   
});

roomRouter.get('/api/get-solo-room-details', middlewareAuth, async (req, res) => {
    try {
        const room = await soloRoomModel.findOne({ room_id: req.query.room_id }).lean();

        if (room && room.owner_id === req.user.uid) {
            return res.status(200).json({ status: 'ok', room: room, message: 'Room found.' });

        } else {
            return res.status(404).json({ status: false, message: 'The room was not found or is no longer available.' });
        }
 
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: 'Server error. Retrieving solo room details failed.' });
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

        const created_solos = await soloRoomModel.find({ owner_id: req.user.uid })
                              .select('room_name');

        
        if (created_solos.length >= 3) {
            return res.status(400).json({ status: false, message: 'You can\'t create more than three (3) solo rooms.'})
        
        } else {
            await soloRoomModel.create({
                room_id: new_id,
                room_name: generateRoomName(created_solos, req.user.first_name),
                owner_id: req.user.uid,
            });    
        }
                            
        return res.status(200).json({ status: 'ok', room_id: new_id, message: 'Room Success' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: 'Server error. Unable to create room.' });
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
        return res.status(500).json({ status: false, message: 'Server error. Unable to retrieve solo rooms.' });
    }   
});

roomRouter.post('/api/update-room-solo', middlewareAuth, async (req, res) => {
    try {
        const room = await soloRoomModel.findOne({ room_id: req.body.room_id });
        if (!room) {
            return res.status(404).json({ status: false, message: 'The room was not found or is no longer available.' });
        }

        if (room.owner_id !== req.user.uid) {
            return res.status(403).json({ status: false, message: 'You are not the owner of this room.' });
        }

        await soloRoomModel.updateOne({ room_id: req.body.room_id }, {
            $set: {
                room_name: req.body.room_name,
            }
        });

        return res.status(200).json({ status: 'ok', message: 'Room updated successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: 'Server error. Unable to update room.' });
    }
});

roomRouter.post('/api/delete-room-solo', middlewareAuth, async (req, res) => {
    try {
        await soloRoomModel.deleteOne({ room_id: req.body.room_id });

        return res.status(200).json({ status: 'ok', message: 'Room deleted successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: 'Server error. Unable to delete room.' });
    }
});

roomRouter.get('/api/view-output', middlewareAuth, async (req, res) => {
    try {
        let room = await assignedRoomModel.findOne({ room_id: req.query.room_id })
                   .select('owner_id activity_id');

        //*is assigned room
        if (room) {
            const files = await fileModel.find({ room_id: req.query.room_id })
                          .select('file_id name type content')
                          .lean();
            
            if (files.length === 0) {
                return res.status(404).json({ status: false, message: 'No files found.'});
            }

            const file = files.find(f => f.name === req.query.file_name);
            
            if (!file) {
                return res.status(404).json({ status: false, message: 'File not found.'});
            }

            
            if (req.user.position === 'Student') {
                const team = await teamModel.findOne({ team_id: room.owner_id })
                             .select('members');
                if (!team) {
                    return res.status(404).json({ status: false, message: 'Team not found.'});
                }

                if (!verifyStudent(team.members, req.user.uid)) {
                    return res.status(403).json({ status: false, message: 'Not a part of this room.'});
                }                
            } if (req.user.position === 'Professor') {
                const activity = await activityModel.findOne({ activity_id: room.activity_id })
                                 .select('class_id');
                if (!activity) {
                    return res.status(404).json({ status: false, message: 'Activity not found.'});
                }

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
        room = await soloRoomModel.findOne({ room_id: req.query.room_id })
                     .select('files owner_id');
        if (room) {
            files = room.files;
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
            return res.status(404).json({ status: false, message: 'The room was not found or is no longer available.'});
        }

    } catch (e) {
        console.log(e);
        return res.status(500).json({ status: false, message: 'Server error. Unable to view output.' });
    }   
});

module.exports = roomRouter;