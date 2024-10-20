const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    notif_id: {
        type: String,
        required: true,
        default: parseInt(Date.now())
    },
    source: {
        type: String,
        required: false
    },
    for: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: true
    },
    subject_name: {
        type: String,
        required: false
    },
    subject_id: {
        type: Object,
        required: false
    },
}, { timestamps: true });

const professorSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true,
        unique: true
    },
    notifications: {
        type: [notificationSchema],
        required: false,
        default: []
    },
}, { timestamps: true, collection: 'professors' });

const professorModel = mongoose.model('professors', professorSchema);

module.exports = professorModel;

