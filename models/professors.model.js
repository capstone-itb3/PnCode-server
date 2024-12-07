const mongoose = require('mongoose');
const notificationSchema = require('./schemas/notifications.schema');

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

