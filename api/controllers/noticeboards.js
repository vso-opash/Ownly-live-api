'use strict';
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Agency = mongoose.model('Agency'),
    Groups = mongoose.model('Group'),
    favourites = mongoose.model('favourites'),
    propertyModel = require('../models/Properties'),
    NotificationInfo = mongoose.model('Notification'),
    Constant = require('../../config/constant.js'),
    validator = require('../../config/validator.js'),
    noticeboard = mongoose.model('noticeboard'),
    InvitationInfo = mongoose.model('invitations'),
    async = require('async'),
    waterfall = require('run-waterfall'),
    noticeboardpost = mongoose.model('noticeboardpost'),
    _ = require('underscore');

module.exports = {
    getUserCountsViaProperties: getUserCountsViaProperties,
    getPropertyListForstarta: getPropertyListForstarta,
    noticeboardList: noticeboardList,
    getFaviourateNoticeboardList: getFaviourateNoticeboardList,
    DashboardNoticeboardList: DashboardNoticeboardList,
    addNoticeboard: addNoticeboard,
    deleteNoticeboard: deleteNoticeboard,
    deleteNoticeboardPost: deleteNoticeboardPost,
    addNoticeboardPost: addNoticeboardPost,
    editNoticeboardPost: editNoticeboardPost,
    noticeBoardDetail: noticeBoardDetail,
    noticeboardPostDetail: noticeboardPostDetail,
    editNoticeboard: editNoticeboard
};

/**
 * Function to get user count via property
 * @access private
 * @return json
 * Created by Rahul Lahariya
 * @smartData Enterprises (I) Ltd
 */
function getUserCountsViaProperties(req, res) {

    var propertyIds = (typeof req.body.property_arr != 'undefined') ? req.body.property_arr : [];

    waterfall([
        function (callback) {
            var getAssociateProperty = function (propertyIds, callback) {
                var property_id_arr = [];
                for (var i = 0; i < propertyIds.length; i++) {
                    var property_id = mongoose.Types.ObjectId(propertyIds[i]);
                    property_id_arr.push(property_id);
                }
                if (property_id_arr) {
                    InvitationInfo.count({ property_id: property_id_arr, deleted: false })
                        .exec(function (err, tenants) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, property_id_arr, tenants);
                            }
                        });
                } else {
                    callback(null, property_id_arr, 0);
                }
            };
            getAssociateProperty(propertyIds, function (err, propertyArr, tenants) {
                if (err) {
                    callback(err);
                } else if (!propertyArr) {
                    callback(null, [], 0);
                } else {
                    propertyModel.find({ _id: { $in: propertyArr }, save_as_draft: false, is_deleted: false },
                        { "owned_by": 1, "created_by": 1, "created_by_agency_id": 1 })
                        .populate("owned_by", "firstname lastname email")
                        .populate("created_by", "firstname lastname email")
                        .populate("created_by_agency_id", "firstname lastname email")
                        .exec(function (err, data) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, data, tenants);
                            }
                        });
                }
            });
        },
        function (arg1, tenantCnt, callback) {

            var agentCnt = 0;
            var agencyCnt = 0;
            var ownerCnt = 0;

            if (arg1.length > 0) {
                var newItem = JSON.stringify(arg1);
                var newItem = JSON.parse(newItem);
                async.each(newItem, function (item, asyncCall) {

                    if (item.hasOwnProperty("owned_by")) {
                        ownerCnt = ownerCnt + 1;
                    } if (item.hasOwnProperty("created_by")) {
                        agentCnt = agentCnt + 1;
                    } if (item.hasOwnProperty("created_by_agency_id")) {
                        agencyCnt = agencyCnt + 1;
                    }
                    asyncCall(null, agencyCnt, agentCnt, ownerCnt, tenantCnt);
                }, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, arg1, agencyCnt, agentCnt, ownerCnt, tenantCnt);
                    }
                });
            } else {
                callback(null, agencyCnt, agentCnt, ownerCnt, tenantCnt);
            }

        }], function (err, result, agencyCnt, agentCnt, ownerCnt, tenantCnt) {
            if (err) {
                //console.log(err);
                res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
            } else {
                res.json({ code: Constant.SUCCESS_CODE, data: result, agencyCnt: agencyCnt, agentCnt: agentCnt, ownerCnt: ownerCnt, tenantCnt: tenantCnt });
            }
        });
}


/**
 * Function is use to all property details
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 */
function getPropertyListForstarta(req, res) {
    propertyModel.find({ "is_deleted": false, "save_as_draft": false }, { title: 1, address: 1, created_by_agency_id: 1, country: 1, state: 1, city: 1 })
        .populate('owned_by', '_id firstname lastname')
        .populate('created_by', 'firstname lastname image')
        .sort({ address: 1 }).exec(function (err, pdata) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
            } else {
                res.json({
                    code: 200,
                    message: Constant.PROPERTY_SUCCESS_GOT_DATA,
                    data: pdata
                });
            }
        });
}

