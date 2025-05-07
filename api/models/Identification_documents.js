/**
 * Identification Documents Model
 * @created 4-1-2019
 * @version 1.0
 */
'use strict';
var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var Schema = mongoose.Schema;

var Identification_documentsSchema = new mongoose.Schema({
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, trim: true, }, //Store unique id of user who are creating property 
    document_name: { type: String },
    document_path: { type: String },
    size: { type: String },
    is_deleted: { type: Boolean, default: false },
    createdDate: { type: Date, default: Date.now },
}, {
        timestamps: true
    });

var Identification_documentsObj = mongoose.model('identification_documents', Identification_documentsSchema);
module.exports = Identification_documentsObj;