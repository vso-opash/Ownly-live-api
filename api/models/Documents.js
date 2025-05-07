/**
 * Documents Model
 * @created 20 Dec 2017
 * @version 1.0
 */
'use strict';
var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var Schema = mongoose.Schema;

var DocumentSchema = new mongoose.Schema({
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, trim: true, }, //Store unique id of user who are creating property 
    document_name: {type: String},
    document_path: {type: String},
    is_tagged: {type: Boolean,default: false},
    is_tagged_by_id:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', trim: true},
    is_tagged_to_id:[{ type: mongoose.Schema.Types.ObjectId, ref: 'User', trim: true}],
    size: {type: String},
    is_deleted: {type: Boolean,default: false},
    is_favorite:{type:Boolean,default:false},
    createdDate: {type: Date,default: Date.now},
}, {
    timestamps: true
});

var documentObj = mongoose.model('documents', DocumentSchema);
module.exports = documentObj;