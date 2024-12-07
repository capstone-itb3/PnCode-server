const mongoose = require('mongoose');
const notificationSchema = require('./schemas/notifications.schema');

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

    resetPasswordToken: {
        type: String,
        required: false
    },
    
    resetPasswordExpires: {
        type: Date,
        required: false
    }    
}, { timestamps: true, collection: 'students' });

const studentModel = mongoose.model('students', studentSchema);

module.exports = studentModel;