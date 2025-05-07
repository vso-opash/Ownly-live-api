'use strict';

var mongoose = require('mongoose'),
	mongoosePaginate = require('mongoose-paginate');

var GroupSchema = mongoose.Schema({
    // title: {
    //     type: String
    // },
    // name: {
    //     type: String
    // },
    user_id: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User'
    },
    status: {
        type: Boolean,
        default: true
    },
    is_master_role:{
        default: false,
        type: Boolean
    },
    role_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true
   },
    deleted: {
        type: Boolean,
        default: false
    },
    about_user: { type: String },
}, {
    timestamps: true
});

GroupSchema.plugin(mongoosePaginate);

/*
 * Get User Listing
 */
GroupSchema.statics.getGroups = function(page, callback) {

    var sortBy = {},
        where = { deleted: { $ne: true }};

    sortBy.updatedAt = -1;
    return Group.paginate(where, {
        page: page,
        limit: 100,
        populate: [{path:'user_id', select: 'title name'}],
        sortBy: sortBy,
    }, callback);
};

/**
 * [getUsers - To check group title exist or not ]
 * @param  {object} title
 * @param  {object} id // on update case id will not be blank as well as on add case it will be blank
 * @return {json}
 */
GroupSchema.statics.existCheck = function(title, id, callback) {
    var where = {title: new RegExp('^'+title+'$', "i"), deleted: { $ne: true } };
    if (id) {
        where = {title: new RegExp('^'+title+'$', "i"), deleted: { $ne: true }, _id: { $ne: id } };
    }
    Group.findOne(where, function(err, data) {
        if (err) {
            callback(err)
        } else {
            if (data) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        }
    });
};

var Group = mongoose.model('Group', GroupSchema);
