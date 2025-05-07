'use strict';

var mongoose = require('mongoose');

var AgentRemovalsSchema = mongoose.Schema({
    property_id: {type: mongoose.Schema.Types.ObjectId,ref: 'properties'},
    removed_req_by_user: {type: mongoose.Schema.Types.ObjectId,ref: 'User'},
    removed_req_to_user: {type: mongoose.Schema.Types.ObjectId,ref: 'User'},
    reason_of_removal_req:{type: String},
    is_approved_by_admin:{type: Boolean, default: false},
    deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
var AgentRemovals = mongoose.model('AgentRemovals', AgentRemovalsSchema);