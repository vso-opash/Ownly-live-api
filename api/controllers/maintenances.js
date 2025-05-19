'use strict';
var mongoose = require('mongoose'),
    maintenances = mongoose.model('maintenances'),
    propertyModel = require('../models/Properties'),
    NotificationInfo = mongoose.model('Notification'),
    maintenance_proposals = mongoose.model('maintenance_proposals'),
    maintentenance_traders_log = require('../models/MaintentenanceTradersLog'),
    Address = require('../models/Address'),
    Chats = mongoose.model('Chats'),
    User = mongoose.model('User'),
    InvitationInfo = mongoose.model('invitations'),
    Group = mongoose.model('Group'),
    reviews = mongoose.model('reviews'),
    moment = require('moment'),
    async = require('async'),
    slug = require('slug'),
    Config = require('../../config/config.js'),
    Constant = require('../../config/constant.js'),
    path = require('path'),
    waterfall = require('run-waterfall'),
    formidable = require('formidable'),
    noticeboard = mongoose.model('noticeboard'),
    easyimg = require('easyimage'),
    fs = require('fs-extra'),
    _ = require('underscore'),
    http = require("https"),
    request = require("request"),
    changeCase = require('change-case'),
    nodemailer = require("nodemailer"),
    smtpTransport = require('nodemailer-smtp-transport'),
    // transporter = nodemailer.createTransport(
    //     smtpTransport('smtp://' + Config.SMTP.authUser + ':' + Config.SMTP.authpass + '@smtp.gmail.com')
    // ),
    validator = require('../../config/validator.js');
// var transporter = nodemailer.createTransport({
//     host: Config.SMTP.host,
//     port: Config.SMTP.port,
//     secure: true,
//     auth: {
//         user: Config.SMTP.authUser,
//         pass: Config.SMTP.authpass
//     }
// });
var transporter = nodemailer.createTransport(smtpTransport({
    service: Config.SMTP.service,
    auth: {
        user: Config.SMTP.authUser,
        pass: Config.SMTP.authpass
    }
}));
const sms = require('../lib/sms');
var sendmail = require('sendmail')();
var lodash = require('lodash');
const mail_helper = require('../helpers/mail_helper')
module.exports = {
    generalThreadForAll: generalThreadForAll,
    generalThreadForMaintenance: generalThreadForMaintenance,
    addMaintenance: addMaintenance,
    cancelMaintenanceRequest: cancelMaintenanceRequest,
    activeMaintenanceList: activeMaintenanceList,
    getMaintenanceDetail: getMaintenanceDetail,
    maintenanceList: maintenanceList,
    maintenanceListAdmin: maintenanceListAdmin,
    getAdminMRcounts: getAdminMRcounts,
    maintenanceRequestByTenant: maintenanceRequestByTenant,
    getMaintenanceByProperty: getMaintenanceByProperty,
    uploadMaintenanceImages: uploadMaintenanceImages,
    uploadMobileMaintenanceImage: uploadMobileMaintenanceImage,
    uploadCompleteJobImages: uploadCompleteJobImages,
    uploadMobileCompleteJobImage: uploadMobileCompleteJobImage,
    uploadMobileProposalImage: uploadMobileProposalImage,
    completeJob: completeJob,
    confirmDeclineCompleteJob: confirmDeclineCompleteJob,
    acceptorDeniedJob: acceptorDeniedJob,
    propertyListForMaintenance: propertyListForMaintenance,
    counterProposals: counterProposals,
    acceptDeclineProposalRequest: acceptDeclineProposalRequest,
    forwardMaintenanceRequest: forwardMaintenanceRequest,
    uploadProposalImages: uploadProposalImages,
    adminGetMaintenanceDetail: adminGetMaintenanceDetail,
    adminGetMaintenanceProperty: adminGetMaintenanceProperty,
    getAllCounterProposals: getAllCounterProposals,
    removeWatcher: removeWatcher,
    addMR: addMR,
    applyForQuote: applyForQuote,
    hire_decline_trader: hire_decline_trader
};

/*
     Function to get general thread communcation
      Request param is
*/

function generalThreadForAll(req, res) {

    var request_by_role = req.body.request_by_role ? req.body.request_by_role : '';
    var request_by_id = req.body.created_by ? req.body.created_by : '';
    var agency_id = req.body.agency_id ? req.body.agency_id : '';
    var type = req.body.type ? req.body.type : '';
    // 1 for sent , 2 for accepted, 3 for booked, 4 for completed, 5 for closed, 6 for due
    // var request_id = req.body.request_id ? req.body.request_id: '';

    var conditions = { "$and": [] };
    conditions["$and"].push({ "deleted": false });

    if (request_by_role == Constant.RUN_STRATA_MANAGEMENT_COMPANY || request_by_role == Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY && (request_by_id))
        conditions["$and"].push({ "created_by": mongoose.Types.ObjectId(request_by_id) });

    if ((request_by_role == Constant.TENANT || request_by_role == Constant.OWNER || request_by_role == Constant.PROPERTY_OWNER) && (request_by_id)) {
        conditions["$and"].push({
            "created_by": mongoose.Types.ObjectId(request_by_id)
        });
    }
    if (request_by_role == Constant.AGENT && request_by_id) {
        conditions["$and"].push({
            $or: [{ "forwarded_by": mongoose.Types.ObjectId(request_by_id) },
            { "created_by": mongoose.Types.ObjectId(request_by_id) }
            ]
        });
    }

    if (request_by_role == Constant.OWN_AGENCY && agency_id) {
        conditions["$and"].push({
            "agency_id": mongoose.Types.ObjectId(agency_id),
            "is_forward": true
        });
    }

    if (request_by_role == Constant.TRADER && request_by_id) {
        conditions["$and"].push({
            "trader_id": mongoose.Types.ObjectId(request_by_id)
        });
    }

    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 5;
    var outputJSON = {};

    waterfall([
        function (callback) {

            maintenances.find(conditions)
                .populate('property_id', 'property_name description address image')
                .populate('trader_id', 'firstname lastname image')
                .populate('created_by_role', 'title name')
                .populate('created_by', 'firstname lastname image')
                .populate('categories_id', 'name')
                .populate('watchers_list.users_id', 'firstname lastname image')
                .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages).sort({ createdAt: -1 })
                .exec(function (err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        // console.log(data);
                        callback(null, data);
                    }
                });
        },
        function (arg1, callback) {

            var getPropertiesArray = function (user_id, role_id, agency_id, number_of_pages, page_number, next) {

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
                                next(err);
                            } else {
                                if (!data) {
                                    next(null, []);
                                } else {
                                    var property_id_arr = [];
                                    for (var i = 0; i < data.length; i++) {
                                        var property_id = mongoose.Types.ObjectId(data[i]._id);
                                        property_id_arr.push(property_id);
                                    }
                                    next(null, property_id_arr);
                                }
                            }
                        });

                    } else {
                        propertyModel.find(conditions, { "_id": 1, "property_id": 1 })
                            .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
                            .sort({ created: -1 }).exec(function (err, data) {
                                if (err) {
                                    next(err);
                                } else {
                                    if (!data) {
                                        next(null, []);
                                    } else {
                                        var propertyArr = [];
                                        for (var i = 0; i < data.length; i++) {
                                            var property_id = mongoose.Types.ObjectId(data[i]._id);
                                            propertyArr.push(property_id);
                                        }
                                        next(null, propertyArr);
                                    }
                                }
                            });
                    }
                } else {
                    next(null, []);
                }
            };

            getPropertiesArray(request_by_id, request_by_role, agency_id, number_of_pages, page_number, function (error, pArr) {
                if (error) {
                    callback(null, arg1, []);
                } else if (!pArr) {
                    callback(null, arg1, []);
                } else {
                    noticeboard.find({ property_id_arr: { $in: pArr }, deleted: false })
                        // .populate('assign_to_roles.role_id','title name description')
                        .populate('createdby', '_id firstname lastname image')
                        // .populate('property_id_arr','property_id property_name address image')
                        .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
                        .sort({ created: -1 }).exec(function (err, pdata) {
                            if (err) {
                                callback(null, arg1, []);
                            } else if (!pdata) {
                                callback(null, arg1, []);
                            } else {
                                callback(null, arg1, pdata);
                            }
                        });
                }
            });
        },
    ], function (err, result1, result2) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, maintenences: result1, noticeboard: result2 });
        }
    });
}

/*
     Function to get general thread communcation
*/

function generalThreadForMaintenance(req, res) {

    var request_by_role = req.body.request_by_role ? req.body.request_by_role : '';
    var request_by_id = req.body.created_by ? req.body.created_by : '';
    var agency_id = req.body.agency_id ? req.body.agency_id : '';
    var type = req.body.type ? req.body.type : '';
    // 1 for sent , 2 for accepted, 3 for booked, 4 for completed, 5 for closed, 6 for due
    // var request_id = req.body.request_id ? req.body.request_id: '';

    var conditions = { "$and": [] };
    conditions["$and"].push({ "deleted": false });

    if (request_by_role == Constant.RUN_STRATA_MANAGEMENT_COMPANY || request_by_role == Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY && (request_by_id))
        conditions["$and"].push({ "created_by": mongoose.Types.ObjectId(request_by_id) });

    if ((request_by_role == Constant.TENANT || request_by_role == Constant.OWNER || request_by_role == Constant.PROPERTY_OWNER) && (request_by_id)) {
        conditions["$and"].push({
            "created_by": mongoose.Types.ObjectId(request_by_id)
        });
    }
    if (request_by_role == Constant.AGENT && request_by_id) {
        conditions["$and"].push({
            $or: [{ "forwarded_by": mongoose.Types.ObjectId(request_by_id) },
            { "created_by": mongoose.Types.ObjectId(request_by_id) }
            ]
        });
    }

    if (request_by_role == Constant.OWN_AGENCY && agency_id) {
        conditions["$and"].push({
            "agency_id": mongoose.Types.ObjectId(agency_id),
            "is_forward": true
        });
    }

    if (request_by_role == Constant.TRADER && request_by_id) {
        conditions["$and"].push({
            "trader_id": mongoose.Types.ObjectId(request_by_id)
        });
    }

    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 5;
    var outputJSON = {};

    maintenances.find(conditions)
        .populate('property_id', 'property_name description address image')
        .populate('trader_id', 'firstname lastname image')
        .populate('created_by_role', 'title name')
        .populate('created_by', 'firstname lastname image')
        .populate('categories_id', 'name')
        .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages).sort({ createdAt: -1 })
        .exec(function (err, data) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
            } else {
                res.json({ code: Constant.SUCCESS_CODE, result: data });
            }
        });
}

/**
 * [adminGetMaintenanceProperty -
  get maintenance by property id]
 * @param  {object} req
 * @param  {object} res
 */
function adminGetMaintenanceProperty(req, res) {
    if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
        var outputJSON = {};
        var property_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
        maintenances.find({ "property_id": property_id, "deleted": false })
            .populate('property_id', 'property_name description address image')
            .populate('trader_id', 'firstname lastname image')
            .populate('created_by', 'firstname lastname image')
            .populate('categories_id', 'name')
            // .limit(parseInt(10)).skip(0).
            .sort({ createdAt: 1 })
            .exec(function (err, data) {
                if (err) {
                    outputJSON = {
                        'code': Constant.ERROR_CODE,
                        'message': Constant.ERROR_RETRIVING_DATA
                    };
                } else {
                    outputJSON = {
                        'code': Constant.SUCCESS_CODE,
                        'data': data
                    }
                }
                res.jsonp(outputJSON);
            });
    } else {
        res.json({ code: Constant.NOT_FOUND, message: Constant.ERROR_RETRIVING_DATA });
    }
}


/**
 * [agentsList - Get maintenance request by tenant]
 * @param  {object} req
 * @param  {object} res
 */
function maintenanceRequestByTenant(req, res) {

    var agency_id = req.body.agency_id ? req.body.agency_id : '';
    var request_by_role = req.body.request_by_role ? req.body.request_by_role : '';
    var request_by_id = req.body.request_by_id ? req.body.request_by_id : '';
    if (request_by_role) {
        var conditions = { "$and": [] };
        conditions["$and"].push({ "deleted": false, "req_status": 1 });
        // conditions["$and"].push({"req_status": {$in: [ 1, 7 ]} });
        conditions["$and"].push({ "agency_id": mongoose.Types.ObjectId(agency_id) });
        conditions["$and"].push({ "created_by_role": mongoose.Types.ObjectId(Constant.TENANT) });
        //if (request_by_role == Constant.AGENT && (request_by_id))
        //conditions["$and"].push({ "forwarded_by": mongoose.Types.ObjectId(request_by_id) });

        var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
        var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;
        var outputJSON = {};

        maintenances.find(conditions).populate('property_id', 'property_name description address image')
            .populate('trader_id', 'firstname lastname image')
            .populate('created_by_role', 'title name')
            .populate('created_by', 'firstname lastname image')
            .populate('categories_id', 'name')
            .populate('watchers_list.users_id', 'firstname lastname image')
            .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages).sort({ createdAt: -1 }).exec(function (err, data) {

                if (err) {
                    outputJSON = {
                        'code': Constant.ERROR_CODE,
                        'message': Constant.ERROR_RETRIVING_DATA
                    };
                } else {
                    outputJSON = {
                        'code': Constant.SUCCESS_CODE,
                        'data': data
                    }
                }
                res.jsonp(outputJSON);
            });
    } else {
        outputJSON = {
            'code': Constant.SUCCESS_CODE,
            'data': []
        }
        res.jsonp(outputJSON);
    }
}

function propertyListForMaintenance(req, res) {

    var request_by_role = req.body.request_by_role;
    var request_by_id = req.body.request_by_id;
    var agency_id = req.body.agency_id;

    if (request_by_role) {

        var conditions = { "$and": [] };
        conditions["$and"].push({ "is_deleted": false });
        conditions["$and"].push({ "save_as_draft": false });

        if ((request_by_role == Constant.AGENT || request_by_role == Constant.RUN_STRATA_MANAGEMENT_COMPANY || request_by_role == Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY) && (request_by_id))
            conditions["$and"].push({ "created_by": mongoose.Types.ObjectId(request_by_id) });

        if (request_by_role == Constant.OWNER || request_by_role == Constant.PROPERTY_OWNER && (request_by_id))
            conditions["$and"].push({ "owned_by": mongoose.Types.ObjectId(request_by_id) });

        if (request_by_role == Constant.OWN_AGENCY && agency_id)
            conditions["$and"].push({ "created_by_agency_id": mongoose.Types.ObjectId(agency_id) });

        // if (request_by_role == Constant.OWNER && request_by_id)
        //     conditions["$and"].push({"owned_by": mongoose.Types.ObjectId(request_by_id)});


        if (request_by_role == Constant.TENANT) {
            var getTenantProperty = function (userId, callback) {
                InvitationInfo.find({ invited_to: mongoose.Types.ObjectId(userId), deleted: false, status: true, invitation_status: 2 }, { property_id: 1 }, function (err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        if (!data) {
                            callback(null, []);
                        } else {
                            var property_id_arr = [];
                            for (var i = 0; i < data.length; i++) {
                                var property_id = mongoose.Types.ObjectId(data[i].property_id);
                                property_id_arr.push(property_id);
                            }
                            callback(null, property_id_arr);
                        }
                    }
                });
            };

            getTenantProperty(request_by_id, function (error, propertyArr) {
                //console.log("property_id_arr",propertyArr);
                if (error) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                }
                else if (!propertyArr) {
                    res.json({ code: Constant.SUCCESS_CODE, data: [] });
                }
                else {
                    propertyModel.find({ _id: { $in: propertyArr }, save_as_draft: false, is_deleted: false }, { title: 1, address: 1, created_by_agency_id: 1, country: 1, state: 1, city: 1, property_id: 1, image: 1 }).populate('owned_by', '_id firstname lastname').populate('created_by', 'firstname lastname image')
                        .exec(function (err, pdata) {

                            if (err || !pdata) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
                            } else {
                                propertyModel.populate(pdata, { path: 'created_by.agency_id', model: 'Agency' }, function (err, property) {
                                    if (err || !property) {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
                                    } else {
                                        property = property.map((r) => {
                                            var isFeatured = false;
                                            r.image = r.image.map((i) => {
                                                if (i.isFeatured) {
                                                    isFeatured = true;
                                                }
                                                return i;
                                            });
                                            if (!isFeatured && r.image && r.image.length > 0) {
                                                r.image[0].isFeatured = true;
                                            }
                                            return r;
                                        });

                                        res.json({
                                            code: 200,
                                            message: Constant.PROPERTY_SUCCESS_GOT_DATA,
                                            data: property
                                        });
                                    }
                                });
                            }
                        });
                }
            });
        } else {
            propertyModel.find(conditions, { title: 1, address: 1, created_by_agency_id: 1, country: 1, state: 1, city: 1, property_id: 1, image: 1 }).populate('owned_by', '_id firstname lastname').populate('created_by', 'firstname lastname image').exec(function (err, pdata) {
                if (err || !pdata) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
                } else {
                    propertyModel.populate(pdata, { path: 'created_by.agency_id', model: 'Agency' }, function (err, property) {
                        if (err || !property) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
                        } else {

                            property = property.map((r) => {
                                var isFeatured = false;
                                r.image = r.image.map((i) => {
                                    if (i.isFeatured) {
                                        isFeatured = true;
                                    }
                                    return i;
                                });
                                if (!isFeatured && r.image && r.image.length > 0) {
                                    r.image[0].isFeatured = true;
                                }
                                return r;
                            });

                            res.json({
                                code: 200,
                                message: Constant.PROPERTY_SUCCESS_GOT_DATA,
                                data: property
                            });
                        }
                    });
                }
            });
        }
    } else {
        res.json({
            code: Constant.ERROR_CODE,
            message: Constant.ERROR_RETRIVING_DATA
        });
    }
}
/**
 * [getMaintenanceByProperty - get maintenance by property id]
 * @param  {object} req
 * @param  {object} res
 */

function getMaintenanceByProperty(req, res) {

    if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
        var outputJSON = {};
        var property_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
        maintenances.find({ "property_id": property_id, "deleted": false })
            .populate('property_id', 'property_name description address image')
            .populate('trader_id', 'firstname lastname image')
            .populate('created_by', 'firstname lastname image')
            .populate('categories_id', 'name')
            .limit(parseInt(10)).skip(0).sort({ createdAt: 1 })
            .exec(function (err, data) {
                if (err) {
                    outputJSON = {
                        'code': Constant.ERROR_CODE,
                        'message': Constant.ERROR_RETRIVING_DATA
                    };
                } else {
                    outputJSON = {
                        'code': Constant.SUCCESS_CODE,
                        'data': data
                    }
                }
                res.jsonp(outputJSON);
            });
    } else {
        res.json({ code: Constant.NOT_FOUND, message: Constant.ERROR_RETRIVING_DATA });
    }
}

function getMaintenanceDetail(req, res) {
    // if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
    var outputJSON = {};
    var maintenance_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    // console.log("maintenance_id    ", maintenance_id);
    waterfall([
        function (callback) {
            maintenances.findById({ "_id": maintenance_id, "deleted": false })
                .populate('categories_id', 'name')
                .populate('property_id', 'property_name description address image owned_by')
                .populate('trader_id', 'firstname lastname image mobile_no createdAt address is_online city zipCode state')
                .populate('created_by_role', 'title name')
                .populate('created_by', 'firstname lastname image mobile_no createdAt address is_online city zipCode state')
                .populate('forwarded_by', 'firstname lastname image mobile_no createdAt address is_online city zipCode state')
                // .populate('categories_id', 'name')
                .populate('watchers_list.users_id', 'firstname lastname image')
                .populate('maintenance_log')
                .populate('maintentenance_counter_proposals')
                // .populate('categories_id')
                .exec(function (err, data) {
                    if (err) {
                        callback(err);
                    } else {

                        callback(null, data);
                    }
                });
        },
        function (arg1, callback) {

            if (arg1.trader_id && typeof arg1.trader_id != 'undefined') {
                var finalResponse = [];

                reviews.find({ review_to: arg1.trader_id }).exec(function (err, data) {
                    if (err) {
                        callback(null, arg1);
                    } else {
                        var newItem = JSON.stringify(arg1);
                        var newItem = JSON.parse(newItem);
                        if (data.length > 0) {
                            async.each(data, function (item, asyncCall) {
                                var totalReviewLength = data.length;
                                var temp = 0;
                                async.each(data, function (innerItem, asyncCallInner) {
                                    temp = temp + innerItem.avg_total;
                                    finalResponse.push(temp);
                                    asyncCallInner(null, finalResponse);
                                }, function (err) {
                                    if (err) {
                                        asyncCall(err);
                                    } else {
                                        console.log('finalResponse ::  check for detail  => ', finalResponse);
                                        var tot = finalResponse.length;
                                        var finalTotalCnt = (finalResponse.length > 0) ? finalResponse[tot - 1] : 0;
                                        var averageRate = finalTotalCnt / totalReviewLength;

                                        newItem.averageTraderRate = Math.round(averageRate);
                                        newItem.totalTraderReviewLength = totalReviewLength;
                                        finalResponse.push(item);
                                        asyncCall(null, finalResponse);
                                    }
                                });
                            }, function (err) {
                                if (err) {
                                    callback(err);
                                } else {
                                    callback(null, arg1);
                                }
                            });
                        } else {
                            callback(null, arg1);
                        }
                    }
                });
            } else {
                callback(null, arg1);
            }
        }
    ], function (err, result) {
        console.log("Result  :: detail data ====> ", result);
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, data: result });
        }
    });
    // } else {
    //     res.json({ code: Constant.NOT_FOUND, message: Constant.ERROR_RETRIVING_DATA });
    // }
}

/**
 * [adminGetMaintenanceDetail list - get list of all maintenance]
 * @param  {object} req
 * @param  {object} res
 */

function adminGetMaintenanceDetail(req, res) {
    if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
        var outputJSON = {};
        var maintenance_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
        //console.log("maintenance_id", maintenance_id);
        maintenances.findOne({ "_id": maintenance_id, "deleted": false })
            .populate('property_id', 'property_name description address image')
            .populate('trader_id', 'firstname lastname image mobile_no createdAt address city state')
            .populate('created_by_role', 'title name')
            .populate('created_by', 'firstname lastname image')
            .populate('categories_id', 'name')
            .populate('watchers_list.users_id', 'firstname lastname image')
            .exec(function (err, data) {
                if (err) {
                    outputJSON = {
                        'code': Constant.ERROR_CODE,
                        'message': Constant.ERROR_RETRIVING_DATA
                    };
                } else {
                    outputJSON = {
                        'code': Constant.SUCCESS_CODE,
                        'data': data
                    }
                }
                res.jsonp(outputJSON);
            });
    } else {
        res.json({ code: Constant.NOT_FOUND, message: Constant.ERROR_RETRIVING_DATA });
    }
}

/**
 * [activeMaintenanceList list - get active maintenence list]
 * @param  {object} req
 * @param  {object} res
 */
function activeMaintenanceList(req, res) {

    var request_by_role = req.body.request_by_role ? req.body.request_by_role : '';
    var request_by_id = req.body.created_by ? req.body.created_by : '';
    var agency_id = req.body.agency_id ? req.body.agency_id : '';
    var type = req.body.type ? req.body.type : '';
    // 1 for sent , 2 for accepted, 3 for booked, 4 for completed, 5 for closed, 6 for due
    // var request_id = req.body.request_id ? req.body.request_id: '';

    var conditions = { "$and": [] };
    conditions["$and"].push({ "deleted": false });

    if ((request_by_role == Constant.TENANT || request_by_role == Constant.AGENT || request_by_role == Constant.OWNER || request_by_role == Constant.PROPERTY_OWNER || request_by_role == Constant.RUN_STRATA_MANAGEMENT_COMPANY || request_by_role == Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY) && (request_by_id)) {
        conditions["$and"].push({
            "created_by": mongoose.Types.ObjectId(request_by_id),
            $or: [{
                req_status: 1
            }, {
                req_status: 2
            }, {
                req_status: 3
            }]
        });
    }
    if (request_by_role == Constant.OWN_AGENCY && agency_id) {
        conditions["$and"].push({
            "agency_id": mongoose.Types.ObjectId(agency_id),
            $or: [{
                req_status: 1
            }, {
                req_status: 2
            }, {
                req_status: 3
            }]
        });
    }
    if (request_by_role == Constant.TRADER && request_by_id) {
        conditions["$and"].push({
            "trader_id": mongoose.Types.ObjectId(request_by_id),
            "is_forward": true,
            $or: [{
                req_status: 1
            }, {
                req_status: 2
            }, {
                req_status: 3
            }]
        });
    }


    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;
    var outputJSON = {};

    maintenances.find(conditions).populate('property_id', 'property_name description address image')
        .populate('trader_id', 'firstname lastname image')
        .populate('created_by_role', 'title name')
        .populate('created_by', 'firstname lastname image')
        .populate('categories_id', 'name')
        .populate('watchers_list.users_id', 'firstname lastname image')
        .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages).sort({ createdAt: -1 }).exec(function (err, data) {
            if (err) {
                outputJSON = {
                    'code': Constant.ERROR_CODE,
                    'message': Constant.ERROR_RETRIVING_DATA
                };
            } else {
                outputJSON = {
                    'code': Constant.SUCCESS_CODE,
                    'data': data
                }
            }
            res.jsonp(outputJSON);
        });
}
/**
 * [maintenance list - get list of all agents]
 * @param  {object} req
 * @param  {object} res
 */
