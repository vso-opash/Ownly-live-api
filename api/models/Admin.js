'use strict';

var mongoose = require('mongoose');

var adminSchema = new mongoose.Schema({
    firstname: {type: String,required: true},
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String
    },
    mobile_no: {
        type: String
    },
    gender: {
        type: String
    },
    image: {
        type: String
    },
    address: {
        type: String
    },
    country: {
        type: String
    },
    city: {
        type: String
    },
    state:{
        type: String
    },
    zipcode:{
        type: String
    },
    interest: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'interests'
    }],
    role: {
        type: Number,
        enum: [1, 2, 3], //Role 1 Buyer , 2 Seller, 3 both
        default: 1
    },
    salary: {
        type: Number
    },
    is_deleted: {
        type: Boolean,
        default: false
    },
    status: {
        type: Boolean,
        default: false
    },
    createdDate: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date

    },
    facebook: String,
}, {
    timestamps: true
});

var Admin = mongoose.model('Admin', adminSchema);
// make this available to our users in our Node applications
module.exports = Admin;