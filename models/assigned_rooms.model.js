const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    feedback_body: {
        type: String,
        required: true,
        default: ''
    },
    professor_uid: {
        type: String,
        required: true
    },
    reacts: {
        type: [String],
        required: false,
        default: []
    }
}, { timestamps: true });

const chatSchema = new mongoose.Schema({
    chat_body: {
        type: String,
        required: true
    },
    sender_uid: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true
    }
});

const assignedRoomSchema = new mongoose.Schema({
    room_id: {
        type: String,
        required: true,
        unique: true
    },
    room_name: {
        type: String,
        required: true
    },
    activity_id: {
        type: String,
        required: true
    },
    owner_id: {
        type: String,
        required: false,
    },  
    notes: {
        type: String,
        required: false,
        default: 'TO DO things for the activity...'
    },
    feedback: {
        type: [feedbackSchema],
        required: false,
        default: []
    },
    chat: {
        type: [chatSchema],
        required: false,
        default: []
    }
}, { timestamps : true, collection : 'assigned-rooms' });

const assignedRoomModel = mongoose.model('assigned-rooms', assignedRoomSchema);

module.exports = assignedRoomModel;