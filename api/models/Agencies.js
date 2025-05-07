'use strict';

var mongoose = require('mongoose');

var agencySchema = new mongoose.Schema({
    name: {type: String,required: true},
    no_of_property: {type: Number},
    about_agency: {type: String},
    abn_number: {type: String},
    licence_number: {type: String},
    email: {type: String},
    phone_number: {type: String},
    banner: {type: String},
    principle_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    is_deleted: {
        type: Boolean,
        default: false
    },
    status: {
        type: Boolean,
        default: false
    },
    logoImage: {type: String},
}, {
    timestamps: true
});

var Agency = mongoose.model('Agency', agencySchema);
module.exports = Agency;
