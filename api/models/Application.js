'use strict';

var mongoose = require('mongoose');

var memberschema = new mongoose.Schema({
    name: { type: String },
    age: { type: Number },
    relationship: { type: Number },
    be_on_lease: { type: Boolean },
    email: { type: String },
    mobile_number: { type: String }
});
var vehicleschema = new mongoose.Schema({
    type: { type: Number },
    registration: { type: String },
    make_model: { type: String }
});
var petschema = new mongoose.Schema({
    type: { type: Number },
    breed: { type: String },
    registration_number: { type: String }
});

var agentSubschema = new mongoose.Schema({
    question_id: { type: String },
    status: { type: Boolean, default: true }
});

var ApplicationSchema = mongoose.Schema({
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'properties', required: true, trim: true }, //Store property id
    property_type: { type: String },
    number_bedroom: { type: Number, default: 1 }, //Store the number of bedroom
    preferred_comm_date: { type: Date },
    preferred_length_of_lease_years: { type: Number },
    preferred_length_of_lease_months: { type: Number },
    weekly_rent: { type: Number },
    monthly_rent: { type: Number },
    bond: { type: Number },
    why_propery_is_right_for_u: { type: String },
    agency_name: { type: String },
    property_manager_name: { type: String },
    property_manager_email: { type: String },
    members: [memberschema],
    vehicles: [vehicleschema],
    pets: [petschema],
    agent_specific: [agentSubschema],
    need_help_moving_service: { type: Boolean, default: false }, // ture - yes, false - no
    documentation_status: { type: Boolean, default: false },
    document_id: [{
        // type: mongoose.Schema.Types.ObjectId,
        type: String,
        ref: 'identification_documents'
    }],
    inspection_status: { type: Boolean, default: false },
    inspection_date: { type: Date },
    status: { type: Number, default: 0 }, //0 - Applied, 1 - Accept, 2 - Decline
    access_tenancy_db: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, trim: true }, //Store unique id of user who are creating property 
    created: { type: Date, default: Date.now },
    modified: { type: Date, default: Date.now }
});

var Applicaion = mongoose.model('application', ApplicationSchema);
module.exports = Applicaion;