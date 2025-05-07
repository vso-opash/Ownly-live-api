'use strict';
var mongoose = require('mongoose');
var ServiceCategoriesSchema = mongoose.Schema({
    name: {type: String,required: true},
    status: {type: Boolean,default: true},
    deleted: {type: Boolean,default: false}
    // createdDate: { type: Date, default: Date.now }
}, {
    timestamps: true
});

var services_cats = mongoose.model('services_cats', ServiceCategoriesSchema);