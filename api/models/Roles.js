'use strict';

var mongoose = require('mongoose');

var RoleSchema = mongoose.Schema({
    title: {type: String,required: true},
    name: {type: String,required: true},
    description: {type: String},
    permission_id: [{type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission'
    }],
    status: {type: Boolean,default: true},
    deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

/**
 * get role by  role id
 * @param {type} id
 * @param {type} callback
 * @returns {undefined}
 */
RoleSchema.statics.getRoleById = function(id, callback) {
    Role.findById(id, '', function(err, data) {
        if (err) {
            callback(err);
        } else {
            if (data !== null) {
                callback(null, data);
            } else {
                callback('No record found!');
            }
        }
    });
};

/**
 * [getUsers - To check role title exist or not ]
 * @param  {object} title
 * @param  {object} id // on update case id will not be blank as well as on add case it will be blank
 * @return {json}
 */
RoleSchema.statics.existCheck = function(title, id, callback) {
    var where = {title: new RegExp('^'+title+'$', "i"), deleted: { $ne: true } };
    if (id) {
        where = {title: new RegExp('^'+title+'$', "i"), deleted: { $ne: true }, _id: { $ne: id } };
    }
    Role.findOne(where, function(err, data) {
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

var Role = mongoose.model('Role', RoleSchema);
