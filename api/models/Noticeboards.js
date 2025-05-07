var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var rolesSubSchema = new mongoose.Schema({
    role_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }
});
// var propertySubSchema = new mongoose.Schema({
//     property_id: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'properties'
//     }
// });
var NoticeboardSchema = new mongoose.Schema({
    description : {type: String},
    title : {type: String},
    noticeboard_id: {type: String},
	createdby: {type: mongoose.Schema.Types.ObjectId,ref: 'User',required: true},
	agency_id: {type: mongoose.Schema.Types.ObjectId,ref: 'Agency'},
	property_id_arr: [{type: mongoose.Schema.Types.ObjectId,ref: 'properties'}],
	assign_to_roles: [rolesSubSchema],
	deleted: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
});

var noticeboard = mongoose.model('noticeboard', NoticeboardSchema);
module.exports = noticeboard;