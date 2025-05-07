var mongoose = require('mongoose');
var Schema = mongoose.Schema;
users = require("./Users");
var verificationSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		//required: true
	},
	type: {
		type: Number,
		enum: [0, 1, 2, 3]
	},
	code: {type: String},
	created: {type: Date, default: Date.now},
	expired: {type: Date},
	status: {type: Boolean, default: true}
});


var verification = mongoose.model('verification', verificationSchema);
module.exports = verification;
