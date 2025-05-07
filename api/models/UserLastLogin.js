'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var UserLastLogSchema = new mongoose.Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    type: { type: String, enum: ['Login', 'Logout'] }, //0-InActive, 1-Active, 2- Deactive
    status: { type: Number, default: 0 }, //0-InActive, 1-Active, 2- Deactive
    deleted: { type: Boolean, default: false },
}, {
    timestamps: true
});
var UserLastLog = mongoose.model('userLastLogin', UserLastLogSchema);
// make this available to our users in our Node applications
module.exports = UserLastLog;