function maintenanceList(req, res) {

    (async () => {
        var request_by_role = req.body.request_by_role ? req.body.request_by_role : '';
        var request_by_id = req.body.request_by_id ? req.body.request_by_id : '';
        var agency_id = req.body.agency_id ? req.body.agency_id : '';
        var type = req.body.type ? req.body.type : '';
        var public_status = req.body.public_status ? req.body.public_status : '';
        var search_text = req.body.search_text ? req.body.search_text : '';
        // 1 for sent , 2 for accepted, 3 for booked, 4 for completed, 5 for closed, 6 for due
        // var request_id = req.body.request_id ? req.body.request_id: '';

        var conditions = { "$and": [] };
        // var conditions= { "$or": [] };
        await conditions["$and"].push({ "deleted": false });

        if (search_text && search_text != '') {
            await conditions["$and"].push(
                {
                    "$or":
                        [
                            { "request_overview": new RegExp(search_text, "i") },
                            { "request_detail": new RegExp(search_text, "i") },
                            { "suburb": new RegExp(search_text, "i") },
                            { "postcode": new RegExp(search_text, "i") },
                            { "address": new RegExp(search_text, "i") },
                        ]
                }
            )
        }

        // if (request_by_role == Constant.RUN_STRATA_MANAGEMENT_COMPANY || request_by_role == Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY && (request_by_id))
        //     conditions["$and"].push({ "created_by": mongoose.Types.ObjectId(request_by_id) });
        if ((request_by_role == Constant.RUN_STRATA_MANAGEMENT_COMPANY || request_by_role == Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY) && (request_by_id)) {
            if (agency_id)
                await conditions["$and"].push({ $or: [{ "forwarded_by": mongoose.Types.ObjectId(request_by_id) }, { "created_by": mongoose.Types.ObjectId(request_by_id) }, { "agency_id": mongoose.Types.ObjectId(agency_id) }] });
            else
                await conditions["$and"].push({ $or: [{ "forwarded_by": mongoose.Types.ObjectId(request_by_id) }, { "created_by": mongoose.Types.ObjectId(request_by_id) }] });
        }

        if (request_by_role == Constant.AGENT && request_by_id) {
            if (agency_id)
                await conditions["$and"].push({ $or: [{ "forwarded_by": mongoose.Types.ObjectId(request_by_id) }, { "created_by": mongoose.Types.ObjectId(request_by_id) }, { "agency_id": mongoose.Types.ObjectId(agency_id) }] });
            else
                await conditions["$and"].push({ $or: [{ "forwarded_by": mongoose.Types.ObjectId(request_by_id) }, { "created_by": mongoose.Types.ObjectId(request_by_id) }] });
        }
        if (request_by_role == Constant.OWN_AGENCY && agency_id)
            await conditions["$and"].push({ "agency_id": mongoose.Types.ObjectId(agency_id) });

        if (request_by_role == Constant.TENANT && request_by_id)
            await conditions["$and"].push({ "created_by": mongoose.Types.ObjectId(request_by_id) });

        if (request_by_role == Constant.OWNER && request_by_id)
            await conditions["$and"].push({ "created_by": mongoose.Types.ObjectId(request_by_id) });

        if (request_by_role == Constant.TRADER && request_by_id) {
            var type_arr = [];
            console.log('req.body.public_status =====> ', req.body.public_status);
            console.log('public_status ========> ', public_status);

            if (public_status && public_status == 'yes') {
                await conditions["$and"].push({ "trader_id": null });
                // await User.findById(request_by_id, async function (userErr, foundUser) {
                //     console.log('userErr => ', userErr);
                //     if (userErr) {
                //         console.log('error occured while finding trader user => ');
                //     } else {
                //         // console.log('foundUser => ', foundUser);
                //         // if (foundUser) {
                //         //     if (foundUser.location_longitude && foundUser.location_longitude != '' && foundUser.location_latitude && foundUser.location_latitude != '') {
                //         //         console.log('condition => ', foundUser.location_longitude);
                //         //         // await conditions["$and"].push({
                //         //         //     address: {
                //         //         //         $geoWithin: {
                //         //         //             $centerSphere: [
                //         //         //                 [foundUser.location_longitude, foundUser.location_latitude], Constant.FIFTY_KM_INTO_MILE / Constant.RADIUS
                //         //         //             ]
                //         //         //         }
                //         //         //     }
                //         //         // });
                //         //     }
                //         //     //  if (foundUser.categories_id && foundUser.categories_id.length > 0) {
                //         //     //     console.log('category condition true => ');
                //         //     //     await (foundUser.categories_id).map(async category => {
                //         //     //         console.log('category => ', category);
                //         //     //         conditions["$and"].push(
                //         //     //             {
                //         //     //                 "$or":
                //         //     //                     [
                //         //     //                         { "categories_id": category }
                //         //     //                     ]
                //         //     //             }
                //         //     //         )
                //         //     //     })
                //         //     //     // await conditions["$and"].push({ "categories_id": foundUser.categories_id });
                //         //     // }
                //         // }
                //     }
                // })
            } else {
                await conditions["$and"].push({ "trader_id": mongoose.Types.ObjectId(request_by_id) });
            }

            // type_arr.push(1);
            // type_arr.push(2);
            // type_arr.push(3);
            // type_arr.push(4);
            // type_arr.push(5);
            // type_arr.push(6);
            // type_arr.push(7);
            // conditions["$and"].push({ "req_status": { $in: type_arr } });
            // is_forward: true
        }
        if (public_status && public_status == 'yes') {
            await conditions["$and"].push({ "request_type": 1 });
            await conditions["$and"].push({ "trader_id": null });
        } else {
            // conditions["$and"].push({ "request_type": 0 });
        }

        if (type)
            await conditions["$and"].push({ "req_status": type });

        var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
        var number_of_pages = (public_status == 'yes') ? 0 : (req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20);
        var outputJSON = {};

        //console.log("conditions",conditions);
        if (request_by_role == Constant.AGENT) {
            // var getAssociateProperty = function (user_id, callback) {
            //     propertyModel.find({ created_by: mongoose.Types.ObjectId(request_by_id), is_deleted: false, status: true },
            //         { _id: 1, property_id: 1 }, function (err, data) {
            //             if (err) {
            //                 callback(err);
            //             } else {
            //                 if (!data) {
            //                     callback(null, []);
            //                 } else {
            //                     var property_id_arr = [];
            //                     for (var i = 0; i < data.length; i++) {
            //                         var property_id = mongoose.Types.ObjectId(data[i]._id);
            //                         property_id_arr.push(property_id);
            //                     }
            //                     callback(null, property_id_arr);
            //                 }
            //             }
            //         });
            // };

            // getAssociateProperty(request_by_id, async function (error, PropertyArr) {
            // if (PropertyArr)
            //     conditions["$and"].push({ "property_id": { $in: PropertyArr } });
            console.log("here called      ", conditions);
            await maintenances.find(conditions).populate('property_id', 'property_name description address image owned_by')
                .populate('trader_id', 'firstname lastname image')
                .populate('created_by_role', 'title name')
                .populate('created_by', 'firstname lastname image')
                .populate('categories_id', 'name')
                .populate('watchers_list.users_id', 'firstname lastname image')
                .populate('maintentenance_counter_proposals')
                .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages).sort({ createdAt: -1 }).lean().exec(async function (err, data) {

                    if (err) {
                        outputJSON = {
                            'code': Constant.ERROR_CODE,
                            'message': Constant.ERROR_RETRIVING_DATA
                        };
                    } else {
                        var dataObj = [];
                        for (let item of data) {
                            let obj = item;
                            await Chats.findOne({
                                maintenance_id: mongoose.Types.ObjectId(item._id), is_maintenance_chat: true, msg: 'Counter proposal'
                            }).populate("from").populate("to")
                                .sort({ created: -1, _id: -1 }).exec(async function (err, chatData) {
                                    obj.mr_last_chat = chatData;
                                    dataObj.push(obj);
                                });
                        }

                        outputJSON = {
                            'code': Constant.SUCCESS_CODE,
                            'data': dataObj
                        }
                    }
                    res.jsonp(outputJSON);
                });
            // });
        }
        else if (request_by_role == Constant.OWNER || request_by_role == Constant.PROPERTY_OWNER) {

            // var getAssociateProperty = function (user_id, callback) {
            //     propertyModel.find({ owned_by: mongoose.Types.ObjectId(request_by_id), is_deleted: false, status: true },
            //         { _id: 1, property_id: 1 }, function (err, data) {
            //             if (err) {
            //                 callback(err);
            //             } else {
            //                 if (!data) {
            //                     callback(null, []);
            //                 } else {
            //                     var property_id_arr = [];
            //                     for (var i = 0; i < data.length; i++) {
            //                         var property_id = mongoose.Types.ObjectId(data[i]._id);
            //                         property_id_arr.push(property_id);
            //                     }
            //                     callback(null, property_id_arr);
            //                 }
            //             }
            //         });
            // };

            // getAssociateProperty(request_by_id, async function (error, PropertyArr) {
            // if (PropertyArr)
            //     conditions["$and"].push({ "property_id": { $in: PropertyArr } });

            await maintenances.find(conditions).populate('property_id', 'property_name description address image owned_by')
                .populate('trader_id', 'firstname lastname image')
                .populate('created_by_role', 'title name')
                .populate('created_by', 'firstname lastname image')
                .populate('categories_id', 'name')
                .populate('watchers_list.users_id', 'firstname lastname image')
                .populate('maintentenance_counter_proposals')
                .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages).sort({ createdAt: -1 }).lean().exec(async function (err, data) {

                    if (err) {
                        outputJSON = {
                            'code': Constant.ERROR_CODE,
                            'message': Constant.ERROR_RETRIVING_DATA
                        };
                    } else {

                        var dataObj = [];
                        for (let item of data) {
                            let obj = item;
                            await Chats.findOne({
                                maintenance_id: item._id, is_maintenance_chat: true, msg: 'Counter proposal'
                            }).populate("from").populate("to")
                                .sort({ created: -1, _id: -1 }).exec(async function (err, chatData) {
                                    obj.mr_last_chat = chatData;
                                    dataObj.push(obj);
                                });
                        }

                        outputJSON = {
                            'code': Constant.SUCCESS_CODE,
                            'data': dataObj
                        }
                    }
                    res.jsonp(outputJSON);
                });
            // });
        }
        else if (request_by_role == Constant.TENANT) {

            // var getAssociateProperty = function (user_id, callback) {
            //     InvitationInfo.find({ invited_to: mongoose.Types.ObjectId(user_id), deleted: false, status: true }, { property_id: 1 }, function (err, data) {
            //         if (err) {
            //             callback(err);
            //         } else {
            //             if (!data) {
            //                 callback(null, []);
            //             } else {
            //                 var property_id_arr = [];
            //                 for (var i = 0; i < data.length; i++) {
            //                     var property_id = mongoose.Types.ObjectId(data[i].property_id);
            //                     property_id_arr.push(property_id);
            //                 }
            //                 callback(null, property_id_arr);
            //             }
            //         }
            //     });
            // }

            // getAssociateProperty(request_by_id, async function (error, pArr) {
            // if (pArr.length > 0)
            //     conditions["$and"].push({ "property_id": { $in: pArr } });
            await maintenances.find(conditions).populate('property_id', 'property_name description address image owned_by')
                .populate('trader_id', 'firstname lastname image')
                .populate('created_by_role', 'title name')
                .populate('created_by', 'firstname lastname image')
                .populate('forwarded_by', 'image')
                .populate('categories_id', 'name')
                .populate('watchers_list.users_id', 'firstname lastname image')
                .populate('maintentenance_counter_proposals')
                .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages).sort({ createdAt: -1 }).lean().exec(async function (err, data) {

                    if (err) {
                        outputJSON = {
                            'code': Constant.ERROR_CODE,
                            'message': Constant.ERROR_RETRIVING_DATA
                        };
                    } else {

                        var dataObj = [];
                        for (let item of data) {
                            let obj = item;
                            await Chats.findOne({
                                maintenance_id: item._id, is_maintenance_chat: true, msg: 'Counter proposal'
                            }).populate("from").populate("to")
                                .sort({ created: -1, _id: -1 }).exec(async function (err, chatData) {
                                    obj.mr_last_chat = chatData;
                                    dataObj.push(obj);
                                });
                        }

                        outputJSON = {
                            'code': Constant.SUCCESS_CODE,
                            'data': dataObj
                        }
                    }
                    res.jsonp(outputJSON);
                });
            // });
        }
        else {
            console.log("im called....Trader user");
            if (request_by_role == Constant.TRADER && request_by_id) {
                if (public_status && public_status == 'yes') {
                    let result = await locationForUser(request_by_id);
                    console.log('result :: promise result :: check here => ', result);
                    console.log('result.location_cond => ', result.location_cond);
                    console.log('result.cat_cond => ', result.cat_cond);
                    if (result.location_cond) {
                        await conditions["$and"].push(result.location_cond);
                    }
                    if (result.cat_cond) {
                        await conditions["$and"].push({ "$or": result.cat_cond })
                    }
                }
            }
            console.log("here called  :: check for conditions ======>", conditions);
            await maintenances.find(conditions)
                .populate('property_id', 'property_name description address image owned_by')
                .populate('trader_id', 'firstname lastname image')
                .populate('created_by_role', 'title name')
                .populate('created_by', 'firstname lastname image')
                .populate('categories_id', 'name')
                .populate('watchers_list.users_id', 'firstname lastname image')
                .populate('maintentenance_counter_proposals')
                .populate('maintenance_log')
                .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages).sort({ createdAt: -1 }).lean().exec(async function (err, data) {

                    if (err) {
                        outputJSON = {
                            'code': Constant.ERROR_CODE,
                            'message': Constant.ERROR_RETRIVING_DATA
                        };
                    } else {

                        var dataObj = [];
                        for (let item of data) {
                            let obj = item;
                            await Chats.findOne({
                                maintenance_id: item._id, is_maintenance_chat: true, msg: 'Counter proposal'
                            }).populate("from").populate("to")
                                .sort({ created: -1, _id: -1 }).exec(async function (err, chatData) {
                                    obj.mr_last_chat = chatData;
                                    dataObj.push(obj);
                                });
                        }

                        outputJSON = {
                            'code': Constant.SUCCESS_CODE,
                            'data': dataObj
                        }
                    }
                    res.jsonp(outputJSON);
                });
        }
    })();
}


/**
 * Maintenance List for Admin user
 */
function maintenanceListAdmin(req, res) {
    (async () => {
        try {
            if (req.body.request_by_id) {
                if (req.body.request_by_id == Constant.ADMIN) {
                    console.log('if function => ');
                    const page_number = req.body.current_page ? (req.body.current_page) - 1 : 0;
                    const number_of_pages = req.body.number_of_pages ? (req.body.number_of_pages) : 10;
                    const limit = (typeof req.body.limit != 'undefined') ? req.body.limit : 10;
                    let conditions = { "deleted": false };
                    await maintenances
                        .count(conditions)
                        .exec(async function (err, result) {
                            if (err) {
                                callback(Constant.INTERNAL_ERROR, null);
                            } else {
                                let totalCount = 0;
                                if (result > 0) {
                                    totalCount = result;
                                    const aggregateArray = [
                                        { $match: conditions },
                                        { $sort: { "createdAt": -1 } },
                                        { $skip: page_number * number_of_pages },
                                        { $limit: limit }
                                    ]
                                    await maintenances
                                        .aggregate(aggregateArray)
                                        .allowDiskUse(true)
                                        .exec(async function (err, MRlist) {
                                            // console.log('MRlist :: MR list for admin => ', MRlist);
                                            if (err) {
                                                console.log('err :: Getting MR List for admin => ', err);
                                                res.json({ code: Constant.ERROR_CODE, message: err });
                                            } else {
                                                await res.json({ code: Constant.SUCCESS_CODE, message: 'Maintenances listed successfully.', data: MRlist, totalCount: totalCount });
                                            }
                                        })
                                } else {
                                    res.json({ code: Constant.SUCCESS_CODE, data: [], totalCount: totalCount });
                                }
                            }
                        })
                } else {
                    res.json({ code: Constant.ERROR_CODE, message: "You are not authorized to perform this operation." });
                }
            } else {
                res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
            }
        } catch (error) {
            res.json({ code: Constant.ERROR_CODE, message: error });
        }
    })();
}

/**
 * Maintenances count as per MR status for Admin user
 * 1 for sent , 2 for accepted, 3 for booked, 4 for closed, 5 for completed , 6 for due, 7 denied
 */
function getAdminMRcounts(req, res) {
    (async () => {
        try {
            if (req.body.request_by_id) {
                if (req.body.request_by_id == Constant.ADMIN) {
                    let sentCount;
                    let acceptedCount;
                    let bookedCount;
                    let completedCount;
                    let closedCount;
                    // let conditions = { "$and": [] };
                    // conditions["$and"].push({ "is_deleted": false });
                    await maintenances.count({ "deleted": false, "req_status": 1 })
                        .exec(async function (err, result) {
                            if (err) {
                                res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
                            } else {
                                sentCount = result;
                                console.log('else 1 => ', sentCount);
                            }
                        });
                    await maintenances.count({ "deleted": false, "req_status": 2 })
                        .exec(async function (err, result) {
                            if (err) {
                                res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
                            } else {
                                acceptedCount = result;
                                console.log('else 2 => ', acceptedCount);
                            }
                        });
                    await maintenances.count({ "deleted": false, "req_status": 3 })
                        .exec(async function (err, result) {
                            if (err) {
                                res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
                            } else {
                                bookedCount = result;
                                console.log('else 3 => ', bookedCount);
                            }
                        });
                    await maintenances.count({ "deleted": false, "req_status": 4 })
                        .exec(async function (err, result) {
                            if (err) {
                                res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
                            } else {
                                closedCount = result;
                                console.log('else 4 => ', closedCount);
                            }
                        });
                    await maintenances.count({ "deleted": false, "req_status": 5 })
                        .exec(async function (err, result) {
                            if (err) {
                                res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
                            } else {
                                completedCount = result;
                                console.log('else 5 => ', completedCount);

                                console.log('last => ', sentCount, acceptedCount, bookedCount, closedCount, completedCount);

                                let tempObj = {};
                                tempObj.sentCount = sentCount ? sentCount : 0;
                                tempObj.acceptedCount = acceptedCount ? acceptedCount : 0;
                                tempObj.bookedCount = bookedCount ? bookedCount : 0;
                                tempObj.closedCount = closedCount ? closedCount : 0;
                                tempObj.completedCount = completedCount ? completedCount : 0;
                                res.json({ code: Constant.SUCCESS_CODE, data: tempObj });
                            }
                        });
                } else {
                    res.json({ code: Constant.ERROR_CODE, message: "You are not authorized to perform this operation." });
                }
            } else {
                res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
            }
        } catch (error) {
            res.json({ code: Constant.ERROR_CODE, message: error });
        }
    })();
}


async function locationForUser(id) {
    let promise = new Promise((resolve, reject) => {
        setTimeout(async function () {
            await User.findById(id, async function (userErr, foundUser) {
                console.log('userErr => ', userErr);
                if (userErr) {
                    console.log('error occured while finding trader user => ');
                } else {
                    // console.log('foundUser => ', foundUser);
                    if (foundUser) {
                        let cond_obj = {};
                        let obj_ = {};
                        let cat_arr = []
                        if (foundUser.location_longitude && foundUser.location_longitude != '' && foundUser.location_latitude && foundUser.location_latitude != '') {
                            cond_obj = await {
                                location: {
                                    $geoWithin: {
                                        $centerSphere: [
                                            [foundUser.location_longitude, foundUser.location_latitude], Constant.FIFTY_KM_INTO_MILE / Constant.RADIUS
                                        ]
                                    }
                                }
                            }
                            obj_.location_cond = await cond_obj;
                        }
                        if (foundUser.categories_id && foundUser.categories_id.length > 0) {
                            await (foundUser.categories_id).map(async category => {
                                await cat_arr.push({ categories_id: mongoose.Types.ObjectId(category) })
                            })
                            obj_.cat_cond = await cat_arr;
                        }
                        resolve(obj_)
                    }
                }
            })
        }, 0)
    });
    let result = await promise;
    return result
}

function addMaintenance(req, res) {
    // console.log("req   ", req.body);
    var forwarded_by;
    var request_overview = (typeof req.body.request_overview != 'undefined') ? req.body.request_overview : '';
    var property_id = (typeof req.body.property_id != 'undefined') ? mongoose.Types.ObjectId(req.body.property_id) : '';
    var agency_id = (typeof req.body.agency_id != 'undefined') ? mongoose.Types.ObjectId(req.body.agency_id) : '';
    var trader_id = (typeof req.body.trader_id != 'undefined') ? mongoose.Types.ObjectId(req.body.trader_id) : '';
    var created_by_role = (typeof req.body.created_by_role != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by_role) : '';
    var created_by = (typeof req.body.created_by != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by) : '';
    var budget = (typeof req.body.budget != 'undefined') ? req.body.budget : 0;
    var due_date = (typeof req.body.due_date != 'undefined') ? req.body.due_date : '';
    var req_status = (typeof req.body.req_status != 'undefined') ? req.body.req_status : 1;
    var images = (typeof req.body.images != 'undefined') ? req.body.images : [];
    var categories_id = (typeof req.body.categories_id != 'undefined') ? req.body.categories_id : [];
    var watchersList = (typeof req.body.watchers_list != 'undefined') ? req.body.watchers_list : [];
    var is_forward = (created_by_role == Constant.AGENT || created_by_role == Constant.OWN_AGENCY) ? true : false;
    // if (created_by_role == Constant.AGENT) {
    //     forwarded_by = created_by;
    // }
    if (request_overview && property_id) {

        var obj = {};

        var chars = "123456789";
        var maintennceId = '';
        for (var x = 0; x < 9; x++) {
            var i = Math.floor(Math.random() * chars.length);
            maintennceId += chars.charAt(i);
        }
        obj.request_id = maintennceId;
        obj.request_overview = request_overview;
        obj.request_detail = (typeof req.body.request_detail != 'undefined') ? req.body.request_detail : '';
        obj.budget = budget;
        obj.due_date = due_date;
        obj.req_status = req_status;
        obj.is_forward = is_forward;

        if (validator.isValidObject(property_id))
            obj.property_id = property_id;
        if (agency_id && validator.isValidObject(agency_id))
            obj.agency_id = agency_id;
        if (trader_id && validator.isValidObject(trader_id))
            obj.trader_id = trader_id;
        if (created_by && validator.isValidObject(created_by))
            obj.created_by = created_by;
        if (created_by_role && validator.isValidObject(created_by_role))
            obj.created_by_role = created_by_role;

        if (watchersList) {
            // var set1 = new Set(watchersList);
            var watchersListArr = [];
            var watchersListusers = [];
            for (var i = 0; i < watchersList.length; i++) {
                if (watchersListusers.indexOf(watchersList[i]._id) === -1) {
                    watchersListArr.push({ "users_id": mongoose.Types.ObjectId(watchersList[i]._id), "is_read": false });
                    watchersListusers.push(watchersList[i]._id);
                }
            }
            obj.watchers_list = watchersListArr;
        }

        if (images) {
            var imagesListArr = [];
            for (var i = 0; i < images.length; i++) {
                if (images.indexOf(images[i].path) === -1) {
                    imagesListArr.push({ "path": images[i].path, "status": false });
                }
            }
            obj.images = imagesListArr;
        }

        propertyModel.findById({ _id: property_id }, 'created_by owned_by', function (err, data) {
            var owner_id = data.owned_by;
            if (err) {
                callback(err, null);
            } else {
                forwarded_by = (typeof data.created_by != 'undefined') ? data.created_by : '';

                if (validator.isValidObject(forwarded_by)) {
                    obj.forwarded_by = forwarded_by;
                    var maintenance = new maintenances(obj);
                    maintenance.save(function (err, maintenanaceData) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                        } else {
                            maintenances.findById({ _id: maintenanaceData._id }).
                                populate('property_id', 'property_name description address image')
                                .populate('created_by', 'firstname lastname image')
                                .populate('trader_id', 'firstname lastname image')
                                //.populate('categories_id','name')
                                //.populate('watchers_list.users_id','firstname lastname image')
                                .exec(function (err, data) {
                                    if (err) {
                                        res.json({ code: Constant.SUCCESS_CODE, data: data });
                                    } else {
                                        if (data) {
                                            var to_users = [];
                                            var obj2 = {};
                                            // obj2.subject = "New Maintenance Request";
                                            // obj2.message = "A new Maintenance request is added on " + moment().format("MMMM Do YYYY") + " by " + data.created_by.firstname + " " + data.created_by.lastname + " for the Property " + data.property_id.address;
                                            // obj2.subject = req.body.request_overview + " - new maintenance request has been added on " + moment().format("MMMM Do YYYY") + " by " + data.created_by.firstname + " " + data.created_by.lastname;
                                            obj2.subject = req.body.request_overview + " - new maintenance request has been added by " + data.created_by.firstname + " " + data.created_by.lastname;
                                            obj2.message = data.address;
                                            obj2.from_user = mongoose.Types.ObjectId(data.created_by._id);
                                            if (forwarded_by != data.created_by._id) {
                                                to_users.push({ "users_id": mongoose.Types.ObjectId(forwarded_by) });
                                            }
                                            // if (forwarded_by == data.created_by._id) {
                                            if (data.trader_id && data.trader_id._id) {
                                                to_users.push({ "users_id": mongoose.Types.ObjectId(data.trader_id._id) });
                                            }
                                            if (owner_id != data.created_by._id) {
                                                to_users.push({ "users_id": mongoose.Types.ObjectId(owner_id) });
                                            }

                                            obj2.to_users = to_users;
                                            obj2.type = Constant.NOTIFICATION_TYPE_MAINTENENCE_REQ;
                                            obj2.maintenence_id = data._id;
                                            obj2.module = 2;
                                            var notification = new NotificationInfo(obj2);
                                            notification.save(function (err, notData) {
                                                if (err) {
                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                } else {
                                                    res.json({ code: Constant.SUCCESS_CODE, data: data });
                                                }
                                            });
                                        } else {
                                            res.json({ code: Constant.SUCCESS_CODE, data: maintenanaceData });
                                        }
                                    }
                                });
                        }
                    });
                } else {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
                }
            }
        })
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }

}

function forwardMaintenanceRequest(req, res) {

    var maintenance_id = (typeof req.body.maintenance_id != 'undefined') ? mongoose.Types.ObjectId(req.body.maintenance_id) : '';
    var request_overview = (typeof req.body.request_overview != 'undefined') ? req.body.request_overview : '';
    var trader_id = (typeof req.body.trader_id != 'undefined') ? mongoose.Types.ObjectId(req.body.trader_id) : '';
    var budget = (typeof req.body.budget != 'undefined') ? req.body.budget : 0;
    var due_date = (typeof req.body.due_date != 'undefined') ? req.body.due_date : '';
    var watchersList = (typeof req.body.watchers_list != 'undefined') ? req.body.watchers_list : [];
    var request_detail = (typeof req.body.request_detail != 'undefined') ? req.body.request_detail : '';
    if (maintenance_id && trader_id) {

        if (trader_id && validator.isValidObject(trader_id))
            var trader_id = trader_id;

        if (watchersList) {
            var watchersListArr = [];
            for (var i = 0; i < watchersList.length; i++) {
                if (watchersList.indexOf(watchersList[i]._id) === -1) {
                    watchersListArr.push({ "users_id": mongoose.Types.ObjectId(watchersList[i]._id), "is_read": false });
                }
            }
            var watchers_list = watchersListArr;
        }

        maintenances.update({ '_id': maintenance_id },
            {
                $set: {
                    'request_overview': request_overview, 'request_detail': request_detail, 'is_forward': true,
                    'budget': budget, 'due_date': due_date, 'trader_id': trader_id, 'watchers_list': watchers_list
                }
            }, function (err) {

                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    maintenances.findById({ _id: maintenance_id }).
                        populate('property_id', 'property_name description address image')
                        .populate('created_by', 'firstname lastname image')
                        .populate('trader_id', 'firstname lastname image')
                        .populate('forwarded_by', 'firstname lastname')
                        //.populate('watchers_list.users_id','firstname lastname image')
                        .exec(function (err, data) {
                            //Send Message to Traders for new maintenance request//
                            if (err) {
                                //res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                res.json({ code: Constant.SUCCESS_CODE, data: data });
                            } else {
                                var to_users = [];
                                var obj2 = {};
                                obj2.subject = "Maintenance Request";
                                obj2.message = "Maintenance request is forwarded by " + data.forwarded_by.firstname + " " + data.forwarded_by.lastname + " on " + moment().format("MMMM Do YYYY") + " for the Property " + data.address;
                                obj2.from_user = mongoose.Types.ObjectId(data.created_by._id);
                                to_users.push({ "users_id": mongoose.Types.ObjectId(data.trader_id._id) });
                                to_users.push({ "users_id": mongoose.Types.ObjectId(data.created_by._id) });
                                obj2.to_users = to_users;
                                obj2.maintenence_id = data._id;
                                obj2.module = 2;
                                obj2.type = Constant.NOTIFICATION_TYPE_MAINTENENCE_REQ;
                                var notification = new NotificationInfo(obj2);
                                notification.save(function (err, notData) {
                                    if (err) {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                    } else {
                                        res.json({ code: Constant.SUCCESS_CODE, data: data });
                                    }
                                });
                            }
                        });
                }
            });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }

}

