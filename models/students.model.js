const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    is_read: {
        type: Boolean,
        required: true
    }
});

const studentSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },
    first_name: {
        type: String,
        required: true,
    },
    last_name: {
        type: String,
        required: true,
    },
    position: {
        type: String,
        required: true, 
    },
    notifications: {
        type: [notificationSchema],
        required: false,
        default: []
    },
    preferences: {
        type: Object,
        required: false,
        default: { theme: 'dark' }
    },
}, { timestamps: true, collection: 'students' });

const studentModel = mongoose.model('students', studentSchema);

module.exports = studentModel;