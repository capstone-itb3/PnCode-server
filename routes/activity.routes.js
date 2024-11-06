const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const classModel = require('../models/classes.model');
const teamModel = require('../models/teams.model');
const activityModel = require('../models/activities.model');
const assignedRoomModel = require('../models/assigned_rooms.model');
const fileModel = require('../models/files.model');
const middlewareAuth = require('../middleware');
const { verifyStudent, verifyProfessor } = require('../utils/verifyAccess');
const generateNanoId = require('../utils/generateNanoId');
const { notifyStudents, notifyProfessor } = require('../utils/notifySelector');

const express = require('express');
const activityRouter = express.Router();
const { v4: uuid } = require('uuid');

activityRouter.get('/api/get-activities', middlewareAuth, async (req, res) => {
    try { 
        const activities = await activityModel.find({ class_id: req.query.class_id });
        
        activities.sort((a, b) => b?.createdAt - a?.createdAt);

        res.status(200).json({ status: 'ok', activities: activities, message: 'Activities retrieved successfully.' });

    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Retrieving activities failed.' });
    }   
});

activityRouter.post('/api/create-activity', middlewareAuth, async (req, res) => {
    try {
        if (req.body.activity_name.length > 100) {
            return res.status(400).json({ status: false, message: 'Activity name must be less than 100 characters.' });
        }
        
        if (req.body.open_time === '') {
            return res.status(400).json({ status: false, message: 'Please complete the input for open time.' });
        } else if (req.body.close_time === '') {
            return res.status(400).json({ status: false, message: 'Please complete the input for close time.' });
        }

        const timeToMinutes = (timeString) => {
            const [hours, minutes] = timeString.split(':').map(Number);
            return hours * 60 + minutes;
        };
    
        const openMinutes = timeToMinutes(req.body.open_time);
        const closeMinutes = timeToMinutes(req.body.close_time);
    
        if (closeMinutes <= openMinutes) {
            return res.status(400).json({ status: false, message: 'Close time must be no earlier than open time.' });
        }

        const class_data = await classModel.findOne({ class_id: req.body.class_id })
                           .select('course_code students')
                           .lean();

        if (!class_data) {
            return res.status(404).json({ status: false, message: 'Class not found.' });
        }

        let new_id = 0, already_exists = true;

        while (already_exists) {
            new_id = generateNanoId();
            
            already_exists = await activityModel.findOne({
                activity_id: new_id
            });
        }
    
        await activityModel.create({
            activity_id: new_id,
            activity_name: req.body.activity_name,
            class_id: req.body.class_id,
            instructions: req.body.instructions,
            open_time: req.body.open_time,
            close_time: req.body.close_time,
        });

        const notification = {
            source: `${req.user.first_name} ${req.user.last_name}`,
            for: `${class_data.course_code}`,
            type: 'activity',
            subject_name: req.body.activity_name,
            subject_id: new_id,
        }

        
        notifyStudents(class_data.students, notification);

        res.status(200).json({ status: 'ok', activity_id: new_id, message: 'Activity created successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Creating activity failed.' });
    }   
});


activityRouter.get('/api/visit-activity', middlewareAuth, async (req, res) => {
    try {
        const activity = await activityModel.findOne({ activity_id: req.query.activity_id })
                         .select('class_id');
        if (!activity) {
            return res.status(404).json({ status: false, message: 'Activity was not found is no longer available.' });
        }

        const team = await teamModel.findOne({
            members: req.user.uid,
            class_id: activity.class_id,
        }).select('team_id team_name');

        if (!team) {
            return res.status(400).json({ status: false, message: 'Please join or create a team first.' });
        } 

        const assigned_room = await assignedRoomModel.findOne({
            activity_id: req.query.activity_id,
            owner_id: team.team_id
        })
        .select('room_id')
        .lean();

        if (assigned_room) {
            return res.status(200).json({ status: 'ok', room_id: assigned_room.room_id, message: 'Room found.' });

        } else {
            const new_room = generateNanoId();

            console.log(new_room);

            await assignedRoomModel.create({
                room_id: new_room,
                room_name: `${team.team_name}'s Room`,
                activity_id: req.query.activity_id,
                owner_id: team.team_id,
            });

            console.log(new_room);

            
            await fileModel.create({
                file_id: generateNanoId(),
                name: `index.html`,
                type: 'html',
                room_id: new_room,
                content:    '<!DOCTYPE html>'
                        + '\n<html lang="en">'
                        + '\n<head>'
                        + '\n<meta charset="UTF-8" />'
                        + '\n<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
                        + '\n<title></title>'
                        + '\n</head>'
                        + '\n<body>'
                        + '\n</body>'
                        + '\n</html>',
                history: []
            });
    
            return res.status(200).json({ status: 'ok', room_id: new_room, message: 'New room created for the activity' });                
        }
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Visiting activity failed.' });
    }   
});

