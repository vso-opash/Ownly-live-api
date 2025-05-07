'use strict';

var mongoose = require('mongoose'),
	mongoosePaginate = require('mongoose-paginate');

var LastLoggedRoleSchema = mongoose.Schema({
    group_id: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Group'
    },
    status: {
        type: Boolean,
        default: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
   },
   role_id: {
       type: mongoose.Schema.Types.ObjectId,
       ref: 'Role',
       required: true
  },
    deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

var LastLoggedRole = mongoose.model('LastLoggedRole', LastLoggedRoleSchema);