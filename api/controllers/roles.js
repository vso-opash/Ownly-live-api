'use strict';

var mongoose = require('mongoose'),
    Role = mongoose.model('Role'),
    slug = require('slug'),
    Groups = mongoose.model('Group'),
    Constant = require('../../config/constant.js'),
    async = require('async'),
    validator = require('../../config/validator.js');
var forEach = require('async-foreach').forEach;
module.exports = {
    getRoles: getRoles,
    addRole: addRole,
    getRoleById: getRoleById,
    updateRole: updateRole,
    deleteRole: deleteRole,
    updatePermission: updatePermission,
    saveUserMultiRoles: saveUserMultiRoles,
    getUserDefaultRoles: getUserDefaultRoles
};

/**
 * [getRole - get role]
 * @param  {object} req
 * @param  {object} res
 * @return {json}
 */
function getRoles(req, res) {
    Role.find({
        status: true,
        deleted: false
         },'_id description title', function(err, data) {
        if (err || data.length === 0) {
            res.json({
                'code': 401,
                'message': 'Unable to get role'
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
 * Add role
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function addRole(req, res) {
    var body = req.body;

    if (!body.title) {
        res.json({
            'code': 401,
            'message': 'Required fields are missing'
        });
    } else {
        Role.existCheck(body.title, '', function(err, exist) {
            if (err) {
                res.json({
                    'code': 401,
                    'message': 'Something went wrong please try again!'
                });
            } else {
                if (exist) {
                    res.json({
                        'code': 401,
                        'message': 'Title already exist please try another!'
                    });
                } else {
                    var role = new Role();
                    role.name = slug(body.title, '_').toLowerCase();
                    role.title = body.title;
                    role.permission_id = body.permission_id;
                    if (req.body.description) {
                        role.description = req.body.description;
                    }
                    //role.permission_id = body.permission_id;
                    role.save(function(err, data) {
                        if (err) {
                            res.json({
                                'code': 401,
                                'message': 'Something went wrong please try again!'
                            });
                        } else {
                            res.json({
                                'code': 200,
                                'message': 'Role added successfully'
                            });
                        }
                    });
                }
            }
        });
    }
}

/**
 * Get role by id
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function getRoleById(req, res) {
    var id = req.swagger.params.id.value;
    Role.findById(id, '', function(err, data) {
        if (err || !data) {
            res.json({
                'code': 401,
                'message': 'Unable to get Role'
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
 * update Role
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function updateRole(req, res) {
    var id = req.swagger.params.id.value;
    var body = req.body;
    if (!body.title) {
        res.json({
            'code': 401,
            'message': 'Required fields are missing'
        });
    } else {
        Role.findOne({_id: id, deleted: false}, function(err, data) {
            if (err || !data) {
                res.json({
                    'code': 401,
                    'message': 'Unable to get Role'
                });
            } else {
                Role.existCheck(body.title, data._id, function(err, exist) {
                    if (err) {
                        res.json({
                            'code': 401,
                            'message': 'Something went wrong please try again!'
                        });
                    } else {
                        if (exist) {
                            res.json({
                                'code': 401,
                                'message': 'Title already exist please try another!'
                            });
                        } else {
                            data.title = body.title;
                            data.name = slug(body.title, '_').toLowerCase();
                            data.permission_id = body.permission_id;
                            if (req.body.description) {
                                data.description = req.body.description;
                            }
                            data.save(function(err, result) {
                                if (err || !result) {
                                    res.json({
                                        'code': 401,
                                        'message': 'Something went wrong please try again!'
                                    });
                                } else {
                                    res.json({
                                        'code': 200,
                                        'data': result
                                    });
                                }
                            });
                        }
                    }
                });
            }
        });

    }
}

/**
 * Delete role by id
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function deleteRole(req, res) {
    var id = req.swagger.params.id.value;
    Role.findOne({ _id: id, deleted: false }, function(err, data) {
        if (err || !data) {
            res.json({
                'code': 401,
                'message': 'Unable to get Role'
            });
        } else {
            data.deleted = true;
            data.save(function(err, result) {
                if (err || !result) {
                    res.json({
                        'code': 401,
                        'message': 'Something went wrong please try again!'
                    });
                } else {
                    res.json({
                        'code': 200,
                        'message': 'Role deleted successfully'
                    });
                }
            });
        }
    });
}

/**
 * set permission
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function updatePermission(req, res) {
    var id = req.swagger.params.id.value;
    var body = req.body;
    if (!validator.isValid(id) || !validator.isValid(body.permission_id)) {
        res.json({
            'code': 400,
            'message': 'Required fields are missing'
        });
    } else {
        Role.findOne({_id: id, deleted: false}, function(err, data) {
            if (err || !data) {
                res.json({
                    'code': 404,
                    'message': 'Unable to get Role'
                });
            } else {
                data.permission_id = [];
                data.save(function(err, result) {
                    if (err || !result) {
                        res.json({
                            'code': 401,
                            'message': 'Something went wrong please try again!'
                        });
                    } else {
                        result.permission_id = body.permission_id;
                        result.save(function(err, resultResp) {
                            if (err || !resultResp) {
                                res.json({
                                    'code': 401,
                                    'message': 'Something went wrong please try again!'
                                });
                            } else {
                                res.json({
                                    'code': 200,
                                    'message': 'Permission updated successfully'
                                });
                            }
                        });
                    }
                });
            }
        });
    }

}
/**
 * get save multi user  roles
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function saveUserMultiRoles(req, res) {
    var roleArray = req.body.roles;
    //process.exit(1);
    async.each(roleArray, function(data, asyncCall) {
        //obj.removed_req_to_user = mongoose.Types.ObjectId(data);
        var finalResponse=[];
        var roleInfo = {};
        roleInfo.role_id = data;
        roleInfo.user_id = req.body.user_id;
        var groupData = new Groups(roleInfo);
        Groups.findOne({ user_id: req.body.user_id, deleted: false,role_id: data }, function (err, userInfo) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else if (userInfo) {
                asyncCall(null, finalResponse);
            }else{
                groupData.save(function (err, group) {
                    if (err) {
                        asyncCall(error, false);
                    } else {
                        finalResponse.push(group);
                        asyncCall(null, finalResponse);
                    }
                })
            }
            })
        
    }, function (err) {
        if (err) {
            var outputJSON ={ 
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR 
                };
        } else {
            var outputJSON = { 
                code: Constant.SUCCESS_CODE, 
                'message': Constant.GROUP_SAVE_SUCCESS 
            };
        }
         res.jsonp(outputJSON);
    });
}

/**
 * [getRole - get user default roles]
 * @param  {object} req
 * @param  {object} res
 * @return {json}
 */
function getUserDefaultRoles(req, res) {
    if(req.body.user_id){
        Groups.findOne({
            status: true,
            deleted: false,
            user_id: req.body.user_id,
            is_master_role: true
             }, function(err, data) {
            if (err) {
                res.json({
                    'code': 401,
                    'message': 'Unable to get role'
                });
            } else {
                res.json({
                    'code': 200,
                    'data': data
                });
            }
        });
    }
    else{
        res.json({
            'code': 401,
            'message': 'Unable to get role'
        });
    }
}