const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
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

    rooms: {
        type: [String],
        default: [],
        required: false
    },

    classes: {
        type: [String],
        default: [],
        required: false
    },

    teams: {
        type: [String],
        default: [],
        required: false
    },
    
}, { timestamps: true, collection: 'users' });

const userModel = mongoose.model('users', userSchema);

module.exports = userModel;