function deleteNoticeboard(req, res) {

    var noticeboard_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    if (noticeboard_id) {
        noticeboard.update({
            '_id': noticeboard_id
        }, {
                $set: {
                    "deleted": true
                }
            }, function (err, data) {
                if (err) {
                    res.json({
                        code: 400,
                        message: "Noticeboard not deleted"
                    });
                } else {
                    res.json({
                        code: 200,
                        message: "Noticeboard deleted successfully"
                    });
                }
            })
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

function deleteNoticeboardPost(req, res) {

    var noticeboard_post_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    if (noticeboard_post_id) {
        noticeboardpost.update({
            '_id': noticeboard_post_id
        }, {
                $set: {
                    "deleted": true
                }
            }, function (err, data) {
                if (err) {
                    res.json({
                        code: 400,
                        message: "Noticeboard post not deleted"
                    });
                } else {
                    res.json({
                        code: 200,
                        message: "Noticeboard post deleted successfully"
                    });
                }
            })
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

function editNoticeboardPost(req, res) {

    var noticeboardpost_id = (typeof req.body.noticeboardpost_id != 'undefined') ? mongoose.Types.ObjectId(req.body.noticeboardpost_id) : '';
    if (noticeboardpost_id) {
        noticeboardpost.findOne({ _id: noticeboardpost_id }, function (err, data) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                if (data) {
                    data._id = (typeof req.body.noticeboardpost_id != 'undefined') ? mongoose.Types.ObjectId(req.body.noticeboardpost_id) : data._id;
                    data.createdby = (typeof req.body.created_by != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by) : data.createdby;
                    data.title = (typeof req.body.title != 'undefined') ? req.body.title : data.title;
                    data.agenda_resolution = (typeof req.body.agenda_resolution != 'undefined') ? req.body.agenda_resolution : data.agenda_resolution;
                    data.description = (typeof req.body.description != 'undefined') ? req.body.description : data.description;
                    data.message = (typeof req.body.description != 'undefined') ? req.body.description : data.description;

                    var noticeboard_id = (typeof req.body.noticeboard_id != 'undefined') ? mongoose.Types.ObjectId(req.body.noticeboard_id) : data.noticeboard_id;
                    data.noticeboard_id = (typeof req.body.noticeboard_id != 'undefined') ? mongoose.Types.ObjectId(req.body.noticeboard_id) : data.noticeboard_id;
                    data.agency_id = (typeof req.body.agency_id != 'undefined') ? mongoose.Types.ObjectId(req.body.agency_id) : data.agency_id;
                    data.enable_thread_post = (typeof req.body.enable_thread_post != 'undefined') ? req.body.enable_thread_post : true;
                    var assign_to_users = (typeof req.body.assign_to_users != 'undefined') ? req.body.assign_to_users : data.assign_to_users;
                    var assign_to_roles = (typeof req.body.assign_to_roles != 'undefined') ? req.body.assign_to_roles : data.assign_to_roles;


                    if (assign_to_roles) {
                        var assignToRolesArr = [];
                        for (var i = 0; i < assign_to_roles.length; i++) {
                            if (assign_to_roles.indexOf(assign_to_roles[i]._id) === -1) {
                                assignToRolesArr.push({ "role_id": mongoose.Types.ObjectId(assign_to_roles[i]._id) });
                            }
                        }
                        data.assign_to_roles = assignToRolesArr;
                    }

                    if (assign_to_users) {
                        var assignToUsersArr = [];
                        for (var i = 0; i < assign_to_users.length; i++) {
                            if (assign_to_users.indexOf(assign_to_users[i]._id) === -1) {
                                assignToUsersArr.push({ "users_id": mongoose.Types.ObjectId(assign_to_users[i]._id) });
                            }
                        }
                        data.assign_to_users = assignToUsersArr;
                    }

                    //var notice = new noticeboardpost(obj);
                    data.save(function (err, noticeData) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                        } else {
                            noticeboard.findById({ _id: noticeboard_id })
                                //.populate('property_id_arr', 'property_name description address image')
                                .populate('createdby', 'firstname lastname image')
                                .populate('assign_to_roles.role_id', '_id title name description')
                                .populate('assign_to_users.users_id', '_id firstname lastname image')
                                .exec(function (err, data) {
                                    if (err) {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                    } else {
                                        if (data) {
                                            var to_users = [];
                                            var obj2 = {};
                                            obj2.subject = "Edit Notice post";
                                            obj2.message = "Edit post from " + data.createdby.firstname + " " + data.createdby.lastname;
                                            obj2.from_user = mongoose.Types.ObjectId(data.createdby._id);
                                            obj2.to_users = data.assign_to_users;
                                            obj2.type = Constant.NOTIFICATION_TYPE_NOTICE_BOARD;
                                            var notification = new NotificationInfo(obj2);
                                            notification.save(function (err, notData) {
                                                if (err) {
                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                } else {
                                                    res.json({ code: Constant.SUCCESS_CODE, data: data });
                                                }
                                            });
                                        } else {
                                            res.json({ code: Constant.SUCCESS_CODE, data: data });
                                        }
                                    }
                                });
                        }
                    });

                } else {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
                }
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

/**
 * [Notice Board list - Notice board List]
 * @param  {object} req
 * @param  {object} res
 */
function DashboardNoticeboardList(req, res) {

    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var role_id = (typeof req.body.role_id != 'undefined') ? req.body.role_id : '';
    var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';

    var getPropertiesArray = function (user_id, role_id, agency_id, callback) {

        if (role_id || user_id) {
            var conditions = { "$and": [] };
            conditions["$and"].push({ "is_deleted": false, "save_as_draft": false });
            if (role_id == Constant.OWN_AGENCY && agency_id)
                conditions["$and"].push({ "created_by_agency_id": agency_id });
            if (role_id == Constant.AGENT && user_id)
                conditions["$and"].push({ "created_by": user_id });
            if (role_id == Constant.OWNER && user_id)
                conditions["$and"].push({ "owned_by": user_id });
            if (role_id == Constant.TENANT && user_id) {
                InvitationInfo.find({ invited_to: mongoose.Types.ObjectId(user_id), deleted: false, status: true, invitation_status: 2 }, { "_id": 1, "property_id": 1 }, function (err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        if (!data) {
                            callback(null, []);
                        } else {
                            var property_id_arr = [];
                            for (var i = 0; i < data.length; i++) {
                                var property_id = mongoose.Types.ObjectId(data[i]._id);
                                property_id_arr.push(property_id);
                            }
                            callback(null, property_id_arr);
                        }
                    }
                });

            } else {
                propertyModel.find(conditions, { "_id": 1, "property_id": 1 })
                    //.limit(5)
                    .sort({ created: -1 }).exec(function (err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            if (!data) {
                                callback(null, []);
                            } else {
                                var propertyArr = [];
                                for (var i = 0; i < data.length; i++) {
                                    var property_id = mongoose.Types.ObjectId(data[i]._id);
                                    propertyArr.push(property_id);
                                }
                                callback(null, propertyArr);
                            }
                        }
                    });
            }
        } else {
            callback(null, []);
        }
    };

    waterfall([
        function (callback) {
            getPropertiesArray(user_id, role_id, agency_id, function (error, pArr) {
                if (error) {
                    callback(error);
                } else if (!pArr) {
                    callback(null, []);
                } else {

                    noticeboard.find({ property_id_arr: { $in: pArr }, deleted: false })
                        .populate('assign_to_roles.role_id', 'title name description')
                        .populate('assign_to_users.users_id', '_id firstname lastname image')
                        .populate('property_id_arr', 'property_name address image')
                        .limit(5)
                        .sort({ created: -1 }).exec(function (err, pdata) {

                            if (err) {
                                callback(error);
                            } else if (!pdata) {
                                callback(null, []);
                            } else {
                                callback(null, pdata);
                            }
                        });
                }
            });
        }, function (arg, callback) {
            var totalNoticePostCnt = [];
            var cnt = 0;
            if (arg.length > 0) {
                async.each(arg, function (item, asyncCall) {
                    var newItem = JSON.stringify(item);
                    var newItem = JSON.parse(newItem);

                    noticeboardpost.count({ noticeboard_id: mongoose.Types.ObjectId(newItem._id) }, function (err, cnt) {
                        if (err) {
                            newItem.noticePostCnt = 0;
                            totalNoticePostCnt.push(newItem);
                            asyncCall(null, totalNoticePostCnt);
                        } else {
                            newItem.noticePostCnt = cnt;
                            totalNoticePostCnt.push(newItem);
                            asyncCall(null, totalNoticePostCnt);
                        }
                    });
                }, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, totalNoticePostCnt);
                    }
                });
            } else {
                callback(null, arg);
            }
        },
        function (arg1, callback) {
            var favArray = [];
            if (arg1.length > 0) {
                var newItem = JSON.stringify(arg1);
                var newItem = JSON.parse(newItem);

                async.each(newItem, function (item, asyncCall) {

                    favourites.findOne({
                        "is_deleted": false,
                        "fav_to_noticeboard": mongoose.Types.ObjectId(newItem._id),
                        "fav_by": mongoose.Types.ObjectId(user_id)
                    },
                        { fav_status: 1 })
                        .sort({ createdAt: -1 }).exec(function (err, fav) {
                            if (err) {
                                item.is_fav = 2;
                                favArray.push(item);
                                asyncCall(null, favArray);
                            } else {
                                if (fav) {
                                    item.is_fav = fav.fav_status;
                                    favArray.push(item);
                                    asyncCall(null, favArray);
                                } else {
                                    item.is_fav = 2;
                                    favArray.push(item);
                                    asyncCall(null, favArray);
                                }
                            }
                        });
                }, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, favArray);
                    }
                });
            } else {
                callback(null, arg1);
            }
        },
    ], function (err, result) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, data: result });
        }
    });

}

