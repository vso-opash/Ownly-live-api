'use strict';

var mongoose = require('mongoose');

var tenantSubschema = new mongoose.Schema({
    users_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    pending_email: {
        type: Boolean,
        default: false
    }
});

var imageSubschema = new mongoose.Schema({
    document_name: { type: String },
    path: { type: String },
    status: { type: Boolean, default: true }
});

var AgreementsSchema = mongoose.Schema({
    agreement_id: { type: Number, required: true }, //10 digits unique id  
    address_service_notice1: { type: String },
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'properties' },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency' },
    created_by_role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tenants: [tenantSubschema],
    terms: { type: Number }, // 1 for Monthly and 2 for yearly
    case_validity: { type: Date },
    tenancy_start_date: { type: Date },
    tenancy_length: { type: Date },
    // tenancy_length: { type: String },
    payable_advance_start_on: { type: Date, default: Date.now },
    rent_price: { type: Number },
    rental_period: { type: Number },// 1 for Monthly and 2 for yearly
    address_service_notice2: { type: String },
    tenancy_inclusion: { type: String },
    images: [imageSubschema],
    rent_paid_to: { type: String },
    rent_paid_at: { type: String },
    bsb_number: { type: String },
    detail: { type: String },
    account_number: { type: String },
    account_name: { type: String },
    payment_reference: { type: String },
    follow_as: { type: String },
    rent_bond_price: { type: Number },
    electricity_repairs: { type: String },
    electricity_repairs_phone_number: { type: String },
    plumbing_repairs: { type: String },
    plumbing_repairs_phone_number: { type: String },
    other_repair: { type: String },
    other_repair_phone_number: { type: String },
    number_of_occupants: { type: String },
    is_csv_uploade: {
        type: Boolean,
        default: false
    },
    water_usage: {
        type: Boolean,
        default: false
    },
    strata_by_laws: {
        type: Boolean,
        default: false
    },
    save_as_draft: {
        type: Boolean,
        default: false
    },
    deleted: {
        type: Boolean,
        default: false
    },
    property_address: { type: String },
    property_lat: { type: String },
    property_lng: { type: String },
    owner_pending_email: { type: Boolean, default: false },
    send_expiration_email: { type: Boolean, default: false },
}, {
    timestamps: true
});
var agreements = mongoose.model('agreements', AgreementsSchema);