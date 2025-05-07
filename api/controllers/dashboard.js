'use strict';
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Group = mongoose.model('Group'),
    propertyModel = require('../models/Properties'),
    agreements = mongoose.model('agreements'),
    InvitationInfo = mongoose.model('invitations'),
    maintenances = mongoose.model('maintenances'),
    async = require('async'),
    forEach = require('async-foreach').forEach,
    slug = require('slug'),
    Config = require('../../config/config.js'),
    Constant = require('../../config/constant.js'),
    randomString = require('random-string'),
    waterfall = require('run-waterfall'),
    moment = require('moment'),
    validator = require('../../config/validator.js'),
    _ = require('underscore');

module.exports = {
    dashboardInspection: dashboardInspection,
    getStatisticsData: getStatisticsData,
};

/* Method for getting inspection date and it will be calculate from after 6 mont of tenancy start date
   Created by Rahul Lahariya
   Date 23 Feb 2017
*/
function dashboardInspection(req, res) {
    /*
    console.log("dashboard called");
    //Update about user in group table.
    User.find({})
        .populate('_id', 'about_user')
        .exec(function (err, data) {
            if (err) {
            } else {
                data.map(function (value, key) {
                    console.log("called form inside");
                    Group.update({
                        'user_id': value._id,
                        'is_master_role': true,
                    }, {
                            $set: {
                                "about_user": value.about_user
                            }
                        }, function (err, data) {
                            if (err) {
                                console.log("error occured: " + err);
                            } else {
                                console.log("success : " + value.id + " -- " + data);
                            }

                        })
                });
            }
        }); */
    /////end of my new code.

    var request_by_role = req.body.request_by_role ? req.body.request_by_role : '';
    var request_by_id = req.body.request_by_id ? req.body.request_by_id : '';
    var agency_id = req.body.agency_id ? req.body.agency_id : '';
    var type = req.body.type ? req.body.type : '';
    var outputJSON = {};

    if (request_by_role && request_by_id) {
        var conditions = { "$and": [] };
        conditions["$and"].push({ "deleted": false, is_csv_uploade: false, save_as_draft: false });

        if ((request_by_role == Constant.AGENT || request_by_role == Constant.RUN_STRATA_MANAGEMENT_COMPANY || request_by_role == Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY) && (request_by_id))
            conditions["$and"].push({ "created_by": mongoose.Types.ObjectId(request_by_id) });
        if (request_by_role == Constant.OWN_AGENCY && agency_id)
            conditions["$and"].push({ "agency_id": mongoose.Types.ObjectId(agency_id) });
        if (request_by_role == Constant.TENANT && request_by_id)
            conditions["$and"].push({ "tenants.users_id": mongoose.Types.ObjectId(request_by_id) });
        if (request_by_role == Constant.OWNER || request_by_role == Constant.PROPERTY_OWNER)
            conditions["$and"].push({ "owner_id": mongoose.Types.ObjectId(request_by_id) });

        waterfall([function (callback) {
            agreements.find(conditions, 'property_id owner_id created_by tenancy_start_date case_validity')
                .populate('property_id', 'property_name description address  property_id')
                .populate('owner_id', 'firstname lastname image')
                .populate('created_by', 'firstname lastname image')
                .populate('tenants.users_id', 'firstname lastname image')
                .exec(function (err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, data);
                    }
                });
        },
        function (arg1, callback) {
            var dateArray = [];

            if (arg1.length > 0) {
                var newItem = JSON.stringify(arg1);
                var newItem = JSON.parse(newItem);

                async.each(newItem, function (item, asyncCall) {

                    if (item.tenancy_start_date != null && item.case_validity != null) {
                        var dateStart = moment(item.tenancy_start_date); // moment(item.tenancy_start_date).format("MM-DD-YYYY");   
                        var dateEnd = moment(item.case_validity); //moment(item.case_validity).format("MM-DD-YYYY");  
                        var timeValues = [];
                        //console.log("dateEnd",dateEnd,"dateStart",dateStart);
                        setTimeout(function () {
                            while (dateEnd > dateStart) {
                                dateStart.add(6, 'month');
                                if (dateEnd > dateStart)
                                    timeValues.push(dateStart.format('YYYY-MM-DD'));
                            }
                            item.inspection_date = timeValues;
                            dateArray.push(item);
                            asyncCall(null, dateArray);
                        }, 200);
                    } else {
                        item.inspection_date = null;
                        dateArray.push(item);
                        asyncCall(null, dateArray);
                    }

                }, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, newItem);
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
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

function getStatisticsData(req, res) {

    var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var request_by_role = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';

    var tenantCnt = 0;
    var propertyCnt = 0;
    var requestCnt = 0;

    if ((request_by_role == Constant.AGENT) && user_id) {

        waterfall([
            function (callback) {
                InvitationInfo.count({ invited_by: mongoose.Types.ObjectId(user_id), deleted: false, invitation_status: 2 }, function (err, tenantCnt) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, tenantCnt);
                    }
                });
            },
            function (tenantCnt, callback) {
                propertyModel.count({ created_by: mongoose.Types.ObjectId(user_id), is_deleted: false }, function (err, propertyCnt) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, tenantCnt, propertyCnt);
                    }
                });
            },
            function (tenantCnt, propertyCnt, callback) {
                var conditions = { "$and": [] };
                conditions["$and"].push({ "deleted": false });
                conditions["$and"].push({ $or: [{ "forwarded_by": mongoose.Types.ObjectId(user_id) }, { "created_by": mongoose.Types.ObjectId(user_id) }] });

                maintenances.count(conditions, function (err, requestCnt) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, tenantCnt, propertyCnt, requestCnt);
                    }
                });
            }
        ], function (err, tenantCnt, propertyCnt, requestCnt) {
            if (err) {
                outputJSON = {
                    code: Constant.ERROR_CODE,
                    message: Constant.PROPERTY_CREATE_UNSUCCESS
                };
            } else {
                var statics = { "tenantCnt": tenantCnt, "propertyCnt": propertyCnt, "requestCnt": requestCnt };
                var outputJSON = { code: Constant.SUCCESS_CODE, data: statics };
            }
            res.jsonp(outputJSON);
        });

    } else if ((request_by_role == Constant.OWN_AGENCY) && agency_id) {
        waterfall([
            function (callback) {
                User.aggregate([
                    { $match: { "agency_id": mongoose.Types.ObjectId(agency_id) } }, // Match me
                    { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                    { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.TENANT), "groups.is_master_role": true, "groups.status": true, "groups.deleted": false } },
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
                        if (err) {
                            callback(null, 0);
                        } else {
                            var tenantCnt = 0;
                            if (result.length > 0) {
                                tenantCnt = result[0].count;
                                callback(null, tenantCnt);
                            } else {
                                callback(null, 0);
                            }
                        }
                    });
            },
            function (tenantCnt, callback) {
                propertyModel.count({ created_by_agency_id: mongoose.Types.ObjectId(agency_id), is_deleted: false }, function (err, propertyCnt) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, tenantCnt, propertyCnt);
                    }
                });
            },
            function (tenantCnt, propertyCnt, callback) {
                maintenances.count({ agency_id: mongoose.Types.ObjectId(agency_id), deleted: false }, function (err, requestCnt) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, tenantCnt, propertyCnt, requestCnt);
                    }
                });
            }
        ], function (err, tenantCnt, propertyCnt, requestCnt) {
            if (err) {
                var outputJSON = {
                    code: Constant.ERROR_CODE,
                    message: Constant.PROPERTY_CREATE_UNSUCCESS
                };
            } else {
                var statics = { "tenantCnt": tenantCnt, "propertyCnt": propertyCnt, "requestCnt": requestCnt };
                var outputJSON = { code: Constant.SUCCESS_CODE, data: statics };
            }
            res.jsonp(outputJSON);
        });

    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}