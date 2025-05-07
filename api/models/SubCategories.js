'use strict';
var mongoose = require('mongoose');
var SubCategoriesSchema = mongoose.Schema({
    name: { type: String, required: true },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'services_cats'
    },
    status: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },    
}, {
        timestamps: true
    });

var sub_categories = mongoose.model('sub_categories', SubCategoriesSchema);
module.exports = sub_categories;