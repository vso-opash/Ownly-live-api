'use strict';

var mongoose = require('mongoose'),
    Permission = mongoose.model('Permission'),
    User = mongoose.model('User'),
    lodash = require('lodash'),
    fs = require('fs'),
    validator = require('../../config/validator.js');

module.exports = {
    getPermissions: getPermissions,
    getUserPermissions: getUserPermissions,
    createPermission: createPermission
};

/**
 * [getUsers - get permissions ]
 * @param  {object} req
 * @param  {object} res
 * @return {json}
 */
function getPermissions(req, res) {
    Permission.find({
        status: true,
        deleted: false
    }, function(err, data) {
        if (err || !data) {
            res.json({
                'code': 401,
                'message': 'Unable to get permissions'
            });
        } else {
            res.json({
                'code': 200,
                'data': data
            });
        }

    });
}

/**
 * [getUsers - get user permissions ]
 * @param  {object} req
 * @param  {object} res
 * @return {json}
 */
function getUserPermissions(req, res) {
    if (validator.isValid(req.headers) && validator.isValid(req.headers.authorization)) {
        var parts = req.headers.authorization.split(' ');
        if (parts.length == 2) {
            User.findOne({
                duoToken: parts[1],
                duoVerified: true
            }).populate('group_id').exec(function(err, user) {
                if (err || !user) {
                    res.json({
                        'code': 401,
                        'message': 'Authentication failed'
                    });
                } else {
                    User.populate(user, { path: 'group_id.role_id', model: 'Role' }, function(err, role) {
                        if (err || !role) {
                            res.json({
                                'code': 401,
                                'message': 'Authentication failed'
                            });
                        } else {
                            User.populate(role, { path: 'group_id.role_id.permission_id', model: 'Permission', select: 'title name' }, function(err, permission) {
                                //console.log("Permission",JSON.stringify(permission));
                                if (err || !permission) {
                                    res.json({
                                        'code': 401,
                                        'message': 'Authentication failed'
                                    });
                                } else {
                                    var permissionsArray = [];
                                    lodash.forEach(permission.group_id.role_id, function(value, key) {
                                        lodash.forEach(value.permission_id, function(permissionValue, permissionKey) {
                                            permissionsArray.push(permissionValue.name);
                                        });
                                    });
                                    var uniqueArray = permissionsArray.filter(function(item, pos) {
                                        return permissionsArray.indexOf(item) == pos;
                                    })
                                    res.json({
                                        'code': 200,
                                        'data': {
                                            permissions: uniqueArray
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        } else {
            res.json({
                'code': 401,
                'message': 'Authentication failed'
            });
        }
    } else {
        res.json({
            'code': 401,
            'message': 'Authentication failed'
        });
    }
}

/**
 * Create product group
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function createPermission(req, res) {
    var body = req.body;
    if (!validator.isValid(body.title) || !validator.isValid(body.name)) {
        res.json({
            'code': 401,
            'message': 'Required fields are missing'
        });
    } else {
        var prmi = new Permission();
        prmi.title = body.title;
        prmi.name = body.name;
        prmi.save(function(err, data) {
            if (err) {
                res.json({
                    'code': 401,
                    'message': 'Something went wrong please try again!'
                });
            } else {
                res.json({
                    'code': 200,
                    'message': 'Permission successfully'
                });
            }
        });
    }
}
