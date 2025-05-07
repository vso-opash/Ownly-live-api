'use strict';

var mongoose = require('mongoose'),
    Group = mongoose.model('Group'),
    Role = mongoose.model('Role'),
    slug = require('slug'),
    Constant = require('../../config/constant.js'),
    config = require('../../config/config'),
    validator = require('../../config/validator.js');

module.exports = {
    getGroups: getGroups,
    createGroup: createGroup,
    getGroupById: getGroupById,
    updateGroup: updateGroup,
    deleteGroup: deleteGroup,
    getUserActiveRoles: getUserActiveRoles
};

function getUserActiveRoles(req, res){
    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 10;
    
    if (user_id) {
        Group.aggregate(
            { $match: {user_id: mongoose.Types.ObjectId(user_id), status: true, deleted: false } }, // Match me
            //{ $unwind: '$agency_id' }, // Unwind addresses field
            { $lookup: { from: 'lastloggedroles', localField: '_id', foreignField: 'group_id', as: 'LastLoginRoles' } },
            {
                $project: {
                    _id: 1,
                    role_id:1,
                    LastLoginRoles: {
                        _id: 1,
                        group_id: 1,
                        createdAt:1,
                        updatedAt:1
                    }
                }
            },
            {$sort: {"createdAt": -1}},
            { $skip: page_number * number_of_pages },
            { "$limit": number_of_pages }
        ).exec(function (err, activeRoles) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR});
            } else {
                Role.populate(activeRoles, {"path": "role_id"}, function (err, finalData) {
                    if (err) {
                        return;
                    } else {
                        res.json({ code: Constant.SUCCESS_CODE, data: finalData });
                    }
                });
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

/**
 * [getUsers - get groups ]
 * @param  {object} req
 * @param  {object} res
 * @return {json}
 */
function getGroups(req, res) {
    
       Group.find({deleted: false, name:{ $ne : config.SUPER_ADMIN_GROUP}})
	   	.populate({path:'role_id', select: 'title name'})
	   	.exec(function(err, group) {
	        if (err || group.length === 0) {
	            res.json({
	                'code': 401,
	                'message': 'Unable to get Group'
	            });
	        } else {
	            res.json({
	                'code': 200,
	                'data': group
	            });
	        }
	    });

    /*Group.getGroups(req.query.page, function(err, paginatedResults, pageCount, itemCount) {
        if (err) {
            res.json({ code: 401, message: 'Unable to get Group' });
        } else {
            res.json({
                code: 200,
                data: paginatedResults
            });
        }
    });*/
}

/**
 * Create group
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function createGroup(req, res) {
    var body = req.body;
    if (!validator.isValid(body.title) || !validator.isValid(body.user_id)) {
        res.json({
            'code': 400,
            'message': 'Required fields are missing'
        });
    } else {
        Group.existCheck(body.title, '', function(err, exist) {
            if (err) {
                res.json({
                    'code': 401,
                    'message': 'Something went wrong please try again!'
                });
            } else {
                if (exist) {
                    res.json({
                        'code': 401,
                        'message': 'Group title already exist please try another!'
                    });
                } else {
                    var group = new Group();
                    group.title = body.title;
                    group.user_id = body.user_id;
                    group.role_id = body.role_id;
                    group.name = slug(body.title, '_').toLowerCase();
                    group.save(function(err, data) {
                        if (err) {
                            res.json({
                                'code': 401,
                                'message': 'Something went wrong please try again!'
                            });
                        } else {
                            res.json({
                                'code': 200,
                                'message': 'Group create successfully'
                            });
                        }
                    });
                }
            }
        });
    }
}

/**
 * Get group by id
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function getGroupById(req, res) {
    var id = req.swagger.params.id.value;
    Group.findById(id, '', function(err, data) {
        if (err || !data) {
            res.json({
                'code': 404,
                'message': 'Unable to get Group'
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
 * update group
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function updateGroup(req, res) {
    var id = req.swagger.params.id.value;
    var body = req.body;
    if (!validator.isValid(id) || !validator.isValid(body.role_id) || !validator.isValid(body.title)) {
        res.json({
            'code': 400,
            'message': 'Required fields are missing'
        });
    } else {
        Group.findOne({_id: id, deleted: false}, function(err, data) {
            if (err || !data) {
                res.json({
                    'code': 404,
                    'message': 'Unable to get Role'
                });
            } else {
                Group.existCheck(body.title, data._id, function(err, exist) {
                    if (err) {
                        res.json({
                            'code': 401,
                            'message': 'Something went wrong please try again!'
                        });
                    } else {
                        if (exist) {
                            res.json({
                                'code': 401,
                                'message': 'Group title already exist please try another!'
                            });
                        } else {
                            data.title = body.title;
                            data.role_id = body.role_id;
                            data.name = slug(body.title, '_').toLowerCase();
                            data.save(function(err, result) {
                                if (err || !result) {
                                    res.json({
                                        'code': 401,
                                        'message': 'Something went wrong please try again!'
                                    });
                                } else {
                                    res.json({
                                        'code': 200,
                                        'message': 'Group updated successfully'
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
 * Delete group by id
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function deleteGroup(req, res) {
    var id = req.swagger.params.id.value;
    if (!validator.isValid(id)) {
        res.json({
            'code': 400,
            'message': 'Required fields are missing'
        });
    } else {
        Group.findOne({ _id: id, deleted: false }, function(err, data) {
            if (err || !data) {
                res.json({
                    'code': 404,
                    'message': 'Unable to get Group'
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
}