/**
 * [Notice Board list - Notice board List]
 * @param  {object} req
 * @param  {object} res
 */
function noticeboardList(req, res) {
    var page_number = (typeof req.body.current_page != 'undefined') ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = (typeof req.body.number_of_pages != 'undefined') ? parseInt(req.body.number_of_pages) : 100;
    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var role_id = (typeof req.body.role_id != 'undefined') ? req.body.role_id : '';
    var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';

    var getPropertiesArray = function (user_id, role_id, agency_id, number_of_pages, page_number, callback) {

        if (role_id || user_id) {
            var conditions = { "$and": [] };
            conditions["$and"].push({ "is_deleted": false, "save_as_draft": false });
            if (role_id == Constant.OWN_AGENCY && agency_id)
                conditions["$and"].push({ "created_by_agency_id": agency_id });
            if (role_id == Constant.AGENT && user_id)
                conditions["$and"].push({ "created_by": user_id });
            if (role_id == Constant.OWNER && user_id)
                conditions["$and"].push({ "owned_by": user_id });
            if (role_id == Constant.TENANT && user_id) {
                InvitationInfo.find({ invited_to: mongoose.Types.ObjectId(user_id), deleted: false, status: true, invitation_status: 2 }, { "_id": 1, "property_id": 1 }, function (err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        if (!data) {
                            callback(null, []);
                        } else {
                            var property_id_arr = [];
                            for (var i = 0; i < data.length; i++) {
                                var property_id = mongoose.Types.ObjectId(data[i]._id);
                                property_id_arr.push(property_id);
                            }
                            callback(null, property_id_arr);
                        }
                    }
                });

            } else {
                propertyModel.find(conditions, { "_id": 1, "property_id": 1 })
                    .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
                    .sort({ created: -1 }).exec(function (err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            if (!data) {
                                callback(null, []);
                            } else {
                                var propertyArr = [];
                                for (var i = 0; i < data.length; i++) {
                                    var property_id = mongoose.Types.ObjectId(data[i]._id);
                                    propertyArr.push(property_id);
                                }
                                callback(null, propertyArr);
                            }
                        }
                    });
            }
        } else {
            callback(null, []);
        }
    };

    waterfall([
        function (callback) {
            getPropertiesArray(user_id, role_id, agency_id, number_of_pages, page_number, function (error, pArr) {
                if (error) {
                    callback(error);
                } else if (!pArr) {
                    callback(null, []);
                } else {

                    noticeboard.find({ property_id_arr: { $in: pArr }, deleted: false })
                        .populate('assign_to_roles.role_id', 'title name description')
                        .populate('assign_to_users.users_id', '_id firstname lastname image')
                        .populate('property_id_arr', 'property_name address image created_by created_by_agency_id owned_by')
                        .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
                        .sort({ createdAt: -1 }).lean().exec(function (err, pdata) {

                            if (err) {
                                callback(error);
                            } else if (!pdata) {
                                callback(null, []);
                            } else {
                                callback(null, pdata);
                            }
                        });
                }
            });
        }, function (arg, callback) {
            var totalNoticePostCnt = [];
            var cnt = 0;
            if (arg.length > 0) {
                async.each(arg, function (item, asyncCall) {
                    var newItem = JSON.stringify(item);
                    var newItem = JSON.parse(newItem);

                    noticeboardpost.count({ noticeboard_id: mongoose.Types.ObjectId(newItem._id), deleted: false }, function (err, cnt) {
                        if (err) {
                            newItem.noticePostCnt = 0;
                            totalNoticePostCnt.push(newItem);
                            asyncCall(null, totalNoticePostCnt);
                        } else {
                            newItem.noticePostCnt = cnt;
                            totalNoticePostCnt.push(newItem);
                            asyncCall(null, totalNoticePostCnt);
                        }
                    });
                }, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, totalNoticePostCnt);
                    }
                });
            } else {
                callback(null, arg);
            }
        },
        function (arg1, callback) {
            var favArray = [];
            if (arg1.length > 0) {
                var newItem = JSON.stringify(arg1);
                var newItem = JSON.parse(newItem);

                async.each(newItem, function (item, asyncCall) {

                    favourites.findOne({
                        "is_deleted": false,
                        "fav_to_noticeboard": mongoose.Types.ObjectId(item._id),
                        "fav_by": mongoose.Types.ObjectId(user_id)
                    },
                        { fav_status: 1 })
                        .sort({ createdAt: -1 }).lean().exec(function (err, fav) {
                            if (err) {
                                item.is_fav = 2;
                                favArray.push(item);
                                asyncCall(null, favArray);
                            } else {
                                if (fav) {
                                    item.is_fav = fav.fav_status;
                                    favArray.push(item);
                                    asyncCall(null, favArray);
                                } else {
                                    item.is_fav = 2;
                                    favArray.push(item);
                                    asyncCall(null, favArray);
                                }
                            }
                        });
                }, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, favArray);
                    }
                });
            } else {
                callback(null, arg1);
            }
        },
        function (arg, callback) {
            async.each(arg, function (noticeboard, loop_callback) {
                let cnt = 0;
                let roleIds = [];
                noticeboard.assign_to_roles.map(function (roleObj) {
                    if (roleObj && roleObj.role_id && roleObj.role_id._id) {
                        roleIds.push(JSON.stringify(roleObj.role_id._id));
                    }
                });

                async.each(noticeboard.property_id_arr, function (propertyId, innerLoop) {
                    async.parallel({
                        ownByGroup: function (callback) {
                            Groups.find({ user_id: mongoose.Types.ObjectId(propertyId.owned_by) }, { role_id: 1 }, function (err, group) {
                                if (err) {
                                    callback(null, 0);
                                } else if (group && group.length > 0) {
                                    callback(null, group);
                                } else {
                                    callback(null, 0);
                                }
                            })
                        },
                        createdByGroup: function (callback) {
                            Groups.find({ user_id: mongoose.Types.ObjectId(propertyId.created_by) }, { role_id: 1 }, function (err, group) {
                                if (err) {
                                    callback(null, 0);
                                } else if (group && group.length > 0) {
                                    callback(null, group);
                                } else {
                                    callback(null, 0);
                                }
                            })
                        },
                        createdByAgencyGroup: function (callback) {
                            Groups.find({ user_id: mongoose.Types.ObjectId(propertyId.created_by_agency_id) }, { role_id: 1 }, function (err, group) {
                                if (err) {
                                    callback(null, 0);
                                } else if (group && group.length > 0) {
                                    callback(null, group);
                                } else {
                                    callback(null, 0);
                                }
                            })
                        },
                    }, function (err, parallelResponse) {
                        if (!err) {

                            let roles = [];

                            if (parallelResponse.ownByGroup && parallelResponse.ownByGroup !== 0 && parallelResponse.ownByGroup.length > 0) {
                                roles = roles.concat(parallelResponse.ownByGroup);
                            }
                            if (parallelResponse.createdByGroup && parallelResponse.createdByGroup !== 0 && parallelResponse.createdByGroup.length > 0) {
                                roles = roles.concat(parallelResponse.createdByGroup);
                            }
                            if (parallelResponse.createdByAgencyGroup && parallelResponse.createdByAgencyGroup !== 0 && parallelResponse.createdByAgencyGroup.length > 0) {
                                roles = roles.concat(parallelResponse.createdByAgencyGroup);
                            }

                            roles = _.pluck(roles, 'role_id');
                            roles = _.uniq(roles);

                            roles.map(function (obj) {
                                if (roleIds.indexOf(JSON.stringify(obj)) !== -1) {
                                    cnt = cnt + 1;
                                }
                            })
                            innerLoop();
                        } else {                            
                            innerLoop();
                        }
                    });
                }, function (err1) {
                    if (err1) {
                        noticeboard.members_count = 0;
                    } else {
                        noticeboard.members_count = cnt;
                    }
                    loop_callback();
                });
                // var roleIds = [];
                // noticeboard.assign_to_roles.map((role) => {
                //     roleIds.push(role.role_id._id);
                // });
            }, function (err) {
                callback(null, arg)
            });
        }
    ], function (err, result) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, data: result });
        }
    });

}


