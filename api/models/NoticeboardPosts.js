var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var rolesSubSchema = new mongoose.Schema({
    role_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }
});
var userSubSchema = new mongoose.Schema({
    users_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

var NoticeboardPostSchema = new mongoose.Schema({
	noticeboard_id: {type: mongoose.Schema.Types.ObjectId,ref: 'noticeboard',required: true},
	title: {type: String},
	agenda_resolution: {type: String},
	description: {type: String},
	message: {type: String},
	createdby: {type: mongoose.Schema.Types.ObjectId,ref: 'User',required: true},
	agency_id: {type: mongoose.Schema.Types.ObjectId,ref: 'Agency'},
	assign_to_roles: [rolesSubSchema],
	assign_to_users: [userSubSchema],
	enable_thread_post: {type: Boolean, default: true},
	status: {type: Boolean, default: true},
	deleted: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
});

var noticeboardpost = mongoose.model('noticeboardpost', NoticeboardPostSchema);
module.exports = noticeboardpost;