/*  @api : upload complete job images
 *  @author  :
 *  @created  : uploadCompleteJobImages
 *  @modified :
 *  @purpose  : To upload closed images
 */
function uploadCompleteJobImages(req, res) {
    var formData = {};
    var outputJSON = {};
    var maintenanceSavedObj = {};
    var validFileExt = ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'txt', 'doc'];
    waterfall([
        function (callback) {
            var uploaded_file = req.swagger.params.file.value;
            formData = {};
            var file = uploaded_file;
            if (file.size < 10574919) {
                var mimeExtension = file.mimetype.split('/');
                if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
                    callback(null, file);
                } else {
                    callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false);
                }
            } else {
                callback('Upload file must be less than 10 MB', false);
            }
        },
        function (file, callback) {
            if (file) {
                var timestamp = Number(new Date()); // current time as number
                var splitFile = file.originalname.split('.');
                var filename = +timestamp + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
                var dir = './api/uploads/Document';
                var temp_path = dir + '/' + filename;
                var data = file.buffer;


                fs.writeFile(path.resolve(temp_path), data, function (err, data) {
                    if (err) {
                        callback(err, false);
                    } else {
                        callback(null, filename);
                        /*var thumbFileName = filename + '_thumb.jpg';
                        var source_path ='./api/uploads/maintenance'+thumbFileName;
                        var destination_path ='./api/uploads/maintenance/thumbnail';
                        // console.log("filename=>",filename);
                        easyimg.resize({src: source_path, dst: destination_path, width: 100, height: 100}, function (err, stdout, stderr) {
                            if (err){
                            //    console.log("err",err);
                               callback(err, false);
                            }
                            else{
                                // console.log("filename",filename);
                                callback(null, filename);
                                // console.log('Resized to 640x480');
                            }
                        });*/
                    }
                });
            } else {
                callback('No files selected', false);
            }
        },
        function (formData, callback) {
            var updateImage = [];
            var maintenanceData = {};
            maintenanceSavedObj._id = req.body._id;
            if (maintenanceSavedObj._id) {
                var field = "";
                var query = { _id: maintenanceSavedObj._id };
                delete formData._id;
                maintenances.findOne(query, function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if (!data.complete_images) { data.complete_images = []; }
                        data.complete_images.push({ 'path': formData });
                        data.save(function (err, data) {
                            if (err) {
                                callback(err, null);
                            } else {
                                callback(null, data);
                            }
                        });
                    }
                });
            }
        }
    ], function (err, maintenanceData) {
        if (err) {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.PROPERTY_CREATE_UNSUCCESS
            };
        } else {
            outputJSON = {
                code: Constant.SUCCESS_CODE,
                data: maintenanceData,
                message: Constant.PROPERTY_CREATE_SUCCESS,
            };
        }
        res.jsonp(outputJSON);
    });
}

function addMaintenance(req, res) {
    // console.log("req   ", req.body);
    var forwarded_by;
    var request_overview = (typeof req.body.request_overview != 'undefined') ? req.body.request_overview : '';
    var property_id = (typeof req.body.property_id != 'undefined') ? mongoose.Types.ObjectId(req.body.property_id) : '';
    var agency_id = (typeof req.body.agency_id != 'undefined') ? mongoose.Types.ObjectId(req.body.agency_id) : '';
    var trader_id = (typeof req.body.trader_id != 'undefined') ? mongoose.Types.ObjectId(req.body.trader_id) : '';
    var created_by_role = (typeof req.body.created_by_role != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by_role) : '';
    var created_by = (typeof req.body.created_by != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by) : '';
    var budget = (typeof req.body.budget != 'undefined') ? req.body.budget : 0;
    var due_date = (typeof req.body.due_date != 'undefined') ? req.body.due_date : '';
    var req_status = (typeof req.body.req_status != 'undefined') ? req.body.req_status : 1;
    var images = (typeof req.body.images != 'undefined') ? req.body.images : [];
    var categories_id = (typeof req.body.categories_id != 'undefined') ? req.body.categories_id : [];
    var watchersList = (typeof req.body.watchers_list != 'undefined') ? req.body.watchers_list : [];
    var is_forward = (created_by_role == Constant.AGENT || created_by_role == Constant.OWN_AGENCY) ? true : false;
    // if (created_by_role == Constant.AGENT) {
    //     forwarded_by = created_by;
    // }
    if (request_overview && property_id) {

        var obj = {};

        var chars = "123456789";
        var maintennceId = '';
        for (var x = 0; x < 9; x++) {
            var i = Math.floor(Math.random() * chars.length);
            maintennceId += chars.charAt(i);
        }
        obj.request_id = maintennceId;
        obj.request_overview = request_overview;
        obj.request_detail = (typeof req.body.request_detail != 'undefined') ? req.body.request_detail : '';
        obj.budget = budget;
        obj.due_date = due_date;
        obj.req_status = req_status;
        obj.is_forward = is_forward;

        if (validator.isValidObject(property_id))
            obj.property_id = property_id;
        if (agency_id && validator.isValidObject(agency_id))
            obj.agency_id = agency_id;
        if (trader_id && validator.isValidObject(trader_id))
            obj.trader_id = trader_id;
        if (created_by && validator.isValidObject(created_by))
            obj.created_by = created_by;
        if (created_by_role && validator.isValidObject(created_by_role))
            obj.created_by_role = created_by_role;

        if (watchersList) {
            // var set1 = new Set(watchersList);
            var watchersListArr = [];
            var watchersListusers = [];
            for (var i = 0; i < watchersList.length; i++) {
                if (watchersListusers.indexOf(watchersList[i]._id) === -1) {
                    watchersListArr.push({ "users_id": mongoose.Types.ObjectId(watchersList[i]._id), "is_read": false });
                    watchersListusers.push(watchersList[i]._id);
                }
            }
            obj.watchers_list = watchersListArr;
        }

        if (images) {
            var imagesListArr = [];
            for (var i = 0; i < images.length; i++) {
                if (images.indexOf(images[i].path) === -1) {
                    imagesListArr.push({ "path": images[i].path, "status": false });
                }
            }
            obj.images = imagesListArr;
        }

        propertyModel.findById({ _id: property_id }, 'created_by owned_by', function (err, data) {
            var owner_id = data.owned_by;
            if (err) {
                callback(err, null);
            } else {
                forwarded_by = (typeof data.created_by != 'undefined') ? data.created_by : '';

                if (validator.isValidObject(forwarded_by)) {
                    obj.forwarded_by = forwarded_by;
                    var maintenance = new maintenances(obj);
                    maintenance.save(function (err, maintenanaceData) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                        } else {
                            maintenances.findById({ _id: maintenanaceData._id }).
                                populate('property_id', 'property_name description address image')
                                .populate('created_by', 'firstname lastname image')
                                .populate('trader_id', 'firstname lastname image')
                                //.populate('categories_id','name')
                                //.populate('watchers_list.users_id','firstname lastname image')
                                .exec(function (err, data) {
                                    if (err) {
                                        res.json({ code: Constant.SUCCESS_CODE, data: data });
                                    } else {
                                        if (data) {
                                            var to_users = [];
                                            var obj2 = {};
                                            // obj2.subject = "New Maintenance Request";
                                            // obj2.message = "A new Maintenance request is added on " + moment().format("MMMM Do YYYY") + " by " + data.created_by.firstname + " " + data.created_by.lastname + " for the Property " + data.property_id.address;
                                            // obj2.subject = req.body.request_overview + " - new maintenance request has been added on " + moment().format("MMMM Do YYYY") + " by " + data.created_by.firstname + " " + data.created_by.lastname;
                                            obj2.subject = req.body.request_overview + " - new maintenance request has been added by " + data.created_by.firstname + " " + data.created_by.lastname;
                                            obj2.message = data.address;
                                            obj2.from_user = mongoose.Types.ObjectId(data.created_by._id);
                                            if (forwarded_by != data.created_by._id) {
                                                to_users.push({ "users_id": mongoose.Types.ObjectId(forwarded_by) });
                                            }
                                            // if (forwarded_by == data.created_by._id) {
                                            if (data.trader_id && data.trader_id._id) {
                                                to_users.push({ "users_id": mongoose.Types.ObjectId(data.trader_id._id) });
                                            }
                                            if (owner_id != data.created_by._id) {
                                                to_users.push({ "users_id": mongoose.Types.ObjectId(owner_id) });
                                            }

                                            obj2.to_users = to_users;
                                            obj2.type = Constant.NOTIFICATION_TYPE_MAINTENENCE_REQ;
                                            obj2.maintenence_id = data._id;
                                            obj2.module = 2;
                                            var notification = new NotificationInfo(obj2);
                                            notification.save(function (err, notData) {
                                                if (err) {
                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                } else {
                                                    res.json({ code: Constant.SUCCESS_CODE, data: data });
                                                }
                                            });
                                        } else {
                                            res.json({ code: Constant.SUCCESS_CODE, data: maintenanaceData });
                                        }
                                    }
                                });
                        }
                    });
                } else {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
                }
            }
        })
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }

}

function forwardMaintenanceRequest(req, res) {

    var maintenance_id = (typeof req.body.maintenance_id != 'undefined') ? mongoose.Types.ObjectId(req.body.maintenance_id) : '';
    var request_overview = (typeof req.body.request_overview != 'undefined') ? req.body.request_overview : '';
    var trader_id = (typeof req.body.trader_id != 'undefined') ? mongoose.Types.ObjectId(req.body.trader_id) : '';
    var budget = (typeof req.body.budget != 'undefined') ? req.body.budget : 0;
    var due_date = (typeof req.body.due_date != 'undefined') ? req.body.due_date : '';
    var watchersList = (typeof req.body.watchers_list != 'undefined') ? req.body.watchers_list : [];
    var request_detail = (typeof req.body.request_detail != 'undefined') ? req.body.request_detail : '';
    if (maintenance_id && trader_id) {

        if (trader_id && validator.isValidObject(trader_id))
            var trader_id = trader_id;

        if (watchersList) {
            var watchersListArr = [];
            for (var i = 0; i < watchersList.length; i++) {
                if (watchersList.indexOf(watchersList[i]._id) === -1) {
                    watchersListArr.push({ "users_id": mongoose.Types.ObjectId(watchersList[i]._id), "is_read": false });
                }
            }
            var watchers_list = watchersListArr;
        }

        maintenances.update({ '_id': maintenance_id },
            {
                $set: {
                    'request_overview': request_overview, 'request_detail': request_detail, 'is_forward': true,
                    'budget': budget, 'due_date': due_date, 'trader_id': trader_id, 'watchers_list': watchers_list
                }
            }, function (err) {

                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    maintenances.findById({ _id: maintenance_id }).
                        populate('property_id', 'property_name description address image')
                        .populate('created_by', 'firstname lastname image')
                        .populate('trader_id', 'firstname lastname image')
                        .populate('forwarded_by', 'firstname lastname')
                        //.populate('watchers_list.users_id','firstname lastname image')
                        .exec(function (err, data) {
                            //Send Message to Traders for new maintenance request//
                            if (err) {
                                //res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                res.json({ code: Constant.SUCCESS_CODE, data: data });
                            } else {
                                var to_users = [];
                                var obj2 = {};
                                obj2.subject = "Maintenance Request";
                                obj2.message = "Maintenance request is forwarded by " + data.forwarded_by.firstname + " " + data.forwarded_by.lastname + " on " + moment().format("MMMM Do YYYY") + " for the Property " + data.address;
                                obj2.from_user = mongoose.Types.ObjectId(data.created_by._id);
                                to_users.push({ "users_id": mongoose.Types.ObjectId(data.trader_id._id) });
                                to_users.push({ "users_id": mongoose.Types.ObjectId(data.created_by._id) });
                                obj2.to_users = to_users;
                                obj2.maintenence_id = data._id;
                                obj2.module = 2;
                                obj2.type = Constant.NOTIFICATION_TYPE_MAINTENENCE_REQ;
                                var notification = new NotificationInfo(obj2);
                                notification.save(function (err, notData) {
                                    if (err) {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                    } else {
                                        res.json({ code: Constant.SUCCESS_CODE, data: data });
                                    }
                                });
                            }
                        });
                }
            });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }

}

/*  @api : upload complete job images
 *  @author  :
 *  @created  : uploadCompleteJobImages
 *  @modified :
 *  @purpose  : To upload closed images
 */
function uploadCompleteJobImages(req, res) {
    var formData = {};
    var outputJSON = {};
    var maintenanceSavedObj = {};
    var validFileExt = ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'txt', 'doc'];
    waterfall([
        function (callback) {
            var uploaded_file = req.swagger.params.file.value;
            formData = {};
            var file = uploaded_file;
            if (file.size < 10574919) {
                var mimeExtension = file.mimetype.split('/');
                if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
                    callback(null, file);
                } else {
                    callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false);
                }
            } else {
                callback('Upload file must be less than 10 MB', false);
            }
        },
        function (file, callback) {
            if (file) {
                var timestamp = Number(new Date()); // current time as number
                var splitFile = file.originalname.split('.');
                var filename = +timestamp + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
                var dir = './api/uploads/Document';
                var temp_path = dir + '/' + filename;
                var data = file.buffer;


                fs.writeFile(path.resolve(temp_path), data, function (err, data) {
                    if (err) {
                        callback(err, false);
                    } else {
                        callback(null, filename);
                        /*var thumbFileName = filename + '_thumb.jpg';
                        var source_path ='./api/uploads/maintenance'+thumbFileName;
                        var destination_path ='./api/uploads/maintenance/thumbnail';
                        // console.log("filename=>",filename);
                        easyimg.resize({src: source_path, dst: destination_path, width: 100, height: 100}, function (err, stdout, stderr) {
                            if (err){
                            //    console.log("err",err);
                               callback(err, false);
                            }
                            else{
                                // console.log("filename",filename);
                                callback(null, filename);
                                // console.log('Resized to 640x480');
                            }
                        });*/
                    }
                });
            } else {
                callback('No files selected', false);
            }
        },
        function (formData, callback) {
            var updateImage = [];
            var maintenanceData = {};
            maintenanceSavedObj._id = req.body._id;
            if (maintenanceSavedObj._id) {
                var field = "";
                var query = { _id: maintenanceSavedObj._id };
                delete formData._id;
                maintenances.findOne(query, function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if (!data.complete_images) { data.complete_images = []; }
                        data.complete_images.push({ 'path': formData });
                        data.save(function (err, data) {
                            if (err) {
                                callback(err, null);
                            } else {
                                callback(null, data);
                            }
                        });
                    }
                });
            }
        }
    ], function (err, maintenanceData) {
        if (err) {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.PROPERTY_CREATE_UNSUCCESS
            };
        } else {
            outputJSON = {
                code: Constant.SUCCESS_CODE,
                data: maintenanceData,
                message: Constant.PROPERTY_CREATE_SUCCESS,
            };
        }
        res.jsonp(outputJSON);
    });
}


/*  @api : uploadMobileCompleteJobImage
 *  @author  :
 *  @created  :
 *  @modified :
 *  @purpose  : To post the complete job.
 */
function uploadMobileCompleteJobImage(req, res) {
    var formData = {};
    var outputJSON = {};
    var propertySavedObj = {};
    var validFileExt = ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'txt', 'doc'];
    waterfall([
        function (callback) {
            var uploaded_file = req.swagger.params.file.value;
            formData = {};
            var file = uploaded_file;
            if (file.size < 10574919) {
                var mimeExtension = file.mimetype.split('/');
                if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
                    callback(null, file);
                } else {
                    callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false);
                }
            } else {
                callback('Upload file must be less than 10 MB', false);
            }
        },
        function (file, callback) {
            if (file) {
                var timestamp = Number(new Date()); // current time as number
                var splitFile = file.originalname.split('.');
                var filename = +timestamp + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
                var dir = './api/uploads/complete_job';
                var temp_path = dir + '/' + filename;
                var data = file.buffer;
                //var uploadedImage = '/uploads/property/'+filename;
                fs.writeFile(path.resolve(temp_path), data, function (err, data) {
                    if (err) {
                        callback(err, false);
                    } else {
                        callback(null, filename);
                    }
                });
            } else {
                callback('No files selected', false);
            }
        }
    ], function (err, imageData) {
        if (err) {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.PROPERTY_CREATE_UNSUCCESS
            };
        } else {
            outputJSON = {
                code: Constant.SUCCESS_CODE,
                data: imageData,
                message: Constant.PROPERTY_CREATE_SUCCESS,
            };
        }
        res.jsonp(outputJSON);
    });
}

/*  @api : uploadMaintenanceImages
 *  @author  :
 *  @created  :
 *  @modified :
 *  @purpose  : To upload mintenance
 */
function uploadMaintenanceImages(req, res) {
    var formData = {};
    var outputJSON = {};
    var maintenanceSavedObj = {};
    var validFileExt = ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'docx'];
    waterfall([
        function (callback) {
            var uploaded_file = req.swagger.params.file.value;
            formData = {};
            var file = uploaded_file;
            if (file.size < 10574919) {
                var mimeExtension = file.mimetype.split('/');
                if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
                    callback(null, file);
                } else {
                    callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false);
                }
            } else {
                callback('Upload file must be less than 10 MB', false);
            }
        },
        function (file, callback) {
            if (file) {
                var timestamp = Number(new Date()); // current time as number
                var splitFile = file.originalname.split('.');
                var filename = +timestamp + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
                var dir = './api/uploads/maintenance';
                var temp_path = dir + '/' + filename;
                var data = file.buffer;
                fs.writeFile(path.resolve(temp_path), data, function (err, data) {
                    if (err) {
                        callback(err, false);
                    } else {
                        callback(null, filename);
                        /*var thumbFileName = filename + '_thumb.jpg';
                        var source_path ='./api/uploads/maintenance'+thumbFileName;
                        var destination_path ='./api/uploads/maintenance/thumbnail';
                        // console.log("filename=>",filename);
                        easyimg.resize({src: source_path, dst: destination_path, width: 100, height: 100}, function (err, stdout, stderr) {
                            if (err){
                               console.log("err",err);
                               callback(err, false);
                            }
                            else{
                                console.log("filename",filename);
                                callback(null, filename);
                                console.log('Resized to 640x480');
                            }
                        });*/
                    }
                });
            } else {
                callback('No files selected', false);
            }
        },
        function (formData, callback) {

            var updateImage = [];
            var maintenanceData = {};
            maintenanceSavedObj._id = req.body._id;
            if (maintenanceSavedObj._id) {
                var field = "";
                var query = { _id: maintenanceSavedObj._id };
                delete formData._id;
                maintenances.findOne(query, function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if (data.images.length == 0) {
                            data.images.push({ 'path': formData });
                            data.save(function (err, data) {
                                if (err) {
                                    callback(err, null);
                                } else {
                                    callback(null, data);
                                }
                            });
                        } else if (data.images && data.images.length > 0) {
                            data.images.push({ 'path': formData });
                            data.save(function (err, data) {
                                if (err) {
                                    callback(err, null);
                                } else {
                                    callback(null, data);
                                }
                            });
                        }
                    }
                });
            }
        }
    ], function (err, maintenanceData) {
        if (err) {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.PROPERTY_CREATE_UNSUCCESS
            };
        } else {
            outputJSON = {
                code: Constant.SUCCESS_CODE,
                data: maintenanceData,
                message: Constant.PROPERTY_CREATE_SUCCESS,
            };
        }
        res.jsonp(outputJSON);
    });
}




/*  @api : uploadProposalImages
 *  @author  :
 *  @created  :
 *  @modified :
 *  @purpose  : To upload proposals images
 */
function uploadProposalImages(req, res) {
    var formData = {};
    var outputJSON = {};
    var maintenanceSavedObj = {};
    var validFileExt = ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'txt', 'doc'];
    waterfall([
        function (callback) {
            var uploaded_file = req.swagger.params.file.value;
            formData = {};
            var file = uploaded_file;
            if (file.size < 10574919) {
                var mimeExtension = file.mimetype.split('/');
                if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
                    callback(null, file);
                } else {
                    callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false);
                }
            } else {
                callback('Upload file must be less than 10 MB', false);
            }
        },
        function (file, callback) {
            if (file) {
                var timestamp = Number(new Date()); // current time as number
                var splitFile = file.originalname.split('.');
                var filename = +timestamp + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
                var dir = './api/uploads/maintenance';
                var temp_path = dir + '/' + filename;
                var data = file.buffer;


                fs.writeFile(path.resolve(temp_path), data, function (err, data) {
                    if (err) {
                        callback(err, false);
                    } else {
                        callback(null, filename);
                        /*var thumbFileName = filename + '_thumb.jpg';
                        var source_path ='./api/uploads/maintenance'+thumbFileName;
                        var destination_path ='./api/uploads/maintenance/thumbnail';
                        console.log("filename=>",filename);
                        easyimg.resize({src: source_path, dst: destination_path, width: 100, height: 100}, function (err, stdout, stderr) {
                            if (err){
                               console.log("err",err);
                               callback(err, false);
                            }
                            else{
                                console.log("filename",filename);
                                callback(null, filename);
                                console.log('Resized to 640x480');
                            }
                        });*/
                    }
                });
            } else {
                callback('No files selected', false);
            }
        },
        function (formData, callback) {
            var updateImage = [];
            var maintenanceData = {};
            maintenanceSavedObj._id = req.body._id;
            if (maintenanceSavedObj._id) {
                var field = "";
                var query = { _id: mongoose.Types.ObjectId(maintenanceSavedObj._id) };
                delete formData._id;

                maintenances.findOne(query, function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if (!data.images) { data.images = []; }
                        data.images.push({ 'path': formData });
                        data.save(function (err, data) {
                            if (err) {
                                callback(err, null);
                            } else {
                                callback(null, data);
                            }
                        });
                    }
                });
            }
        }
    ], function (err, maintenanceData) {
        if (err) {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.PROPERTY_CREATE_UNSUCCESS
            };
        } else {
            outputJSON = {
                code: Constant.SUCCESS_CODE,
                data: maintenanceData,
                message: Constant.PROPERTY_CREATE_SUCCESS,
            };
        }
        res.jsonp(outputJSON);
    });
}



/*  @api : uploadMobilePropertyImage
 *  @author  :
 *  @created  :
 *  @modified :
 *  @purpose  : To post the Propert.
 */
function uploadMobileMaintenanceImage(req, res) {
    var formData = {};
    var outputJSON = {};
    var propertySavedObj = {};
    var validFileExt = ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'docx'];
    waterfall([
        function (callback) {
            var uploaded_file = req.swagger.params.file.value;
            formData = {};
            var file = uploaded_file;
            if (file.size < 10574919) {
                var mimeExtension = file.mimetype.split('/');
                if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
                    callback(null, file);
                } else {
                    callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false);
                }
            } else {
                callback('Upload file must be less than 10 MB', false);
            }
        },
        function (file, callback) {
            if (file) {
                var timestamp = Number(new Date()); // current time as number
                var splitFile = file.originalname.split('.');
                var filename = +timestamp + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
                var dir = './api/uploads/maintenance';
                var temp_path = dir + '/' + filename;
                var data = file.buffer;
                //var uploadedImage = '/uploads/property/'+filename;
                fs.writeFile(path.resolve(temp_path), data, function (err, data) {
                    if (err) {
                        callback(err, false);
                    } else {
                        callback(null, filename);
                    }
                });
            } else {
                callback('No files selected', false);
            }
        }
    ], function (err, imageData) {
        if (err) {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.PROPERTY_CREATE_UNSUCCESS
            };
        } else {
            outputJSON = {
                code: Constant.SUCCESS_CODE,
                data: imageData,
                message: Constant.PROPERTY_CREATE_SUCCESS,
            };
        }
        res.jsonp(outputJSON);
    });
}

function completeJob(req, res) {

    var maintenance_id = (typeof req.body.maintenance_id != 'undefined') ? req.body.maintenance_id : '';
    var message = (typeof req.body.message != 'undefined') ? req.body.message : '';
    var images = (typeof req.body.images != 'undefined') ? req.body.images : [];
    var imagesListArr = [];

    if (maintenance_id) {
        var req_status = Constant.REQ_STATUS_COMPLETE_JOB;
        var req_complete_message = message;
        var is_job_completed = true;
        console.log("req_status   ", req_status);
        if (images) {
            for (var i = 0; i < images.length; i++) {
                if (images.indexOf(images[i].path) === -1) {
                    imagesListArr.push({ "path": images[i].path, "status": false });
                }
            }
        }

        if (validator.isValidObject(maintenance_id))
            var maintenance_id = maintenance_id;

        maintenances.update({ '_id': mongoose.Types.ObjectId(maintenance_id) },
            {
                $set: {
                    'req_status': req_status,
                    'req_complete_message': req_complete_message,
                    'job_close_confirmation': 1,
                    'complete_images': imagesListArr,
                    'is_job_completed': is_job_completed
                }
            }, function (err) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR + "1" });
                } else {
                    maintenances.findById({ _id: mongoose.Types.ObjectId(maintenance_id) }).
                        populate('property_id', 'property_name description address image')
                        .populate('created_by', 'firstname lastname image')
                        .populate('trader_id', 'firstname lastname image')
                        //.populate('categories_id','name')
                        //.populate('watchers_list.users_id','firstname lastname image')
                        .exec(function (err, data) {
                            //Send Message to Traders for new maintenance request//
                            if (err) {
                                //res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                res.json({ code: Constant.SUCCESS_CODE, data: data });
                            } else {
                                var to_users = [];
                                var obj2 = {};
                                // obj2.subject = "Job " + data.request_id + " completed  in property " + data.property_id.address;
                                // obj2.subject = data.trader_id.firstname + " " + data.trader_id.lastname + " sent confirmation request for job #" + data.request_id + " completion in property " + data.property_id.address;
                                // obj2.message = "Job " + data.request_id + " completed by " + data.trader_id.firstname + " " + data.trader_id.lastname + " in property " + data.property_id.address;
                                // obj2.message = req_complete_message;
                                obj2.subject = data.request_overview + " has been completed by " + data.trader_id.firstname + " " + data.trader_id.lastname;
                                obj2.message = data.address;

                                obj2.from_user = mongoose.Types.ObjectId(data.trader_id._id);
                                if (data.created_by._id != data.forwarded_by) {
                                    to_users.push({ "users_id": mongoose.Types.ObjectId(data.forwarded_by) });
                                }
                                to_users.push({ "users_id": mongoose.Types.ObjectId(data.created_by._id) });
                                obj2.to_users = to_users;
                                obj2.type = Constant.NOTIFICATION_TYPE_MAINTENENCE_JOB_CLOSED;
                                obj2.maintenence_id = data._id;
                                obj2.module = 2;
                                var notification = new NotificationInfo(obj2);
                                notification.save(function (err, notData) {
                                    if (err) {
                                        // console.log("error ", err);
                                        res.json({ code: Constant.SUCCESS_CODE, maintenance_data: data });
                                    } else {
                                        // console.log("Success");
                                        res.json({ code: Constant.SUCCESS_CODE, data: notData, maintenance_data: data });
                                    }
                                });
                            }
                        });
                }
            });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }

}

