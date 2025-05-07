'use strict';

var mongoose = require('mongoose');
var DeviceinfoSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, trim: true},
    device_token: {type: String}, // used to send notification
    uuid: {type: String}, 
    platform: {type: String}, // ios/android
    model: {type: String}, // model number
    status: {type: Boolean},
    last_updated: {type: Date, default: Date.now},
    is_deleted: {type: Boolean, default: false},
    last_login: {type: Date, default: Date.now}
}, {
    timestamps: true
});

var device_info = mongoose.model('device_info', DeviceinfoSchema);