const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    feedback_body: {
        type: String,
        required: false,
        default: ''
    },
    professor_uid: {
        type: String,
        required: true
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
}, { timestamps: true });

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
    room_type: {
        type: String,
        required: true
    },
    files: {
        type: [Object],
        required: false,
        default: []
    },
    notes: {
        type: String,
        required: false,
        default: ''
    },
    group_id: {
        type: String,
        required: true
    },
    assigned: {
        type: [String],
        required: false,
        default: []
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
    },
}, { timestamps : true, collection : 'rooms' });

const assignedRoomModel = mongoose.model('assigned-rooms', assignedRoomSchema);

module.exports = assignedRoomModel;