/**
 * [Add Faviourate - Get Faviourate noticeboard list ]
 * @param  {object} req user id - current user logged in id
 * @param  {object} res
 */
function getFaviourateNoticeboardList(req, res) {

    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 100;

    if (user_id) {
        var getFavNoticebaordIds = function (user_id, callback) {

            favourites.find({ "is_deleted": false, fav_type: 3, fav_status: 1, fav_by: mongoose.Types.ObjectId(user_id) },
                { fav_to_noticeboard: 1 }, function (err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        if (!data) {
                            callback(null, []);
                        } else {
                            var noticeboard_arr = [];
                            for (var i = 0; i < data.length; i++) {
                                var noticeboard = mongoose.Types.ObjectId(data[i].fav_to_noticeboard);
                                noticeboard_arr.push(noticeboard);
                            }
                            callback(null, noticeboard_arr);
                        }
                    }
                });
        }

        waterfall([
            function (callback) {
                getFavNoticebaordIds(user_id, function (error, noticeArr) {
                    if (error) {
                        callback(error);
                    } else if (!noticeArr) {
                        callback(null, []);
                    } else {
                        noticeboard.find({ "_id": { $in: noticeArr }, deleted: false })
                            .populate('assign_to_roles.role_id', 'title name description')
                            .populate('assign_to_users.users_id', '_id firstname lastname image')
                            .populate('property_id_arr', 'property_name address image created_by created_by_agency_id owned_by')
                            .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
                            .sort({ created: -1 }).lean().exec(function (err, ndata) {
                                if (err) {
                                    callback(error);
                                } else if (!ndata) {
                                    callback(null, []);
                                } else {
                                    callback(null, ndata);
                                }
                            });
                    }
                });
            },
            function (arg, callback) {
                async.each(arg, function (noticeboard, loop_callback) {
                    let cnt = 0;
                    let roleIds = [];
                    noticeboard.assign_to_roles.map(function (roleObj) {
                        if (roleObj && roleObj.role_id && roleObj.role_id._id) {
                            roleIds.push(JSON.stringify(roleObj.role_id._id));
                        }
                    });

                    async.each(noticeboard.property_id_arr, function (propertyId, innerLoop) {
                        async.parallel({
                            ownByGroup: function (callback) {
                                Groups.find({ user_id: mongoose.Types.ObjectId(propertyId.owned_by) }, { role_id: 1 }, function (err, group) {
                                    if (err) {
                                        callback(null, 0);
                                    } else if (group && group.length > 0) {
                                        callback(null, group);
                                    } else {
                                        callback(null, 0);
                                    }
                                })
                            },
                            createdByGroup: function (callback) {
                                Groups.find({ user_id: mongoose.Types.ObjectId(propertyId.created_by) }, { role_id: 1 }, function (err, group) {
                                    if (err) {
                                        callback(null, 0);
                                    } else if (group && group.length > 0) {
                                        callback(null, group);
                                    } else {
                                        callback(null, 0);
                                    }
                                })
                            },
                            createdByAgencyGroup: function (callback) {
                                Groups.find({ user_id: mongoose.Types.ObjectId(propertyId.created_by_agency_id) }, { role_id: 1 }, function (err, group) {
                                    if (err) {
                                        callback(null, 0);
                                    } else if (group && group.length > 0) {
                                        callback(null, group);
                                    } else {
                                        callback(null, 0);
                                    }
                                })
                            },
                        }, function (err, parallelResponse) {
                            if (!err) {

                                let roles = [];

                                if (parallelResponse.ownByGroup && parallelResponse.ownByGroup !== 0 && parallelResponse.ownByGroup.length > 0) {
                                    roles = roles.concat(parallelResponse.ownByGroup);
                                }
                                if (parallelResponse.createdByGroup && parallelResponse.createdByGroup !== 0 && parallelResponse.createdByGroup.length > 0) {
                                    roles = roles.concat(parallelResponse.createdByGroup);
                                }
                                if (parallelResponse.createdByAgencyGroup && parallelResponse.createdByAgencyGroup !== 0 && parallelResponse.createdByAgencyGroup.length > 0) {
                                    roles = roles.concat(parallelResponse.createdByAgencyGroup);
                                }

                                roles = _.pluck(roles, 'role_id');
                                roles = _.uniq(roles);

                                roles.map(function (obj) {
                                    if (roleIds.indexOf(JSON.stringify(obj)) !== -1) {
                                        cnt = cnt + 1;
                                    }
                                })
                                innerLoop();
                            } else {                                
                                innerLoop();
                            }
                        });
                    }, function (err1) {
                        if (err1) {
                            noticeboard.members_count = 0;
                        } else {
                            noticeboard.members_count = cnt;
                        }
                        loop_callback();
                    });
                    // var roleIds = [];
                    // noticeboard.assign_to_roles.map((role) => {
                    //     roleIds.push(role.role_id._id);
                    // });
                }, function (err) {
                    callback(null, arg)
                });
            }
        ], function (err, result) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
            } else {
                res.json({ code: Constant.SUCCESS_CODE, data: result });
            }
        });


    } else {
        res.json({
            code: Constant.ERROR_CODE,
            message: Constant.ERROR_RETRIVING_DATA
        });
    }

}

