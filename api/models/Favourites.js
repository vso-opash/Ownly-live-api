'use strict';

var mongoose = require('mongoose');
var FavouritesSchema = mongoose.Schema({
    fav_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User',required: true},
    fav_to_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    fav_to_property: { type: mongoose.Schema.Types.ObjectId, ref: 'properties'},
    fav_to_noticeboard: { type: mongoose.Schema.Types.ObjectId, ref: 'noticeboard'},
    fav_type:{type: Number, default: 1} , // 1 for user and 2 for property 3 for noticeboard
    fav_status: {type: Number, default: 1}, //1 for faviourate and 2 for unfaviourate
    is_deleted: {type: Boolean,default: false}
}, {
    timestamps: true
});

var favourites = mongoose.model('favourites', FavouritesSchema); 