async function acceptorDeniedJob(req, res) {
  console.log('req.body :: acceptorDeniedJob api ==============================> ', req.body);
  const maintenance_id = req.body.maintenance_id || '';
  const req_status = req.body.req_status || '';
  const accepted_or_declined_by_role = req.body.accepted_or_declined_by_role || '';

  // Map req_status to human-readable status
  let status = '';
  if (req_status == 2) {
    status = 'Accepted';
  } else if (req_status == 3) {
    status = 'Booked';
  } else if (req_status == 7) {
    status = 'Denied';
  } else {
    return res.json({ code: Constant.ERROR_CODE, message: 'Invalid req_status' });
  }

  if (!maintenance_id) {
    return res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
  }

  try {
    // Fetch maintenance data
    const data = await maintenances
      .findById(mongoose.Types.ObjectId(maintenance_id))
      .populate('property_id', 'property_name description address image')
      .populate('created_by', 'firstname lastname image email')
      .populate('trader_id', 'firstname lastname image email')
      .populate('forwarded_by', 'firstname lastname image')
      .exec();

    if (!data) {
      return res.json({ code: Constant.ERROR_CODE, message: 'Maintenance not found' });
    }

    // Prepare notification
    const to_users = [];
    if (data.forwarded_by && data.forwarded_by._id) {
      to_users.push({ users_id: mongoose.Types.ObjectId(data.forwarded_by._id) });
    }
    if (data.created_by && data.created_by._id) {
      to_users.push({ users_id: mongoose.Types.ObjectId(data.created_by._id) });
    }

    const notificationObj = {
      subject: `${data.request_overview} has been ${status}`,
      message: `${data.request_overview} for property at ${data.address} has been ${status} by ${data.trader_id ? data.trader_id.firstname + ' ' + data.trader_id.lastname : 'user'}`,
      from_user: mongoose.Types.ObjectId(data.trader_id ? data.trader_id._id : data.created_by._id),
      to_users,
      type: Constant.NOTIFICATION_TYPE_MAINTENENCE_JOB_STATUS_CHANGED,
      maintenence_id: data._id, // Note: Typo in variable name (maintenence_id vs maintenance_id)
      module: 2,
    };

    const notification = new NotificationInfo(notificationObj);
    await notification.save();

    // Send emails if the action is performed by the owner
    if (accepted_or_declined_by_role === Constant.OWNER && [2, 3, 7].includes(req_status)) {
      const infoObj = {
        maintenanceURL: `${Constant.STAGGING_URL}#!/maintance_detail/${req.body.maintenance_id}`,
        traderName: data.trader_id ? `${data.trader_id.firstname} ${data.trader_id.lastname}` : '',
        consumerName: data.created_by ? `${data.created_by.firstname} ${data.created_by.lastname}` : '',
        requestOverview: data.request_overview || 'Maintenance Request',
        jobAddress: data.address || 'N/A',
        logoURL: Constant.STAGGING_URL + 'assets/images/logo-public-home.png',
      };

      // Define email templates and subjects
      let template, subject, traderSubject, consumerSubject;
      if (req_status == 2) {
        template = 'consumer_accepts_CP_email';
        traderSubject = 'Counter Proposal Accepted';
        consumerSubject = 'Your Maintenance Request Has Been Accepted';
      } else if (req_status == 3) {
        template = 'consumer_books_job_email';
        traderSubject = 'Maintenance Request Booked';
        consumerSubject = 'Your Maintenance Request Has Been Booked';
      } else {
        template = 'consumer_declines_CP_email';
        traderSubject = 'Counter Proposal Denied';
        consumerSubject = 'Your Maintenance Request Has Been Denied';
      }

      // Send email to trader
      if (data.trader_id && data.trader_id.email) {
        const traderOptions = {
          from: Config.EMAIL_FROM,
          to: data.trader_id.email,
          subject: traderSubject,
          text: traderSubject,
        };
        await mail_helper.sendEmail(traderOptions, template, {
          ...infoObj,
          recipientName: infoObj.traderName,
        });
      }

      // Send email to consumer
      if (data.created_by && data.created_by.email) {
        const consumerOptions = {
          from: Config.EMAIL_FROM,
          to: data.created_by.email,
          subject: consumerSubject,
          text: consumerSubject,
        };
        await mail_helper.sendEmail(consumerOptions, template, {
          ...infoObj,
          recipientName: infoObj.consumerName,
        });
      }
    }

    // Update maintenance status
    if (req_status == 2 || req_status == 3) {
      await maintenances.updateOne(
        { _id: mongoose.Types.ObjectId(maintenance_id) },
        { $set: { req_status } }
      );
    } else if (req_status == 7) {
      await maintenances.updateOne(
        { _id: mongoose.Types.ObjectId(maintenance_id) },
        { $unset: { trader_id: '' }, $set: { req_status: 1, is_forward: false } }
      );
    }

    // Fetch updated maintenance data for response
    const updatedData = await maintenances
      .findById(mongoose.Types.ObjectId(maintenance_id))
      .populate('property_id', 'property_name description address image')
      .populate('created_by', 'firstname lastname image email')
      .populate('trader_id', 'firstname lastname image email')
      .populate('forwarded_by', 'firstname lastname image')
      .exec();

    return res.json({ code: Constant.SUCCESS_CODE, data: updatedData });
  } catch (err) {
    console.error('Error in acceptorDeniedJob:', err);
    return res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
  }
}

function counterProposals(req, res) {
    console.log('req.body :: counter proposal api =========> ', req.body);
    var price = (typeof req.body.proposed_price != 'undefined') ? req.body.proposed_price : 0;
    var date = (typeof req.body.proposed_date != 'undefined') ? req.body.proposed_date : '';
    var maintenance_id = (typeof req.body.maintenance_id != 'undefined') ? mongoose.Types.ObjectId(req.body.maintenance_id) : '';
    var proposal_created_by = (typeof req.body.proposal_created_by != 'undefined') ? mongoose.Types.ObjectId(req.body.proposal_created_by) : '';
    var proposal_created_name = (typeof req.body.proposal_created_name != 'undefined') ? req.body.proposal_created_name : '';
    var message = (typeof req.body.message != 'undefined') ? req.body.message : '';
    var images = (typeof req.body.images != 'undefined') ? req.body.images : [];

    if (maintenance_id) {
        var obj = {};
        obj.maintenance_id = maintenance_id;
        obj.proposed_price = price;
        obj.message = message;
        obj.proposed_date = date;
        obj.proposal_created_by = proposal_created_by;
        // For Mobile app
        if (images) {
            var imagesListArr = [];
            for (var i = 0; i < images.length; i++) {
                if (images.indexOf(images[i].path) === -1) {
                    imagesListArr.push({ "path": images[i].path, "status": false });
                }
            }
            obj.images = imagesListArr;
        }
        var Proposal = new maintenance_proposals(obj);
        Proposal.save({ new: true, runValidators: true }, function (err, proposalData) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                maintenances.findById({ _id: proposalData.maintenance_id }).
                    populate('property_id', 'property_name description address image')
                    .populate('created_by', 'firstname lastname image email')
                    .populate('trader_id', 'firstname lastname image')
                    .populate('forwarded_by', 'firstname lastname image')
                    //.populate('categories_id','name')
                    //.populate('watchers_list.users_id','firstname lastname image')
                    .exec(function (err, data) {
                        console.log('data :: maintenance data => ', data);
                        //Send Message to Traders for new maintenance request//
                        if (err) {
                            //res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                            res.json({ code: Constant.SUCCESS_CODE, data: data });
                        } else {
                            var to_users = [];
                            var obj2 = {};
                            obj2.subject = "Proposal request";
                            obj2.message = "Proposal request sent by " + proposal_created_name + " on " + moment().format("MMMM Do YYYY") + " for the Property " + data.address;
                            obj2.from_user = mongoose.Types.ObjectId(proposal_created_by);
                            to_users.push({ "users_id": mongoose.Types.ObjectId(data.forwarded_by._id) });
                            obj2.to_users = to_users;
                            obj2.module = 2;
                            obj2.maintenence_id = data._id;
                            obj2.type = Constant.NOTIFICATION_TYPE_PROPOSAL;
                            var notification = new NotificationInfo(obj2);

                            console.log('counter proposal ==== owner side ====> ');
                            notification.save(async function (err, notData) {
                                if (err) {
                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                } else {

                                    console.log('req.body.proposal_created_role => ', req.body.proposal_created_role);
                                    console.log('Constant.TRADER => ', Constant.TRADER);
                                    if (req.body.proposal_created_role == Constant.TRADER) {

                                        console.log('CP by trader => ');
                                        // trader_sends_CP_email
                                        let infoObj = {
                                            maintenanceURL: Constant.STAGGING_URL + '#!/maintance_detail/' + req.body.maintenance_id,
                                            traderName: data.trader_id ? data.trader_id.firstname : '',
                                            consumerName: data.created_by.firstname,
                                        }
                                        const options = {
                                            from: Config.EMAIL_FROM, // sender address
                                            // owner email
                                            to: data.created_by.email, // list of receivers
                                            subject: 'Counter Proposal', // Subject line
                                            text: 'Counter Proposal', // plaintext body
                                        }

                                        let mail_response = await mail_helper.sendEmail(options, 'trader_sends_CP_email', infoObj);


                                    } else {
                                        console.log('CP by owner ::  DO not need to send Mail => ');
                                        // DO not need to send Mail
                                    }

                                    res.json({ code: Constant.SUCCESS_CODE, data: data, proposal_data: proposalData });
                                }
                            });
                        }
                    });
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }

}


/*  @api : uploadProposalImages
 *  @author  :
 *  @created  :
 *  @modified :
 *  @purpose  : To upload proposals images
 */
function uploadProposalImages(req, res) {
    var formData = {};
    var outputJSON = {};
    var maintenanceSavedObj = {};
    var validFileExt = ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'txt', 'doc'];
    waterfall([
        function (callback) {
            var uploaded_file = req.swagger.params.file.value;
            formData = {};
            var file = uploaded_file;
            if (file.size < 10574919) {
                var mimeExtension = file.mimetype.split('/');
                if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
                    callback(null, file);
                } else {
                    callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false);
                }
            } else {
                callback('Upload file must be less than 10 MB', false);
            }
        },
        function (file, callback) {
            if (file) {
                var timestamp = Number(new Date()); // current time as number
                var splitFile = file.originalname.split('.');
                var filename = +timestamp + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
                var dir = './api/uploads/proposals';
                var temp_path = dir + '/' + filename;
                var data = file.buffer;


                fs.writeFile(path.resolve(temp_path), data, function (err, data) {
                    if (err) {
                        callback(err, false);
                    } else {
                        callback(null, filename);
                        /*var thumbFileName = filename + '_thumb.jpg';
                        var source_path ='./api/uploads/maintenance'+thumbFileName;
                        var destination_path ='./api/uploads/maintenance/thumbnail';
                        console.log("filename=>",filename);
                        easyimg.resize({src: source_path, dst: destination_path, width: 100, height: 100}, function (err, stdout, stderr) {
                            if (err){
                               console.log("err",err);
                               callback(err, false);
                            }
                            else{
                                console.log("filename",filename);
                                callback(null, filename);
                                console.log('Resized to 640x480');
                            }
                        });*/
                    }
                });
            } else {
                callback('No files selected', false);
            }
        },
        function (formData, callback) {
            var updateImage = [];
            var maintenanceData = {};
            maintenanceSavedObj._id = req.body._id;
            if (maintenanceSavedObj._id) {
                var field = "";
                var query = { maintenance_id: mongoose.Types.ObjectId(maintenanceSavedObj._id) };
                delete formData._id;

                maintenance_proposals.findOne(query, function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if (!data.images) { data.images = []; }
                        data.images.push({ 'path': formData });
                        data.save(function (err, data) {
                            if (err) {
                                callback(err, null);
                            } else {
                                callback(null, data);
                            }
                        });
                    }
                });
            }
        }
    ], function (err, maintenanceData) {
        if (err) {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.PROPERTY_CREATE_UNSUCCESS
            };
        } else {
            outputJSON = {
                code: Constant.SUCCESS_CODE,
                data: maintenanceData,
                message: Constant.PROPERTY_CREATE_SUCCESS,
            };
        }
        res.jsonp(outputJSON);
    });
}


/*  @api : uploadMobilePropertyImage
 *  @author  :
 *  @created  :
 *  @modified :
 *  @purpose  : To post the Propert.
 */
function uploadMobileProposalImage(req, res) {
    var formData = {};
    var outputJSON = {};
    var propertySavedObj = {};
    var validFileExt = ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'docx'];
    waterfall([
        function (callback) {
            var uploaded_file = req.swagger.params.file.value;
            formData = {};
            var file = uploaded_file;
            if (file.size < 10574919) {
                var mimeExtension = file.mimetype.split('/');
                if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
                    callback(null, file);
                } else {
                    callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false);
                }
            } else {
                callback('Upload file must be less than 10 MB', false);
            }
        },
        function (file, callback) {
            if (file) {
                var timestamp = Number(new Date()); // current time as number
                var splitFile = file.originalname.split('.');
                var filename = +timestamp + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
                var dir = './api/uploads/proposals';
                var temp_path = dir + '/' + filename;
                var data = file.buffer;
                //var uploadedImage = '/uploads/property/'+filename;
                fs.writeFile(path.resolve(temp_path), data, function (err, data) {
                    if (err) {
                        callback(err, false);
                    } else {
                        callback(null, filename);
                    }
                });
            } else {
                callback('No files selected', false);
            }
        }
    ], function (err, imageData) {
        if (err) {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.PROPERTY_CREATE_UNSUCCESS
            };
        } else {
            outputJSON = {
                code: Constant.SUCCESS_CODE,
                data: imageData,
                message: Constant.PROPERTY_CREATE_SUCCESS,
            };
        }
        res.jsonp(outputJSON);
    });
}

function acceptDeclineProposalRequest(req, res) {
    console.log('req.body :: another api ======> ', req.body);
    var proposal_id = (typeof req.body.proposal_id != 'undefined') ? req.body.proposal_id : '';
    var is_proposal_accept = (typeof req.body.is_proposal_accept != 'undefined') ? req.body.is_proposal_accept : false;
    var trader_id = (typeof req.body.trader_id != 'undefined') ? mongoose.Types.ObjectId(req.body.trader_id) : false;
    var pstatus = (is_proposal_accept) ? "Accept" : "Decline";
    var req_status = (is_proposal_accept == true) ? 2 : 1;

    if (req_status == 2) {
        var accepted_price = (typeof req.body.price != 'undefined') ? req.body.price : '';
        var due_date = (typeof req.body.due_date != 'undefined') ? req.body.due_date : '';
        var update_maitenance = { "req_status": req_status, budget: accepted_price, due_date: due_date };
    }
    else
        var update_maitenance = { "req_status": req_status };

    if (trader_id && trader_id != '') {
        update_maitenance.trader_id = trader_id;
    }

    if (proposal_id) {
        maintenance_proposals.findOneAndUpdate({ '_id': mongoose.Types.ObjectId(proposal_id) },
            {
                $set: {
                    "is_proposal_accept": is_proposal_accept,
                    "is_proposal_read_by_agent": true
                }
            }, function (err, proposal) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    if (proposal) {
                        maintenances.findOneAndUpdate({ "_id": mongoose.Types.ObjectId(proposal.maintenance_id) },
                            { $set: update_maitenance }, function (err, mdata) {
                                if (err) {
                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                } else {
                                    maintenances.findById({ _id: mongoose.Types.ObjectId(mdata._id) })
                                        .populate('property_id', 'property_name description address image')
                                        .populate('created_by', 'firstname lastname image')
                                        .populate('forwarded_by', 'firstname lastname image')
                                        .populate('trader_id', 'firstname lastname image email')
                                        .exec(function (err, data) {
                                            //Send Message to Traders for accept/decline maintenance proposal request//
                                            if (err) {
                                                res.json({ code: Constant.SUCCESS_CODE, data: data });
                                            } else {
                                                var to_users = [];
                                                var obj2 = {};
                                                // obj2.subject = "Maintenance request #" + data.request_id + " has been " + pstatus;
                                                // obj2.message = "Request " + data.request_id + " has been " + pstatus + " by " + data.forwarded_by.firstname + " " + data.forwarded_by.lastname;
                                                obj2.subject = data.request_overview + " - maintenance request has been " + pstatus + " by " + data.forwarded_by.firstname + " " + data.forwarded_by.lastname;
                                                obj2.message = data.address;
                                                obj2.from_user = mongoose.Types.ObjectId(data.forwarded_by._id);
                                                to_users.push({ "users_id": mongoose.Types.ObjectId(data.trader_id._id) });
                                                obj2.to_users = to_users;
                                                obj2.module = 2;
                                                obj2.maintenence_id = data._id;
                                                obj2.type = Constant.NOTIFICATION_TYPE_MAINTENENCE_PROPOSAL_REQ;
                                                var notification = new NotificationInfo(obj2);
                                                notification.save(async function (err, notData) {
                                                    if (err) {
                                                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                    } else {
                                                        if (req.body.accepted_or_declined_by_role == Constant.OWNER) {
                                                            if (req_status == 2) {
                                                                console.log('owner accepted CP => ');
                                                                // send email for accepted CP
                                                                // consumer_accepts_CP_email
                                                                let infoObj = {
                                                                    maintenanceURL: Constant.STAGGING_URL + '#!/maintance_detail/' + data._id,
                                                                    traderName: data.trader_id ? data.trader_id.firstname : '',
                                                                    consumerName: data.created_by.firstname,
                                                                }
                                                                const options = {
                                                                    from: Config.EMAIL_FROM, // sender address
                                                                    // trader email
                                                                    to: data.trader_id.email, // list of receivers
                                                                    subject: 'Counter Proposal Accepted', // Subject line
                                                                    text: 'Counter Proposal Accepted', // plaintext body
                                                                }

                                                                let mail_response = await mail_helper.sendEmail(options, 'consumer_accepts_CP_email', infoObj);

                                                            } else if (req_status == 7 || !is_proposal_accept) {
                                                                console.log('owner declined CP => ');
                                                                // send email for decline CP
                                                                // consumer_declines_CP_email
                                                                let infoObj = {
                                                                    maintenanceURL: Constant.STAGGING_URL + '#!/maintance_detail/' + data._id,
                                                                    traderName: data.trader_id ? data.trader_id.firstname : '',
                                                                    consumerName: data.created_by.firstname,
                                                                }
                                                                const options = {
                                                                    from: Config.EMAIL_FROM, // sender address
                                                                    // trader email
                                                                    to: data.trader_id.email, // list of receivers
                                                                    subject: 'Counter Proposal Declined', // Subject line
                                                                    text: 'Counter Proposal Declined', // plaintext body
                                                                }
                                                                let mail_response = await mail_helper.sendEmail(options, 'consumer_declines_CP_email', infoObj);

                                                            } else {
                                                                console.log('req_status != 2 or != 7 => ');
                                                            }
                                                        } else {
                                                            console.log('not owner user => ');
                                                        }
                                                        res.json({ code: Constant.SUCCESS_CODE, data: notData, message: "successfully update proposal request" });
                                                    }
                                                });
                                            }
                                        });
                                }
                            });
                    } else {
                        res.json({ code: Constant.SUCCESS_CODE, message: "successfully update proposal request" });
                    }
                }
            });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}
/*  @api : counterProposals
 *  @author  :
 *  @created  :
 *  @modified :
 *  @purpose  : To get the counter proposal.
 */
function getAllCounterProposals(req, res) {
    var maintenance_id = (typeof req.body.maintenance_id != 'undefined') ? mongoose.Types.ObjectId(req.body.maintenance_id) : '';
    var trader_id = (typeof req.body.trader_id != 'undefined') ? mongoose.Types.ObjectId(req.body.trader_id) : '';

    if (maintenance_id) {

        var conditions = { "$and": [] };
        conditions["$and"].push({ deleted: false, maintenance_id: maintenance_id });

        if (trader_id && trader_id != '') {
            conditions["$and"].push({ "proposal_created_by": trader_id });
            conditions["$and"].push({ "proposal_type": 'apply' });
        }

        maintenance_proposals.aggregate([
            { $match: conditions }, // Match me
            { $lookup: { from: 'users', localField: 'proposal_created_by', foreignField: '_id', as: 'users' } },
            {
                $match: { "users.is_active": true, "users.is_deleted": false }
            }
        ])
            .allowDiskUse(true)
            .exec(function (err, results) {
                // console.log("test  ", results);
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    if (results.length > 0) {
                        waterfall([
                            function (callback) {
                                maintenance_proposals.aggregate(
                                    { $match: conditions }, // Match me
                                    { $lookup: { from: 'users', localField: 'proposal_created_by', foreignField: '_id', as: 'users' } },
                                    { $lookup: { from: 'groups', localField: 'users._id', foreignField: 'user_id', as: 'groups' } },
                                    { $lookup: { from: 'reviews', localField: 'proposal_created_by', foreignField: 'review_to', as: 'reviews' } },
                                    {
                                        $project: {
                                            "_id": 1,
                                            "maintenance_id": 1,
                                            "proposed_price": 1,
                                            "message": 1,
                                            "proposed_date": 1,
                                            "proposal_type": 1,
                                            "status": 1,
                                            users: "$users",
                                            groups: { "_id": 1, "role_id": 1, "status": 1, "deleted": 1, "is_master_role": 1 },
                                            reviews: { "_id": 1, "review_to": 1, "review_by": 1, "avg_total": 1 }
                                        }
                                    },
                                    {
                                        $match: {
                                            // "groups.is_master_role": true,
                                            // "groups.status": true,
                                            // "groups.deleted": false,
                                            "users.is_active": true,
                                            "users.is_deleted": false
                                        }
                                    },
                                    { $sort: { "createdDate": -1 } },
                                    // { "$limit": number_of_pages }
                                ).exec(function (err, userList) {
                                    // console.log("userList    ", userList);
                                    if (err) {
                                        callback(err);
                                    } else {
                                        callback(null, userList);
                                    }
                                });
                            },
                            function (arg1, callback) {
                                if (arg1.length > 0) {
                                    var finalResponse = [];
                                    async.each(arg1, function (item, asyncCall) {
                                        var totalReviewLength = item.reviews.length;
                                        // console.log("length   : ", totalReviewLength);
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
                                            callback(null, arg1);
                                        }
                                    });
                                } else {
                                    callback(null, []);
                                }
                            },
                        ], function (err, result) {
                            if (err) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
                            } else {
                                // console.log("result =========   ", result);
                                result = _.sortBy(result, function (o) { return o.createdDate; }).reverse();
                                // console.log("result      ", result);
                                res.json({ code: Constant.SUCCESS_CODE, data: result });
                            }
                        });
                    } else {
                        res.json({ code: Constant.SUCCESS_CODE, data: [] });
                    }
                }
            });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

/*  @api : cancel request
 *  @author  : Rahul Lahariya
 *  @created  :
 *  @modified :
 *  @purpose  : To cancel maintenence request
 */
function cancelMaintenanceRequest(req, res) {
    if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
        var maintenance_id = mongoose.Types.ObjectId(req.swagger.params.id.value);

        if (maintenance_id) {
            maintenances.findOneAndUpdate({ "_id": mongoose.Types.ObjectId(maintenance_id) },
                { $set: { "deleted": true } }, function (err, data) {
                    if (err) {
                        res.json({
                            code: Constant.INVALID_CODE,
                            message: Constant.INTERNAL_ERROR
                        });
                    } else {
                        res.json({
                            code: Constant.SUCCESS_CODE,
                            message: "Request successfully cancel"
                        });
                    }
                });
        } else {
            res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
        }
    } else {
        res.json({ code: Constant.NOT_FOUND, message: Constant.ERROR_RETRIVING_DATA });
    }
}

/*  @api : Confirm Job completion
 *  @author  : Rahul Lahariya
 *  @created  : 02-Feb
 *  @modified :
 *  @purpose  : Confirm Job completion
 */
function confirmDeclineCompleteJob(req, res) {

    var maintenence_id = (typeof req.body.maintenence_id != 'undefined') ? req.body.maintenence_id : '';
    var job_close_confirmation = (typeof req.body.job_close_confirmation != 'undefined') ? req.body.job_close_confirmation : 3;
    var jstatus = (job_close_confirmation == 2) ? "accepted" : "decline";
    var is_job_completed = (job_close_confirmation == 2) ? true : false;
    var job_status = (job_close_confirmation == 2) ? 4 : 3;
    // 5 for Job complete confirm by agent and 3 is for booked

    if (maintenence_id) {
        maintenances.update({ "_id": mongoose.Types.ObjectId(maintenence_id) },
            {
                $set: {
                    "job_close_confirmation": job_close_confirmation,
                    "is_job_completed": is_job_completed, "req_status": job_status
                }
            }, function (err, data1) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    if (data1) {
                        maintenances.findById({ _id: mongoose.Types.ObjectId(maintenence_id) })
                            .populate('property_id', 'property_name description address image')
                            .populate('created_by', 'firstname lastname image')
                            .populate('forwarded_by', 'firstname lastname image')
                            .populate('trader_id', 'firstname lastname image')
                            .exec(function (err, data) {
                                // console.log("data     ", data);
                                //Send Message to Traders for accept/decline maintenance proposal request//
                                if (err) {
                                    res.json({ code: Constant.SUCCESS_CODE, data: data });
                                } else {
                                    var to_users = [];
                                    var obj2 = {};
                                    // obj2.subject = "Confirmation on job request #" + data.request_id + " has been " + jstatus;
                                    // obj2.message = "Confirmation on job request #" + data.request_id + " has been " + jstatus + " by " + data.forwarded_by.firstname + " " + data.forwarded_by.lastname;
                                    obj2.subject = "Confirmation on " + data.request_overview + " has been " + jstatus;
                                    obj2.message = data.address;
                                    obj2.from_user = mongoose.Types.ObjectId(data.forwarded_by._id);
                                    to_users.push({ "users_id": mongoose.Types.ObjectId(data.trader_id._id) });
                                    obj2.to_users = to_users;
                                    obj2.type = Constant.NOTIFICATION_TYPE_MAINTENENCE_PROPOSAL_REQ;
                                    obj2.maintenence_id = data._id;
                                    obj2.module = 2;
                                    var notification = new NotificationInfo(obj2);
                                    notification.save(function (err, notData) {
                                        if (err) {
                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                        } else {
                                            res.json({ code: Constant.SUCCESS_CODE, data: notData, message: "successfully update proposal request" });
                                        }
                                    });
                                }
                            });
                    } else {
                        res.json({ code: Constant.SUCCESS_CODE, message: "successfully update close job request" });
                    }
                }
            });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}
