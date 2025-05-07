var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var advertiseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    postcode: { type: String, required: false },
    state: { type: String, required: false },
    url: { type: String, required: true },
    status: { type: String, required: true },
    adLocation: { type: String, required: true },
    comments: { type: String, required: false },
    file: { type: String, required: false },
    clicked: { type: Number, required: false, default: 0 },
    viewed: { type: Array, required: false, default: [] }
}, {
    timestamps: true
});

var Advertise = mongoose.model('advertise', advertiseSchema);
// make this available to our users in our Node applications
module.exports = Advertise;