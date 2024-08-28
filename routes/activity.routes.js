const studentModel = require('../models/students.model');
const professorModel = require('../models/professors.model');
const teamModel = require('../models/teams.model');
const activityModel = require('../models/activities.model');
const assignedRoomModel = require('../models/assigned_rooms.model');
const tokenizer = require('./tokenizer');

const firebaseApp = require('../firebase');
const { getFirestore, doc, setDoc, collection, query, where, getDocs } = require('firebase/firestore');
const db = getFirestore(firebaseApp);

const express = require('express');
const activityRouter = express.Router();
const { v4: uuid } = require('uuid');

activityRouter.post('/api/get-activities', async (req, res) => {
    try { 
        const activities = await activityModel.find({ course_code: req.body.course, section: req.body.section });
        
        activities.sort((a, b) => b.createdAt - a.createdAt);

        res.status(200).json({ status: 'ok', activities: activities, message: 'Activities retrieved successfully.' });
    } catch(e) {
        console.log(e)
        res.status(500).json({ status: false, message: 'Error. Retrieving activities failed.' });
    }
});

activityRouter.post('/api/create-activity', async (req, res) => {
    try {
        let already_exists = true, 
            new_id = 0;

        while (already_exists) {
            new_id = uuid().toString();
           
            already_exists = await activityModel.findOne({
                activity_id: new_id
            });
        }
        
        await activityModel.create({
            activity_id: new_id,
            activity_name: req.body.activity_name,
            course_code: req.body.course,
            section: req.body.section,
            instructions: req.body.instructions,
            open_time: req.body.open_time,
            close_time: req.body.close_time,
            deadline: req.body.deadline
        });

        res.status(200).json({ status: 'ok', message: 'Activity created successfully.' });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: 'Error. Creating activity failed.' });
    }
});

activityRouter.post('/api/visit-activity', async (req, res) => {
    try {
        const team = await teamModel.findOne({
            members: req.body.uid,
            course: req.body.course,
            section: req.body.section
        });

        if (!team) {
            return res.status(500).json({ status: false, message: 'Please join or create a team first.' });
        } else {

            const assigned_room = await assignedRoomModel.findOne({
                activity_id: req.body.activity_id,
                owner_id: team.team_id
            });
    
            
            if (assigned_room) {
                res.status(200).json({ status: 'ok', room_id: assigned_room.room_id, message: 'Room found.' });

            } else {
                const new_room = await assignedRoomModel.create({
                    room_id: uuid().toString(),
                    room_name: `${team.team_name}'s Room`,
                    room_type: 'assigned',
                    activity_id: req.body.activity_id,
                    owner_id: team.team_id
                });
    
                res.status(200).json({ status: 'ok', room_id: new_room.room_id, message: 'New room created for the activity' });
            }    
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: 'Error. Creating activity failed.' });
    }
});

activityRouter.post('/api/get-activity-details', async (req, res) => {
    try {
        const activity = await activityModel.findOne({
            activity_id: req.body.activity_id
        });

        if (!activity) {
            return res.status(500).json({ status: false, message: 'Activity not found.' });
        } else {
            let access = false;

            for (let course of req.body.auth.assigned_courses) {
                if (course.course_code === activity.course_code && course.sections.includes(activity.section)) {
                    access = true;
                    break;
                }
            }

            const rooms = await assignedRoomModel.find({
                activity_id: req.body.activity_id
            }).lean();
            
            return res.status(200).json({ status: 'ok', activity: activity, access: access, rooms: rooms});            
        }

    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: 'Error. Retrieving activity details failed.' });
    }
});

activityRouter.post('/api/update-dates', async (req, res) => {
    try {
        await activityModel.updateOne({ activity_id: req.body.activity_id }, {
            open_time: req.body.open_time,
            close_time: req.body.close_time,
            deadline: req.body.deadline
        });

        return res.status(200).json({ status: 'ok', message: 'Activity is updated successfully.' });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: 'Error. Editing activity dates failed.' });
    }
});

activityRouter.post('/api/delete-activity', async (req, res) => {
    try {
        await activityModel.deleteOne({
            activity_id: req.body.activity_id
        });

        await assignedRoomModel.deleteMany({
            activity_id: req.body.activity_id
        });

        return res.status(200).json({ status: 'ok', message: 'Activity deleted successfully.' });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: 'Error. Deleting activity failed.' });
    }
});
    

module.exports = activityRouter;