/*  @api : watcher remove from maintenance watcher list
 *  @author  :
 *  @created  : 18-Mar
 *  @modified :
 *  @purpose  : watcher remove from maintenance watcher list
 */
function removeWatcher(req, res) {
    if (req.body.userId && req.body.maintenanceId) {
        var maintenanceId = req.body.maintenanceId;
        var userId = req.body.userId;
        var outputJSON = {};
        waterfall([
            function (callback) {
                maintenances.findById({ "_id": maintenanceId, "deleted": false })
                    .populate('watchers_list.users_id', 'firstname lastname image')
                    .exec(function (err, response) {
                        if (err) {
                            callback(err, false);
                        } else {
                            callback(null, response);
                        }
                    });
            },
            function (response, callback) {
                maintenances.update({ '_id': maintenanceId },
                    {
                        $pull: {
                            'watchers_list': { users_id: userId }
                        }
                    }, function (err, maintenanceData) {
                        if (err) {
                            callback(err, false);
                        } else {
                            callback(null, maintenanceData);
                        }
                    });
            }
        ], function (err, maintenanceData) {
            if (err) {
                outputJSON = {
                    code: Constant.ERROR_CODE,
                    message: Constant.INTERNAL_ERROR
                };
            } else {
                outputJSON = {
                    code: Constant.SUCCESS_CODE,
                    data: maintenanceData,
                    message: Constant.WATCHER_REMOVED_SUCCESS,
                };
            }
            res.jsonp(outputJSON);
        });
    }
}

// function addMR(req, res) {
//     console.log('req.body :: addMR => ', req.body);
//     console.log('req.body.latitude :: addMR => ', req.body.latitude);
//     console.log('req.body.longitude :: addMR => ', req.body.longitude);
//     var referral_code = (typeof req.body.referralCode != 'undefined') ? req.body.referralCode : '';
//     var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
//     var email = (typeof req.body.email != 'undefined') ? req.body.email : '';
//     var mobile_no = (typeof req.body.mobile_no != 'undefined') ? req.body.mobile_no : '';
//     var request_overview = (typeof req.body.request_overview != 'undefined') ? req.body.request_overview : '';
//     var request_detail = (typeof req.body.request_detail != 'undefined') ? req.body.request_detail : '';
//     var mail_title = request_overview + ' - Quote Request';
//     var agency_id = (typeof req.body.agency_id != 'undefined') ? mongoose.Types.ObjectId(req.body.agency_id) : '';
//     var trader_id = (typeof req.body.trader_id != 'undefined') ? mongoose.Types.ObjectId(req.body.trader_id) : '';
//     var request_type = (trader_id && trader_id != '') ? 0 : 1;
//     var created_by_role = (typeof req.body.created_by_role != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by_role) : mongoose.Types.ObjectId(Config.TENANT);
//     var created_by = (typeof req.body.created_by != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by) : '';
//     var budget = (typeof req.body.budget != 'undefined') ? req.body.budget : 0;
//     var due_date = (typeof req.body.due_date != 'undefined') ? moment(req.body.due_date).format('YYYY-MM-DD') : '';
//     var req_status = (typeof req.body.req_status != 'undefined') ? req.body.req_status : 1;
//     var category_id = (typeof req.body.category_id != 'undefined') ? mongoose.Types.ObjectId(req.body.category_id) : '';
//     var is_forward = (created_by_role == Constant.AGENT || created_by_role == Constant.OWN_AGENCY) ? true : false;
//     var address = (typeof req.body.address != 'undefined') ? req.body.address : '';
//     var longitude = (typeof req.body.longitude != 'undefined') ? req.body.longitude : '';
//     var latitude = (typeof req.body.latitude != 'undefined') ? req.body.latitude : '';
//     var watchersList = (typeof req.body.watchers_list != 'undefined') ? req.body.watchers_list : [];
//     var images = (typeof req.body.images != 'undefined') ? req.body.images : [];
//     var activation_code = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
//     var newuserId = [];
//     var user_id = '';
//     (async () => {
//         // console.log("step1");
//         if (email && category_id && email != '' && category_id != '') {
//             // console.log("step2");
//             let userRecord = await User.findOne({ email: email }, { email: 1, _id: 1 });
//             //console.log("userRecord", userRecord);
//             if (userRecord) {
//                 user_id = userRecord._id
//             } else {
//                 console.log("New User");
//                 //Add User, Send Mail to Consumer for Account Activation and Mail to Traders for new Job

//                 // Add User Start
//                 var userData = {
//                     firstname: firstname,
//                     email: email,
//                     mobile_no: mobile_no,
//                     activation_code: activation_code,
//                     status: false,
//                     is_deleted: false,
//                     referedBy: trader_id
//                 };
//                 var UsersRecord = new User(userData);

//                 // call the built-in save method to save to the database
//                 newuserId = await UsersRecord.save();
//                 //console.log("new added user is ", newuserId);
//                 user_id = newuserId._id;
//             }
//             //console.log("user_id =>", user_id);
//             if (user_id && user_id != '') {
//                 console.log("calling;;;");
//                 //Add MR and Send Mail to Traders for new Job
//                 var mrData = {};
//                 var addData = {};

//                 var chars = "123456789";
//                 var maintennceId = '';
//                 for (var x = 0; x < 9; x++) {
//                     var i = Math.floor(Math.random() * chars.length);
//                     maintennceId += chars.charAt(i);
//                 }
//                 mrData.address = address;
//                 mrData.request_id = maintennceId;
//                 mrData.request_overview = request_overview;
//                 mrData.request_detail = request_detail;
//                 mrData.created_by = (created_by && created_by != '') ? mongoose.Types.ObjectId(created_by) : mongoose.Types.ObjectId(user_id);
//                 mrData.forwarded_by = (created_by && created_by != '') ? mongoose.Types.ObjectId(created_by) : mongoose.Types.ObjectId(user_id);
//                 mrData.budget = budget;
//                 mrData.due_date = due_date;
//                 mrData.req_status = req_status;
//                 mrData.is_forward = is_forward;
//                 mrData.categories_id = mongoose.Types.ObjectId(category_id);
//                 mrData.request_type = request_type;
//                 mrData.watchers_list = watchersList;
//                 mrData.referral_code = referral_code;

//                 if (images) {
//                     var imagesListArr = [];
//                     for (var i = 0; i < images.length; i++) {
//                         if (images.indexOf(images[i].path) === -1) {
//                             imagesListArr.push({ "path": images[i].path });
//                         }
//                     }
//                     mrData.images = imagesListArr;
//                 }

//                 if (mrData.request_type == 1) {
//                     mrData.original_budget = budget;
//                     mrData.original_date = due_date;
//                 }
//                 if (agency_id && validator.isValidObject(agency_id))
//                     mrData.agency_id = agency_id;
//                 if (trader_id && validator.isValidObject(trader_id))
//                     mrData.trader_id = trader_id;
//                 if (created_by && validator.isValidObject(created_by))
//                     mrData.created_by = created_by;
//                 if (created_by_role && validator.isValidObject(created_by_role))
//                     mrData.created_by_role = created_by_role;
//                 //console.log("step6    ", mrData);

//                 var options = {
//                     method: 'GET',
//                     url: 'https://api.psma.com.au/beta/v1/addresses',
//                     qs: { perPage: '10', page: '1', addressString: address },
//                     headers: { authorization: 'Z6Auyhh7JOaXfvandiUb0e95Mr92GfnY' }
//                 };

//                 await request(options, async function (error, response, body) {
//                     if (response) {
//                         var result = JSON.parse(body);
//                         if (result && result.data && result.data[0] && result.data[0].addressId) {
//                             addData.GNAFId = mrData.address_id = await result.data[0].addressId;
//                             console.log("result.data[0].addressId    ", addData.GNAFId);
//                         }
//                     }
//                     console.log('address :: addMR => ', address);
//                     var address1 = escape(address);
//                     var options = {
//                         "method": "GET",
//                         "hostname": "maps.googleapis.com",
//                         "port": null,
//                         "path": "/maps/api/geocode/json?address=" + address1 + "&key=AIzaSyCGWZqTcVNj2IeuAud3EsdL3ewktb0yCFo"
//                     };
//                     // console.log('options for google map API : addMR => ', options);
//                     var req1 = await http.request(options, async function (res1) {
//                         var chunks = [];
//                         await res1.on("data", function (chunk) {
//                             chunks.push(chunk);
//                         });

//                         await res1.on("end", async function () {
//                             var body = Buffer.concat(chunks);
//                             var address2 = body.toString();
//                             var result = JSON.parse(address2).results;
//                             // console.log('result :: data of google map api => ', result);
//                             //console.log("result   ", JSON.stringify(JSON.parse(address2)));
//                             if (result && result.length > 0) {
//                                 const locData = result[0];
//                                 // console.log("===========>   " ,  locData.address_components);
//                                 if (locData.address_components && locData.address_components.length > 0) {
//                                     locData.address_components.map(function (location_part) {
//                                         if (location_part.types && location_part.types[0] && location_part.types[0] == 'administrative_area_level_1')
//                                             mrData.suburb = location_part.long_name;
//                                         if (location_part.types && location_part.types[0] && location_part.types[0] == 'postal_code')
//                                             mrData.postcode = location_part.long_name;
//                                     });
//                                 }
//                                 if (locData.geometry && locData.geometry.location && locData.geometry.location.lat && locData.geometry.location.lng) {
//                                     mrData.latitude = await locData.geometry.location.lat;
//                                     mrData.longitude = await locData.geometry.location.lng;
//                                     // console.log("======================= ", mrData.latitude + "    " + mrData.longitude);

//                                     mrData.location = await {
//                                         coordinates: [locData.geometry.location.lng, locData.geometry.location.lat],
//                                         type: 'Point'
//                                     }
//                                 }
//                             }

//                             var maintenance_id = '';
//                             var maintenance = new maintenances(mrData);
//                             //console.log("mr data    ", mrData);
//                             await maintenance.save(async function (err5, maintenanaceData) {
//                                 if (err5) {
//                                     // console.log("err5     ", err5);
//                                 } else {
//                                     maintenance_id = await maintenanaceData._id;
//                                     let createdByData;
//                                     await User.findById(maintenanaceData.created_by, async function (createdByErr, createdByInfo) {
//                                         console.log('createdByInfo => ', await createdByInfo);
//                                         if (createdByErr) {
//                                             console.log('createdByErr :: Error occured while retrieving data from users table => ', createdByErr);
//                                         } else {
//                                             createdByData = await createdByInfo
//                                         }
//                                     })
//                                     var traderLog = {
//                                         maintenance_id: mongoose.Types.ObjectId(maintenance_id)
//                                     };
//                                     var addTraderLog = new maintentenance_traders_log(traderLog);
//                                     await addTraderLog.save(function (err_, traderLogs) {

//                                     });


//                                     if (newuserId && newuserId._id && newuserId._id != '') {
//                                         console.log('newuserId => ');
//                                         var mailOptions = {
//                                             from: Config.EMAIL_FROM, // sender address
//                                             to: email, // list of receivers
//                                             // to: 'jerriranhard@yahoo.com', // list of receivers
//                                             subject: 'Your Ownly Trade service request', // Subject line
//                                             text: 'Your Ownly Trade service request', // plaintext body
//                                             html: '<!doctype html>' +
//                                                 '<html lang="en">' +
//                                                 '<head>' +
//                                                 '<meta charset="utf-8">' +
//                                                 '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">' +
//                                                 '<link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">' +
//                                                 '<title>Email </title>' +
//                                                 '</head>' +
//                                                 '<body>' +
//                                                 '<table style="font-family:Roboto;max-width:800px;width:100%;border-radius:4px;margin:0 auto;border-spacing:0;background: #3b4856;display: block;">' +
//                                                 '<tr>' +
//                                                 '<td style="border:0;padding: 130px 0 180px 0px;background:#3b4856;border-spacing:0;text-align:center;background: url(' + Constant.STAGGING_URL + 'assets/images/img-001.jpg) no-repeat center 0;background-size:contain">' +
//                                                 '<table style="width:90%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">' +
//                                                 '<tr>' +
//                                                 '<td style="padding:20px; text-align:left;">' +
//                                                 '<table style="width:100%; margin:0; border-spacing:0; border-spacing: 0;">' +
//                                                 '<tr>' +
//                                                 '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:20px;">Dear ' + firstname + ',</td>' +
//                                                 '</tr>' +
//                                                 '<tr>' +
//                                                 '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;">Thank you for placing your request through Australia’s newest Trade and Service platform, Ownly Trade. We are delighted to help you find the perfect Trader.</td>' +
//                                                 '</tr>' +
//                                                 '<tr>' +
//                                                 '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;">Please <a href="' + Constant.PUBLIC_STAGGING_URL + 'consumer_account_activation/' + activation_code + '/' + maintenance_id + '"><b>click here</b></a> to activate your account ' + email + ' and stay up to date with your Trade Request.</td>' +
//                                                 '</tr>' +
//                                                 '<tr>' +
//                                                 '<td style="color:#2E4255; font-size:18px; font-weight:700; line-height:normal; padding:0; margin:0;"><a target="_blank" href="' + Constant.PUBLIC_STAGGING_URL + 'consumer_account_activation/' + activation_code + '/' + maintenance_id + '" style="display:block;background:#2AA8D7; width:150px; line-height:28px; color:#fff; font-size:13px; border-radius:4px; text-decoration:none;text-align:center; margin-bottom:15px;">Activate My Account</a><br></td>' +
//                                                 '</tr>' +
//                                                 '<tr>' +
//                                                 '<td>' +
//                                                 '<p style="display:flex; padding-bottom:25px; margin:0;">' +
//                                                 '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">- Communicate with your trader</em>' +
//                                                 '</p>' +
//                                                 '<p style="display:flex; padding-bottom:25px; margin:0;">' +
//                                                 '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">- Add any new files</em>' +
//                                                 '</p>' +
//                                                 '<p style="display:flex; padding-bottom:25px; margin:0;">' +
//                                                 '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">- Cancel your request</em>' +
//                                                 '</p>' +
//                                                 '<p style="display:flex; padding-bottom:25px; margin:0;">' +
//                                                 '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">- Review your traders work</em>' +
//                                                 '</p>' +
//                                                 '</td>' +
//                                                 '</tr>' +
//                                                 '<tr>' +
//                                                 '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;">If you are on mobile, <a href="' + Constant.APP_DOWNLOAD_URL + '"><b>click here</b></a> to download the PropertyCom app featuring the full TradeHub suite.</td>' +
//                                                 '</tr>' +
//                                                 '<tr>' +
//                                                 '<td style="color:#7C888D; font-size:15px; line-height:normal;">Thanks and Welcome to Ownly Trade</td>' +
//                                                 '</tr>' +
//                                                 '</table>' +
//                                                 '</td>' +
//                                                 '</tr>' +
//                                                 '</table>' +
//                                                 '</td>' +
//                                                 '</tr>' +
//                                                 '</table>' +
//                                                 '</body>' +
//                                                 '</html>'// html body'
//                                         }
//                                         // console.log("mailOptions  1 ", mailOptions);
//                                         let info = transporter.sendMail({
//                                             from: mailOptions.from,
//                                             to: mailOptions.to,
//                                             subject: mailOptions.subject,
//                                             text: mailOptions.subject,
//                                             html: mailOptions.html
//                                         }, function (error, response) {
//                                             console.log("===============================");
//                                             if (error) {
//                                                 console.log("eeeeee", error);
//                                             } else {
//                                                 console.log("Message sent: Successfully  1 ==========> check here ", mailOptions.to);
//                                             }
//                                         });

//                                         // sendmail({
//                                         //     from: mailOptions.from,
//                                         //     to: mailOptions.to,
//                                         //     subject: mailOptions.subject,
//                                         //     html: mailOptions.html,
//                                         // }, function (err3, response) {
//                                         //     if (err3) { } else {
//                                         //     }
//                                         // });
//                                     } else {
//                                         console.log('newuserId :: else => ');
//                                     }

//                                     var add_conditions = { maintenance: maintenance_id };
//                                     await Address.findOne({ GNAFId: addData.GNAFId }, { GNAFId: 1, trader: 1 }, async function (err6, address_exist) {
//                                         if (err6) {

//                                         } else {
//                                             if (address_exist) {
//                                                 console.log('trader_id => ', trader_id);
//                                                 // console.log('address_exist.trader => ', address_exist.trader);
//                                                 // if (address_exist.trader && address_exist.trader != '' && trader_id && trader_id != '') {
//                                                 if (trader_id && trader_id != '') {
//                                                     console.log('existing trader => ');
//                                                     var exist_trader = false;
//                                                     address_exist.trader.map(function (trader) {
//                                                         if (_.isEqual(trader, trader_id)) {
//                                                             exist_trader = true;
//                                                         }
//                                                     });
//                                                     if (!exist_trader) {
//                                                         add_conditions.trader = mongoose.Types.ObjectId(trader_id);
//                                                     }
//                                                 }
//                                                 // Push MR ID in Existing
//                                                 await Address.update(
//                                                     { GNAFId: addData.GNAFId },
//                                                     { $push: add_conditions },
//                                                     function (err, data) {

//                                                     });
//                                             } else {
//                                                 if (trader_id && trader_id != '')
//                                                     addData.trader = mongoose.Types.ObjectId(trader_id);

//                                                 addData.maintenance = mongoose.Types.ObjectId(maintenance_id);
//                                                 var addAddress = new Address(addData);
//                                                 await addAddress.save(function (err7, addrData) {
//                                                 });
//                                             }
//                                         }
//                                     });

//                                     if (trader_id && trader_id != '') {
//                                         // Send Mail to specific Trader
//                                         var quote_link = Constant.STAGGING_URL + '#!/maintance_detail/' + maintenance_id;
//                                         if (category_id != '') {
//                                             var conditions = { 'is_deleted': false, '_id': mongoose.Types.ObjectId(trader_id) };
//                                             if (category_id != '') {
//                                                 conditions.categories_id = mongoose.Types.ObjectId(category_id);
//                                             }

//                                             User.find(conditions)
//                                                 // .select('_id, email, is_active')
//                                                 .exec(async function (err, userTraderData) {

//                                                     if (err) {

//                                                     }
//                                                     else {

//                                                         var Traderdata_ = _.pluck(userTraderData, '_id');
//                                                         var traderLog = { mail_send_trader_id: Traderdata_ };

//                                                         maintentenance_traders_log.update(
//                                                             { maintenance_id: mongoose.Types.ObjectId(maintenance_id) },
//                                                             { $push: traderLog },
//                                                             function (err__, log_data) {
//                                                                 // console.log("err   ", err__)
//                                                                 // console.log("update data   ", log_data);
//                                                             });
//                                                         console.log('createdByData ======1111111111111111111111111111=====> ', createdByData);
//                                                         console.log('Traderdata_ :: Direct Request =========================> ', Traderdata_);
//                                                         var to_users = [{
//                                                             "users_id": mongoose.Types.ObjectId(Traderdata_[0])
//                                                         }];
//                                                         console.log('to_users => ', to_users);
//                                                         // Add Notification For Direct MR
//                                                         var notiObj = {};
//                                                         notiObj.subject = req.body.request_overview + " - new maintenance request has been added by " + createdByData.firstname + " " + createdByData.lastname;
//                                                         notiObj.message = maintenanaceData.address;
//                                                         notiObj.from_user = mongoose.Types.ObjectId(createdByData._id);
//                                                         notiObj.to_users = to_users;
//                                                         notiObj.type = Constant.NOTIFICATION_TYPE_MAINTENENCE_REQ;
//                                                         notiObj.maintenence_id = maintenanaceData._id;
//                                                         notiObj.module = 2;
//                                                         var notification = new NotificationInfo(notiObj);
//                                                         notification.save(function (notErr, notData) {
//                                                             if (notErr) {
//                                                                 console.log('notErr :: Error occured while adding notification => ', notErr);
//                                                                 // res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
//                                                             } else {
//                                                                 // res.json({ code: Constant.SUCCESS_CODE, data: data });
//                                                                 console.log('successfully added notification => ', notData);
//                                                             }
//                                                         });
//                                                         if (userTraderData) {
//                                                             userTraderData.map(async function (value, key) {
//                                                                 // console.log('value :: trader data=> ', value);

//                                                                 var { business_name } = value;
//                                                                 if (value.is_active == true) {
//                                                                     // working code for email sending
//                                                                     var mailOptions = {
//                                                                         from: Config.EMAIL_FROM, // sender address
//                                                                         to: value.email, // list of receivers
//                                                                         // to: 'jerriranhard@yahoo.com', // list of receivers
//                                                                         subject: mail_title, // Subject line
//                                                                         text: mail_title, // plaintext body
//                                                                         html: '<!doctype html>' +
//                                                                             '<html lang="en">' +
//                                                                             '<head>' +
//                                                                             '<meta charset="utf-8">' +
//                                                                             '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">' +
//                                                                             '<link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">' +
//                                                                             '<title>Email </title>' +
//                                                                             '</head>' +
//                                                                             '<body>' +
//                                                                             '<table style="font-family:Roboto;max-width:800px;width:100%;border-radius:4px;margin:0 auto;border-spacing:0;background: #3b4856;display: block;">' +
//                                                                             '<tr>' +
//                                                                             '<td style="border:0;padding: 130px 0 180px 0px;background:#3b4856;border-spacing:0;text-align:center;background: url(' + Constant.STAGGING_URL + 'assets/images/img-001.jpg) no-repeat center 0;background-size:contain">' +
//                                                                             '<table style="width:90%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">' +
//                                                                             '<tr>' +
//                                                                             '<td style="padding:20px; text-align:left;">' +
//                                                                             '<table style="width:100%; margin:0; border-spacing:0; border-spacing: 0;">' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:20px;">Dear ' + changeCase.sentenceCase(business_name) + ',</td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;">One of our users on the Ownly Trade platform has viewed your profile and would like you to quote on a new job.</td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#2E4255; font-size:18px; font-weight:700; line-height:normal; padding:0; margin:0;">Job details<br><br></td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td>' +
//                                                                             '<p style="display:flex; padding-bottom:25px; margin:0;">' +
//                                                                             '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Title: ' + '<strong>' + request_overview + '</strong>' + '</em>' +
//                                                                             '</p>' +
//                                                                             '<p style="display:flex; padding-bottom:25px; margin:0;">' +
//                                                                             '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Description: ' + '<strong>' + request_detail + '</strong>' + '</em>' +
//                                                                             '</p>' +
//                                                                             '<p style="display:flex; padding-bottom:25px; margin:0;">' +
//                                                                             '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Budget: ' + '<strong>' + budget + '</strong>' + '</em>' +
//                                                                             '</p>' +
//                                                                             '<p style="display:flex; padding-bottom:25px; margin:0;">' +
//                                                                             '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Due Date: ' + '<strong>' + due_date + '</strong>' + '</em>' +
//                                                                             '</p>' +
//                                                                             '</td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#2E4255; font-size:18px; font-weight:500; line-height:normal; padding:0; margin:0;">If you would like to quote on this job please <a target="_blank" href="' + quote_link + '">click here</a> to communicate with the customer and submit your quote!<br><br></td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#2E4255; font-size:18px; font-weight:700; line-height:normal; padding:0; margin:0;"><a target="_blank" href="' + quote_link + '" style="display:block;background:#2AA8D7; width:100px; line-height:28px; color:#fff; font-size:13px; border-radius:4px; text-decoration:none;text-align:center; margin-bottom:15px;">Quote Now</a><br /><br /><br /></td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#7C888D; font-size:15px; line-height:normal;">Thank you,</td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#7C888D; font-size:15px; line-height:normal;">The Ownly Trade team!</td>' +
//                                                                             '</tr>' +
//                                                                             '</table>' +
//                                                                             '</td>' +
//                                                                             '</tr>' +
//                                                                             '</table>' +
//                                                                             '</td>' +
//                                                                             '</tr>' +
//                                                                             '</table>' +
//                                                                             '</body>' +
//                                                                             '</html>'
//                                                                     };
//                                                                     let info = transporter.sendMail({
//                                                                         from: mailOptions.from,
//                                                                         to: mailOptions.to,
//                                                                         subject: mailOptions.subject,
//                                                                         text: mailOptions.subject,
//                                                                         html: mailOptions.html
//                                                                     }, function (error, response) {
//                                                                         if (error) {
//                                                                             console.log("eeeeee", error);
//                                                                         } else {
//                                                                             let msgOptions = {
//                                                                                 mobile_no: value.mobile_no,
//                                                                                 business_name: value.business_name,
//                                                                                 title: maintenanaceData.request_overview,
//                                                                                 budget: maintenanaceData.budget,
//                                                                                 quote_link: quote_link
//                                                                             }
//                                                                             console.log('maintenanaceData :: addMR=> ', maintenanaceData);

//                                                                             console.log("Message sent: Successfully  2 ", mailOptions.to);
//                                                                             console.log('Options for Text message=> ', msgOptions);
//                                                                             sms.JobRequestMsg(msgOptions);
//                                                                         }
//                                                                     });
//                                                                     // working code for email sending



//                                                                 } else {
//                                                                     // var activation_code = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
//                                                                     var activation_code = value.activation_code;
//                                                                     var click_here = Constant.PUBLIC_STAGGING_URL + 'trader_account_activation/' + activation_code + '/' + maintenance_id;
//                                                                     // var updateUserRecord = {
//                                                                     //     activation_code: activation_code
//                                                                     // }
//                                                                     // User.update({ _id: userTraderData._id }, { $set: updateUserRecord }, function (err) {
//                                                                     // });

