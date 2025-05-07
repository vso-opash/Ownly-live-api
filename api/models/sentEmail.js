'use strict';
var mongoose = require('mongoose');
var sentEmailSchema = new mongoose.Schema({
    dayNumber: Number,
    yearNumber: Number,
    to: {type: mongoose.Schema.Types.ObjectId, required: false, trim: true, ref:'User'},
    msg: String,
    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'properties',
        required: false
    }
});

var SentEmail = mongoose.model('SentEmail', sentEmailSchema);
// make this available to our users in our Node applications
module.exports = SentEmail;