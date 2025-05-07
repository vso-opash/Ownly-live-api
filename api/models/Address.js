'use strict';

var mongoose = require('mongoose');

var AddressSchema = new mongoose.Schema({
    GNAFId: { type: String },
    maintenance: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'maintenances'
    }],
    trader: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    agreement: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    address: { type: String },
    lat: { type: String },
    lng: { type: String }
}, {
    timestamps: true
});

var Address = mongoose.model('Address', AddressSchema);
module.exports = Address;