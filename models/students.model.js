const mongoose = require('mongoose');

const enrolledCourseSchema = new mongoose.Schema({
    course_code: {
        type: String
    },
    section: {
        type: String
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

const studentSchema = new mongoose.Schema({
    image: {
        type: String,
        required: false,
        default: null
    },
    uid: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
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
    section: {
        type: String,
        required: true, 
    },
    enrolled_courses: {
        type: [enrolledCourseSchema],
        required: false, 
    },
    notifications: {
        type: [notificationSchema],
        required: false,
        default: []
    },
    preferences: {
        type: Object,
        required: false,
        default: {}
    },
}, { timestamps: true, collection: 'students' });

const studentModel = mongoose.model('students', studentSchema);

module.exports = studentModel;