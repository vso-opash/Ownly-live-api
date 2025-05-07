'use strict';
var mongoose = require('mongoose');
var InvitationsSchema = mongoose.Schema({
    invited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User',required: true},
    invited_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User',required: true},
    invited_to_role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role'},
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property'},
    agreement_id: { type: mongoose.Schema.Types.ObjectId, ref: 'agreements',required: false},
    //agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency'},
    invitation_status:{type:Number,default:1}, // 1 for pending request 2 for Accept request  3 for decline
    status: {type: Boolean,default: true},
    deleted: {type: Boolean,default: false}
}, {
    timestamps: true
});

var invitations = mongoose.model('invitations', InvitationsSchema); 