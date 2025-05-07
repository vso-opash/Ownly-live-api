'use strict';

var mongoose = require('mongoose');
var toUserSubschema = new mongoose.Schema({
    users_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    is_read: {type: Boolean, default: false},
    status: {type: Boolean, default: true}
});
var NotificationSchema = mongoose.Schema({
    message: {type: String,required: true},
    subject:{type: String},
    from_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, trim: true},
    maintenence_id: { type: mongoose.Schema.Types.ObjectId, ref: 'maintenances'},
    agreement_id: { type: mongoose.Schema.Types.ObjectId, ref: 'agreements'},
    dispute_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Disputes'},
    document_id: { type: mongoose.Schema.Types.ObjectId, ref: 'documents'},
    noticeboard_id: { type: mongoose.Schema.Types.ObjectId, ref: 'noticeboard'},
    application_id: { type: mongoose.Schema.Types.ObjectId, ref: 'applications'},
    to_users: [toUserSubschema],
    module:{type: Number,default:1}, //Store the module name  // 1  Request to associate agency 2 maintenence 3 for agreements 4 for noticeboard  //5 agent removal request //6 for dispute//7 For document //8 For application
    //category_type: {type: mongoose.Schema.Types.ObjectId, ref: 'services_cats', required: true, trim: true},
    type:{type: Number,default:1} , // 1 for invitation request sent , 2 for sent confirmation // 3 Messages
    deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

var Notification = mongoose.model('Notification', NotificationSchema);