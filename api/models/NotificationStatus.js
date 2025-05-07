'use strict';

var mongoose = require('mongoose');

var NotificationSchema = mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: Boolean,
        default: true
    },
    deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

var NotificationStatus = mongoose.model('NotificationStatus', NotificationSchema);