'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    users = require("./users");
var recentViewedPropertySchema = new mongoose.Schema({
    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'properties'
    },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, trim: true, ref: 'User' },
    dayNumber: Number,
    yearNumber: Number,
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, trim: true, ref: 'User' },
    isDeleted: {
        type: Boolean,
        default: false
    }
});

var viewedProperty = mongoose.model('viewedProperty', recentViewedPropertySchema);
// make this available to our users in our Node applications
module.exports = viewedProperty;