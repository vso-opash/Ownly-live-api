'use strict';

var mongoose = require('mongoose');

var DisputesSchema = mongoose.Schema({
        dispute_id:{type: String},
        created_by_id: {type: mongoose.Schema.Types.ObjectId,ref: 'User'},
        agency_id: {type: mongoose.Schema.Types.ObjectId,ref: 'Agency'},
        tenant_id :{type: mongoose.Schema.Types.ObjectId,ref: 'User'},
        owner_id :{type: mongoose.Schema.Types.ObjectId,ref: 'User'},
        agent_id :{type: mongoose.Schema.Types.ObjectId,ref: 'User'},
        property_id: {type: mongoose.Schema.Types.ObjectId,ref: 'properties'},
        subject : {type: String},
        message : {type: String},
        start_from : { type : Date, default: Date.now },
        status : {type: Boolean,default: false},
        dispute_status : {type: Number,default: 1},//1=> In progress 2=>resolved 3=>transfer to fair trading
        is_deleted : {type: Boolean,default: false}
    }, 
{
    timestamps: true
});
var Disputes = mongoose.model('Disputes', DisputesSchema);
module.exports = Disputes;