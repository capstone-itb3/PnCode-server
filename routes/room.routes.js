const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const soloRoomModel = require('../models/solo_rooms.model');
const assignedRoomModel = require('../models/assigned_rooms.model');

const express = require('express');
const roomRouter = express.Router();
const { v4: uuid } = require('uuid');

//*POST function when user creates a solo room
roomRouter.post('/api/create-room-solo', async (req, res) => {
    try {
        let already_exists = true,
        new_id = 0,
        user = null,
        userModel = null;

        if (req.body.position === 'Student') {
            user = await studentModel.findOne({ 
                uid: req.body.uid,
                email: req.body.email
            });    
            userModel = studentModel;

        } else if (req.body.position === 'Professor') {
            user = await professorModel.findOne({ 
                uid: req.body.uid,
                email: req.body.email
            });
            userModel = professorModel;
        }

        while (already_exists) {
            new_id = uuid().toString();
           
            already_exists = await soloRoomModel.findOne({
                room_id: new_id
            });
        }

        if (user && userModel) {
            await soloRoomModel.create({
                room_id: new_id,
                room_name: 'New room',
                room_type: 'solo',
                owner_id: user.uid,
                files: [],
                notes: '',
            });
                        
            return res.json({ status: 'ok', room_id: new_id, message: 'Room Success' });
        } else {
            res.status(500).json({ status: false, message: 'Internal Server Error. Please log in again' });
        }
    } catch (e) {
        res.status(500).json({ status: false, message: e });
        console.log(e);
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
        
        return res.json({ status: 'ok', solo_rooms: solo_rooms});
    } catch (err) {
        res.status(500).json({ status: false, message: err });
        console.log(err);
    }
});

//*POST function when user renames current room
roomRouter.post('/api/rename-room', async (req, res) => {
    await roomModel.updateOne({ room_id: req.body.room_id }, {
        room_name: req.body.room_name,
    });
});

module.exports = roomRouter;