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

const studentSchema = new mongoose.Schema({
    //the unique identifier of the student
    uid: {
        type: String,
        required: true,
        unique: true,
    },
    //the email address of the student
    email: {
        type: String,
        required: true,
        unique: true,
    },
    ///the password of the student
    password: {
        type: String,
        required: true
    },
    //the first name of the student
    first_name: {
        type: String,
        required: true,
    },
    //the last name of the student
    last_name: {
        type: String,
        required: true,
    },
    //the notifications received by the student
    notifications: {
        type: [notificationSchema],
        required: false,
        default: []
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationToken: {
        type: String,
        required: false
    },
}, { timestamps: true, collection: 'students' });

const studentModel = mongoose.model('students', studentSchema);

module.exports = studentModel;