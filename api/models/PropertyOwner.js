var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var Schema = mongoose.Schema;

var propertyOwnerSchema = new mongoose.Schema({
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, trim: true }, //Store unique id of user who are creating property 
    property_owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, trim: true }, //Store unique id of user who are creating property 
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'properties' }, //Store unique id of user who are creating property 
    email: { type: String },
    is_deleted: { type: Boolean, default: false },
    created: { type: Date, default: Date.now },
    modified: { type: Date, default: Date.now }
});
//console.log('inside property schema');

var propertyOwner = mongoose.model('property_owner', propertyOwnerSchema);
// make this available to our users in our Node applications
module.exports = propertyOwner;