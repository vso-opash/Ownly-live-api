'use strict';
var mongoose = require('mongoose');
var StaticConstantSchema = mongoose.Schema({
    name: { type: String },
    value: { type: Number },
    status: { type: Boolean },
    deleted: { type: Boolean }
}, {
        timestamps: true
    });

var static_constant = mongoose.model('static_constant', StaticConstantSchema);
module.exports = static_constant;