activityRouter.get('/api/get-activity-details', middlewareAuth, async (req, res) => {
    try {
        if (req.user.position !== 'Professor') {
            return res.status(403).json({ status: false, message: 'You do not have access to this resource.' });
        }
        
        const activity = await activityModel.findOne({
            activity_id: req.query.activity_id
        });

        if (!activity) {
            return res.status(404).json({ status: false, message: 'Activity not found.' });
        }

        if (!await verifyProfessor(activity.class_id, req.user.uid)) {
            return res.status(403).json({ status: false, message: 'You do not have access to this resource.' });
        }

        const class_data = await classModel.findOne({ class_id: activity.class_id })
        .select('course_code section')
        .lean();

        const rooms = await assignedRoomModel.find({ activity_id: req.query.activity_id })
        .lean();

        return res.status(200).json({   status: 'ok', 
                                        activity: activity, 
                                        rooms: rooms,
                                        course_code: class_data.course_code,
                                        section: class_data.section });
        
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Retrieving activity details failed.' });
    }   
});

activityRouter.post('/api/update-instructions', middlewareAuth, async (req, res) => {
    try {
        await activityModel.updateOne({ activity_id: req.body.activity_id }, {
            instructions: req.body.instructions
        });

        const rooms = await assignedRoomModel.find({ activity_id: req.body.activity_id })
        .select('room_id')
        .lean();
        
        for (const room of rooms) {
            req.io?.in(room.room_id)?.emit('instructions_updated', {
                new_instructions: req.body.instructions
            });
        }
    
        return res.status(200).json({ status: 'ok', message: 'Instructions updated!'})
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Updating instructions failed.' });
    }
});

activityRouter.post('/api/update-dates', middlewareAuth, async (req, res) => {
    try {
        if (req.body.open_time === '') {
            return res.status(400).json({ status: false, message: 'Please complete the input for open time.' });
        } else if (req.body.close_time === '') {
            return res.status(400).json({ status: false, message: 'Please complete the input for close time.' });
        }

        const timeToMinutes = (timeString) => {
            const [hours, minutes] = timeString.split(':').map(Number);
            return hours * 60 + minutes;
        };
    
        const openMinutes = timeToMinutes(req.body.open_time);
        const closeMinutes = timeToMinutes(req.body.close_time);
    
        if (closeMinutes <= openMinutes) {
            return res.status(400).json({ status: false, message: 'Close time must be no earlier than open time.' });
        }
    
        await activityModel.updateOne({ activity_id: req.body.activity_id }, {
            open_time: req.body.open_time,
            close_time: req.body.close_time,
        });
        const rooms = await assignedRoomModel.find({ activity_id: req.body.activity_id })
        .select('room_id')
        .lean();
        
        for (const room of rooms) {
            req.io?.in(room.room_id)?.emit('dates_updated', {
                new_open_time: req.body.open_time,
                new_close_time: req.body.close_time,
            });
        }
    
        return res.status(200).json({ status: 'ok', message: 'Activity is updated successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Updating access timeframes failed.' });
    }   
});

activityRouter.post('/api/delete-activity', middlewareAuth, async (req, res) => {
    try {
        await activityModel.deleteOne({ activity_id: req.body.activity_id });
        const assigned_rooms = await assignedRoomModel.find({ activity_id: req.body.activity_id })
                               .select('room_id')
                               .lean();

        await assignedRoomModel.deleteMany({ room_id: { $in: assigned_rooms.map(r => r.room_id) } });
        await fileModel.deleteMany({ room_id: { $in: assigned_rooms.map(r => r.room_id) } });
        
        return res.status(200).json({ status: 'ok', message: 'Activity deleted successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(500).json({   status: false, 
                                        message: 'Server error. Deleting activity failed.' });
    }   
});

module.exports = activityRouter;