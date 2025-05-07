'use strict';

var mongoose = require('mongoose');

var PermissionSchema = mongoose.Schema({
    title: {type: String,required: true},
    name: {type: String,required: true},
    status: {
        type: Boolean,
        default: true
    },
    deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

/**
 * [getUsers - To check permissions title exist or not ]
 * @param  {object} title
 * @param  {object} id // on update case id will not be blank as well as on add case it will be blank
 * @return {json}
 */
PermissionSchema.statics.existCheck = function(name, id, callback) {
    var where = {name: new RegExp('^'+name+'$', "i"), deleted: { $ne: true } };
    if (id) {
        where = {name: new RegExp('^'+name+'$', "i"), deleted: { $ne: true }, _id: { $ne: id } };
    }
    Permission.findOne(where, function(err, data) {
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

var Permission = mongoose.model('Permission', PermissionSchema);