//                                                                     var mailOptions = {
//                                                                         from: Config.EMAIL_FROM, // sender address
//                                                                         to: value.email, // list of receivers
//                                                                         // to: 'jerriranhard@yahoo.com',
//                                                                         subject: value.firstname + ' ' + value.lastname + '- NEW QUOTE REQUEST', // Subject line
//                                                                         text: value.firstname + ' ' + value.lastname + '- NEW QUOTE REQUEST', // plaintext body
//                                                                         html: '<!doctype html>' +
//                                                                             '<html lang="en">' +
//                                                                             '<head>' +
//                                                                             '<meta charset="utf-8">' +
//                                                                             '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">' +
//                                                                             '<link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">' +
//                                                                             '<title>Email </title>' +
//                                                                             '</head>' +
//                                                                             '<body>' +
//                                                                             '<table style="font-family:Roboto;max-width:800px;width:100%;border-radius:4px;margin:0 auto;border-spacing:0;background: #3b4856;display: block;">' +
//                                                                             '<tr>' +
//                                                                             '<td style="border:0;padding: 130px 0 180px 0px;background:#3b4856;border-spacing:0;text-align:center;background: url(' + Constant.STAGGING_URL + 'assets/images/img-001.jpg) no-repeat center 0;background-size:contain">' +
//                                                                             '<table style="width:90%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">' +
//                                                                             '<tr>' +
//                                                                             '<td style="padding:20px; text-align:left;">' +
//                                                                             '<table style="width:100%; margin:0; border-spacing:0; border-spacing: 0;">' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:20px;">Good news travels fast! Ownly wants to connect as someone is interested in using your services.</td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;">As you know, unlike other search platforms, we give all <b>TRADES A FAIR GO.</b> We help you <b>PROMOTE, SECURE</b> AND <b>GROW</b> YOUR BUSINESS.</td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td style="padding:25px;" >' +
//                                                                             ' <table style="width:100%; margin:0 auto; border:0; border-spacing:0; text-align:left;">' +
//                                                                             ' <tr><td style="padding:0 0 30px;font-size:16px; color:#606382; font-weight:normal;"><strong>What’s even better?</strong></td></tr>' +
//                                                                             ' <tr><td style="font-size:16px; color:#606382; font-weight:normal; padding:0 0 20px 40px;"><div style="width:8px; height:8px; background:#606382; display:inline-block; border-radius:100px; margin:0 10px 0 0;"></div>Our trade innovation platform is completely free to use! </td></tr>' +
//                                                                             ' <tr><td style="font-size:16px; color:#606382; font-weight:normal; padding:0 0 20px 40px;"><div style="width:8px; height:8px; background:#606382; display:inline-block; border-radius:100px; margin:0 10px 0 0;"></div>Connecting you to thousands of new business opportunities</td></tr>' +
//                                                                             ' <tr><td style="font-size:16px; color:#606382; font-weight:normal; padding:0 0 20px 40px;"><div style="width:8px; height:8px; background:#606382; display:inline-block; border-radius:100px; margin:0 10px 0 0;"></div>UNLIMITED quotes</td></tr>' +
//                                                                             ' <tr><td style="font-size:16px; color:#606382; font-weight:normal; padding:0 0 20px 40px;"><div style="width:8px; height:8px; background:#606382; display:inline-block; border-radius:100px; margin:0 10px 0 0;"></div>No booking fees or taking a share of your hard-earned revenue</td></tr>' +
//                                                                             ' <tr><td style="font-size:16px; color:#606382; font-weight:normal; padding:0 0 20px 40px;"><div style="width:8px; height:8px; background:#606382; display:inline-block; border-radius:100px; margin:0 10px 0 0;"></div>Giving your business exposure by saving your work to a property file so the next owner/tenant/property manager can recall you with a click of a button</td></tr>' +
//                                                                             ' <tr><td style="font-size:16px; color:#606382; font-weight:normal; padding:0 0 20px 40px;"><div style="width:8px; height:8px; background:#606382; display:inline-block; border-radius:100px; margin:0 10px 0 0;"></div>Connecting you to new markets–strata managers, property managers which no other trade platform has done before!</td></tr>' +
//                                                                             '</table >' +
//                                                                             '</td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#2E4255; font-size:15px; font-weight:500; line-height:normal; padding:0 0 20px; margin:0;">You are one step away from responding to your quote request and securing your next potential job:<br></td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#2E4255; font-size:15px; font-weight:700; line-height:normal; padding:0 0 20px; margin:0;"><a target="_blank" href="' + click_here + '" style="display:block;background:#2AA8D7; width:100px; line-height:28px; color:#fff; font-size:13px; border-radius:4px; text-decoration:none;text-align:center; margin-bottom:15px;">Quote Now</a><br /><br /><br /></td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#7C888D; font-size:15px; line-height:normal;">Thank you,</td>' +
//                                                                             '</tr>' +
//                                                                             '<tr>' +
//                                                                             '<td style="color:#7C888D; font-size:15px; line-height:normal;">The Ownly Trade team!</td>' +
//                                                                             '</tr>' +
//                                                                             '</table>' +
//                                                                             '</td>' +
//                                                                             '</tr>' +
//                                                                             '</table>' +
//                                                                             '</td>' +
//                                                                             '</tr>' +
//                                                                             '</table>' +
//                                                                             '</body>' +
//                                                                             '</html>'
//                                                                     };
//                                                                     let info = transporter.sendMail({
//                                                                         from: mailOptions.from,
//                                                                         to: mailOptions.to,
//                                                                         subject: mailOptions.subject,
//                                                                         text: mailOptions.subject,
//                                                                         html: mailOptions.html
//                                                                     }, function (error, response) {
//                                                                         console.log("===============================");
//                                                                         if (error) {
//                                                                             console.log("eeeeee", error);
//                                                                         } else {
//                                                                             let msgOptions = {
//                                                                                 mobile_no: value.mobile_no,
//                                                                                 business_name: value.business_name,
//                                                                                 title: maintenanaceData.request_overview,
//                                                                                 budget: maintenanaceData.budget,
//                                                                                 quote_link: click_here
//                                                                             }
//                                                                             console.log("Message sent: Successfully  3 ", mailOptions.to);
//                                                                             sms.JobRequestMsg(msgOptions);
//                                                                         }
//                                                                     });

//                                                                 }
//                                                             });
//                                                         }
//                                                     }
//                                                 });
//                                         }

//                                     } else {
//                                         console.log('no trade id => ');
//                                         var quote_link = Constant.STAGGING_URL + '#!/maintance_detail/' + maintenance_id;
//                                         // Send Mail to within specified km Traders

//                                         conditions = { 'is_deleted': false };
//                                         console.log('latitude :: Check Here => ', latitude);
//                                         console.log('longitude :: Check Here => ', longitude);
//                                         if (longitude && longitude != '' && latitude && latitude != '') {

//                                             conditions.location = {
//                                                 $geoWithin: {
//                                                     $centerSphere: [
//                                                         [longitude, latitude], Constant.FIFTY_KM_INTO_MILE / Constant.RADIUS
//                                                     ]
//                                                 }
//                                             };
//                                         }

//                                         if (category_id != '') {
//                                             //console.log("category_id   ", category_id);
//                                             conditions.categories_id = mongoose.Types.ObjectId(category_id);
//                                         }
//                                         //console.log("Data      ", JSON.stringify(conditions));
//                                         var parser = User.find(conditions)
//                                             .exec(async function (err, userData) {
//                                                 // console.log("Here to call", userData);
//                                                 // console.log("Here to call err ", err);

//                                                 if (!err) {

//                                                     var Traderdata_ = _.pluck(userData, '_id');
//                                                     console.log('Traderdata_ ===================> ', Traderdata_);
//                                                     var traderLog = { mail_send_trader_id: Traderdata_ };

//                                                     maintentenance_traders_log.update(
//                                                         { maintenance_id: mongoose.Types.ObjectId(maintenance_id) },
//                                                         { $push: traderLog },
//                                                         function (err__, log_data) {
//                                                             // console.log("err   ", err__)
//                                                             // console.log("update data   ", log_data);
//                                                         });
//                                                     console.log("userData.length ==>", userData.length);

//                                                     let traders_arr = [];
//                                                     Traderdata_.map(ele => {
//                                                         traders_arr.push({ "users_id": mongoose.Types.ObjectId(ele) })
//                                                     })
//                                                     console.log('traders_arr =========================> ', traders_arr);

//                                                     console.log('createdByData ======2222222222222222222222222====> ', createdByData);

//                                                     // Add Notification For Direct MR
//                                                     var notiObj = {};
//                                                     notiObj.subject = req.body.request_overview + " - new maintenance request has been added by " + createdByData.firstname + " " + createdByData.lastname;
//                                                     notiObj.message = maintenanaceData.address;
//                                                     notiObj.from_user = mongoose.Types.ObjectId(createdByData._id);
//                                                     notiObj.to_users = traders_arr;
//                                                     notiObj.type = Constant.NOTIFICATION_TYPE_MAINTENENCE_REQ;
//                                                     notiObj.maintenence_id = maintenanaceData._id;
//                                                     notiObj.module = 2;
//                                                     var notification = new NotificationInfo(notiObj);
//                                                     notification.save(function (notErr, notData) {
//                                                         if (notErr) {
//                                                             console.log('notErr :: Error occured while adding notification => ', notErr);
//                                                             // res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
//                                                         } else {
//                                                             // res.json({ code: Constant.SUCCESS_CODE, data: data });
//                                                             console.log('successfully added notification => ', notData);
//                                                         }
//                                                     });
//                                                     var key = 1;
//                                                     for (const value of userData) {

//                                                         let msgOptions = {
//                                                             mobile_no: value.mobile_no,
//                                                             business_name: value.business_name,
//                                                             title: maintenanaceData.request_overview,
//                                                             budget: maintenanaceData.budget,
//                                                             quote_link: quote_link
//                                                         }

//                                                         // console.log("single user Value", value);
//                                                         console.log("USER :: Public Request ==>");

//                                                         // parser.pause();
//                                                         // var i = 0;
//                                                         // setTimeout(function () {
//                                                         setTimeout(async function timer() {
//                                                             var business_name = value.business_name;
//                                                             if (value.is_active == true) {
//                                                                 console.log("IF");
//                                                                 //console.log("Active USer   ", value._id);
//                                                                 var click_here = Constant.STAGGING_URL;
//                                                                 var mailOptions = {
//                                                                     from: Config.EMAIL_FROM, // sender address
//                                                                     to: value.email, // list of receivers
//                                                                     // to: 'jerriranhard@yahoo.com',
//                                                                     subject: mail_title, // Subject line
//                                                                     text: mail_title, // plaintext body
//                                                                     html: '<!doctype html>' +
//                                                                         '<html lang="en">' +
//                                                                         '<head>' +
//                                                                         '<meta charset="utf-8">' +
//                                                                         '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">' +
//                                                                         '<link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">' +
//                                                                         '<title>Email </title>' +
//                                                                         '</head>' +
//                                                                         '<body>' +
//                                                                         '<table style="font-family:Roboto;max-width:800px;width:100%;border-radius:4px;margin:0 auto;border-spacing:0;background: #3b4856;display: block;">' +
//                                                                         '<tr>' +
//                                                                         '<td style="border:0;padding: 130px 0 180px 0px;background:#3b4856;border-spacing:0;text-align:center;background: url(' + Constant.STAGGING_URL + 'assets/images/img-001.jpg)no-repeat center 0;background-size:contain">' +
//                                                                         '<table style="width:90%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">' +
//                                                                         '<tr>' +
//                                                                         '<td style="padding:20px; text-align:left;">' +
//                                                                         '<table style="width:100%; margin:0; border-spacing:0; border-spacing: 0;">' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:20px;">Dear ' + changeCase.sentenceCase(business_name) + ',</td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;">One of our users on the Ownly Trade platform has posted a job in your area. </td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#2E4255; font-size:18px; font-weight:700; line-height:normal; padding:0; margin:0;">Job details<br><br></td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td>' +
//                                                                         '<p style="display:flex; padding-bottom:25px; margin:0;">' +
//                                                                         '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Title: ' + '<strong>' + request_overview + '</strong>' + '</em>' +
//                                                                         '</p>' +
//                                                                         '<p style="display:flex; padding-bottom:25px; margin:0;">' +
//                                                                         '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Description: ' + '<strong>' + request_detail + '</strong>' + '</em>' +
//                                                                         '</p>' +
//                                                                         '<p style="display:flex; padding-bottom:25px; margin:0;">' +
//                                                                         '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Budget: ' + '<strong>' + budget + '</strong>' + '</em>' +
//                                                                         '</p>' +
//                                                                         '<p style="display:flex; padding-bottom:25px; margin:0;">' +
//                                                                         '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Due Date: ' + '<strong>' + due_date + '</strong>' + '</em>' +
//                                                                         '</p>' +
//                                                                         '</td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#2E4255; font-size:18px; font-weight:500; line-height:normal; padding:0; margin:0;">If you would like to quote on this job please <a target="_blank" href="' + quote_link + '">click here</a> to view the job details and submit a quote! </td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#2E4255; font-size:18px; font-weight:700; line-height:normal; padding:0; margin:0;"><br><a target="_blank" href="' + quote_link + '" style="display:block;background:#2AA8D7; width:100px; line-height:28px; color:#fff; font-size:13px; border-radius:4px; text-decoration:none; text-align:center; margin-bottom:15px;">Quote Now</a><br /><br /><br /></td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#7C888D; font-size:15px; line-height:normal;"><br>Thank you,</td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#7C888D; font-size:15px; line-height:normal;">The Ownly Trade team!</td>' +
//                                                                         '</tr>' +
//                                                                         '</table>' +
//                                                                         '</td>' +
//                                                                         '</tr>' +
//                                                                         '</table>' +
//                                                                         '</td>' +
//                                                                         '</tr>' +
//                                                                         '</table>' +
//                                                                         '</body>' +
//                                                                         '</html>'
//                                                                 };
//                                                                 console.log("before send mail If condition");


//                                                                 let info = transporter.sendMail({
//                                                                     from: mailOptions.from,
//                                                                     to: mailOptions.to,
//                                                                     subject: mailOptions.subject,
//                                                                     text: mailOptions.subject,
//                                                                     html: mailOptions.html
//                                                                 }, function (error, response) {
//                                                                     console.log("===============================");
//                                                                     if (error) {
//                                                                         console.log("eeeeee", error);
//                                                                     } else {

//                                                                         console.log("Message sent: Successfully  4 ", mailOptions.to);
//                                                                         sms.JobRequestMsg(msgOptions);
//                                                                     }
//                                                                 });

//                                                                 console.log("after send mail If condition");

//                                                                 // parser.resume();
//                                                                 // console.log("mail section 1", mailOptions);
//                                                             } else {
//                                                                 console.log("Else :: !isActive ==>");

//                                                                 //console.log("InActive USer   ", value._id);
//                                                                 var activation_code = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
//                                                                 var click_here = Constant.PUBLIC_STAGGING_URL + 'trader_account_activation/' + activation_code + "/" + maintenance_id;
//                                                                 var updateUserRecord = {
//                                                                     activation_code: activation_code
//                                                                 }
//                                                                 User.update({ _id: value._id }, { $set: updateUserRecord }, function (err) {
//                                                                 });

//                                                                 var mailOptions = {
//                                                                     from: Config.EMAIL_FROM, // sender address
//                                                                     to: value.email, // list of receivers
//                                                                     // to: 'jerriranhard@yahoo.com',
//                                                                     subject: value.firstname + ' ' + value.lastname + '- NEW QUOTE REQUEST', // Subject line
//                                                                     text: value.firstname + ' ' + value.lastname + '- NEW QUOTE REQUEST', // plaintext body
//                                                                     html: '<!doctype html>' +
//                                                                         '<html lang="en">' +
//                                                                         '<head>' +
//                                                                         '<meta charset="utf-8">' +
//                                                                         '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">' +
//                                                                         '<link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">' +
//                                                                         '<title>Email </title>' +
//                                                                         '</head>' +
//                                                                         '<body>' +
//                                                                         '<table style="font-family:Roboto;max-width:800px;width:100%;border-radius:4px;margin:0 auto;border-spacing:0;background: #3b4856;display: block;">' +
//                                                                         '<tr>' +
//                                                                         '<td style="border:0;padding: 130px 0 180px 0px;background:#3b4856;border-spacing:0;text-align:center;background: url(' + Constant.STAGGING_URL + 'assets/images/img-001.jpg) no-repeat center 0;background-size:contain">' +
//                                                                         '<table style="width:90%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">' +
//                                                                         '<tr>' +
//                                                                         '<td style="padding:20px; text-align:left;">' +
//                                                                         '<table style="width:100%; margin:0; border-spacing:0; border-spacing: 0;">' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:20px;">Good news travels fast! Ownly wants to connect as someone is interested in using your services.</td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;">As you know, unlike other search platforms, we give all <b>TRADES A FAIR GO.</b> We help you <b>PROMOTE, SECURE</b> AND <b>GROW</b> YOUR BUSINESS.</td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td style="padding:25px;" >' +
//                                                                         ' <table style="width:100%; margin:0 auto; border:0; border-spacing:0; text-align:left;">' +
//                                                                         ' <tr><td style="padding:0 0 30px;font-size:16px; color:#606382; font-weight:normal;"><strong>What’s even better?</strong></td></tr>' +
//                                                                         ' <tr><td style="font-size:16px; color:#606382; font-weight:normal; padding:0 0 20px 40px;"><div style="width:8px; height:8px; background:#606382; display:inline-block; border-radius:100px; margin:0 10px 0 0;"></div>Our trade innovation platform is completely free to use! </td></tr>' +
//                                                                         ' <tr><td style="font-size:16px; color:#606382; font-weight:normal; padding:0 0 20px 40px;"><div style="width:8px; height:8px; background:#606382; display:inline-block; border-radius:100px; margin:0 10px 0 0;"></div>Connecting you to thousands of new business opportunities</td></tr>' +
//                                                                         ' <tr><td style="font-size:16px; color:#606382; font-weight:normal; padding:0 0 20px 40px;"><div style="width:8px; height:8px; background:#606382; display:inline-block; border-radius:100px; margin:0 10px 0 0;"></div>UNLIMITED quotes</td></tr>' +
//                                                                         ' <tr><td style="font-size:16px; color:#606382; font-weight:normal; padding:0 0 20px 40px;"><div style="width:8px; height:8px; background:#606382; display:inline-block; border-radius:100px; margin:0 10px 0 0;"></div>No booking fees or taking a share of your hard-earned revenue</td></tr>' +
//                                                                         ' <tr><td style="font-size:16px; color:#606382; font-weight:normal; padding:0 0 20px 40px;"><div style="width:8px; height:8px; background:#606382; display:inline-block; border-radius:100px; margin:0 10px 0 0;"></div>Giving your business exposure by saving your work to a property file so the next owner/tenant/property manager can recall you with a click of a button</td></tr>' +
//                                                                         ' <tr><td style="font-size:16px; color:#606382; font-weight:normal; padding:0 0 20px 40px;"><div style="width:8px; height:8px; background:#606382; display:inline-block; border-radius:100px; margin:0 10px 0 0;"></div>Connecting you to new markets–strata managers, property managers which no other trade platform has done before!</td></tr>' +
//                                                                         '</table >' +
//                                                                         '</td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#2E4255; font-size:15px; font-weight:500; line-height:normal; padding:0 0 20px; margin:0;">You are one step away from responding to your quote request and securing your next potential job:<br></td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#2E4255; font-size:15px; font-weight:700; line-height:normal; padding:0 0 20px; margin:0;"><a target="_blank" href="' + click_here + '" style="display:block;background:#2AA8D7; width:100px; line-height:28px; color:#fff; font-size:13px; border-radius:4px; text-decoration:none;text-align:center; margin-bottom:15px;">Quote Now</a><br /><br /><br /></td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#7C888D; font-size:15px; line-height:normal;">Thank you,</td>' +
//                                                                         '</tr>' +
//                                                                         '<tr>' +
//                                                                         '<td style="color:#7C888D; font-size:15px; line-height:normal;">The Ownly Trade team!</td>' +
//                                                                         '</tr>' +
//                                                                         '</table>' +
//                                                                         '</td>' +
//                                                                         '</tr>' +
//                                                                         '</table>' +
//                                                                         '</td>' +
//                                                                         '</tr>' +
//                                                                         '</table>' +
//                                                                         '</body>' +
//                                                                         '</html>'
//                                                                 };
//                                                                 console.log("before send mail else condition");

//                                                                 let info = transporter.sendMail({
//                                                                     from: mailOptions.from,
//                                                                     to: mailOptions.to,
//                                                                     subject: mailOptions.subject,
//                                                                     text: mailOptions.subject,
//                                                                     html: mailOptions.html
//                                                                 }, function (error, response) {
//                                                                     console.log("===============================");
//                                                                     if (error) {
//                                                                         console.log("eeeeee", error);
//                                                                     } else {
//                                                                         console.log("Message sent: Successfully 5  ", mailOptions.to);
//                                                                         sms.JobRequestMsg(msgOptions);
//                                                                     }
//                                                                 });

//                                                                 // sendmail({
//                                                                 //     from: mailOptions.from,
//                                                                 //     to: mailOptions.to,
//                                                                 //     subject: mailOptions.subject,
//                                                                 //     html: mailOptions.html,
//                                                                 // }, function (error, response) {
//                                                                 //     if (error) {
//                                                                 //         console.log(error);
//                                                                 //         console.log("Message failed => ", mailOptions.to);
//                                                                 //     } else {
//                                                                 //         console.log("Message sent: Successfully ", mailOptions.to);
//                                                                 //     }
//                                                                 // });
//                                                                 console.log("after send mail Else condition");

//                                                                 // console.log("mail section 2", mailOptions);
//                                                                 // parser.resume();
//                                                             }
//                                                             key++;
//                                                         }, key * 2000);
//                                                     }
//                                                     console.log("end here-------------------------------------------------------------------------");
//                                                 }
//                                             });
//                                     }
//                                     res.json({ code: Constant.SUCCESS_CODE, data: maintenanaceData });
//                                 }
//                             });
//                         });
//                     });
//                     req1.end();
//                 });
//             } else {
//                 res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
//             }

//         } else {
//             res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
//         }
//     })();
// }