function addNoticeboard(req, res) {
    var property_arr = (typeof req.body.propertiesArr != 'undefined') ? req.body.propertiesArr : [];
    var createdBy = (typeof req.body.created_by != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by) : '';
    var agency_id = (typeof req.body.agency_id != 'undefined') ? mongoose.Types.ObjectId(req.body.agency_id) : '';
    var assign_to_roles = (typeof req.body.assign_to_roles != 'undefined') ? req.body.assign_to_roles : [];
    var title = req.body.title ? req.body.title : "";
    var description = req.body.description ? req.body.description : "";
    if (createdBy || property_arr || agency_id) {
        var obj = {};
        obj.title = title;
        obj.description = description;
        obj.property_id_arr = property_arr;
        if (agency_id && validator.isValidObject(agency_id))
            obj.agency_id = agency_id;
        if (createdBy && validator.isValidObject(createdBy))
            obj.createdby = createdBy;
        if (assign_to_roles) {
            var assignToRolesArr = [];
            for (var i = 0; i < assign_to_roles.length; i++) {
                if (assign_to_roles.indexOf(assign_to_roles[i]._id) === -1) {
                    assignToRolesArr.push({ "role_id": mongoose.Types.ObjectId(assign_to_roles[i]._id) });
                }
            }

            obj.assign_to_roles = assignToRolesArr;
        }

        var chars = "123456789";
        var noticeId = '';
        for (var x = 0; x < 9; x++) {
            var i = Math.floor(Math.random() * chars.length);
            noticeId += chars.charAt(i);
        }
        obj.noticeboard_id = noticeId;

        var notice = new noticeboard(obj);
        notice.save(function (err, noticeData) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                res.json({ code: Constant.SUCCESS_CODE, data: noticeData });
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }

}


function editNoticeboard(req, res) {
    var property_arr = (typeof req.body.propertiesArr != 'undefined') ? req.body.propertiesArr : [];
    var createdBy = (typeof req.body.created_by != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by) : '';
    var agency_id = (typeof req.body.agency_id != 'undefined') ? mongoose.Types.ObjectId(req.body.agency_id) : '';
    var assign_to_roles = (typeof req.body.assign_to_roles != 'undefined') ? req.body.assign_to_roles : [];
    //var title = req.body.title ? req.body.title : "";
    //var description = req.body.description ? req.body.description : "";
    var obj = {};
    obj.updatedAt = new Date();
    obj.description = '';
    obj.title = '';
    if (req.body._id && property_arr && createdBy) {
        obj.property_id_arr = property_arr;
        if (agency_id && validator.isValidObject(agency_id))
            obj.agency_id = agency_id;
        if (createdBy && validator.isValidObject(createdBy))
            obj.createdby = createdBy;
        if (assign_to_roles) {
            var assignToRolesArr = [];
            for (var i = 0; i < assign_to_roles.length; i++) {
                if (assign_to_roles.indexOf(assign_to_roles[i]._id) === -1) {
                    assignToRolesArr.push({ "role_id": mongoose.Types.ObjectId(assign_to_roles[i]._id) });
                }
            }

            obj.assign_to_roles = assignToRolesArr;
        }

        noticeboard.update({
            '_id': req.body._id
        }, {
                $set: obj
            }, function (err, data) {
                if (err) {
                    res.json({
                        code: 400,
                        message: "Issue with noticeboard updating"
                    });
                } else {
                    res.json({
                        code: 200,
                        message: "Noticeboard updated successfully"
                    });
                }
            })
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }

}




function addNoticeboardPost(req, res) {

    var title = (typeof req.body.title != 'undefined') ? req.body.title : '';
    var agenda_resolution = (typeof req.body.agenda_resolution != 'undefined') ? req.body.agenda_resolution : '';
    var description = (typeof req.body.description != 'undefined') ? req.body.description : '';
    var message = (typeof req.body.description != 'undefined') ? req.body.description : '';
    var noticeboard_id = (typeof req.body.noticeboard_id != 'undefined') ? mongoose.Types.ObjectId(req.body.noticeboard_id) : '';
    var createdby = (typeof req.body.created_by != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by) : '';
    var agency_id = (typeof req.body.agency_id != 'undefined') ? mongoose.Types.ObjectId(req.body.agency_id) : '';
    var enable_thread_post = (typeof req.body.enable_thread_post != 'undefined') ? req.body.enable_thread_post : true;
    var assign_to_users = (typeof req.body.assign_to_users != 'undefined') ? req.body.assign_to_users : [];
    var assign_to_roles = (typeof req.body.assign_to_roles != 'undefined') ? req.body.assign_to_roles : [];

    if (createdby) {

        var obj = {};

        obj.title = title;
        obj.agenda_resolution = agenda_resolution;
        obj.description = description;
        obj.message = message;
        obj.enable_thread_post = enable_thread_post;

        if (validator.isValidObject(noticeboard_id))
            obj.noticeboard_id = noticeboard_id;
        if (agency_id && validator.isValidObject(agency_id))
            obj.agency_id = agency_id;
        if (createdby && validator.isValidObject(createdby))
            obj.createdby = createdby;


        if (assign_to_roles) {
            var assignToRolesArr = [];
            for (var i = 0; i < assign_to_roles.length; i++) {
                if (assign_to_roles.indexOf(assign_to_roles[i]._id) === -1) {
                    assignToRolesArr.push({ "role_id": mongoose.Types.ObjectId(assign_to_roles[i]._id) });
                }
            }
            obj.assign_to_roles = assignToRolesArr;
        }

        if (assign_to_users) {
            var assignToUsersArr = [];
            for (var i = 0; i < assign_to_users.length; i++) {
                if (assign_to_users.indexOf(assign_to_users[i]._id) === -1) {
                    assignToUsersArr.push({ "users_id": mongoose.Types.ObjectId(assign_to_users[i]._id) });
                }
            }
            obj.assign_to_users = assignToUsersArr;
        }

        var notice = new noticeboardpost(obj);
        notice.save(function (err, noticeData) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                noticeboard.findById({ _id: noticeboard_id }).
                    populate('property_id_arr', 'property_name description address image')
                    .populate('createdby', 'firstname lastname image')
                    .populate('assign_to_roles.role_id', '_id title name description')
                    .populate('assign_to_users.users_id', '_id firstname lastname image')
                    .exec(function (err, data) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                        } else {
                            if (data) {
                                let i = 0;
                                let length = data.property_id_arr.length;
                                let address = "";
                                for (i; i < length; i++) {
                                    address = address + ',' + data.property_id_arr[i].address;
                                }
                                var to_users = [];
                                var obj2 = {};
                                obj2.subject = "New Notice post";
                                obj2.message = "New post from " + data.createdby.firstname + " " + data.createdby.lastname + " in Property " + address;
                                obj2.from_user = mongoose.Types.ObjectId(data.createdby._id);
                                obj2.to_users = data.assign_to_users;
                                obj2.type = Constant.NOTIFICATION_TYPE_NOTICE_BOARD;
                                var notification = new NotificationInfo(obj2);
                                notification.save(function (err, notData) {
                                    if (err) {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                    } else {
                                        res.json({ code: Constant.SUCCESS_CODE, data: data });
                                    }
                                });
                            } else {
                                res.json({ code: Constant.SUCCESS_CODE, data: data });
                            }
                        }
                    });
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

function noticeBoardDetail(req, res) {

    var noticeboard_id = mongoose.Types.ObjectId(req.swagger.params.id.value);

    noticeboard.aggregate([
        { $match: { "_id": noticeboard_id } }, // Match me
        { $lookup: { from: 'noticeboardposts', localField: '_id', foreignField: 'noticeboard_id', as: 'noticeboardposts' } },
        // { $match: {"noticeboardposts.deleted": false} },
        {
            $project: {
                _id: 1,
                property_id_arr: 1, description: 1, noticeboard_id: 1, title: 1, createdby: 1, agency_id: 1, updatedAt: 1, assign_to_roles: 1, createdAt: 1,
                noticeboardposts: {
                    _id: 1,
                    noticeboard_id: 1,
                    title: 1,
                    createdAt: 1,
                    agenda_resolution: 1,
                    description: 1,
                    message: 1,
                    createdby: 1,
                    agency_id: 1,
                    assign_to_roles: 1,
                    assign_to_users: 1,
                    enable_thread_post: 1,
                    deleted: 1
                }
            },
        },
    ])
        .allowDiskUse(true)
        .exec(function (err, result) {            
            if (err) {
                var outputJSON = {
                    'code': Constant.ERROR_CODE,
                    'message': Constant.ERROR_RETRIVING_DATA
                };
            } else {

                async.waterfall([
                    function (callback) {
                        noticeboard.populate(result, { "path": "property_id_arr", "select": "_id address image description owned_by created_by created_by_agency_id" }, function (err, finalData) {
                            if (err) {
                                var outputJSON = {
                                    'code': Constant.ERROR_CODE,
                                    'message': Constant.ERROR_RETRIVING_DATA
                                };
                            } else {
                                noticeboard.populate(finalData, { "path": "assign_to_roles.role_id", "select": "_id title name description" }, function (err, Arr) {
                                    if (err) {
                                        var outputJSON = {
                                            'code': Constant.ERROR_CODE,
                                            'message': Constant.ERROR_RETRIVING_DATA
                                        };
                                    } else {
                                        let length = Arr[0].noticeboardposts.length;
                                        let index = 0;
                                        let temp_arr_new = [];
                                        let array = Arr[0].noticeboardposts;
                                        array.forEach(function (element) {
                                            if (element.deleted == false) {
                                                temp_arr_new.push(element);
                                            }

                                        }, this);
                                        Arr[0].noticeboardposts = temp_arr_new;
                                        noticeboard.populate(Arr, { path: 'noticeboardposts.assign_to_roles.role_id', model: 'Role', select: "_id name description" }, function (err, completeData) {
                                            if (err) {
                                                var outputJSON = {
                                                    'code': Constant.ERROR_CODE,
                                                    'message': Constant.ERROR_RETRIVING_DATA
                                                };
                                            } else {
                                                var outputJSON = {
                                                    'code': Constant.SUCCESS_CODE,
                                                    'data': completeData
                                                };
                                                callback(null, outputJSON);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }, function (resp, callback) {                        
                        async.eachSeries(result[0].noticeboardposts, function (noticeboard, loop_callback) {
                            let cnt = 0;
                            let roleIds = [];
                            let roles = [];

                            noticeboard['assign_to_roles'].map((roleObj) => {
                                if (roleObj && roleObj.role_id && roleObj.role_id._id) {
                                    roleIds.push(JSON.stringify(roleObj.role_id._id));
                                }
                            });

                            async.eachSeries(result[0].property_id_arr, function (propertyId, innerLoop) {
                                async.parallel({
                                    ownByGroup: function (parallelCallback) {
                                        Groups.find({ user_id: mongoose.Types.ObjectId(propertyId.owned_by) }, { role_id: 1 }, function (err, group) {                                            
                                            if (err) {
                                                parallelCallback(null, 0);
                                            } else if (group && group.length > 0) {
                                                parallelCallback(null, group);
                                            } else {
                                                parallelCallback(null, 0);
                                            }
                                        })
                                    },
                                    createdByGroup: function (parallelCallback) {
                                        Groups.find({ user_id: mongoose.Types.ObjectId(propertyId.created_by) }, { role_id: 1 }, function (err, group) {
                                            if (err) {
                                                parallelCallback(null, 0);
                                            } else if (group && group.length > 0) {
                                                parallelCallback(null, group);
                                            } else {
                                                parallelCallback(null, 0);
                                            }
                                        })
                                    },
                                    createdByAgencyGroup: function (parallelCallback) {
                                        Groups.find({ user_id: mongoose.Types.ObjectId(propertyId.created_by_agency_id) }, { role_id: 1 }, function (err, group) {
                                            if (err) {
                                                parallelCallback(null, 0);
                                            } else if (group && group.length > 0) {
                                                parallelCallback(null, group);
                                            } else {
                                                parallelCallback(null, 0);
                                            }
                                        })
                                    },
                                }, function (err, parallelResponse) {
                                    if (!err) {
                                        let Newroles = [];
                                        if (parallelResponse.ownByGroup && parallelResponse.ownByGroup !== 0 && parallelResponse.ownByGroup.length > 0) {
                                            Newroles = Newroles.concat(parallelResponse.ownByGroup);
                                        }
                                        if (parallelResponse.createdByGroup && parallelResponse.createdByGroup !== 0 && parallelResponse.createdByGroup.length > 0) {
                                            Newroles = Newroles.concat(parallelResponse.createdByGroup);
                                        }
                                        if (parallelResponse.createdByAgencyGroup && parallelResponse.createdByAgencyGroup !== 0 && parallelResponse.createdByAgencyGroup.length > 0) {
                                            Newroles = Newroles.concat(parallelResponse.createdByAgencyGroup);
                                        }

                                        Newroles = _.pluck(Newroles, 'role_id');
                                        
                                        roles = roles.concat(Newroles);

                                        innerLoop();
                                    } else {
                                        // console.log("err : ", err);
                                        innerLoop();
                                    }
                                });
                            }, function (err1) {
                                if (err1) {
                                    noticeboard.members_count = 0;
                                } else {
                                    roles = roles.map((r) => {return JSON.stringify(r)})
                                    roles = _.uniq(roles);                                    
                                    roles.map(function (obj) {
                                        if (roleIds.indexOf(obj) !== -1) {
                                            cnt = cnt + 1;
                                        }
                                    })
                                    noticeboard.members_count = cnt;
                                }
                                loop_callback();
                            });

                        }, function (err1) {
                            callback(null, resp)
                        });
                    }
                ], function (err, data) {                    
                    res.jsonp(data);
                });


            }
        });
}


function noticeboardPostDetail(req, res) {

    var noticeboardpost_id = mongoose.Types.ObjectId(req.swagger.params.id.value);

    noticeboardpost.findById({ _id: noticeboardpost_id })
        .populate('noticeboard_id', '_id property_id_arr assign_to_roles')
        .populate('assign_to_roles.role_id', '_id name description')
        .populate('assign_to_users.users_id', 'firstname lastname image')
        .exec(function (err, data) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
            } else {                
                noticeboardpost.populate(data, { path: 'noticeboard_id.property_id_arr', model: 'properties', select: '_id address description' }, function (err, finalData) {
                    if (err) {
                        var outputJSON = {
                            'code': Constant.ERROR_CODE,
                            'message': Constant.ERROR_RETRIVING_DATA
                        };
                    } else {
                        noticeboardpost.populate(finalData, { path: 'noticeboard_id.assign_to_roles.role_id', model: 'Role', select: '_id name description' }, function (err, datas) {
                            if (err) {
                                var outputJSON = {
                                    'code': Constant.ERROR_CODE,
                                    'message': Constant.ERROR_RETRIVING_DATA
                                };
                            } else {
                                var outputJSON = {
                                    'code': Constant.SUCCESS_CODE,
                                    'data': datas
                                };
                                res.jsonp(outputJSON);
                            }
                        });
                    }
                });
            }
        });

}