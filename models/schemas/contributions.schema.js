const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema({
    line: {
        type: Number,
        required: true,
    },
    text: {
        type: String,
        required: true,
    }
});

const contributionSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
    },
    edit_count: {
        type: Number,
        required: true,
    },
    lines: {
        type: [lineSchema],
        required: false,
    }

}, { timestamps: true });

module.exports = contributionSchema;