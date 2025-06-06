const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    activity_id: {
        type: String,
        required: true,
        unique: true
    },
    activity_name: {
        type: String,
        required: true
    },
    class_id: {
        type: String,
        required: true
    },
    instructions: {
        type: String,
        required: false
    },
    open_time: {
        type: String,
        required: false,
        default: null
    },
    close_time: {
        type: String,
        required: false,
        default: null
    },
}, { timestamps: true, collection: 'activities' });

const activityModel = mongoose.model('activities', activitySchema);

module.exports = activityModel;