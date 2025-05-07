'use strict';

var mongoose = require('mongoose');
var imageSubschema = new mongoose.Schema({
    url: { type: String },
    status: { type: Boolean, default: true }
});
var availabilityschema = new mongoose.Schema({
    status: { type: Number },
    option: { type: Number },
    days: { type: Array }
});
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

var locschema = new mongoose.Schema({
    coordinates: [Number], // [<longitude>, <latitude>]
    type: { type: String }
});

var UserSchema = new mongoose.Schema({
    business_name: { type: String },
    abn_number: { type: String },
    firstname: { type: String, required: false },
    // firstname: { type: String, required: true },
    lastname: { type: String },
    email: { type: String, required: true, unique: true },
    name: { type: String },
    password: { type: String },
    mobile_no: { type: String },
    date_of_birth: { type: Date },
    image: { type: String },
    gender: { type: Number, enum: [1, 2, 3] }, //Role 1 male , 2 female ,3 others
    is_invited: { type: Boolean, default: false },
    accept_invitation: { type: Boolean, default: false },
    totalPropertyCount: { type: Number, default: 0 },
    is_active: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false },
    is_suspended: { type: Boolean, default: false },
    createdDate: { type: Date, default: Date.now },
    resendmailDate: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    about_user: { type: String },
    images: [imageSubschema],
    country: { type: String },
    address: { type: String },
    city: { type: String },
    bannerImage: { type: String },
    latitude: { type: String },
    longitude: { type: String },
    state: { type: String },
    zipCode: { type: String },
    suburb_postcode: { type: String },
    reveal_contact_number: { type: Number, default: 0 },
    rate: { type: Number },
    availability: [availabilityschema],
    members: [memberschema],
    vehicles: [vehicleschema],
    pets: [petschema],

    stripe_customer_id: { type: String },
    first_time_subscription: { type: Boolean, default: false },

    stripe_email_id: { type: String },
    subscription_id: { type: String },
    subscription_plan_id: { type: String },
    trial_period_days: { type: Number },
    subscription_price: { type: Number },
    subscription_start_date: { type: Date },
    subscription_end_date: { type: Date },
    subscription_interval: { type: String },
    is_subscription_cancelled: { type: Boolean, default: false },
    subscription_cancelled_date: { type: Date },

    location_latitude: { type: String },
    location_longitude: { type: String },
    location_administrative_area_level_1: { type: String },
    location_country: { type: String },
    location_postal_code: { type: String },
    location_locality: { type: String },
    location_street_number: { type: String },

    is_online: { type: Boolean, default: false },//to check user is already available for previous group chat
    // User associate with agency
    agency_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agency'
    },
    agent_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    trader_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    referedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    is_accepted_req: { type: Boolean, default: false },
    documentation_status: { type: Boolean, default: false },
    // For traders //
    categories_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'services_cats'
    }],
    is_opened_trade_email: { type: Boolean, default: false, required: false },
    tenant_request_status: { type: Number, enum: [0, 1, 2] }, //Status 0 Send , 1 Accept , 2 Decline
    activation_code: { type: String },
    location: locschema,
    social_provider: { type: String, required: false },
    social_id: { type: String, required: false },
    social_token: { type: String, required: false },
    // To check claim you profile mail for traders only
    resend_activation_email: { type: Boolean, default: false },
    profileTiers: { type: String, enum: ["basic", "premium"], default: "basic", required: true },
    defaultUserRole: { type: String, enum: ["agencyOwner", "agent", "tenant", "trader", "owner", "strataPrinciple", "strataManager"] },
    // commented for now - add total avg rate
    averageRate: { type: Number },
    totalReviewLength: { type: Number }
}, {
    timestamps: true
});
UserSchema.index({ location: '2dsphere' });
var User = mongoose.model('User', UserSchema);

module.exports = User;