function addMR(req, res) {
    console.log('req.body :: addMR => ', req.body);
    console.log('req.body.latitude :: addMR => ', req.body.latitude);
    console.log('req.body.longitude :: addMR => ', req.body.longitude);
    var referral_code = (typeof req.body.referralCode != 'undefined') ? req.body.referralCode : '';
    var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
    var email = (typeof req.body.email != 'undefined') ? req.body.email : '';
    var mobile_no = (typeof req.body.mobile_no != 'undefined') ? req.body.mobile_no : '';
    var request_overview = (typeof req.body.request_overview != 'undefined') ? req.body.request_overview : '';
    var request_detail = (typeof req.body.request_detail != 'undefined') ? req.body.request_detail : '';
    var mail_title = request_overview + ' - Quote Request';
    var agency_id = (typeof req.body.agency_id != 'undefined') ? mongoose.Types.ObjectId(req.body.agency_id) : '';
    var trader_id = (typeof req.body.trader_id != 'undefined') ? mongoose.Types.ObjectId(req.body.trader_id) : '';
    var request_type = (trader_id && trader_id != '') ? 0 : 1;
    var created_by_role = (typeof req.body.created_by_role != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by_role) : mongoose.Types.ObjectId(Config.TENANT);
    var created_by = (typeof req.body.created_by != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by) : '';
    var budget = (typeof req.body.budget != 'undefined') ? req.body.budget : 0;
    var due_date = (typeof req.body.due_date != 'undefined') ? moment(req.body.due_date).format('YYYY-MM-DD') : '';
    var req_status = (typeof req.body.req_status != 'undefined') ? req.body.req_status : 1;
    var category_id = (typeof req.body.category_id != 'undefined') ? mongoose.Types.ObjectId(req.body.category_id) : '';
    var is_forward = (created_by_role == Constant.AGENT || created_by_role == Constant.OWN_AGENCY) ? true : false;
    var address = (typeof req.body.address != 'undefined') ? req.body.address : '';
    var longitude = (typeof req.body.longitude != 'undefined') ? req.body.longitude : '';
    var latitude = (typeof req.body.latitude != 'undefined') ? req.body.latitude : '';
    var watchersList = (typeof req.body.watchers_list != 'undefined') ? req.body.watchers_list : [];
    var images = (typeof req.body.images != 'undefined') ? req.body.images : [];
    var activation_code = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    var newuserId = [];
    var user_id = '';
    (async () => {
        if (email && category_id && email != '' && category_id != '') {
            let userRecord = await User.findOne({ email: email }, { email: 1, _id: 1 });
            if (userRecord) {
                user_id = userRecord._id
            } else {
                console.log("New User");
                var userData = {
                    firstname: firstname,
                    email: email,
                    mobile_no: mobile_no,
                    activation_code: activation_code,
                    status: false,
                    is_deleted: false,
                    referedBy: trader_id
                };
                var UsersRecord = new User(userData);
                newuserId = await UsersRecord.save();
                user_id = newuserId._id;
            }
            if (user_id && user_id != '') {
                console.log("calling;;;");
                var mrData = {};
                var addData = {};

                var chars = "123456789";
                var maintennceId = '';
                for (var x = 0; x < 9; x++) {
                    var i = Math.floor(Math.random() * chars.length);
                    maintennceId += chars.charAt(i);
                }
                mrData.address = address;
                mrData.request_id = maintennceId;
                mrData.request_overview = request_overview;
                mrData.request_detail = request_detail;
                mrData.created_by = (created_by && created_by != '') ? mongoose.Types.ObjectId(created_by) : mongoose.Types.ObjectId(user_id);
                mrData.forwarded_by = (created_by && created_by != '') ? mongoose.Types.ObjectId(created_by) : mongoose.Types.ObjectId(user_id);
                mrData.budget = budget;
                mrData.due_date = due_date;
                mrData.req_status = req_status;
                mrData.is_forward = is_forward;
                mrData.categories_id = mongoose.Types.ObjectId(category_id);
                mrData.request_type = request_type;
                mrData.watchers_list = watchersList;
                mrData.referral_code = referral_code;

                if (images) {
                    var imagesListArr = [];
                    for (var i = 0; i < images.length; i++) {
                        if (images.indexOf(images[i].path) === -1) {
                            imagesListArr.push({ "path": images[i].path });
                        }
                    }
                    mrData.images = imagesListArr;
                }

                if (mrData.request_type == 1) {
                    mrData.original_budget = budget;
                    mrData.original_date = due_date;
                }
                if (agency_id && validator.isValidObject(agency_id))
                    mrData.agency_id = agency_id;
                if (trader_id && validator.isValidObject(trader_id))
                    mrData.trader_id = trader_id;
                if (created_by && validator.isValidObject(created_by))
                    mrData.created_by = created_by;
                if (created_by_role && validator.isValidObject(created_by_role))
                    mrData.created_by_role = created_by_role;

                var options = {
                    method: 'GET',
                    url: 'https://api.psma.com.au/beta/v1/addresses',
                    qs: { perPage: '10', page: '1', addressString: address },
                    headers: { authorization: 'Z6Auyhh7JOaXfvandiUb0e95Mr92GfnY' }
                };

                await request(options, async function (error, response, body) {
                    if (response) {
                        var result = JSON.parse(body);
                        if (result && result.data && result.data[0] && result.data[0].addressId) {
                            addData.GNAFId = mrData.address_id = await result.data[0].addressId;
                            console.log("result.data[0].addressId    ", addData.GNAFId);
                        }
                    }
                    console.log('address :: addMR => ', address);
                    var address1 = escape(address);
                    var options = {
                        "method": "GET",
                        "hostname": "maps.googleapis.com",
                        "port": null,
                        "path": "/maps/api/geocode/json?address=" + address1 + "&key=AIzaSyCGWZqTcVNj2IeuAud3EsdL3ewktb0yCFo"
                    };
                    var req1 = await http.request(options, async function (res1) {
                        var chunks = [];
                        await res1.on("data", function (chunk) {
                            chunks.push(chunk);
                        });

                        await res1.on("end", async function () {
                            var body = Buffer.concat(chunks);
                            var address2 = body.toString();
                            var result = JSON.parse(address2).results;
                            if (result && result.length > 0) {
                                const locData = result[0];
                                if (locData.address_components && locData.address_components.length > 0) {
                                    locData.address_components.map(function (location_part) {
                                        if (location_part.types && location_part.types[0] && location_part.types[0] == 'administrative_area_level_1')
                                            mrData.suburb = location_part.long_name;
                                        if (location_part.types && location_part.types[0] && location_part.types[0] == 'postal_code')
                                            mrData.postcode = location_part.long_name;
                                    });
                                }
                                if (locData.geometry && locData.geometry.location && locData.geometry.location.lat && locData.geometry.location.lng) {
                                    mrData.latitude = await locData.geometry.location.lat;
                                    mrData.longitude = await locData.geometry.location.lng;
                                    mrData.location = await {
                                        coordinates: [locData.geometry.location.lng, locData.geometry.location.lat],
                                        type: 'Point'
                                    }
                                }
                            }

                            var maintenance_id = '';
                            var maintenance = new maintenances(mrData);
                            await maintenance.save(async function (err5, maintenanaceData) {
                                if (err5) {
                                    console.log("err5     ", err5);
                                } else {
                                    maintenance_id = await maintenanaceData._id;
                                    let createdByData;
                                    await User.findById(maintenanaceData.created_by, async function (createdByErr, createdByInfo) {
                                        console.log('createdByInfo => ', await createdByInfo);
                                        if (createdByErr) {
                                            console.log('createdByErr :: Error occurred while retrieving data from users table => ', createdByErr);
                                        } else {
                                            createdByData = await createdByInfo;
                                        }
                                    });

                                    var traderLog = {


                                        maintenance_id: mongoose.Types.ObjectId(maintenance_id)
                                    };
                                    var addTraderLog = new maintentenance_traders_log(traderLog);
                                    await addTraderLog.save(function (err_, traderLogs) {});

                                    // New email notification for maintenance request creation - Trader
                                    if (trader_id && trader_id != '') {
                                        let traderData = await User.findById(trader_id, 'firstname lastname email');
                                        if (traderData) {
                                            let mailOptions = {
                                                from: Config.EMAIL_FROM,
                                                to: traderData.email,
                                                subject: 'New Maintenance Request Assigned',
                                                text: 'New Maintenance Request Assigned',
                                                html: `<!doctype html>
                                                    <html lang="en">
                                                    <head>
                                                        <meta charset="utf-8">
                                                        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                                                        <link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">
                                                        <title>Email</title>
                                                        <style>
                                                            @media only screen and (max-width: 600px) {
                                                                .container-table { width: 100% !important; max-width: 100% !important; }
                                                                .background-container { padding: 10px !important; }
                                                                .content-table { width: 100% !important; padding: 10px !important; }
                                                                img { max-width: 100% !important; height: auto !important; }
                                                            }
                                                        </style>
                                                    </head>
                                                    <body>
                                                        <table class="container-table" style="font-family:Roboto;max-width:800px;width:100%;border-radius:4px;margin:0 auto;border-spacing:0;background:#3b4856;">
                                                            <tr>
                                                                <td class="background-container" style="border:0;padding:20px 0;background:#3b4856;border-spacing:0;text-align:center;">
                                                                    <table class="content-table" style="width:90%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">
                                                                        <tr>
                                                                            <td style="padding:0;text-align:center;">
                                                                                <img src="${Constant.STAGGING_URL}assets/images/img-001.jpg" style="max-width:100%;height:auto;display:block;margin:0 auto;" alt="Ownly Trade Brand Image">
                                                                            </td>
                                                                        </tr>
                                                                        <tr>
                                                                            <td style="padding:20px;text-align:left;">
                                                                                <table style="width:100%;margin:0;border-spacing:0;">
                                                                                    <tr>
                                                                                        <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:20px;">Dear ${traderData.firstname} ${traderData.lastname},</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:40px;">A new maintenance request titled "${request_overview}" has been assigned to you by ${createdByData.firstname} ${createdByData.lastname}.</td>
                                                                                    </tr>
                                                                                    ${images && images.length > 0 ? `
                                                                                    <tr>
                                                                                        <td style="padding-bottom:20px;">
                                                                                            ${images.map(image => `
                                                                                                <img src="${image.path}" style="max-width:100%;height:auto;display:block;margin:10px 0;" alt="Maintenance Image">
                                                                                            `).join('')}
                                                                                        </td>
                                                                                    </tr>
                                                                                    ` : ''}
                                                                                    <tr>
                                                                                        <td style="color:#2E4255;font-size:18px;font-weight:700;line-height:normal;padding:0;margin:0;">Request Details<br><br></td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td>
                                                                                            <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Address: <strong>${address}</strong></p>
                                                                                            <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Budget: <strong>${budget}</strong></p>
                                                                                            <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Due Date: <strong>${due_date}</strong></p>
                                                                                        </td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td style="color:#2E4255;font-size:18px;font-weight:700;line-height:normal;padding:0;margin:0;">
                                                                                            <a target="_blank" href="${Constant.STAGGING_URL}#!/maintance_detail/${maintenance_id}" style="display:block;background:#2AA8D7;width:100px;line-height:28px;color:#fff;font-size:13px;border-radius:4px;text-decoration:none;text-align:center;margin-bottom:15px;">View Request</a><br><br><br>
                                                                                        </td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td style="color:#7C888D;font-size:15px;line-height:normal;">Thank you,</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td style="color:#7C888D;font-size:15px;line-height:normal;">The Ownly Trade team!</td>
                                                                                    </tr>
                                                                                </table>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </body>
                                                    </html>`
                                            };
                                            transporter.sendMail(mailOptions, function (error, response) {
                                                if (error) {
                                                    console.log("Trader email error: ", error);
                                                } else {
                                                    console.log("Trader email sent successfully to: ", traderData.email);
                                                }
                                            });
                                        }
                                    }

                                    // New email notification for maintenance request creation - Consumer (Inquirer)
                                    if (createdByData && createdByData.email) {
                                        let mailOptions = {
                                            from: Config.EMAIL_FROM,
                                            to: createdByData.email,
                                            subject: 'Your Maintenance Request Has Been Created',
                                            text: 'Your Maintenance Request Has Been Created',
                                            html: `<!doctype html>
                                                <html lang="en">
                                                <head>
                                                    <meta charset="utf-8">
                                                    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                                                    <link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">
                                                    <title>Email</title>
                                                    <style>
                                                        @media only screen and (max-width: 600px) {
                                                            .container-table { width: 100% !important; max-width: 100% !important; }
                                                            .background-container { padding: 10px !important; }
                                                            .content-table { width: 100% !important; padding: 10px !important; }
                                                            img { max-width: 100% !important; height: auto !important; }
                                                        }
                                                    </style>
                                                </head>
                                                <body>
                                                    <table class="container-table" style="font-family:Roboto;max-width:800px;width:100%;border-radius:4px;margin:0 auto;border-spacing:0;background:#3b4856;">
                                                        <tr>
                                                            <td class="background-container" style="border:0;padding:20px 0;background:#3b4856;border-spacing:0;text-align:center;">
                                                                <table class="content-table" style="width:90%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">
                                                                    <tr>
                                                                        <td style="padding:0;text-align:center;">
                                                                            <img src="${Constant.STAGGING_URL}assets/images/img-001.jpg" style="max-width:100%;height:auto;display:block;margin:0 auto;" alt="Ownly Trade Brand Image">
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="padding:20px;text-align:left;">
                                                                            <table style="width:100%;margin:0;border-spacing:0;">
                                                                                <tr>
                                                                                    <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:20px;">Dear ${createdByData.firstname} ${createdByData.lastname},</td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:40px;">Your maintenance request titled "${request_overview}" has been successfully created.</td>
                                                                                </tr>
                                                                                ${images && images.length > 0 ? `
                                                                                <tr>
                                                                                    <td style="padding-bottom:20px;">
                                                                                        ${images.map(image => `
                                                                                            <img src="${image.path}" style="max-width:100%;height:auto;display:block;margin:10px 0;" alt="Maintenance Image">
                                                                                        `).join('')}
                                                                                    </td>
                                                                                </tr>
                                                                                ` : ''}
                                                                                <tr>
                                                                                    <td style="color:#2E4255;font-size:18px;font-weight:700;line-height:normal;padding:0;margin:0;">Request Details<br><br></td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td>
                                                                                        <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Address: <strong>${address}</strong></p>
                                                                                        <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Budget: <strong>${budget}</strong></p>
                                                                                        <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Due Date: <strong>${due_date}</strong></p>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="color:#2E4255;font-size:18px;font-weight:700;line-height:normal;padding:0;margin:0;">
                                                                                        <a target="_blank" href="${Constant.STAGGING_URL}#!/maintance_detail/${maintenance_id}" style="display:block;background:#2AA8D7;width:100px;line-height:28px;color:#fff;font-size:13px;border-radius:4px;text-decoration:none;text-align:center;margin-bottom:15px;">View Request</a><br><br><br>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="color:#7C888D;font-size:15px;line-height:normal;">Thank you,</td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="color:#7C888D;font-size:15px;line-height:normal;">The Ownly Trade team!</td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </body>
                                                </html>`
                                        };
                                        transporter.sendMail(mailOptions, function (error, response) {
                                            if (error) {
                                                console.log("Consumer email error: ", error);
                                            } else {
                                                console.log("Consumer email sent successfully to: ", createdByData.email);
                                            }
                                        });
                                    }

                                    if (newuserId && newuserId._id && newuserId._id != '') {
                                        console.log('newuserId => ');
                                        var mailOptions = {
                                            from: Config.EMAIL_FROM,
                                            to: email,
                                            subject: 'Your Ownly Trade service request',
                                            text: 'Your Ownly Trade service request',
                                            html: `<!doctype html>
                                                <html lang="en">
                                                <head>
                                                    <meta charset="utf-8">
                                                    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                                                    <link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">
                                                    <title>Email</title>
                                                    <style>
                                                        @media only screen and (max-width: 600px) {
                                                            .container-table { width: 100% !important; max-width: 100% !important; }
                                                            .background-container { padding: 10px !important; }
                                                            .content-table { width: 100% !important; padding: 10px !important; }
                                                            img { max-width: 100% !important; height: auto !important; }
                                                        }
                                                    </style>
                                                </head>
                                                <body>
                                                    <table class="container-table" style="font-family:Roboto;max-width:800px;width:100%;border-radius:4px;margin:0 auto;border-spacing:0;background:#3b4856;">
                                                        <tr>
                                                            <td class="background-container" style="border:0;padding:20px 0;background:#3b4856;border-spacing:0;text-align:center;">
                                                                <table class="content-table" style="width:90%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">
                                                                    <tr>
                                                                        <td style="padding:0;text-align:center;">
                                                                            <img src="${Constant.STAGGING_URL}assets/images/img-001.jpg" style="max-width:100%;height:auto;display:block;margin:0 auto;" alt="Ownly Trade Brand Image">
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="padding:20px;text-align:left;">
                                                                            <table style="width:100%;margin:0;border-spacing:0;">
                                                                                <tr>
                                                                                    <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:20px;">Dear ${firstname},</td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:40px;">Thank you for placing your request through Australia’s newest Trade and Service platform, Ownly Trade. We are delighted to help you find the perfect Trader.</td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:40px;">Please <a href="${Constant.PUBLIC_STAGGING_URL}consumer_account_activation/${activation_code}/${maintenance_id}"><b>click here</b></a> to activate your account ${email} and stay up to date with your Trade Request.</td>
                                                                                </tr>
                                                                                ${images && images.length > 0 ? `
                                                                                <tr>
                                                                                    <td style="padding-bottom:20px;">
                                                                                        ${images.map(image => `
                                                                                            <img src="${image.path}" style="max-width:100%;height:auto;display:block;margin:10px 0;" alt="Maintenance Image">
                                                                                        `).join('')}
                                                                                    </td>
                                                                                </tr>
                                                                                ` : ''}
                                                                                <tr>
                                                                                    <td style="color:#2E4255;font-size:18px;font-weight:700;line-height:normal;padding:0;margin:0;">
                                                                                        <a target="_blank" href="${Constant.PUBLIC_STAGGING_URL}consumer_account_activation/${activation_code}/${maintenance_id}" style="display:block;background:#2AA8D7;width:150px;line-height:28px;color:#fff;font-size:13px;border-radius:4px;text-decoration:none;text-align:center;margin-bottom:15px;">Activate My Account</a><br>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td>
                                                                                        <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">- Communicate with your trader</p>
                                                                                        <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">- Add any new files</p>
                                                                                        <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">- Cancel your request</p>
                                                                                        <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">- Review your traders work</p>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:40px;">If you are on mobile, <a href="${Constant.APP_DOWNLOAD_URL}"><b>click here</b></a> to download the PropertyCom app featuring the full TradeHub suite.</td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="color:#7C888D;font-size:15px;line-height:normal;">Thanks and Welcome to Ownly Trade</td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </body>
                                                </html>`
                                        };
                                        transporter.sendMail({
                                            from: mailOptions.from,
                                            to: mailOptions.to,
                                            subject: mailOptions.subject,
                                            text: mailOptions.subject,
                                            html: mailOptions.html
                                        }, function (error, response) {
                                            console.log("===============================");
                                            if (error) {
                                                console.log("New user email error: ", error);
                                            } else {
                                                console.log("Message sent: Successfully 1 ==========> check here ", mailOptions.to);
                                            }
                                        });
                                    } else {
                                        console.log('newuserId :: else => ');
                                    }

                                    var add_conditions = { maintenance: maintenance_id };
                                    await Address.findOne({ GNAFId: addData.GNAFId }, { GNAFId: 1, trader: 1 }, async function (err6, address_exist) {
                                        if (err6) {
                                        } else {
                                            if (address_exist) {
                                                console.log('trader_id => ', trader_id);
                                                if (trader_id && trader_id != '') {
                                                    console.log('existing trader => ');
                                                    var exist_trader = false;
                                                    address_exist.trader.map(function (trader) {
                                                        if (_.isEqual(trader, trader_id)) {
                                                            exist_trader = true;
                                                        }
                                                    });
                                                    if (!exist_trader) {
                                                        add_conditions.trader = mongoose.Types.ObjectId(trader_id);
                                                    }
                                                }
                                                await Address.update(
                                                    { GNAFId: addData.GNAFId },
                                                    { $push: add_conditions },
                                                    function (err, data) {}
                                                );
                                            } else {
                                                if (trader_id && trader_id != '')
                                                    addData.trader = mongoose.Types.ObjectId(trader_id);
                                                addData.maintenance = mongoose.Types.ObjectId(maintenance_id);
                                                var addAddress = new Address(addData);
                                                await addAddress.save(function (err7, addrData) {});
                                            }
                                        }
                                    });

                                    if (trader_id && trader_id != '') {
                                        var quote_link = Constant.STAGGING_URL + '#!/maintance_detail/' + maintenance_id;
                                        var conditions = { 'is_deleted': false, '_id': mongoose.Types.ObjectId(trader_id) };
                                        if (category_id != '') {
                                            conditions.categories_id = mongoose.Types.ObjectId(category_id);
                                        }

                                        User.find(conditions)
                                            .exec(async function (err, userTraderData) {
                                                if (err) {
                                                } else {
                                                    var Traderdata_ = _.pluck(userTraderData, '_id');
                                                    var traderLog = { mail_send_trader_id: Traderdata_ };
                                                    maintentenance_traders_log.update(
                                                        { maintenance_id: mongoose.Types.ObjectId(maintenance_id) },
                                                        { $push: traderLog },
                                                        function (err__, log_data) {}
                                                    );
                                                    console.log('createdByData ======1111111111111111111111111111=====> ', createdByData);
                                                    console.log('Traderdata_ :: Direct Request =========================> ', Traderdata_);
                                                    var to_users = [{
                                                        "users_id": mongoose.Types.ObjectId(Traderdata_[0])
                                                    }];
                                                    console.log('to_users => ', to_users);
                                                    var notiObj = {};
                                                    notiObj.subject = req.body.request_overview + " - new maintenance request has been added by " + createdByData.firstname + " " + createdByData.lastname;
                                                    notiObj.message = maintenanaceData.address;
                                                    notiObj.from_user = mongoose.Types.ObjectId(createdByData._id);
                                                    notiObj.to_users = to_users;
                                                    notiObj.type = Constant.NOTIFICATION_TYPE_MAINTENENCE_REQ;
                                                    notiObj.maintenence_id = maintenanaceData._id;
                                                    notiObj.module = 2;
                                                    var notification = new NotificationInfo(notiObj);
                                                    notification.save(function (notErr, notData) {
                                                        if (notErr) {
                                                            console.log('notErr :: Error occurred while adding notification => ', notErr);
                                                        } else {
                                                            console.log('successfully added notification => ', notData);
                                                        }
                                                    });
                                                    if (userTraderData) {
                                                        userTraderData.map(async function (value, key) {
                                                            var { business_name } = value;
                                                            if (value.is_active == true) {
                                                                var mailOptions = {
                                                                    from: Config.EMAIL_FROM,
                                                                    to: value.email,
                                                                    subject: mail_title,
                                                                    text: mail_title,
                                                                    html: `<!doctype html>
                                                                        <html lang="en">
                                                                        <head>
                                                                            <meta charset="utf-8">
                                                                            <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                                                                            <link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">
                                                                            <title>Email</title>
                                                                            <style>
                                                                                @media only screen and (max-width: 600px) {
                                                                                    .container-table { width: 100% !important; max-width: 100% !important; }
                                                                                    .background-container { padding: 10px !important; }
                                                                                    .content-table { width: 100% !important; padding: 10px !important; }
                                                                                    img { max-width: 100% !important; height: auto !important; }
                                                                                }
                                                                            </style>
                                                                        </head>
                                                                        <body>
                                                                            <table class="container-table" style="font-family:Roboto;max-width:800px;width:100%;border-radius:4px;margin:0 auto;border-spacing:0;background:#3b4856;">
                                                                                <tr>
                                                                                    <td class="background-container" style="border:0;padding:20px 0;background:#3b4856;border-spacing:0;text-align:center;">
                                                                                        <table class="content-table" style="width:90%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">
                                                                                            <tr>
                                                                                                <td style="padding:0;text-align:center;">
                                                                                                    <img src="${Constant.STAGGING_URL}assets/images/img-001.jpg" style="max-width:100%;height:auto;display:block;margin:0 auto;" alt="Ownly Trade Brand Image">
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding:20px;text-align:left;">
                                                                                                    <table style="width:100%;margin:0;border-spacing:0;">
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:20px;">Dear ${changeCase.sentenceCase(business_name)},</td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:40px;">One of our users on the Ownly Trade platform has viewed your profile and would like you to quote on a new job.</td>
                                                                                                        </tr>
                                                                                                        ${images && images.length > 0 ? `
                                                                                                        <tr>
                                                                                                            <td style="padding-bottom:20px;">
                                                                                                                ${images.map(image => `
                                                                                                                    <img src="${image.path}" style="max-width:100%;height:auto;display:block;margin:10px 0;" alt="Maintenance Image">
                                                                                                                `).join('')}
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        ` : ''}
                                                                                                        <tr>
                                                                                                            <td style="color:#2E4255;font-size:18px;font-weight:700;line-height:normal;padding:0;margin:0;">Job details<br><br></td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td>
                                                                                                                <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Title: <strong>${request_overview}</strong></p>
                                                                                                                <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Description: <strong>${request_detail}</strong></p>
                                                                                                                <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Budget: <strong>${budget}</strong></p>
                                                                                                                <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Due Date: <strong>${due_date}</strong></p>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#2E4255;font-size:18px;font-weight:500;line-height:normal;padding:0;margin:0;">If you would like to quote on this job please <a target="_blank" href="${quote_link}">click here</a> to communicate with the customer and submit your quote!<br><br></td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#2E4255;font-size:18px;font-weight:700;line-height:normal;padding:0;margin:0;">
                                                                                                                <a target="_blank" href="${quote_link}" style="display:block;background:#2AA8D7;width:100px;line-height:28px;color:#fff;font-size:13px;border-radius:4px;text-decoration:none;text-align:center;margin-bottom:15px;">Quote Now</a><br><br><br>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;">Thank you,</td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;">The Ownly Trade team!</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </body>
                                                                        </html>`
                                                                };
                                                                transporter.sendMail({
                                                                    from: mailOptions.from,
                                                                    to: mailOptions.to,
                                                                    subject: mailOptions.subject,
                                                                    text: mailOptions.subject,
                                                                    html: mailOptions.html
                                                                }, function (error, response) {
                                                                    if (error) {
                                                                        console.log("Trader quote email error: ", error);
                                                                    } else {
                                                                        let msgOptions = {
                                                                            mobile_no: value.mobile_no,
                                                                            business_name: value.business_name,
                                                                            title: maintenanaceData.request_overview,
                                                                            budget: maintenanaceData.budget,
                                                                            quote_link: quote_link + '?roleId=' + Constant.TRADER
                                                                        }
                                                                        console.log('maintenanaceData :: addMR=> ', maintenanaceData);
                                                                        console.log("Message sent: Successfully 2 ", mailOptions.to);
                                                                        console.log('Options for Text message=> ', msgOptions);
                                                                        sms.JobRequestMsg(msgOptions);
                                                                    }
                                                                });
                                                            } else {
                                                                var activation_code = value.activation_code;
                                                                var click_here = Constant.PUBLIC_STAGGING_URL + 'trader_account_activation/' + activation_code + '/' + maintenance_id;
                                                                var mailOptions = {
                                                                    from: Config.EMAIL_FROM,
                                                                    to: value.email,
                                                                    subject: value.firstname + ' ' + value.lastname + '- NEW QUOTE REQUEST',
                                                                    text: value.firstname + ' ' + value.lastname + '- NEW QUOTE REQUEST',
                                                                    html: `<!doctype html>
                                                                        <html lang="en">
                                                                        <head>
                                                                            <meta charset="utf-8">
                                                                            <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                                                                            <link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">
                                                                            <title>Email</title>
                                                                            <style>
                                                                                @media only screen and (max-width: 600px) {
                                                                                    .container-table { width: 100% !important; max-width: 100% !important; }
                                                                                    .background-container { padding: 10px !important; }
                                                                                    .content-table { width: 100% !important; padding: 10px !important; }
                                                                                    img { max-width: 100% !important; height: auto !important; }
                                                                                }
                                                                            </style>
                                                                        </head>
                                                                        <body>
                                                                            <table class="container-table" style="font-family:Roboto;max-width:800px;width:100%;border-radius:4px;margin:0 auto;border-spacing:0;background:#3b4856;">
                                                                                <tr>
                                                                                    <td class="background-container" style="border:0;padding:20px 0;background:#3b4856;border-spacing:0;text-align:center;">
                                                                                        <table class="content-table" style="width:90%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">
                                                                                            <tr>
                                                                                                <td style="padding:0;text-align:center;">
                                                                                                    <img src="${Constant.STAGGING_URL}assets/images/img-001.jpg" style="max-width:100%;height:auto;display:block;margin:0 auto;" alt="Ownly Trade Brand Image">
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding:20px;text-align:left;">
                                                                                                    <table style="width:100%;margin:0;border-spacing:0;">
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:20px;">Good news travels fast! Ownly wants to connect as someone is interested in using your services.</td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:40px;">As you know, unlike other search platforms, we give all <b>TRADES A FAIR GO.</b> We help you <b>PROMOTE, SECURE</b> AND <b>GROW</b> YOUR BUSINESS.</td>
                                                                                                        </tr>
                                                                                                        ${images && images.length > 0 ? `
                                                                                                        <tr>
                                                                                                            <td style="padding-bottom:20px;">
                                                                                                                ${images.map(image => `
                                                                                                                    <img src="${image.path}" style="max-width:100%;height:auto;display:block;margin:10px 0;" alt="Maintenance Image">
                                                                                                                `).join('')}
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        ` : ''}
                                                                                                        <tr>
                                                                                                            <td style="padding:25px;">
                                                                                                                <table style="width:100%;margin:0 auto;border:0;border-spacing:0;text-align:left;">
                                                                                                                    <tr><td style="padding:0 0 30px;font-size:16px;color:#606382;font-weight:normal;"><strong>What’s even better?</strong></td></tr>
                                                                                                                    <tr><td style="font-size:16px;color:#606382;font-weight:normal;padding:0 0 20px 40px;"><div style="width:8px;height:8px;background:#606382;display:inline-block;border-radius:100px;margin:0 10px 0 0;"></div>Our trade innovation platform is completely free to use!</td></tr>
                                                                                                                    <tr><td style="font-size:16px;color:#606382;font-weight:normal;padding:0 0 20px 40px;"><div style="width:8px;height:8px;background:#606382;display:inline-block;border-radius:100px;margin:0 10px 0 0;"></div>Connecting you to thousands of new business opportunities</td></tr>
                                                                                                                    <tr><td style="font-size:16px;color:#606382;font-weight:normal;padding:0 0 20px 40px;"><div style="width:8px;height:8px;background:#606382;display:inline-block;border-radius:100px;margin:0 10px 0 0;"></div>UNLIMITED quotes</td></tr>
                                                                                                                    <tr><td style="font-size:16px;color:#606382;font-weight:normal;padding:0 0 20px 40px;"><div style="width:8px;height:8px;background:#606382;display:inline-block;border-radius:100px;margin:0 10px 0 0;"></div>No booking fees or taking a share of your hard-earned revenue</td></tr>
                                                                                                                    <tr><td style="font-size:16px;color:#606382;font-weight:normal;padding:0 0 20px 40px;"><div style="width:8px;height:8px;background:#606382;display:inline-block;border-radius:100px;margin:0 10px 0 0;"></div>Giving your business exposure by saving your work to a property file so the next owner/tenant/property manager can recall you with a click of a button</td></tr>
                                                                                                                    <tr><td style="font-size:16px;color:#606382;font-weight:normal;padding:0 0 20px 40px;"><div style="width:8px;height:8px;background:#606382;display:inline-block;border-radius:100px;margin:0 10px 0 0;"></div>Connecting you to new markets–strata managers, property managers which no other trade platform has done before!</td></tr>
                                                                                                                </table>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#2E4255;font-size:15px;font-weight:500;line-height:normal;padding:0 0 20px;margin:0;">You are one step away from responding to your quote request and securing your next potential job:<br></td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#2E4255;font-size:15px;font-weight:700;line-height:normal;padding:0 0 20px;margin:0;">
                                                                                                                <a target="_blank" href="${click_here}" style="display:block;background:#2AA8D7;width:100px;line-height:28px;color:#fff;font-size:13px;border-radius:4px;text-decoration:none;text-align:center;margin-bottom:15px;">Quote Now</a><br><br><br>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;">Thank you,</td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;">The Ownly Trade team!</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </body>
                                                                        </html>`
                                                                };
                                                                transporter.sendMail({
                                                                    from: mailOptions.from,
                                                                    to: mailOptions.to,
                                                                    subject: mailOptions.subject,
                                                                    text: mailOptions.subject,
                                                                    html: mailOptions.html
                                                                }, function (error, response) {
                                                                    console.log("===============================");
                                                                    if (error) {
                                                                        console.log("Inactive trader email error: ", error);
                                                                    } else {
                                                                        let msgOptions = {
                                                                            mobile_no: value.mobile_no,
                                                                            business_name: value.business_name,
                                                                            title: maintenanaceData.request_overview,
                                                                            budget: maintenanaceData.budget,
                                                                            quote_link: click_here
                                                                        }
                                                                        console.log("Message sent: Successfully 3 ", mailOptions.to);
                                                                        sms.JobRequestMsg(msgOptions);
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                }
                                            });
                                    } else {
                                        console.log('no trade id => ');
                                        var quote_link = Constant.STAGGING_URL + '#!/maintance_detail/' + maintenance_id;
                                        conditions = { 'is_deleted': false };
                                        console.log('latitude :: Check Here => ', latitude);
                                        console.log('longitude :: Check Here => ', longitude);
                                        if (longitude && longitude != '' && latitude && latitude != '') {
                                            conditions.location = {
                                                $geoWithin: {
                                                    $centerSphere: [
                                                        [longitude, latitude], Constant.FIFTY_KM_INTO_MILE / Constant.RADIUS
                                                    ]
                                                }
                                            };
                                        }

                                        if (category_id != '') {
                                            conditions.categories_id = mongoose.Types.ObjectId(category_id);
                                        }
                                        var parser = User.find(conditions)
                                            .exec(async function (err, userData) {
                                                if (!err) {
                                                    var Traderdata_ = _.pluck(userData, '_id');
                                                    console.log('Traderdata_ ===================> ', Traderdata_);
                                                    var traderLog = { mail_send_trader_id: Traderdata_ };
                                                    maintentenance_traders_log.update(
                                                        { maintenance_id: mongoose.Types.ObjectId(maintenance_id) },
                                                        { $push: traderLog },
                                                        function (err__, log_data) {}
                                                    );
                                                    console.log("userData.length ==>", userData.length);

                                                    let traders_arr = [];
                                                    Traderdata_.map(ele => {
                                                        traders_arr.push({ "users_id": mongoose.Types.ObjectId(ele) })
                                                    })
                                                    console.log('traders_arr =========================> ', traders_arr);
                                                    console.log('createdByData ======2222222222222222222222222====> ', createdByData);

                                                    var notiObj = {};
                                                    notiObj.subject = req.body.request_overview + " - new maintenance request has been added by " + createdByData.firstname + " " + createdByData.lastname;
                                                    notiObj.message = maintenanaceData.address;
                                                    notiObj.from_user = mongoose.Types.ObjectId(createdByData._id);
                                                    notiObj.to_users = traders_arr;
                                                    notiObj.type = Constant.NOTIFICATION_TYPE_MAINTENENCE_REQ;
                                                    notiObj.maintenence_id = maintenanaceData._id;
                                                    notiObj.module = 2;
                                                    var notification = new NotificationInfo(notiObj);
                                                    notification.save(function (notErr, notData) {
                                                        if (notErr) {
                                                            console.log('notErr :: Error occurred while adding notification => ', notErr);
                                                        } else {
                                                            console.log('successfully added notification => ', notData);
                                                        }
                                                    });
                                                    var key = 1;
                                                    for (const value of userData) {
                                                        let msgOptions = {
                                                            mobile_no: value.mobile_no,
                                                            business_name: value.business_name,
                                                            title: maintenanaceData.request_overview,
                                                            budget: maintenanaceData.budget,
                                                            quote_link: quote_link
                                                        }
                                                        console.log("USER :: Public Request ==>");
                                                        setTimeout(async function timer() {
                                                            var business_name = value.business_name;
                                                            if (value.is_active == true) {
                                                                console.log("IF");
                                                                var mailOptions = {
                                                                    from: Config.EMAIL_FROM,
                                                                    to: value.email,
                                                                    subject: mail_title,
                                                                    text: mail_title,
                                                                    html: `<!doctype html>
                                                                        <html lang="en">
                                                                        <head>
                                                                            <meta charset="utf-8">
                                                                            <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                                                                            <link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">
                                                                            <title>Email</title>
                                                                            <style>
                                                                                @media only screen and (max-width: 600px) {
                                                                                    .container-table { width: 100% !important; max-width: 100% !important; }
                                                                                    .background-container { padding: 10px !important; }
                                                                                    .content-table { width: 100% !important; padding: 10px !important; }
                                                                                    img { max-width: 100% !important; height: auto !important; }
                                                                                }
                                                                            </style>
                                                                        </head>
                                                                        <body>
                                                                            <table class="container-table" style="font-family:Roboto;max-width:800px;width:100%;border-radius:4px;margin:0 auto;border-spacing:0;background:#3b4856;">
                                                                                <tr>
                                                                                    <td class="background-container" style="border:0;padding:20px 0;background:#3b4856;border-spacing:0;text-align:center;">
                                                                                        <table class="content-table" style="width:90%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">
                                                                                            <tr>
                                                                                                <td style="padding:0;text-align:center;">
                                                                                                    <img src="${Constant.STAGGING_URL}assets/images/img-001.jpg" style="max-width:100%;height:auto;display:block;margin:0 auto;" alt="Ownly Trade Brand Image">
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding:20px;text-align:left;">
                                                                                                    <table style="width:100%;margin:0;border-spacing:0;">
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:20px;">Dear ${changeCase.sentenceCase(business_name)},</td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:40px;">One of our users on the Ownly Trade platform has posted a job in your area.</td>
                                                                                                        </tr>
                                                                                                        ${images && images.length > 0 ? `
                                                                                                        <tr>
                                                                                                            <td style="padding-bottom:20px;">
                                                                                                                ${images.map(image => `
                                                                                                                    <img src="${image.path}" style="max-width:100%;height:auto;display:block;margin:10px 0;" alt="Maintenance Image">
                                                                                                                `).join('')}
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        ` : ''}
                                                                                                        <tr>
                                                                                                            <td style="color:#2E4255;font-size:18px;font-weight:700;line-height:normal;padding:0;margin:0;">Job details<br><br></td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td>
                                                                                                                <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Title: <strong>${request_overview}</strong></p>
                                                                                                                <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Description: <strong>${request_detail}</strong></p>
                                                                                                                <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Budget: <strong>${budget}</strong></p>
                                                                                                                <p style="padding-bottom:25px;margin:0;color:#7C888D;font-size:15px;font-style:italic;line-height:normal;font-weight:300;">Due Date: <strong>${due_date}</strong></p>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#2E4255;font-size:18px;font-weight:500;line-height:normal;padding:0;margin:0;">If you would like to quote on this job please <a target="_blank" href="${quote_link}">click here</a> to view the job details and submit a quote!</td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#2E4255;font-size:18px;font-weight:700;line-height:normal;padding:0;margin:0;"><br>
                                                                                                                <a target="_blank" href="${quote_link}" style="display:block;background:#2AA8D7;width:100px;line-height:28px;color:#fff;font-size:13px;border-radius:4px;text-decoration:none;text-align:center;margin-bottom:15px;">Quote Now</a><br><br><br>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;"><br>Thank you,</td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;">The Ownly Trade team!</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </body>
                                                                        </html>`
                                                                };
                                                                transporter.sendMail({
                                                                    from: mailOptions.from,
                                                                    to: mailOptions.to,
                                                                    subject: mailOptions.subject,
                                                                    text: mailOptions.subject,
                                                                    html: mailOptions.html
                                                                }, function (error, response) {
                                                                    console.log("===============================");
                                                                    if (error) {
                                                                        console.log("Public trader email error: ", error);
                                                                    } else {
                                                                        console.log("Message sent: Successfully 4 ", mailOptions.to);
                                                                        sms.JobRequestMsg(msgOptions);
                                                                    }
                                                                });
                                                            } else {
                                                                console.log("Else :: !isActive ==>");
                                                                var activation_code = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
                                                                var click_here = Constant.PUBLIC_STAGGING_URL + 'trader_account_activation/' + activation_code + "/" + maintenance_id;
                                                                var updateUserRecord = {
                                                                    activation_code: activation_code
                                                                }
                                                                User.update({ _id: value._id }, { $set: updateUserRecord }, function (err) {});
                                                                var mailOptions = {
                                                                    from: Config.EMAIL_FROM,
                                                                    to: value.email,
                                                                    subject: value.firstname + ' ' + value.lastname + '- NEW QUOTE REQUEST',
                                                                    text: value.firstname + ' ' + value.lastname + '- NEW QUOTE REQUEST',
                                                                    html: `<!doctype html>
                                                                        <html lang="en">
                                                                        <head>
                                                                            <meta charset="utf-8">
                                                                            <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                                                                            <link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">
                                                                            <title>Email</title>
                                                                            <style>
                                                                                @media only screen and (max-width: 600px) {
                                                                                    .container-table { width: 100% !important; max-width: 100% !important; }
                                                                                    .background-container { padding: 10px !important; }
                                                                                    .content-table { width: 100% !important; padding: 10px !important; }
                                                                                    img { max-width: 100% !important; height: auto !important; }
                                                                                }
                                                                            </style>
                                                                        </head>
                                                                        <body>
                                                                            <table class="container-table" style="font-family:Roboto;max-width:800px;width:100%;border-radius:4px;margin:0 auto;border-spacing:0;background:#3b4856;">
                                                                                <tr>
                                                                                    <td class="background-container" style="border:0;padding:20px 0;background:#3b4856;border-spacing:0;text-align:center;">
                                                                                        <table class="content-table" style="width:90%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">
                                                                                            <tr>
                                                                                                <td style="padding:0;text-align:center;">
                                                                                                    <img src="${Constant.STAGGING_URL}assets/images/img-001.jpg" style="max-width:100%;height:auto;display:block;margin:0 auto;" alt="Ownly Trade Brand Image">
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding:20px;text-align:left;">
                                                                                                    <table style="width:100%;margin:0;border-spacing:0;">
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:20px;">Good news travels fast! Ownly wants to connect as someone is interested in using your services.</td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;padding-bottom:40px;">As you know, unlike other search platforms, we give all <b>TRADES A FAIR GO.</b> We help you <b>PROMOTE, SECURE</b> AND <b>GROW</b> YOUR BUSINESS.</td>
                                                                                                        </tr>
                                                                                                        ${images && images.length > 0 ? `
                                                                                                        <tr>
                                                                                                            <td style="padding-bottom:20px;">
                                                                                                                ${images.map(image => `
                                                                                                                    <img src="${image.path}" style="max-width:100%;height:auto;display:block;margin:10px 0;" alt="Maintenance Image">
                                                                                                                `).join('')}
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        ` : ''}
                                                                                                        <tr>
                                                                                                            <td style="padding:25px;">
                                                                                                                <table style="width:100%;margin:0 auto;border:0;border-spacing:0;text-align:left;">
                                                                                                                    <tr><td style="padding:0 0 30px;font-size:16px;color:#606382;font-weight:normal;"><strong>What’s even better?</strong></td></tr>
                                                                                                                    <tr><td style="font-size:16px;color:#606382;font-weight:normal;padding:0 0 20px 40px;"><div style="width:8px;height:8px;background:#606382;display:inline-block;border-radius:100px;margin:0 10px 0 0;"></div>Our trade innovation platform is completely free to use!</td></tr>
                                                                                                                    <tr><td style="font-size:16px;color:#606382;font-weight:normal;padding:0 0 20px 40px;"><div style="width:8px;height:8px;background:#606382;display:inline-block;border-radius:100px;margin:0 10px 0 0;"></div>Connecting you to thousands of new business opportunities</td></tr>
                                                                                                                    <tr><td style="font-size:16px;color:#606382;font-weight:normal;padding:0 0 20px 40px;"><div style="width:8px;height:8px;background:#606382;display:inline-block;border-radius:100px;margin:0 10px 0 0;"></div>UNLIMITED quotes</td></tr>
                                                                                                                    <tr><td style="font-size:16px;color:#606382;font-weight:normal;padding:0 0 20px 40px;"><div style="width:8px;height:8px;background:#606382;display:inline-block;border-radius:100px;margin:0 10px 0 0;"></div>No booking fees or taking a share of your hard-earned revenue</td></tr>
                                                                                                                    <tr><td style="font-size:16px;color:#606382;font-weight:normal;padding:0 0 20px 40px;"><div style="width:8px;height:8px;background:#606382;display:inline-block;border-radius:100px;margin:0 10px 0 0;"></div>Giving your business exposure by saving your work to a property file so the next owner/tenant/property manager can recall you with a click of a button</td></tr>
                                                                                                                    <tr><td style="font-size:16px;color:#606382;font-weight:normal;padding:0 0 20px 40px;"><div style="width:8px;height:8px;background:#606382;display:inline-block;border-radius:100px;margin:0 10px 0 0;"></div>Connecting you to new markets–strata managers, property managers which no other trade platform has done before!</td></tr>
                                                                                                                </table>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#2E4255;font-size:15px;font-weight:500;line-height:normal;padding:0 0 20px;margin:0;">You are one step away from responding to your quote request and securing your next potential job:<br></td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#2E4255;font-size:15px;font-weight:700;line-height:normal;padding:0 0 20px;margin:0;">
                                                                                                                <a target="_blank" href="${click_here}" style="display:block;background:#2AA8D7;width:100px;line-height:28px;color:#fff;font-size:13px;border-radius:4px;text-decoration:none;text-align:center;margin-bottom:15px;">Quote Now</a><br><br><br>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;">Thank you,</td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="color:#7C888D;font-size:15px;line-height:normal;">The Ownly Trade team!</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </body>
                                                                        </html>`
                                                                };
                                                                transporter.sendMail({
                                                                    from: mailOptions.from,
                                                                    to: mailOptions.to,
                                                                    subject: mailOptions.subject,
                                                                    text: mailOptions.subject,
                                                                    html: mailOptions.html
                                                                }, function (error, response) {
                                                                    console.log("===============================");
                                                                    if (error) {
                                                                        console.log("Inactive public trader email error: ", error);
                                                                    } else {
                                                                        console.log("Message sent: Successfully 5 ", mailOptions.to);
                                                                        sms.JobRequestMsg(msgOptions);
                                                                    }
                                                                });
                                                            }
                                                            key++;
                                                        }, key * 2000);
                                                    }
                                                    console.log("end here-------------------------------------------------------------------------");
                                                }
                                            });
                                    }
                                    res.json({ code: Constant.SUCCESS_CODE, data: maintenanaceData });
                                }
                            });
                        });
                    });
                    req1.end();
                });
            } else {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            }
        } else {
            res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
        }
    })();
}

function applyForQuote(req, res) {

    var price = (typeof req.body.proposed_price != 'undefined') ? req.body.proposed_price : 0;
    var date = (typeof req.body.proposed_date != 'undefined') ? req.body.proposed_date : '';
    var maintenance_id = (typeof req.body.maintenance_id != 'undefined') ? mongoose.Types.ObjectId(req.body.maintenance_id) : '';
    var proposal_created_by = (typeof req.body.proposal_created_by != 'undefined') ? mongoose.Types.ObjectId(req.body.proposal_created_by) : '';
    var message = (typeof req.body.message != 'undefined') ? req.body.message : '';
    var business_name = (typeof req.body.business_name != 'undefined') ? req.body.business_name : '';
    var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
    var lastname = (typeof req.body.lastname != 'undefined') ? req.body.lastname : '';

    if (maintenance_id) {
        var obj = {};
        obj.maintenance_id = maintenance_id;
        obj.proposed_price = price;
        obj.message = message;
        obj.proposed_date = date;
        obj.proposal_created_by = proposal_created_by;
        obj.proposal_type = 'apply';
        obj.status = 0;

        var Proposal = new maintenance_proposals(obj);
        Proposal.save({ new: true, runValidators: true }, function (err, proposalData) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                maintenances.findById({ _id: proposalData.maintenance_id }).
                    populate('property_id', 'property_name description address image')
                    .populate('created_by', '_id firstname lastname image email is_active activation_code')
                    .populate('forwarded_by', '_id firstname lastname image')
                    .exec(function (err, data) {
                        console.log("data ==========>>>", data);
                        // console.log('data.is_active => ', data.is_active);
                        // var activation_code = data.created_by.activation_code;



                        var business_name = '';
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                        } else {
                            var add_conditions = { maintenance: maintenance_id };
                            add_conditions.apply_trader_id = mongoose.Types.ObjectId(proposal_created_by);

                            maintentenance_traders_log.update(
                                { maintenance_id: mongoose.Types.ObjectId(maintenance_id) },
                                { $push: add_conditions },
                                function (err__, log_data) {
                                    console.log("err   ", err__)
                                    console.log("update data   ", log_data);
                                });

                            var to_users = [];
                            var obj2 = {};
                            obj2.subject = "Quote";
                            if (business_name && business_name != '') {
                                obj2.message = "Quote sent by " + business_name + " on " + moment().format("MMMM Do YYYY") + " for the Property " + data.address;
                            }
                            else {
                                business_name = firstname + " " + lastname;
                                obj2.message = "Quote sent by " + firstname + " " + lastname + " on " + moment().format("MMMM Do YYYY") + " for the Property " + data.address;
                            }

                            var html_view = '<!doctype html>' +
                                '<html lang="en">' +
                                '<head>' +
                                '<meta charset="utf-8">' +
                                '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">' +
                                '<link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">' +
                                '<title>Email </title>' +
                                '</head>' +
                                '<body>' +
                                '<table style="font-family:Roboto;max-width:800px; width:100%; border-radius:4px;margin:0 auto; border-spacing:0;background: #3b4856;">' +
                                '<tr>' +
                                '<td style="border:0;padding: 130px 0 180px 0px;background:#3b4856;border-spacing:0;text-align:center;background: url(' + Constant.STAGGING_URL + 'assets/images/img-001.jpg) no-repeat center 0;background-size:contain">' +
                                '</tr>' +
                                '<tr>' +
                                '<td style="border:0; padding:0 0 50px; background:#3B4856; border-spacing:0; text-align:center;">' +
                                '<table style="width:80%;top: -90px !important; margin-left: auto;margin-right: auto;margin-top: -90px; border-spacing:0; position:relative; border-radius:4px; background:#fff; border-radius:10px; border-spacing: 0;">' +
                                '<tr>' +
                                '<td style="padding:20px; text-align:left;">' +
                                '<table style="width:100%; margin:0; border-spacing:0; border-spacing: 0;">' +
                                '<tr>' +
                                '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:20px;">Dear ' + changeCase.sentenceCase(data.created_by.firstname) + ',</td>' +
                                '</tr>' +
                                '<tr>' +
                                '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:15px;">' + changeCase.sentenceCase(business_name) + ' has offered to complete your $' + data.original_budget + ' task, "' + data.request_overview + '" for </td></tr>' +
                                '<td style="color:#7C888D; font-size:25px; line-height:normal; padding-bottom:40px; font-weight: bold">$' + proposalData.proposed_price + '</td>' +
                                '</tr>' +
                                '<tr>' +
                                '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:30px;">Your due date: ' + moment(proposalData.proposed_date).format("DD MMM YYYY") + '</td>' +
                                '</tr>' +
                                '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:5px;">' + changeCase.sentenceCase(business_name) + `'s offer comment to you:</td>` +
                                '</tr>' +
                                '<td style="color:#7C888D; font-size:14px; line-height:normal; padding-bottom:40px;">' + `'<i>` + message + `</i>'</td>` +
                                '</tr>';

                            if (data.created_by.is_active == true) {
                                html_view += '<tr>' +
                                    '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;">You can login to your account to get in contact or ask a quick question using our chat.</td>' +
                                    '</tr>' +
                                    '<tr>' +
                                    // '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;"><a  style="display:block;background:#2AA8D7; width:150px; line-height:28px; color:#fff; font-size:13px; border-radius:4px; text-decoration:none;text-align:center; margin-bottom:15px;" href="' + Constant.STAGGING_URL + '#!/login' + '">Log in to view quote</a>' +
                                    '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;"><a  style="display:block;background:#2AA8D7; width:150px; line-height:28px; color:#fff; font-size:13px; border-radius:4px; text-decoration:none;text-align:center; margin-bottom:15px;" href="' + Constant.STAGGING_URL + '#!/quote_detail/' + proposalData.maintenance_id + '/' + proposalData.proposal_created_by +'">View quote</a>' +
                                    '</td>' +
                                    '</tr>';

                            } else {
                                // var activation_code = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
                                console.log('data.activation_code => ', data.created_by.activation_code);
                                var activation_code = data.created_by.activation_code;

                                html_view += '<tr>' +
                                    '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;">You can activate your account to get in contact or ask a quick question using our chat.</td>' +
                                    '</tr>' +
                                    '<tr>' +
                                    '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;"><a  style="display:block;background:#2AA8D7; width:150px; line-height:28px; color:#fff; font-size:13px; border-radius:4px; text-decoration:none;text-align:center; margin-bottom:15px;" href="' + Constant.PUBLIC_STAGGING_URL + 'consumer_account_activation/' + activation_code + '/' + maintenance_id + '">Activate Account</a>' +
                                    '</td>' +
                                    '</tr>';
                            }

                            html_view += '<tr>' +
                                '<td style="color:#7C888D; font-size:15px; line-height:normal;"><br>Thank you,</td>' +
                                '</tr>' +
                                '<tr>' +
                                '<td style="color:#7C888D; font-size:15px; line-height:normal;">The Ownly Trade team!</td>' +
                                '</tr>' +
                                '</table>' +
                                '</td>' +
                                '</tr>' +
                                '</table>' +
                                '</td>' +
                                '</tr>' +
                                '</table>' +
                                '</body>' +
                                '</html>';
                            console.log("html_view     ", html_view);

                            let info = transporter.sendMail({
                                from: Config.EMAIL_FROM,
                                to: data.created_by.email,
                                subject: 'Someone has quoted on your job!', // Subject line
                                text: 'Someone has quoted on your job!', // plaintext body
                                // subject: 'Notification for Getting a Quote', // Subject line
                                // text: 'Notification for Getting a Quote', // plaintext body
                                html: html_view
                            }, function (error, response) {
                                console.log("===============================");
                                if (error) {
                                    console.log("eeeeee", error);
                                } else {
                                    console.log("Message sent: Successfully  1 ==========> check here ", data.created_by.email);
                                }
                            });



                            // var mailOptions = {
                            //     from: Config.EMAIL_FROM, // sender address
                            //     to: data.email, // list of receivers
                            //     // to: 'jerriranhard@yahoo.com',
                            //     subject: 'Notification for Getting a Quote', // Subject line
                            //     text: 'Notification for Getting a Quote', // plaintext body
                            //     html: html_view
                            // };

                            obj2.from_user = mongoose.Types.ObjectId(proposal_created_by);
                            to_users.push({ "users_id": mongoose.Types.ObjectId(data.created_by._id) });
                            obj2.to_users = to_users;
                            obj2.module = 2;
                            obj2.maintenence_id = data._id;
                            obj2.type = Constant.NOTIFICATION_TYPE_PROPOSAL;
                            var notification = new NotificationInfo(obj2);
                            notification.save(function (err, notData) {
                                if (err) {
                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                } else {
                                    res.json({ code: Constant.SUCCESS_CODE, data: data, proposal_data: proposalData });
                                }
                            });

                        }
                    });
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

function hire_decline_trader(req, res) {

    var maintenance_id = (typeof req.body.maintenance_id != 'undefined') ? mongoose.Types.ObjectId(req.body.maintenance_id) : '';
    var watchersList = (typeof req.body.watchers_list != 'undefined') ? req.body.watchers_list : [];
    var status = (typeof req.body.status != 'undefined') ? parseInt(req.body.status) : '';
    var trader_id = (typeof req.body.trader_id != 'undefined') ? mongoose.Types.ObjectId(req.body.trader_id) : '';

    if (maintenance_id != '' && status != '') {
        var watchers_list = [];
        if (watchersList) {
            // var set1 = new Set(watchersList);
            var watchersListArr = [];
            var watchersListusers = [];
            for (var i = 0; i < watchersList.length; i++) {
                if (watchersListusers.indexOf(watchersList[i]._id) === -1) {
                    watchersListArr.push({ "users_id": mongoose.Types.ObjectId(watchersList[i]._id), "is_read": false });
                    watchersListusers.push(watchersList[i]._id);
                }
            }
            watchers_list = watchersListArr;
        }

        maintenances.findById({ _id: maintenance_id })
            .exec(function (err, mrData) {
                // console.log("calling   ", mrData);
                var conditions = { "status": status, };
                if (status == 1)
                    conditions.is_proposal_accept = true;
                else
                    conditions.is_proposal_accept = false;
                maintenance_proposals.findOneAndUpdate({ 'proposal_created_by': trader_id, 'maintenance_id': mongoose.Types.ObjectId(maintenance_id), 'proposal_type': "apply" },
                    {
                        $set: conditions,
                    }, function (err, proposalData) {
                        if (err) {
                        } else {
                            if (status == 1) {
                                maintenances.update({ '_id': mongoose.Types.ObjectId(maintenance_id) },
                                    {
                                        $set: {
                                            "req_status": Constant.REQ_STATUS_ACCEPT_JOB,
                                            "request_type": 0,
                                            "trader_id": mongoose.Types.ObjectId(proposalData.proposal_created_by),
                                            "budget": proposalData.proposed_price,
                                            "due_date": proposalData.proposed_date,
                                            "watchers_list": watchers_list
                                        }
                                    },
                                    { new: true }, function (err, maintenanceData) {
                                        if (err) {
                                        } else {
                                            var to_users = [];
                                            var obj2 = {};
                                            obj2.subject = "Quote Approved";
                                            obj2.message = mrData.request_overview + " on " + moment().format("MMMM Do YYYY") + " for the Property : " + mrData.address;
                                            obj2.from_user = mongoose.Types.ObjectId(mrData.created_by);
                                            to_users.push({ "users_id": mongoose.Types.ObjectId(proposalData.proposal_created_by) });
                                            obj2.to_users = to_users;
                                            obj2.module = 2;
                                            obj2.maintenence_id = mrData._id;
                                            obj2.type = Constant.NOTIFICATION_TYPE_PROPOSAL;
                                            var notification = new NotificationInfo(obj2);
                                            notification.save(function (err, notData) {
                                                if (err) {

                                                } else {

                                                }
                                            });
                                        }
                                    });
                            } else {
                                maintenances.update({ '_id': mongoose.Types.ObjectId(maintenance_id) },
                                    {
                                        $set: {
                                            "req_status": 1,
                                            "request_type": 1,
                                            "budget": mrData.original_budget,
                                            "due_date": mrData.original_date
                                        },
                                        $unset: { 'trader_id': "" }
                                    }, function (err, maintenanceData) {
                                        var to_users = [];
                                        var obj2 = {};
                                        obj2.subject = "Quote Declined";
                                        obj2.message = mrData.request_overview + " on " + moment().format("MMMM Do YYYY") + " for the Property : " + mrData.address;
                                        obj2.from_user = mongoose.Types.ObjectId(mrData.created_by);
                                        to_users.push({ "users_id": mongoose.Types.ObjectId(proposalData.proposal_created_by) });
                                        obj2.to_users = to_users;
                                        obj2.module = 2;
                                        obj2.maintenence_id = mrData._id;
                                        obj2.type = Constant.NOTIFICATION_TYPE_PROPOSAL;
                                        var notification = new NotificationInfo(obj2);
                                        notification.save(function (err, notData) {
                                            if (err) {

                                            } else {

                                            }
                                        });
                                    });
                            }
                            res.json({ code: Constant.SUCCESS_CODE, data: proposalData });
                        }
                    });
            });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}
