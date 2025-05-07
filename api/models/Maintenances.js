'use strict';

var mongoose = require('mongoose');

var watcherSubschema = new mongoose.Schema({
    users_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    is_read: { type: Boolean, default: false }
});

var imageSubschema = new mongoose.Schema({
    path: { type: String },
    status: { type: Boolean, default: true }
});

var locschema = new mongoose.Schema({
    coordinates: [Number], // [<longitude>, <latitude>]
    type: { type: String }
});

var MaintenancesSchema = mongoose.Schema({
    request_id: { type: Number, required: true }, //10 digits unique id
    request_overview: { type: String, required: true },
    request_detail: { type: String },
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'properties' },
    agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency' },
    trader_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    is_forward: { type: Boolean, default: false },
    created_by_role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    forwarded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    categories_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'services_cats'
    }],
    watchers_list: [watcherSubschema],
    budget: { type: Number },
    original_budget: { type: Number },
    due_date: { type: Date },
    original_date: { type: Date },
    images: [imageSubschema],
    //is_req_forward: {type: Boolean,default: false},
    is_job_completed: { type: Boolean, default: false },
    job_close_confirmation: { type: Number, default: 1 }, //1 No confirm 2 confirm 3 decline
    address_id: { type: String },
    address: { type: String },
    suburb: { type: String },
    postcode: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    referral_code: { type: String },
    request_type: { type: Number, default: 0 }, //0 : Direct Request to Trader, 1 : Public Service Request
    complete_images: [imageSubschema],
    req_complete_message: { type: String },
    confirm_complete_message: { type: String },
    completed_date: { type: Date },
    sent_to_more_traders: { type: Number, default: 0 }, // 0 : not sent, 1 sent to more traders for more within radius
    req_status: { type: Number, default: 1 }, // 1 for sent , 2 for accepted, 3 for booked, 4 for closed, 5 for completed , 6 for due, 7 denied
    location: locschema,
    deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true }
});
MaintenancesSchema.virtual("maintenance_log", {
    ref: "maintentenance_traders_log",
    localField: "_id",
    foreignField: "maintenance_id",
    justOne: true,
    options: { sort: { maintenance_id: -1 } }
});
MaintenancesSchema.virtual("maintentenance_counter_proposals", {
    ref: "maintenance_proposals",
    localField: "_id",
    foreignField: "maintenance_id",
    // justOne: true,
    options: { sort: { maintenance_id: -1 } }
});
var maintenances = mongoose.model('maintenances', MaintenancesSchema);
