var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var EnquirySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    first_name: { type: String },
    last_name: { type: String },
    email: { type: String },
    phone: { type: String },
    post_code: { type: String },
    property_query: { type: String },
    enquiries: [{
        type: String
    }],
    agent_email_id: { type: String },
    agent_name: { type: String },
    agent_id: { type: String },
    property_url: { type: String },
    is_deleted: {
        type: Boolean,
        default: false
    },
}, {
        timestamps: true
    });

var enquiry = mongoose.model('Enquiry', EnquirySchema);
module.exports = enquiry;