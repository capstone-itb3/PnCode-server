const mongoose = require('mongoose');

const assignedCourseSchema = new mongoose.Schema({
    course_code: {
        type: String,
        required: true    
    },
    sections: {
        type: [String]
    }
});

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

const professorSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
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
    position: {
        type: String,
        required: true
    },
    assigned_courses: {
        type: [assignedCourseSchema],
        required: true
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
}, { timestamps: true, collection: 'professors' });

const professorModel = mongoose.model('professors', professorSchema);

module.exports = professorModel;

