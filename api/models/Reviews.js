var mongoose = require('mongoose');
var responseSubschema = new mongoose.Schema({
    response_by:  {type: mongoose.Schema.Types.ObjectId,ref: 'User'},
    response: {type: String},
    createdDate: {type: Date,default: Date.now}
});
var Schema = mongoose.Schema;
var ReviewsSchema = new mongoose.Schema({
	review_by_role: {type: mongoose.Schema.Types.ObjectId,ref: 'Role'},
	review_by: {type: mongoose.Schema.Types.ObjectId,ref: 'User',required: true},
	review_to: {type: mongoose.Schema.Types.ObjectId,ref: 'User',required: true},
	comments: {type:String},
	quality_work: {type:Number},
	puntuality : {type:Number},
	communication : {type:Number},
	avg_total :{type:Number},
	job_id: {type: mongoose.Schema.Types.ObjectId,ref: 'maintenances'},
	response: [responseSubschema],
	is_deleted: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
});

var reviews = mongoose.model('reviews', ReviewsSchema);
module.exports = reviews;