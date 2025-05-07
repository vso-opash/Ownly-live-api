var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var Schema = mongoose.Schema;

var amenitiesSchema = new mongoose.Schema({
    name: { type: String,required: true },
    is_deleted: { type: Boolean, default: false }
}, {
    timestamps: true
});
var Amenities = mongoose.model('amenities', amenitiesSchema);
module.exports = Amenities;