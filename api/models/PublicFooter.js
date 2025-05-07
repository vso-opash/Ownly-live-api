'use strict';

var mongoose = require('mongoose');

var PublicFooterSchema = new mongoose.Schema({
    left_content: { type: String },
    right_content: { type: String }, //0-InActive, 1-Active, 2- Deactive
}, {
    timestamps: true
});
var PublicFooter = mongoose.model('PublicFooter', PublicFooterSchema);
// make this available to our users in our Node applications
module.exports = PublicFooter;