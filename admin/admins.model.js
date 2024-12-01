const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    admin_uid: {
        type: String,
        required: true,
        unique: true
    },
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
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
    role: {
        type: String,
        required: true,
        enum: ['admin', 'superadmin'],
        default: 'admin'
    },
}, { timestamps: true, collection: 'admins' });

const adminModel = mongoose.model('admins', adminSchema);

module.exports = adminModel;