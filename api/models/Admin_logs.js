'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var AdminLogSchema = new mongoose.Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['Login', 'Logout'] }, //0-InActive, 1-Active, 2- Deactive
    ip: { type: String },
    token: { type: String },
    status: { type: Number, default: 0 }, //0-InActive, 1-Active, 2- Deactive
    deleted: { type: Boolean, default: false },
}, {
    timestamps: true
});

var AdminLogSchema = mongoose.model('adminLog', AdminLogSchema);
// make this available to our users in our Node applications
module.exports = AdminLogSchema;