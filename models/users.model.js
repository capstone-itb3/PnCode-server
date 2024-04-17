const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true, 
        minlength: 8
    },
}, { timestamps: true, collection: 'users' });

const userModel = mongoose.model('users', userSchema);

module.exports = userModel;