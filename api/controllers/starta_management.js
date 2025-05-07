'use strict';
var mongoose = require('mongoose'),
    Agency = mongoose.model('Agency'),
    User = mongoose.model('User'),
    Group = mongoose.model('Group'),
    propertyModel = require('../models/Properties'),
    AgentRemovals = mongoose.model('AgentRemovals'),
    InvitationInfo = mongoose.model('invitations'),
    NotificationInfo = mongoose.model('NotificationStatus'),
    validator = require('../../config/validator.js'),
    waterfall = require('run-waterfall'),
    Config = require('../../config/config.js'),
    async = require('async'),
    forEach = require('async-foreach').forEach,
    Constant = require('../../config/constant.js');

module.exports = {
    startaUserList: startaUserList
};

/**
 * [startaUserList - get list of all agents]
 * @param  {object} req
 * @param  {object} res
 */
function startaUserList(req, res) {
    var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;
    var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
    var lastname = (typeof req.body.lastname != 'undefined') ? req.body.lastname : '';
    var state = (typeof req.body.state != 'undefined') ? req.body.state : '';
    var city = (typeof req.body.city != 'undefined') ? req.body.city : '';
    var zip_code = (typeof req.body.zip_code != 'undefined') ? req.body.zip_code : '';

    var conditions = { "$and": [] };
    conditions["$and"].push({ "is_deleted": false, "is_active": true, "agency_id": mongoose.Types.ObjectId(agency_id) });


    if (firstname)
        conditions["$and"].push({ "name": { $regex: new RegExp(firstname, "i") } });
    // if (lastname)
    //     conditions["$and"].push({ "lastname": { $regex: new RegExp(lastname, "i") } });
    if (state)
        conditions["$and"].push({ "state": { $regex: new RegExp(state, "i") } });
    if (city)
        conditions["$and"].push({ "city": { $regex: new RegExp(city, "i") } });
    if (zip_code)
        conditions["$and"].push({ "zipCode": { $regex: new RegExp(zip_code, "i") } });

    // console.log("conditions    ", conditions);
    waterfall([
        function (callback) {
            if (agency_id) {
                User.aggregate([
                    { $match: conditions }, // Match me
                    { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                    { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY), "groups.is_master_role": true, "groups.status": true, "groups.deleted": false } },
                    {
                        $group:
                        {
                            _id: null,
                            "count": { $sum: 1 }
                        }
                    }
                ])
                    .allowDiskUse(true)
                    .exec(function (err, result) {
                        // console.log("result");
                        // console.log(result);
                        if (err) {
                            callback({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
                        } else {
                            var totalCount = 0;
                            //console.log("result",result);
                            if (result.length > 0) {
                                totalCount = result[0].count;
                                User.aggregate(
                                    { $match: conditions }, // Match me
                                    { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                                    { $lookup: { from: 'reviews', localField: '_id', foreignField: 'review_to', as: 'reviews' } },
                                    {
                                        $project: {
                                            _id: 1, firstname: 1, lastname: 1, is_online: 1,
                                            email: 1, address: 1, totalPropertyCount: 1, about_user: 1,
                                            image: 1, images: 1, city: 1, state: 1, agency_id: 1,
                                            groups: { _id: 1, role_id: 1, status: 1, deleted: 1, is_master_role: 1 },
                                            reviews: { _id: 1, review_to: 1, review_by: 1, avg_total: 1 }
                                        }
                                    },
                                    { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY), "groups.is_master_role": true, "groups.status": true, "groups.deleted": false } },
                                    { $sort: { "createdAt": -1 } },
                                    { $skip: page_number * number_of_pages },
                                    { "$limit": number_of_pages }
                                ).exec(function (err, usersList) {
                                    if (err) {
                                        callback({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                    } else {

                                        Agency.populate(usersList, { "path": "agency_id" }, function (err, finalData) {
                                            if (err) {
                                                callback({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                            } else {
                                                callback(null, finalData, totalCount);
                                            }
                                        });
                                    }
                                });
                            } else {
                                callback(null, [], 0);
                            }
                        }
                    });
            } else {
                callback({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
            }
        },
        function (arg1, arg2, callback) {
            var finalResponse = [];
            async.each(arg1, function (item, asyncCall) {
                propertyModel.count({ created_by: item._id, save_as_draft: false }).exec(function (err, propertycnt) {
                    if (err) {
                        item.property_cnt = 0;
                        finalResponse.push(item);
                        asyncCall(null, finalResponse);
                    } else {
                        item.property_cnt = propertycnt;
                        finalResponse.push(item);
                        asyncCall(null, finalResponse);
                    }
                });
            }, function (err) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, finalResponse, arg2);
                }
            });
        },
        function (arg1, arg2, callback) {
            var finalResponse = [];
            async.each(arg1, function (item, asyncCall) {
                InvitationInfo.count({ invited_by: item._id, status: true }).exec(function (err, teamcnt) {
                    if (err) {
                        item.team_cnt = 0;
                        finalResponse.push(item);
                        asyncCall(null, finalResponse);
                    } else {
                        item.team_cnt = teamcnt;
                        finalResponse.push(item);
                        asyncCall(null, finalResponse);
                    }
                });
            }, function (err) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, finalResponse, arg2);
                }
            });
        },
        function (arg1, arg2, callback) {

            if (arg1.length > 0) {
                var finalResponse = [];
                async.each(arg1, function (item, asyncCall) {
                    var totalReviewLength = item.reviews.length;
                    if (typeof item.reviews != 'undefined' && item.reviews.length > 0) {
                        var temp = 0;
                        async.each(item.reviews, function (innerItem, asyncCallInner) {
                            temp = temp + innerItem.avg_total;
                            finalResponse.push(temp);
                            asyncCallInner(null, finalResponse);
                        }, function (err) {
                            if (err) {
                                asyncCall(err);
                            } else {
                                var tot = finalResponse.length;
                                var finalTotalCnt = (finalResponse.length > 0) ? finalResponse[tot - 1] : 0;
                                var averageRate = finalTotalCnt / totalReviewLength;

                                item.averageRate = Math.round(averageRate);
                                item.totalReviewLength = totalReviewLength;
                                finalResponse.push(item);
                                asyncCall(null, finalResponse);
                            }
                        });
                    } else {
                        asyncCall(null, arg1);
                    }
                }, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, arg1, arg2);
                    }
                });
            } else {
                callback(null, [], 0);
            }
        },

    ], function (err, result1, result2) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, data: result1, total_count: result2 });
        }
    });
}