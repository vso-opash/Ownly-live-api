'use strict';
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Groups = mongoose.model('Group'),
    NotificationInfo = mongoose.model('Notification'),
    maintenances = mongoose.model('maintenances'),
    NotificationStatus = mongoose.model('NotificationStatus'),
    chatModel = mongoose.model('Chats'), //To manage chat by user
    InvitationInfo = mongoose.model('invitations'),
    propertyModel = require('../models/Properties'),
    async = require('async'),
    _ = require('underscore'),
    forEach = require('async-foreach').forEach,
    reviews = mongoose.model('reviews'),
    favourites = mongoose.model('favourites'),
    slug = require('slug'),
    moment = require('moment'),
    Config = require('../../config/config.js'),
    Constant = require('../../config/constant.js'),
    randomString = require('random-string'),
    waterfall = require('run-waterfall'),
    agreements = mongoose.model('agreements'),
    csv = require("fast-csv"),
    path = require('path'),
    formidable = require('formidable'),
    fs = require('fs-extra'),
    request = require('request'),
    validator = require('../../config/validator.js');

/* Mailgun Email setup*/
var bcrypt = require('bcrypt');
var sendmail = require('sendmail')();
var nodemailer = require('nodemailer');
var changeCase = require('change-case')
var salt = bcrypt.genSaltSync(10);
var smtpTransport = require('nodemailer-smtp-transport');
// var transporter = nodemailer.createTransport(
//     smtpTransport('smtp://' + Config.SMTP.authUser + ':' + Config.SMTP.authpass + '@smtp.gmail.com')
// );

var transporter = nodemailer.createTransport(smtpTransport({
    service: Config.SMTP.service,
    auth: {
        user: Config.SMTP.authUser,
        pass: Config.SMTP.authpass
    }
}));


module.exports = {
    getStatisticsData: getStatisticsData,
    getPropertyForAddingTenant: getPropertyForAddingTenant,
    tenantsList: tenantsList,
    getFavTenants: getFavTenants,
    allTenentsFromDatabase: allTenentsFromDatabase,
    addNewTenant: addNewTenant,
    sendMessage: sendMessage,
    TenantListWithinProperty: TenantListWithinProperty,
    update_tanent_request_status: update_tanent_request_status,
    check_user_valid: check_user_valid,
    importTenantCSV: importTenantCSV,
    validateEmail: validateEmail,
    download_file: download_file
};
/* Api for get tenant list associate with an property
   Request param is properrty id
   Response - Tenant List
*/
function TenantListWithinProperty(req, res) {
    var property_id = (typeof req.body.property_id != 'undefined') ? req.body.property_id : '';
    InvitationInfo.find({ property_id: mongoose.Types.ObjectId(property_id), deleted: false, status: true }, { invited_to: 1, property_id: 1 })
        .populate("invited_to", "firstname lastname image")
        .sort({ created: -1 }).exec(function (err, tenants) {
            if (err) {
                callback(err);
            } else {
                if (err) {
                    res.json({
                        code: Constant.ERROR_CODE,
                        message: Constant.ERROR_RETRIVING_DATA
                    });
                } else {
                    res.json({
                        code: 200,
                        data: tenants
                    });
                }
            }
        });
}

/*  @api : getpropertyByid
 *  @author  :  
 *  @created  : 
 *  @modified :
 *  @purpose  : To get the property by owner id.
 */
function getPropertyForAddingTenant(req, res) {
    var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var request_by_role = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';


    var conditions = { "$and": [] };
    conditions["$and"].push({ "is_deleted": false, "save_as_draft": false });

    if (request_by_role == Constant.OWN_AGENCY && agency_id)
        conditions["$and"].push({ "created_by_agency_id": agency_id });

    if (request_by_role == Constant.AGENT && user_id)
        conditions["$and"].push({ "created_by": user_id });

    if (request_by_role == Constant.OWNER && user_id)
        conditions["$and"].push({ "owned_by": user_id });

    if (request_by_role == Constant.TENANT && user_id) {

        var getAssociateProperty = function (user_id, callback) {
            InvitationInfo.find({ invited_to: mongoose.Types.ObjectId(user_id), deleted: false, status: true, invitation_status: 2 }, { property_id: 1 }, function (err, data) {
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
                        //console.log("property_id_arr",property_id_arr);
                        callback(null, property_id_arr);
                    }
                }
            });
        }

        getAssociateProperty(user_id, function (error, PropertyArr) {
            if (error) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else if (!PropertyArr) {
                res.json({ code: Constant.SUCCESS_CODE, data: [] });
            } else {
                propertyModel.find({ _id: { $in: PropertyArr }, save_as_draft: false, is_deleted: false }, { "_id": 1, "property_id": 1, "address": 1, "image": 1 })
                    .sort({ created: -1 }).exec(function (err, property) {
                        if (err) {
                            res.json({
                                code: Constant.ERROR_CODE,
                                message: Constant.ERROR_RETRIVING_DATA
                            });
                        } else if (property && property.length) {
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
                        } else {
                            res.json({
                                code: Constant.ERROR_CODE,
                                message: Constant.ERROR_RETRIVING_DATA
                            });
                        }
                    });
            }
        });
    } else {
        propertyModel.find(conditions, { "_id": 1, "property_id": 1, "address": 1, "image": 1 })
            .sort({ created: -1 }).exec(function (err, property) {
                if (err) {
                    res.json({
                        code: Constant.ERROR_CODE,
                        message: Constant.ERROR_RETRIVING_DATA
                    });
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
                maintenances.count({ agency_id: mongoose.Types.ObjectId(user_id), deleted: false }, function (err, requestCnt) {
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
/**
 * [Tenants List - get tenants list for repective users roles]
 * @param  {object} req
 * @param  {object} res
 * Created By Rahul Lahariya
 */
function tenantsList(req, res) {
    var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var request_by_role = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';
    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 40;

    var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
    var lastname = (typeof req.body.lastname != 'undefined') ? req.body.lastname : '';
    var state = (typeof req.body.state != 'undefined') ? req.body.state : '';
    var city = (typeof req.body.city != 'undefined') ? req.body.city : '';
    var zip_code = (typeof req.body.zip_code != 'undefined') ? req.body.zip_code : '';
    var totalCount = 0;

    var getAllTenantsForAgents = function (user_id, page_number, number_of_pages, next) {
        if (request_by_role == Constant.AGENT) {
            agreements.find({ created_by: mongoose.Types.ObjectId(user_id), deleted: false }, { tenants: 1 })
                .sort({ createdAt: -1 }).exec(function (err, data) {
                    if (err) {
                        next(err);
                    } else {
                        if (!data) {
                            next(null, []);
                        } else {
                            var users_id_arr = [];

                            var users_id_arr = [];
                            data.map(function (item) {
                                item.tenants.map(function (user_items) {
                                    users_id_arr.push(user_items.users_id);
                                });
                            });
                            next(null, users_id_arr);
                        }
                    }
                });
        }
        else if (request_by_role == Constant.OWN_AGENCY) {
            agreements.find({ agency_id: mongoose.Types.ObjectId(agency_id), deleted: false }, { tenants: 1 })
                .sort({ createdAt: -1 }).exec(function (err, data) {
                    if (err) {
                        next(err);
                    } else {
                        if (!data) {
                            next(null, []);
                        } else {
                            var users_id_arr = [];
                            data.map(function (item) {
                                item.tenants.map(function (user_items) {
                                    users_id_arr.push(user_items.users_id);
                                });
                            });
                            next(null, users_id_arr);
                        }
                    }
                });
        }
        else if (request_by_role == Constant.OWNER) {
            agreements.find({ owner_id: mongoose.Types.ObjectId(user_id), deleted: false }, { tenants: 1 })
                .sort({ createdAt: -1 }).exec(function (err, data) {
                    if (err) {
                        next(err);
                    } else {
                        if (!data) {
                            next(null, []);
                        } else {
                            var users_id_arr = [];
                            data.map(function (item) {
                                item.tenants.map(function (user_items) {
                                    users_id_arr.push(user_items.users_id);
                                });
                            });
                            next(null, users_id_arr);
                        }
                    }
                });
        }
        else {

            InvitationInfo.find({ invited_by: mongoose.Types.ObjectId(user_id), deleted: false, status: true, invitation_status: 2 }, { invited_to: 1 })
                .sort({ createdAt: -1 }).exec(function (err, data) {
                    if (err) {
                        next(err);
                    } else {
                        if (!data) {
                            next(null, []);
                        } else {
                            var users_id_arr = [];
                            for (var i = 0; i < data.length; i++) {
                                var users_id = mongoose.Types.ObjectId(data[i].invited_to);
                                users_id_arr.push(users_id);
                            }
                            next(null, users_id_arr);
                        }
                    }
                });
        }
    };
    waterfall([
        function (callback) {
            getAllTenantsForAgents(user_id, page_number, number_of_pages, function (error, usersArr) {
                if (error) {
                    callback(error);
                } else if (!usersArr) {
                    callback(null, [], 0);
                } else {
                    var conditions = { "$and": [] };
                    conditions["$and"].push({ _id: { $in: usersArr }, is_active: true, is_deleted: false });
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

                    User.aggregate([
                        { $match: conditions }, // Match me
                        { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                        {
                            $group:
                            {
                                _id: null,
                                "count": { $sum: 1 }
                            }
                        }
                    ])
                        .allowDiskUse(true)
                        .sort({ createdAt: -1 })
                        .exec(function (err, results) {
                            if (err) {
                                callback(err);
                            } else {
                                if (results.length > 0) {
                                    totalCount = results[0].count;
                                    User.aggregate(
                                        { $match: conditions }, // Match me
                                        { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                                        { $lookup: { from: 'reviews', localField: '_id', foreignField: 'review_to', as: 'reviews' } },
                                        {
                                            $project: {
                                                _id: 1,
                                                firstname: 1, lastname: 1, email: 1, address: 1, totalPropertyCount: 1, about_user: 1, is_online: 1,
                                                image: 1, images: 1, agency_id: 1, city: 1,
                                                groups: { _id: 1, role_id: 1, status: 1, deleted: 1 },
                                                reviews: { _id: 1, review_to: 1, review_by: 1, avg_total: 1 }
                                            }
                                        },
                                        { $sort: { "createdAt": -1 } },
                                        { $skip: page_number * number_of_pages },
                                        { "$limit": number_of_pages }
                                    ).exec(function (err, userList) {
                                        if (err) {
                                            callback(err);
                                        } else {
                                            callback(null, userList, totalCount);
                                        }
                                    });
                                } else {
                                    callback(null, [], 0);
                                }
                            }
                        });
                }
            });
        },
        function (arg1, arg2, callback) {
            var favArray = [];
            if (arg1.length > 0) {
                var newItem = JSON.stringify(arg1);
                var newItem = JSON.parse(newItem);

                async.each(newItem, function (item, asyncCall) {
                    favourites.findOne({
                        "is_deleted": false,
                        "fav_to_user": mongoose.Types.ObjectId(item._id),
                        "fav_by": mongoose.Types.ObjectId(user_id)
                    }, { fav_status: 1 }).sort({ createdAt: -1 }).exec(function (err, fav) {
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
                        callback(null, favArray, arg2);
                    }
                });
            } else {
                callback(null, arg1, arg2);
            }
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
    ], function (err, result, total_count) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, data: result, totalCount: total_count });
        }
    });


}


/**
 * [tenantsList - get all tenants from database]
 * @param  {object} req
 * @param  {object} res
 * Created By Rahul Lahariya
 */
function allTenentsFromDatabase(req, res) {

    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;
    var user_id = req.body.user_id ? mongoose.Types.ObjectId(req.body.user_id) : '';

    var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
    var lastname = (typeof req.body.lastname != 'undefined') ? req.body.lastname : '';
    var state = (typeof req.body.state != 'undefined') ? req.body.state : '';
    var city = (typeof req.body.city != 'undefined') ? req.body.city : '';
    var zip_code = (typeof req.body.zip_code != 'undefined') ? req.body.zip_code : '';

    var totalCount = 0;

    if (user_id) {

        var conditions = { "$and": [] };
        conditions["$and"].push({ is_active: true, is_deleted: false });

        if (firstname)
            conditions["$and"].push({ "firstname": { $regex: new RegExp(firstname, "i") } });
        if (lastname)
            conditions["$and"].push({ "lastname": { $regex: new RegExp(lastname, "i") } });
        if (state)
            conditions["$and"].push({ "state": { $regex: new RegExp(state, "i") } });
        if (city)
            conditions["$and"].push({ "city": { $regex: new RegExp(city, "i") } });
        if (zip_code)
            conditions["$and"].push({ "zipCode": { $regex: new RegExp(zip_code, "i") } });

        User.aggregate([
            { $match: conditions }, // Match me
            { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
            { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.TENANT), "groups.status": true, "groups.is_master_role": true, "groups.deleted": false } },
            {
                $group:
                {
                    _id: null,
                    "count": { $sum: 1 }
                }
            }
        ])
            .allowDiskUse(true)
            .exec(function (err, results) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    if (results.length > 0) {
                        totalCount = results[0].count;
                        waterfall([
                            function (callback) {
                                User.aggregate(
                                    { $match: conditions }, // Match me
                                    { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                                    { $lookup: { from: 'reviews', localField: '_id', foreignField: 'review_to', as: 'reviews' } },
                                    {
                                        $project: {
                                            "_id": 1,
                                            "firstname": 1, "lastname": 1, "email": 1, "address": 1, "totalPropertyCount": 1, "about_user": 1,
                                            "image": 1, "images": 1, "agency_id": 1, "city": 1, "createdDate": 1,
                                            groups: { "_id": 1, "role_id": 1, "status": 1, "deleted": 1, "is_master_role": 1 },
                                            reviews: { "_id": 1, "review_to": 1, "review_by": 1, "avg_total": 1 }
                                        }
                                    },
                                    { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.TENANT), "groups.is_master_role": true, "groups.status": true, "groups.deleted": false } },
                                    { $sort: { "createdDate": -1 } },
                                    // { $skip: page_number * number_of_pages },
                                    // { "$limit": number_of_pages }
                                ).exec(function (err, userList) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        callback(null, userList, totalCount);
                                    }
                                });
                            },
                            function (arg1, arg2, callback) {
                                var favArray = [];
                                if (arg1.length > 0) {
                                    async.each(arg1, function (item, asyncCall) {
                                        favourites.findOne({
                                            "is_deleted": false,
                                            "fav_to_user": mongoose.Types.ObjectId(item._id),
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
                                            callback(null, favArray, arg2);
                                        }
                                    });
                                } else {
                                    callback(null, arg1, arg2);
                                }
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
                        ], function (err, result, total_count) {
                            if (err) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
                            } else {
                                result = _.sortBy(result, function (o) { return o.createdDate; }).reverse();

                                res.json({ code: Constant.SUCCESS_CODE, data: result, totalCount: total_count });
                            }
                        });
                    } else {
                        res.json({ code: Constant.SUCCESS_CODE, data: [], total_count: totalCount });
                    }
                }
            });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: "User Id required to get the faviourate list" });
    }
}


/**
 * [tenantsList - get all fav tenants list]
 * @param  {object} req
 * @param  {object} res
 * Created By Rahul Lahariya
 */
function getFavTenants(req, res) {

    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;
    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';

    var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
    var lastname = (typeof req.body.lastname != 'undefined') ? req.body.lastname : '';
    var state = (typeof req.body.state != 'undefined') ? req.body.state : '';
    var city = (typeof req.body.city != 'undefined') ? req.body.city : '';
    var zip_code = (typeof req.body.zip_code != 'undefined') ? req.body.zip_code : '';

    var totalCount = 0;


    if (user_id) {

        var getAllfavUsers = function (userId, callback) {

            favourites.find({ "is_deleted": false, "fav_type": 1, "fav_status": 1, fav_by: mongoose.Types.ObjectId(user_id) }, { fav_to_user: 1 })
                .sort({ createdAt: -1 }).exec(function (err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        if (!data) {
                            callback(null, []);
                        } else {
                            var users_id_arr = [];
                            for (var i = 0; i < data.length; i++) {
                                var users_id = mongoose.Types.ObjectId(data[i].fav_to_user);
                                users_id_arr.push(users_id);
                            }
                            callback(null, users_id_arr);
                        }
                    }
                });
        };

        getAllfavUsers(user_id, function (error, usersArr) {
            if (error) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else if (!usersArr) {
                res.json({ code: Constant.SUCCESS_CODE, data: [] });
            } else {

                var conditions = { "$and": [] };
                conditions["$and"].push({ _id: { $in: usersArr }, is_active: true, is_deleted: false });

                if (firstname)
                    conditions["$and"].push({ "firstname": { $regex: new RegExp(firstname, "i") } });
                if (lastname)
                    conditions["$and"].push({ "lastname": { $regex: new RegExp(lastname, "i") } });
                if (state)
                    conditions["$and"].push({ "state": { $regex: new RegExp(state, "i") } });
                if (city)
                    conditions["$and"].push({ "city": { $regex: new RegExp(city, "i") } });
                if (zip_code)
                    conditions["$and"].push({ "zipCode": { $regex: new RegExp(zip_code, "i") } });

                User.aggregate([
                    { $match: conditions }, // Match me
                    { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                    { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.TENANT), "groups.status": true, "groups.is_master_role": true, "groups.deleted": false } },
                    {
                        $group:
                        {
                            _id: null,
                            "count": { $sum: 1 }
                        }
                    }
                ])
                    .allowDiskUse(true)
                    .exec(function (err, results) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                        } else {
                            if (results.length > 0) {
                                totalCount = results[0].count;
                                waterfall([
                                    function (callback) {
                                        User.aggregate(
                                            { $match: conditions }, // Match me
                                            { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                                            { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.TENANT), "groups.status": true, "groups.is_master_role": true, "groups.deleted": false } },
                                            { $lookup: { from: 'reviews', localField: '_id', foreignField: 'review_to', as: 'reviews' } },
                                            {
                                                $project: {
                                                    _id: 1,
                                                    firstname: 1, lastname: 1, email: 1, address: 1, totalPropertyCount: 1, about_user: 1,
                                                    image: 1, images: 1, agency_id: 1, city: 1,
                                                    groups: { _id: 1, role_id: 1, status: 1, deleted: 1, is_master_role: 1 },
                                                    reviews: { _id: 1, review_to: 1, review_by: 1, avg_total: 1 }
                                                }
                                            },
                                            { $sort: { "createdAt": -1 } },
                                            { $skip: page_number * number_of_pages },
                                            { "$limit": number_of_pages }
                                        ).exec(function (err, userList) {
                                            if (err) {
                                                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                            } else {
                                                res.json({ code: Constant.SUCCESS_CODE, data: userList, total_count: totalCount });
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
                                ], function (err, result, total_count) {
                                    if (err) {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
                                    } else {
                                        res.json({ code: Constant.SUCCESS_CODE, data: result, totalCount: total_count });
                                    }
                                });
                            } else {
                                res.json({ code: Constant.SUCCESS_CODE, data: [], total_count: totalCount });
                            }
                        }
                    });
            }
        });
    }
}



/**
 * Function is use to add new tenant
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 1-Dec-2017
 */
function addNewTenant(req, res) {
    var password;
    if ((req.body.email) && (req.body.firstname) && (req.body.lastname)) {
        if (validator.isEmail(req.body.email)) {
            User.findOne({ email: (req.body.email).toLowerCase(), is_deleted: false }, { email: 1 }, function (err, data) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                }
                else {
                    if (data) {
                        var obj3 = {}, obj2 = {};
                        var to_users = [];

                        obj3.invited_to_role_id = mongoose.Types.ObjectId(Constant.TENANT);
                        obj3.invited_by = mongoose.Types.ObjectId(req.body.invited_by);
                        obj3.invited_to = mongoose.Types.ObjectId(data._id);

                        if (req.body.passwordStatus == false) {
                            obj3.invitation_status = 2;
                        }
                        var invite = new InvitationInfo(obj3);
                        var conditions = { "$and": [] };
                        conditions["$and"].push({ invited_to_role_id: mongoose.Types.ObjectId(obj3.invited_to_role_id), invited_to: mongoose.Types.ObjectId(obj3.invited_to), invited_by: mongoose.Types.ObjectId(obj3.invited_by), deleted: false });
                        InvitationInfo.findOne(conditions, { _id: 1 })
                            .populate("property_id", "_id address")
                            .exec(function (err, invitationData) {
                                // console.log("out", invitationData);
                                if (invitationData) {
                                    var Msg = "You have already sent invitation to " + req.body.firstname + " " + req.body.lastname + " for this property ";
                                    res.json({ code: Constant.ALLREADY_EXIST, message: Msg });
                                }
                                else {
                                    var updateUserRecord = {
                                        tenant_request_status: 0
                                    }
                                    User.update({ _id: mongoose.Types.ObjectId(data._id) }, { $set: updateUserRecord }, function (err) {
                                        if (err) {
                                            // console.log('err', err);
                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                        }
                                        else {
                                            // console.log("successsss");
                                            var agentName = (typeof req.body.agentName != 'undefined') ? req.body.agentName : '';
                                            obj2.subject = "Invitation to tenant " + req.body.firstname + " " + req.body.lastname + " sent by " + agentName + " on " + moment().format("MMMM Do YYYY");
                                            obj2.message = agentName + " " + " request sent";
                                            obj2.from_user = mongoose.Types.ObjectId(req.body.invited_by);
                                            to_users.push({ "users_id": mongoose.Types.ObjectId(data._id) });
                                            obj2.to_users = to_users;
                                            obj2.type = 1;

                                            var notification = new NotificationInfo(obj2);
                                            notification.save(function (err, group2) {
                                                if (err) {
                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                }
                                                else {
                                                    invite.save(function (err, group3) {
                                                        if (err) {
                                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                        } else {
                                                            var mailOptions = {
                                                                from: Config.EMAIL_FROM, // sender address
                                                                to: data.email, // list of receivers
                                                                subject: 'Invitation to join Ownly as tenant', // Subject line
                                                                text: 'Invitation to join Ownly as tenant', // plaintext body
                                                                html: '<!DOCTYPE html>' +
                                                                    '<html lang="en">' +
                                                                    '<head>' +
                                                                    '<meta charset="utf-8">' +
                                                                    '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
                                                                    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
                                                                    '<meta name="description" content="">' +
                                                                    '<meta name="author" content="">' +
                                                                    '<link rel="icon" href="../../favicon.ico">' +
                                                                    '<title>Ownly</title>' +
                                                                    '</head>' +
                                                                    '<body>' +
                                                                    '<table style="width: 100%;font-family: SF Text;"">' +
                                                                    '<tr>' +
                                                                    '<td></td>' +
                                                                    '<td bgcolor="#FFFFFF ">' +
                                                                    '<div style="padding: 15px; max-width: 600px;margin: 0 auto;display: block; border-radius: 0px;padding: 0px;box-shadow: 0 5px 10px rgba(0,0,0,0.3);">' +
                                                                    '<table style="width: 100%;background: #142540 ;">' +
                                                                    '<tr>' +
                                                                    '<td></td>' +
                                                                    '<td>' +
                                                                    '<div>' +
                                                                    '<table width="100%">' +
                                                                    '<tr>' +
                                                                    '<td rowspan="2" style="text-align:center;padding:10px;">' +
                                                                    '<img src="' + Constant.STAGGING_URL + 'assets/images/logo-public-home.png"/>' +
                                                                    '</td>' +
                                                                    '</tr>' +
                                                                    '</table>' +
                                                                    '</div>' +
                                                                    '</td>' +
                                                                    '<td></td>' +
                                                                    '</tr>' +
                                                                    '</table>' +
                                                                    '<table style="padding:10px;font-size:14px; width:100%;">' +
                                                                    '<tr>' +
                                                                    '<td style="padding:10px;font-size:14px; width:100%;">' +
                                                                    '<p><strong> Hi' + ' ' + changeCase.sentenceCase(req.body.firstname) + " " + changeCase.sentenceCase(req.body.lastname) + ',' + '</strong></p>' +
                                                                    '<p><br /><span class="text-capitalize">' + agentName + '</span>' + ' sent you the invitation to join as a tenant ' +
                                                                    '<p>Your username: ' + '<strong>' + req.body.email + '</strong>' + '</p>' +
                                                                    '<p> Go to Accept or Decline Request by clicking on below link:-</p>' +
                                                                    '<p><a target="_blank" href="' + Constant.STAGGING_URL + '#!/tenant_invitation_request/' + data._id + '">' + 'click here ' + '</a><br /></p>' +
                                                                    '<p></p>' +
                                                                    '<p><br />Thanks for choosing Ownly,</p>' +
                                                                    '<p>Ownly Team.</p>' +
                                                                    '</td>' +
                                                                    '</tr>' +
                                                                    '</table>' +
                                                                    '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
                                                                    '<tr>' +
                                                                    '<td>' +
                                                                    '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© ' +
                                                                    Config.CURRENT_YEAR +
                                                                    ' <a href="#" style="text-decoration:none;color:#fff;">| Ownly</a>' +
                                                                    '</div>' +
                                                                    '</td>' +
                                                                    '</tr>' +
                                                                    '</table>' +
                                                                    '</div>' +
                                                                    '</td>' +
                                                                    '</tr>' +
                                                                    '</table>' +
                                                                    '</body>' +
                                                                    '</html>'

                                                            }
                                                            transporter.sendMail({
                                                                from: mailOptions.from,
                                                                to: req.body.email,
                                                                subject: mailOptions.subject,
                                                                html: mailOptions.html,
                                                            }, function (err, response) {
                                                                if (err) {
                                                                    res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: data });
                                                                } else {
                                                                    res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: data });
                                                                }
                                                            });

                                                        }
                                                    });

                                                }
                                            });


                                        }
                                    });
                                }
                            });
                    }
                    else {
                        //new user
                        if (typeof req.body.agency_id != 'undefined') {
                            var userData = {
                                firstname: req.body.firstname,
                                lastname: req.body.lastname,
                                email: (req.body.email).toLowerCase(),
                                name: req.body.firstname + " " + req.body.lastname,
                                mobile_no: (req.body.mobile_no).toString(),
                                is_active: true,
                                deleted: false,
                                agency_id: mongoose.Types.ObjectId(req.body.agency_id),
                                is_invited: true,
                                accept_invitation: false,
                                country: 'Austrailia'
                            };
                        } else {
                            var userData = {
                                firstname: req.body.firstname,
                                lastname: req.body.lastname,
                                email: (req.body.email).toLowerCase(),
                                name: req.body.firstname + " " + req.body.lastname,
                                mobile_no: (req.body.mobile_no).toString(),
                                is_active: true,
                                deleted: false,
                                is_invited: true,
                                accept_invitation: false,
                                country: 'Austrailia'
                            };

                        }
                        if (req.body.passwordStatus == false) {
                            password = randomString({ length: 8, numeric: true, letters: true });
                            password = password + "@s1";
                            var hash = bcrypt.hashSync(password, salt);
                            userData.password = hash;
                            userData.accept_invitation = true;
                        }

                        var UsersRecord = new User(userData);
                        UsersRecord.save(function (err, userInfo) {
                            if (err) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                            }
                            else {
                                if (userInfo) {
                                    userInfo = { userId: userInfo._id, firstname: userInfo.firstname, lastname: userInfo.lastname, email: userInfo.email, mobile_no: userInfo.mobile_no }
                                    var agentName = (typeof req.body.agentName != 'undefined') ? req.body.agentName : '';
                                    var obj = {}, obj2 = {}, obj3 = {}, obj4 = {};
                                    obj4.user_id = mongoose.Types.ObjectId(userInfo.userId);
                                    obj.user_id = mongoose.Types.ObjectId(userInfo.userId);
                                    obj.role_id = mongoose.Types.ObjectId(Constant.TENANT);
                                    obj.is_master_role = true;
                                    var to_users = [];
                                    obj3.invited_to_role_id = mongoose.Types.ObjectId(Constant.TENANT);
                                    obj3.invited_by = mongoose.Types.ObjectId(req.body.invited_by);
                                    obj3.invited_to = mongoose.Types.ObjectId(userInfo.userId);

                                    if (req.body.passwordStatus == false) {
                                        obj3.invitation_status = 2;
                                    }
                                    var groupUser = new Groups(obj);
                                    var invite = new InvitationInfo(obj3);
                                    var notificationState = new NotificationStatus(obj4);

                                    obj2.subject = "An invitation  sent to tenant " + req.body.firstname + " " + req.body.lastname + " from " + agentName + " on " + moment().format("MMMM Do YYYY");
                                    obj2.message = agentName + " " + " request sent";
                                    obj2.from_user = mongoose.Types.ObjectId(req.body.invited_by);
                                    to_users.push({ "users_id": mongoose.Types.ObjectId(userInfo.userId) });
                                    obj2.to_users = to_users;
                                    obj2.type = 1;

                                    var notification = new NotificationInfo(obj2);
                                    groupUser.save(function (err, group) {
                                        if (err) {
                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                        }
                                        else {
                                            notification.save(function (err, group2) {
                                                if (err) {
                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                }
                                                else {
                                                    invite.save(function (err, group3) {
                                                        if (err) {
                                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                        }
                                                        else {
                                                            notificationState.save(function (err, group3) {
                                                                if (err) {
                                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                                }
                                                                else {
                                                                    if (req.body.passwordStatus == false) {
                                                                        var mailOptions = {
                                                                            from: Config.EMAIL_FROM, // sender address
                                                                            to: userInfo.email, // list of receivers
                                                                            subject: 'Invitation to join Ownly as tenant', // Subject line
                                                                            text: 'Invitation to join Ownly as tenant', // plaintext body
                                                                            html: '<!DOCTYPE html>' +
                                                                                '<html lang="en">' +
                                                                                '<head>' +
                                                                                '<meta charset="utf-8">' +
                                                                                '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
                                                                                '<meta name="viewport" content="width=device-width, initial-scale=1">' +
                                                                                '<meta name="description" content="">' +
                                                                                '<meta name="author" content="">' +
                                                                                '<link rel="icon" href="../../favicon.ico">' +
                                                                                '<title>Ownly</title>' +
                                                                                '</head>' +
                                                                                '<body>' +
                                                                                '<table style="width: 100%;font-family: SF Text;"">' +
                                                                                '<tr>' +
                                                                                '<td></td>' +
                                                                                '<td bgcolor="#FFFFFF ">' +
                                                                                '<div style="padding: 15px; max-width: 600px;margin: 0 auto;display: block; border-radius: 0px;padding: 0px;box-shadow: 0 5px 10px rgba(0,0,0,0.3);">' +
                                                                                '<table style="width: 100%;background: #142540 ;">' +
                                                                                '<tr>' +
                                                                                '<td></td>' +
                                                                                '<td>' +
                                                                                '<div>' +
                                                                                '<table width="100%">' +
                                                                                '<tr>' +
                                                                                '<td rowspan="2" style="text-align:center;padding:10px;">' +
                                                                                '<img src="' + Constant.STAGGING_URL + 'assets/images/logo-public-home.png"/>' +
                                                                                '</td>' +
                                                                                '</tr>' +
                                                                                '</table>' +
                                                                                '</div>' +
                                                                                '</td>' +
                                                                                '<td></td>' +
                                                                                '</tr>' +
                                                                                '</table>' +
                                                                                '<table style="padding:10px;font-size:14px; width:100%;">' +
                                                                                '<tr>' +
                                                                                '<td style="padding:10px;font-size:14px; width:100%;">' +
                                                                                '<p><strong> Hi' + ' ' + changeCase.sentenceCase(req.body.firstname) + " " + changeCase.sentenceCase(req.body.lastname) + ',' + '</strong></p>' +
                                                                                '<p><br />Thank you for choosing Ownly.' +
                                                                                '<p>Your username: ' + '<strong>' + req.body.email + '</strong>' + '</p>' +
                                                                                '<p>password: ' + '<strong>' + password + '</strong>' + '<p>' +
                                                                                '<p> Go to login screen by clicking on below link:-</p>' +
                                                                                '<p><a target="_blank" href="' + Constant.STAGGING_URL + '#!/login' + '">' + 'click here ' + '</a><br /></p>' +
                                                                                '<p></p>' +
                                                                                '<p><br />Thanks for choosing Ownly,</p>' +
                                                                                '<p>Ownly Team.</p>' +
                                                                                '</td>' +
                                                                                '</tr>' +
                                                                                '</table>' +
                                                                                '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
                                                                                '<tr>' +
                                                                                '<td>' +
                                                                                '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© ' +
                                                                                Config.CURRENT_YEAR +
                                                                                ' <a href="#" style="text-decoration:none;color:#fff;">| Ownly</a>' +
                                                                                '</div>' +
                                                                                '</td>' +
                                                                                '</tr>' +
                                                                                '</table>' +
                                                                                '</div>' +
                                                                                '</td>' +
                                                                                '</tr>' +
                                                                                '</table>' +
                                                                                '</body>' +
                                                                                '</html>'

                                                                        }
                                                                    }
                                                                    else {

                                                                        var mailOptions = {
                                                                            from: Config.EMAIL_FROM, // sender address
                                                                            to: userInfo.email, // list of receivers
                                                                            subject: 'Invitation to join Ownly as tenant', // Subject line
                                                                            text: 'Invitation to join Ownly as tenant', // plaintext body
                                                                            html: '<!DOCTYPE html>' +
                                                                                '<html lang="en">' +
                                                                                '<head>' +
                                                                                '<meta charset="utf-8">' +
                                                                                '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
                                                                                '<meta name="viewport" content="width=device-width, initial-scale=1">' +
                                                                                '<meta name="description" content="">' +
                                                                                '<meta name="author" content="">' +
                                                                                '<link rel="icon" href="../../favicon.ico">' +
                                                                                '<title>Ownly</title>' +
                                                                                '</head>' +
                                                                                '<body>' +
                                                                                '<table style="width: 100%;font-family: SF Text;"">' +
                                                                                '<tr>' +
                                                                                '<td></td>' +
                                                                                '<td bgcolor="#FFFFFF ">' +
                                                                                '<div style="padding: 15px; max-width: 600px;margin: 0 auto;display: block; border-radius: 0px;padding: 0px;box-shadow: 0 5px 10px rgba(0,0,0,0.3);">' +
                                                                                '<table style="width: 100%;background: #142540 ;">' +
                                                                                '<tr>' +
                                                                                '<td></td>' +
                                                                                '<td>' +
                                                                                '<div>' +
                                                                                '<table width="100%">' +
                                                                                '<tr>' +
                                                                                '<td rowspan="2" style="text-align:center;padding:10px;">' +
                                                                                '<img src="' + Constant.STAGGING_URL + 'assets/images/logo-public-home.png"/>' +
                                                                                '</td>' +
                                                                                '</tr>' +
                                                                                '</table>' +
                                                                                '</div>' +
                                                                                '</td>' +
                                                                                '<td></td>' +
                                                                                '</tr>' +
                                                                                '</table>' +
                                                                                '<table style="padding:10px;font-size:14px; width:100%;">' +
                                                                                '<tr>' +
                                                                                '<td style="padding:10px;font-size:14px; width:100%;">' +
                                                                                '<p><strong> Hi' + ' ' + changeCase.sentenceCase(req.body.firstname) + " " + changeCase.sentenceCase(req.body.lastname) + ',' + '</strong></p>' +
                                                                                '<p><br /> Thank you choosing Ownly.' +
                                                                                'Click below & set your password :-</p>' +
                                                                                '<p><a target="_blank" href="' + Constant.STAGGING_URL + '#!/newUser/' + userInfo.userId + '">' + 'click here ' + '</a><br /></p>' +
                                                                                '<p></p>' +
                                                                                '<p><br />Thanks for choosing Ownly,</p>' +
                                                                                '<p>Ownly Team.</p>' +
                                                                                '</td>' +
                                                                                '</tr>' +
                                                                                '</table>' +
                                                                                '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
                                                                                '<tr>' +
                                                                                '<td>' +
                                                                                '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© ' +
                                                                                Config.CURRENT_YEAR +
                                                                                ' <a href="#" style="text-decoration:none;color:#fff;">| Ownly</a>' +
                                                                                '</div>' +
                                                                                '</td>' +
                                                                                '</tr>' +
                                                                                '</table>' +
                                                                                '</div>' +
                                                                                '</td>' +
                                                                                '</tr>' +
                                                                                '</table>' +
                                                                                '</body>' +
                                                                                '</html>'
                                                                        }
                                                                    }  // send mail with defined transport object

                                                                    transporter.sendMail({
                                                                        from: mailOptions.from,
                                                                        to: req.body.email,
                                                                        subject: mailOptions.subject,
                                                                        html: mailOptions.html,
                                                                    }, function (err, response) {
                                                                        // console.log(err && err.stack);
                                                                        // console.dir(reply);
                                                                        if (err) {
                                                                            res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                                                        } else {
                                                                            res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                                                        }
                                                                    });

                                                                }
                                                            })
                                                        }
                                                    });

                                                }
                                            });
                                        }
                                    });


                                }
                                else {
                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                }
                            }
                        });
                    }

                }
            });
        }
        else {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL });
        }
    }
    else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQUIRED_REGISTER_FIELDS });
    }
}

/*
function addNewTenant(req, res) {
    //console.log("req.body",req.body);
    var password;
    // var user_image = req.body.user_image ? req.body.user_image : "no_image.png";
    if ((req.body.email) && (req.body.firstname) && (req.body.lastname)) {
        if (validator.isEmail(req.body.email)) {
            User.findOne({ email: (req.body.email).toLowerCase(), is_deleted: false }, { email: 1 }, function (err, data) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    if (data) {
                        var obj3 = {}, obj2 = {};
                        // obj4.user_id = mongoose.Types.ObjectId(userInfo.userId);

                        var to_users = [];
                        obj3.invited_to_role_id = mongoose.Types.ObjectId(Constant.TENANT);
                        obj3.invited_by = mongoose.Types.ObjectId(req.body.invited_by);
                        obj3.invited_to = mongoose.Types.ObjectId(data._id);
                        if ((typeof req.body.property_id != 'undefined') && req.body.agreement_id) {
                            var agreement_id = mongoose.Types.ObjectId(req.body.agreement_id);
                            obj3.agreement_id = agreement_id;
                        }
                        if (req.body.passwordStatus == false) {
                            obj3.invitation_status = 2;
                        }
                        obj3.property_id = (typeof req.body.property_id != 'undefined') ? mongoose.Types.ObjectId(req.body.property_id) : '';

                        var invite = new InvitationInfo(obj3);
                        // var notificationState = new NotificationStatus(obj4);
                        var conditions = { "$and": [] };
                        conditions["$and"].push({ invited_to_role_id: mongoose.Types.ObjectId(obj3.invited_to_role_id), invited_to: mongoose.Types.ObjectId(obj3.invited_to), invited_by: mongoose.Types.ObjectId(obj3.invited_by), property_id: mongoose.Types.ObjectId(obj3.property_id), deleted: false });
                        if (obj3.property_id) {
                            InvitationInfo.findOne(conditions, { _id: 1, property_id: 1 })
                                .populate("property_id", "_id address")
                                .exec(function (err, invitationData) {
                                    console.log("out", invitationData);
                                    if (invitationData) {
                                        var Msg = "You have already sent invitation to " + req.body.firstname + " " + req.body.lastname + " for this property ";
                                        res.json({ code: Constant.ALLREADY_EXIST, message: Msg });
                                    }
                                    else {
                                        propertyModel.findOne({ _id: mongoose.Types.ObjectId(obj3.property_id), is_deleted: false }, { _id: 1, owned_by: 1, address: 1 })
                                            // .populate("owned_by","_id firstname lastname")
                                            .exec(function (err, propData) {
                                                if (propData) {

                                                    var updateUserRecord = {
                                                        tenant_request_status: 0
                                                    }
                                                    User.update({ _id: mongoose.Types.ObjectId(data._id) }, { $set: updateUserRecord }, function (err) {
                                                        if (err) {
                                                            console.log('err', err);
                                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                        } else {
                                                            console.log("successsss");
                                                            var agentName = (typeof req.body.agentName != 'undefined') ? req.body.agentName : '';
                                                            obj2.subject = "Invitation to tenant " + req.body.firstname + " " + req.body.lastname + " sent by " + agentName + " for the property " + propData.address + " on " + moment().format("MMMM Do YYYY");;
                                                            obj2.message = agentName + " " + " request sent";
                                                            obj2.from_user = mongoose.Types.ObjectId(req.body.invited_by);
                                                            to_users.push({ "users_id": mongoose.Types.ObjectId(data._id) });
                                                            to_users.push({ "users_id": mongoose.Types.ObjectId(propData.owned_by) });
                                                            obj2.to_users = to_users;
                                                            obj2.type = 1;

                                                            var notification = new NotificationInfo(obj2);
                                                            notification.save(function (err, group2) {
                                                                if (err) {
                                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                                } else {
                                                                    invite.save(function (err, group3) {
                                                                        if (err) {
                                                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                                        } else {
                                                                            var mailOptions = {
                                                                                from: Config.EMAIL_FROM, // sender address
                                                                                to: data.email, // list of receivers
                                                                                subject: 'Invitation to join Ownly as tenant', // Subject line
                                                                                text: 'Invitation to join Ownly as tenant', // plaintext body
                                                                                html: '<!DOCTYPE html>' +
                                                                                    '<html lang="en">' +
                                                                                    '<head>' +
                                                                                    '<meta charset="utf-8">' +
                                                                                    '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
                                                                                    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
                                                                                    '<meta name="description" content="">' +
                                                                                    '<meta name="author" content="">' +
                                                                                    '<link rel="icon" href="../../favicon.ico">' +
                                                                                    '<title>Ownly</title>' +
                                                                                    '</head>' +
                                                                                    '<body>' +
                                                                                    '<table style="width: 100%;font-family: SF Text;"">' +
                                                                                    '<tr>' +
                                                                                    '<td></td>' +
                                                                                    '<td bgcolor="#FFFFFF ">' +
                                                                                    '<div style="padding: 15px; max-width: 600px;margin: 0 auto;display: block; border-radius: 0px;padding: 0px;box-shadow: 0 5px 10px rgba(0,0,0,0.3);">' +
                                                                                    '<table style="width: 100%;background: #142540 ;">' +
                                                                                    '<tr>' +
                                                                                    '<td></td>' +
                                                                                    '<td>' +
                                                                                    '<div>' +
                                                                                    '<table width="100%">' +
                                                                                    '<tr>' +
                                                                                    '<td rowspan="2" style="text-align:center;padding:10px;">' +
                                                                                    '<img src="http://13.210.134.130:5094/assets/images/logo-public-home.png"/>' +
                                                                                    '</td>' +
                                                                                    '</tr>' +
                                                                                    '</table>' +
                                                                                    '</div>' +
                                                                                    '</td>' +
                                                                                    '<td></td>' +
                                                                                    '</tr>' +
                                                                                    '</table>' +
                                                                                    '<table style="padding:10px;font-size:14px; width:100%;">' +
                                                                                    '<tr>' +
                                                                                    '<td style="padding:10px;font-size:14px; width:100%;">' +
                                                                                    '<p><strong> Hi' + ' ' + changeCase.sentenceCase(req.body.firstname) + " " + changeCase.sentenceCase(req.body.lastname) + ',' + '</strong></p>' +
                                                                                    '<p><br /><span class="text-capitalize">' + agentName + '</span>' + ' sent you the invitation to join as a tenant for thr property ' + propData.address +
                                                                                    '<p>Your username: ' + '<strong>' + req.body.email + '</strong>' + '</p>' +
                                                                                    '<p> Go to Accept or Decline Request by clicking on below link:-</p>' +
                                                                                    '<p><a target="_blank" href="' + Constant.STAGGING_URL + 'tenant_invitation_request/' + data._id + '">' + 'click here ' + '</a><br /></p>' +
                                                                                    '<p></p>' +
                                                                                    '<p><br />Thanks for choosing Ownly,</p>' +
                                                                                    '<p>Ownly Team.</p>' +
                                                                                    '</td>' +
                                                                                    '</tr>' +
                                                                                    '</table>' +
                                                                                    '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
                                                                                    '<tr>' +
                                                                                    '<td>' +
                                                                                    '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© 2020 <a href="#" style="text-decoration:none;color:#fff;"> Ownly. All rights reserved.</a>' +
                                                                                    '</div>' +
                                                                                    '</td>' +
                                                                                    '</tr>' +
                                                                                    '</table>' +
                                                                                    '</div>' +
                                                                                    '</td>' +
                                                                                    '</tr>' +
                                                                                    '</table>' +
                                                                                    '</body>' +
                                                                                    '</html>'

                                                                            }
                                                                            // transporter.sendMail(mailOptions, function (error, response) {
                                                                            //     if (error) {
                                                                            //         res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: data });
                                                                            //     } else {
                                                                            //         res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: data });
                                                                            //     }
                                                                            // });
                                                                            sendmail({
                                                                                from: mailOptions.from,
                                                                                to: req.body.email,
                                                                                subject: mailOptions.subject,
                                                                                html: mailOptions.html,
                                                                            }, function (err, response) {
                                                                                // console.log(err && err.stack);
                                                                                // console.dir(reply);
                                                                                if (err) {
                                                                                    res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: data });
                                                                                } else {
                                                                                    res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: data });
                                                                                }
                                                                            });

                                                                        }
                                                                    });

                                                                }
                                                            });


                                                        }
                                                    });

                                                } else {
                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                }
                                            });
                                    }
                                });
                        }

                        //res.json({ code: Constant.ALLREADY_EXIST, message: Constant.EMAIL_ALREADY_EXIST });
                    } else {
                        if (typeof req.body.agency_id != 'undefined') {
                            var userData = {
                                firstname: req.body.firstname,
                                lastname: req.body.lastname,
                                email: (req.body.email).toLowerCase(),
                                name: req.body.firstname + " " + req.body.lastname,
                                mobile_no: (req.body.mobile_no).toString(),
                                is_active: true,
                                deleted: false,
                                agency_id: mongoose.Types.ObjectId(req.body.agency_id),
                                is_invited: true,
                                accept_invitation: false,
                                country: 'Austrailia'
                            };
                        } else {
                            var userData = {
                                firstname: req.body.firstname,
                                lastname: req.body.lastname,
                                email: (req.body.email).toLowerCase(),
                                name: req.body.firstname + " " + req.body.lastname,
                                mobile_no: (req.body.mobile_no).toString(),
                                is_active: true,
                                deleted: false,
                                is_invited: true,
                                accept_invitation: false,
                                country: 'Austrailia'
                            };

                        }
                        if (req.body.passwordStatus == false) {
                            password = randomString({ length: 8, numeric: true, letters: true });
                            password = password + "@s1";
                            var hash = bcrypt.hashSync(password, salt);
                            userData.password = hash;
                            userData.accept_invitation = true;
                        }

                        var UsersRecord = new User(userData);
                        UsersRecord.save(function (err, userInfo) {
                            if (err) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                            } else {
                                if (userInfo) {
                                    userInfo = { userId: userInfo._id, firstname: userInfo.firstname, lastname: userInfo.lastname, email: userInfo.email, mobile_no: userInfo.mobile_no }
                                    var agentName = (typeof req.body.agentName != 'undefined') ? req.body.agentName : '';
                                    var obj = {}, obj2 = {}, obj3 = {}, obj4 = {};
                                    obj4.user_id = mongoose.Types.ObjectId(userInfo.userId);
                                    obj.user_id = mongoose.Types.ObjectId(userInfo.userId);
                                    obj.role_id = mongoose.Types.ObjectId(Constant.TENANT);
                                    obj.is_master_role = true;
                                    var to_users = [];
                                    obj3.invited_to_role_id = mongoose.Types.ObjectId(Constant.TENANT);
                                    obj3.invited_by = mongoose.Types.ObjectId(req.body.invited_by);
                                    obj3.invited_to = mongoose.Types.ObjectId(userInfo.userId);
                                    if ((typeof req.body.property_id != 'undefined') && req.body.agreement_id) {
                                        var agreement_id = mongoose.Types.ObjectId(req.body.agreement_id);
                                        obj3.agreement_id = agreement_id;
                                    }
                                    if (req.body.passwordStatus == false) {
                                        obj3.invitation_status = 2;
                                    }
                                    obj3.property_id = (typeof req.body.property_id != 'undefined') ? mongoose.Types.ObjectId(req.body.property_id) : '';
                                    // obj3.property_id =  req.body.property_id;
                                    var groupUser = new Groups(obj);

                                    var invite = new InvitationInfo(obj3);
                                    var notificationState = new NotificationStatus(obj4);


                                    if (obj3.property_id) {
                                        propertyModel.findOne({ _id: mongoose.Types.ObjectId(obj3.property_id), is_deleted: false }, { _id: 1, owned_by: 1, address: 1 })
                                            // .populate("owned_by","_id firstname lastname")
                                            .exec(function (err, propData) {
                                                if (propData) {
                                                    obj2.subject = "An invitation  sent to tenant " + req.body.firstname + " " + req.body.lastname + " from " + agentName + " for the property " + propData.address + " on " + moment().format("MMMM Do YYYY");;
                                                    obj2.message = agentName + " " + " request sent";
                                                    obj2.from_user = mongoose.Types.ObjectId(req.body.invited_by);
                                                    to_users.push({ "users_id": mongoose.Types.ObjectId(userInfo.userId) });
                                                    to_users.push({ "users_id": mongoose.Types.ObjectId(propData.owned_by) });
                                                    obj2.to_users = to_users;
                                                    obj2.type = 1;

                                                    var notification = new NotificationInfo(obj2);
                                                    groupUser.save(function (err, group) {
                                                        if (err) {
                                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                        } else {
                                                            notification.save(function (err, group2) {
                                                                if (err) {
                                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                                } else {
                                                                    invite.save(function (err, group3) {
                                                                        if (err) {
                                                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                                        } else {
                                                                            notificationState.save(function (err, group3) {
                                                                                if (err) {
                                                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                                                } else {
                                                                                    if (req.body.passwordStatus == false) {
                                                                                        var mailOptions = {
                                                                                            from: Config.EMAIL_FROM, // sender address
                                                                                            to: userInfo.email, // list of receivers
                                                                                            subject: 'Invitation to join Ownly as tenant', // Subject line
                                                                                            text: 'Invitation to join Ownly as tenant', // plaintext body
                                                                                            html: '<!DOCTYPE html>' +
                                                                                                '<html lang="en">' +
                                                                                                '<head>' +
                                                                                                '<meta charset="utf-8">' +
                                                                                                '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
                                                                                                '<meta name="viewport" content="width=device-width, initial-scale=1">' +
                                                                                                '<meta name="description" content="">' +
                                                                                                '<meta name="author" content="">' +
                                                                                                '<link rel="icon" href="../../favicon.ico">' +
                                                                                                '<title>Ownly</title>' +
                                                                                                '</head>' +
                                                                                                '<body>' +
                                                                                                '<table style="width: 100%;font-family: SF Text;"">' +
                                                                                                '<tr>' +
                                                                                                '<td></td>' +
                                                                                                '<td bgcolor="#FFFFFF ">' +
                                                                                                '<div style="padding: 15px; max-width: 600px;margin: 0 auto;display: block; border-radius: 0px;padding: 0px;box-shadow: 0 5px 10px rgba(0,0,0,0.3);">' +
                                                                                                '<table style="width: 100%;background: #142540 ;">' +
                                                                                                '<tr>' +
                                                                                                '<td></td>' +
                                                                                                '<td>' +
                                                                                                '<div>' +
                                                                                                '<table width="100%">' +
                                                                                                '<tr>' +
                                                                                                '<td rowspan="2" style="text-align:center;padding:10px;">' +
                                                                                                '<img src="http://13.210.134.130:5094/assets/images/logo-public-home.png"/>' +
                                                                                                '</td>' +
                                                                                                '</tr>' +
                                                                                                '</table>' +
                                                                                                '</div>' +
                                                                                                '</td>' +
                                                                                                '<td></td>' +
                                                                                                '</tr>' +
                                                                                                '</table>' +
                                                                                                '<table style="padding:10px;font-size:14px; width:100%;">' +
                                                                                                '<tr>' +
                                                                                                '<td style="padding:10px;font-size:14px; width:100%;">' +
                                                                                                '<p><strong> Hi' + ' ' + changeCase.sentenceCase(req.body.firstname) + " " + changeCase.sentenceCase(req.body.lastname) + ',' + '</strong></p>' +
                                                                                                '<p><br />Thank you for choosing Ownly.' +
                                                                                                '<p>Your username: ' + '<strong>' + req.body.email + '</strong>' + '</p>' +
                                                                                                '<p>password: ' + '<strong>' + password + '</strong>' + '<p>' +
                                                                                                '<p> Go to login screen by clicking on below link:-</p>' +
                                                                                                '<p><a target="_blank" href="' + Constant.STAGGING_URL + 'login' + '">' + 'click here ' + '</a><br /></p>' +
                                                                                                '<p></p>' +
                                                                                                '<p><br />Thanks for choosing Ownly,</p>' +
                                                                                                '<p>Ownly Team.</p>' +
                                                                                                '</td>' +
                                                                                                '</tr>' +
                                                                                                '</table>' +
                                                                                                '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
                                                                                                '<tr>' +
                                                                                                '<td>' +
                                                                                                '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© 2020 <a href="#" style="text-decoration:none;color:#fff;"> Ownly. All rights reserved.</a>' +
                                                                                                '</div>' +
                                                                                                '</td>' +
                                                                                                '</tr>' +
                                                                                                '</table>' +
                                                                                                '</div>' +
                                                                                                '</td>' +
                                                                                                '</tr>' +
                                                                                                '</table>' +
                                                                                                '</body>' +
                                                                                                '</html>'

                                                                                        }
                                                                                    }
                                                                                    else {

                                                                                        var mailOptions = {
                                                                                            from: Config.EMAIL_FROM, // sender address
                                                                                            to: userInfo.email, // list of receivers
                                                                                            subject: 'Invitation to join Ownly as tenant', // Subject line
                                                                                            text: 'Invitation to join Ownly as tenant', // plaintext body
                                                                                            html: '<!DOCTYPE html>' +
                                                                                                '<html lang="en">' +
                                                                                                '<head>' +
                                                                                                '<meta charset="utf-8">' +
                                                                                                '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
                                                                                                '<meta name="viewport" content="width=device-width, initial-scale=1">' +
                                                                                                '<meta name="description" content="">' +
                                                                                                '<meta name="author" content="">' +
                                                                                                '<link rel="icon" href="../../favicon.ico">' +
                                                                                                '<title>Ownly</title>' +
                                                                                                '</head>' +
                                                                                                '<body>' +
                                                                                                '<table style="width: 100%;font-family: SF Text;"">' +
                                                                                                '<tr>' +
                                                                                                '<td></td>' +
                                                                                                '<td bgcolor="#FFFFFF ">' +
                                                                                                '<div style="padding: 15px; max-width: 600px;margin: 0 auto;display: block; border-radius: 0px;padding: 0px;box-shadow: 0 5px 10px rgba(0,0,0,0.3);">' +
                                                                                                '<table style="width: 100%;background: #142540 ;">' +
                                                                                                '<tr>' +
                                                                                                '<td></td>' +
                                                                                                '<td>' +
                                                                                                '<div>' +
                                                                                                '<table width="100%">' +
                                                                                                '<tr>' +
                                                                                                '<td rowspan="2" style="text-align:center;padding:10px;">' +
                                                                                                '<img src="http://13.210.134.130:5094/assets/images/logo-public-home.png"/>' +
                                                                                                '</td>' +
                                                                                                '</tr>' +
                                                                                                '</table>' +
                                                                                                '</div>' +
                                                                                                '</td>' +
                                                                                                '<td></td>' +
                                                                                                '</tr>' +
                                                                                                '</table>' +
                                                                                                '<table style="padding:10px;font-size:14px; width:100%;">' +
                                                                                                '<tr>' +
                                                                                                '<td style="padding:10px;font-size:14px; width:100%;">' +
                                                                                                '<p><strong> Hi' + ' ' + changeCase.sentenceCase(req.body.firstname) + " " + changeCase.sentenceCase(req.body.lastname) + ',' + '</strong></p>' +
                                                                                                '<p><br /> Thank you choosing Ownly.' +
                                                                                                'Click below & set your password :-</p>' +
                                                                                                '<p><a target="_blank" href="' + Constant.STAGGING_URL + 'newUser/' + userInfo.userId + '">' + 'click here ' + '</a><br /></p>' +
                                                                                                '<p></p>' +
                                                                                                '<p><br />Thanks for choosing Ownly,</p>' +
                                                                                                '<p>Ownly Team.</p>' +
                                                                                                '</td>' +
                                                                                                '</tr>' +
                                                                                                '</table>' +
                                                                                                '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
                                                                                                '<tr>' +
                                                                                                '<td>' +
                                                                                                '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© 2020 <a href="#" style="text-decoration:none;color:#fff;"> Ownly. All rights reserved.</a>' +
                                                                                                '</div>' +
                                                                                                '</td>' +
                                                                                                '</tr>' +
                                                                                                '</table>' +
                                                                                                '</div>' +
                                                                                                '</td>' +
                                                                                                '</tr>' +
                                                                                                '</table>' +
                                                                                                '</body>' +
                                                                                                '</html>'
                                                                                        }
                                                                                    }  // send mail with defined transport object
                                                                                    //console.log(mailOptions);
                                                                                    // transporter.sendMail(mailOptions, function (error, response) {
                                                                                    //     if (error) {
                                                                                    //         res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                                                                    //     } else {
                                                                                    //         res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                                                                    //     }
                                                                                    // });
                                                                                    sendmail({
                                                                                        from: mailOptions.from,
                                                                                        to: req.body.email,
                                                                                        subject: mailOptions.subject,
                                                                                        html: mailOptions.html,
                                                                                    }, function (err, response) {
                                                                                        // console.log(err && err.stack);
                                                                                        // console.dir(reply);
                                                                                        if (err) {
                                                                                            res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                                                                        } else {
                                                                                            res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                                                                        }
                                                                                    });

                                                                                }
                                                                            })
                                                                        }
                                                                    });

                                                                }
                                                            });
                                                        }
                                                    });
                                                } else {
                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                }
                                            });
                                    }

                                } else {
                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                }
                            }
                        });
                    }

                }
            });
        } else {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL });
        }
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQUIRED_REGISTER_FIELDS });
    }
} */

/**
 * Function to send message to all users
 * @access private and request param is sender and reciever ids
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 1-Dec-2017
 */
function sendMessage(req, res) {
    if (typeof req.body.firstname != 'undefined' && typeof req.body.sender_id != 'undefined' && typeof req.body.receiver_id != 'undefined') {
        var obj = {};
        var to_users = [];
        obj.subject = "Message from " + req.body.firstname + " " + req.body.lastname + " ";
        obj.message = req.body.message;
        obj.from_user = mongoose.Types.ObjectId(req.body.sender_id);
        to_users.push({ "users_id": mongoose.Types.ObjectId(req.body.receiver_id) });
        obj.to_users = to_users;
        obj.type = Constant.NOTIFICATION_TYPE_CONTACT_MESSAGE; //Contact message type
        var notification = new NotificationInfo(obj);
        notification.save(function (err, data) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                // var time = moment().format("MMM Do") + ', ' + moment().format('LT');
                var obj = {
                    from: mongoose.Types.ObjectId(req.body.sender_id),
                    to: mongoose.Types.ObjectId(req.body.receiver_id),
                    msg: req.body.message,
                    time: req.body.time,
                    isRead: false,
                    is_message: true,
                    is_file: false
                }
                var msg = new chatModel(obj);
                msg.save(function (err, chatData) {
                    if (err) {
                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                    } else {
                        res.json({ code: Constant.SUCCESS_CODE, message: Constant.SUCCESS_CONTACT_MESSAGE });
                    }
                });
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }

}

/*
update status for Tenent Request and add tanent role in group table
*/
function update_tanent_request_status(req, res) {
    var updateUserRecord = {
        tenant_request_status: req.body.tenant_request_status
    }
    User.update({ _id: mongoose.Types.ObjectId(req.body.user_id) }, { $set: updateUserRecord }, function (err) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
        } else {
            var groupData = {
                user_id: req.body.user_id,
                role_id: req.body.role_id,
                deleted: false,
                is_master_role: false,
                status: true
            };
            var GroupRecord = new Groups(groupData);
            GroupRecord.save(function (err1, group_info) {
                if (err1) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    if (req.body.tenant_request_status == '1')
                        res.json({ code: Constant.SUCCESS_CODE, message: 'Tanent role added successfully.' });
                    else
                        res.json({ code: Constant.SUCCESS_CODE, message: 'Tanent role declined successfully.' });
                }
            });
        }
    });
}
/*
* Function to check user is valid or not to set Tenant Role
*/
function check_user_valid(req, res) {

    User.findOne({ _id: mongoose.Types.ObjectId(req.body.user_id), is_active: true, is_deleted: false }, { tenant_request_status: 1 }, function (err, user_data) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: USER_NO_LONGER_EXIST });
        } else {
            Groups.findOne({ user_id: mongoose.Types.ObjectId(req.body.user_id), role_id: mongoose.Types.ObjectId(req.body.role_id), deleted: false, status: true }, { user_id: 1 }, function (err, role_exist) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: INTERNAL_ERROR });
                } else {
                    if (role_exist) {
                        res.json({ code: Constant.SUCCESS_CODE, message: 'You are already Tenant.', data: user_data });
                    } else {
                        res.json({ code: Constant.SUCCESS_CODE, message: 'success', data: user_data });
                    }
                }
            });
        }
    });
}

/*
Import Tenents using CSV
*/
function importTenantCSV(req, res) {

    var timestamp = Number(new Date()); // current time as number
    var form = new formidable.IncomingForm();
    var file = req.swagger.params.file.value;

    var outputJSON = {};
    var splitFile = file.originalname.split('.');
    var filename = +timestamp + '_' + 'tenant' + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
    var filePath = "./api/uploads/tenant_csv/" + filename;
    var errorfilename = Date.now() + ".csv";
    var errorMessage = '';
    var count = 1;
    var errorCount = 0;
    var csvArray = [];
    var agreementData = {};
    waterfall([
        function (callback) {
            fs.writeFile(path.resolve(filePath), file.buffer, function (err) {
                if (err) {
                    callback(err, false);
                } else {
                    var csvheaders;
                    csvheaders = {
                        headers: ["first_name", "last_name", "email", "phone_number", "profile_image", "description"],
                        discardUnmappedColumns: true,
                        headers: true,
                        ignoreEmpty: false,
                        trim: true,
                        rtrim: true,
                        ltrim: true
                    };
                    var dataArray = [];
                    var is_success = true;
                    var stream = fs.createReadStream(filePath);
                    // console.log('stream',stream);
                    csv
                        .fromStream(stream, csvheaders)
                        .validate(function (data) {
                            // console.log("data  ", data);
                            if (data.first_name && data.last_name && data.email && validateEmail(data.email) && data.phone_number && data.description) {
                                // console.log("i m here now");
                                if (
                                    data.first_name.length == 0 || data.last_name.length == 0 ||
                                    data.email.length == 0 || data.phone_number.length == 0 ||
                                    data.profile_image.length == 0 || data.description.length == 0) {
                                    errorCount++;
                                    errorMessage = 'Please insert proper datatype values';
                                    return false;
                                } else {
                                    return true;
                                }
                            } else if (errorMessage) {
                                return false;
                            } else {
                                errorCount++;
                                errorMessage = 'Some of the values are missing on row number ' + errorCount;
                                return false;
                            }
                        })
                        .on("data-invalid", function (data) {
                            if (errorMessage) {
                                is_success = false;
                            } else if (data) {
                                errorCount++;
                                errorMessage = 'Data not valid, Please insert proper value';
                                is_success = false;
                            }
                        })
                        .on("data", function (data) {
                            count++;
                            var password;
                            password = randomString({ length: 8, numeric: true, letters: true });
                            password = password + "@s1";

                            var tenant_id = '';
                            User.findOne({ 'email': data.email, 'is_deleted': false }).exec(function (err, email) {
                                if (err) {
                                    is_success = false;
                                } else if (email) {
                                    is_success = false;
                                } else {
                                    var hash = bcrypt.hashSync(password, salt);
                                    var userData = {
                                        password: hash,
                                        firstname: (data.first_name).toLowerCase(),
                                        lastname: (data.last_name).toLowerCase(),
                                        email: (data.email).toLowerCase(),
                                        mobile_no: data.phone_number,
                                        status: true,
                                        is_deleted: false,
                                        is_active: true
                                    }

                                    // console.log("user add data");
                                    // console.log(userData);

                                    var users_ = new User(userData);
                                    users_.save(function (err, userData) {
                                        if (err) {
                                            is_success = false;
                                        } else {

                                            if (data.profile_image && data.profile_image.length > 0) {
                                                var timestamp = Number(new Date()); // current time as number
                                                var dir = './api/uploads/users';
                                                var temp_path = dir + '/' + timestamp + '.jpeg';

                                                download_file(data.profile_image, temp_path, function () {
                                                    // console.log('image upload done');
                                                    userData.image = timestamp + ".jpeg";
                                                    var uploaded_image_name = timestamp + ".jpeg";
                                                    User.findOneAndUpdate({ _id: userData._id }, { $set: { image: uploaded_image_name } }, { new: true, runValidators: true }, function (err, userData) {
                                                        // console.log("Image Name Updated");
                                                    });
                                                });
                                            }

                                            var groupData = {
                                                user_id: mongoose.Types.ObjectId(userData._id),
                                                role_id: mongoose.Types.ObjectId(Constant.TENANT),
                                                about_user: data.description,
                                                is_master_role: true,
                                                status: true,
                                                is_deleted: false
                                            }
                                            var group_ = new Groups(groupData);
                                            group_.save(function (err1, groupData) {
                                                if (err1) {
                                                    // console.log("grop insert err  ", err1);
                                                } else {
                                                    // console.log("group success  ", groupData);
                                                    var mailOptions = {
                                                        from: Config.EMAIL_FROM, // sender address
                                                        to: data.email, // list of receivers
                                                        subject: 'Account created as Ownly Tenant', // Subject line
                                                        text: 'Account created as Ownly Tenant', // plaintext body
                                                        html: '<!DOCTYPE html>' +
                                                            '<html lang="en">' +
                                                            '<head>' +
                                                            '<meta charset="utf-8">' +
                                                            '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
                                                            '<meta name="viewport" content="width=device-width, initial-scale=1">' +
                                                            '<meta name="description" content="">' +
                                                            '<meta name="author" content="">' +
                                                            '<link rel="icon" href="../../favicon.ico">' +
                                                            '<title>Ownly</title>' +
                                                            '</head>' +
                                                            '<body>' +
                                                            '<table style="width: 100%;font-family: SF Text;"">' +
                                                            '<tr>' +
                                                            '<td></td>' +
                                                            '<td bgcolor="#FFFFFF ">' +
                                                            '<div style="padding: 15px; max-width: 600px;margin: 0 auto;display: block; border-radius: 0px;padding: 0px;box-shadow: 0 5px 10px rgba(0,0,0,0.3);">' +
                                                            '<table style="width: 100%;background: #142540 ;">' +
                                                            '<tr>' +
                                                            '<td></td>' +
                                                            '<td>' +
                                                            '<div>' +
                                                            '<table width="100%">' +
                                                            '<tr>' +
                                                            '<td rowspan="2" style="text-align:center;padding:10px;">' +
                                                            '<img src="' + Constant.STAGGING_URL + 'assets/images/logo-public-home.png"/>' +
                                                            '</td>' +
                                                            '</tr>' +
                                                            '</table>' +
                                                            '</div>' +
                                                            '</td>' +
                                                            '<td></td>' +
                                                            '</tr>' +
                                                            '</table>' +
                                                            '<table style="padding:10px;font-size:14px; width:100%;">' +
                                                            '<tr>' +
                                                            '<td style="padding:10px;font-size:14px; width:100%;">' +
                                                            '<p><strong> Hi' + ' ' + changeCase.sentenceCase(data.first_name) + " " + changeCase.sentenceCase(data.last_name) + ',' + '</strong></p>' +
                                                            '<p>You are a Tenant on ownly now.' +
                                                            '<p>Your username: ' + '<strong>' + data.email + '</strong>' + '</p>' +
                                                            '<p>password: ' + '<strong>' + password + '</strong>' + '<p>' +
                                                            '<p> Go to login screen by clicking on below link:-</p>' +
                                                            '<p><a target="_blank" href="' + Constant.STAGGING_URL + '#!/login' + '">' + 'click here to Login' + '</a><br /></p>' +
                                                            '<p></p>' +
                                                            '<p><a target="_blank" href="' + Constant.APP_DOWNLOAD_URL + '' + '">' + 'click here to download Mobile App' + '</a><br /></p>' +
                                                            '<p><br />Thanks and Regards,</p>' +
                                                            '<p>Ownly Team.</p>' +
                                                            '</td>' +
                                                            '</tr>' +
                                                            '</table>' +
                                                            '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
                                                            '<tr>' +
                                                            '<td>' +
                                                            '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© ' +
                                                            Config.CURRENT_YEAR +
                                                            ' <a href="#" style="text-decoration:none;color:#fff;">| Ownly</a>' +
                                                            '</div>' +
                                                            '</td>' +
                                                            '</tr>' +
                                                            '</table>' +
                                                            '</div>' +
                                                            '</td>' +
                                                            '</tr>' +
                                                            '</table>' +
                                                            '</body>' +
                                                            '</html>'
                                                    }
                                                    // console.log("mailOptions  ", mailOptions);
                                                    sendmail({
                                                        from: mailOptions.from,
                                                        to: mailOptions.to,
                                                        subject: mailOptions.subject,
                                                        html: mailOptions.html,
                                                    }, function (err, response) {
                                                        if (err) {
                                                            // console.log("Email not sent : ", err);
                                                        } else {
                                                            // console.log("credetials email sent");
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        })
                        .on("end", function () {
                            if (is_success) {
                                res.json({
                                    code: Constant.SUCCESS_CODE,
                                    message: "Tenant(s) created successfully"
                                });
                            }
                            else {
                                res.json({
                                    code: Constant.ERROR_CODE,
                                    message: errorMessage
                                });
                            }
                        });
                }
            });
        }
    ], function (err, TenantData) {
        // console.log('err', err);
        if (err == 'not_valid') {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.NOT_VALID_CSV,
                error_row: count
            };
        }
        else if (err) {
            count++;
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.CSV_UPLOAD_UNSUCCESS + ' ' + count,
                error_row: count
            };
        } else {
            outputJSON = {
                code: Constant.SUCCESS_CODE,
                message: Constant.CSV_UPLOAD_SUCCESS,
            };
        }
        res.jsonp(outputJSON);
    });
}

function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function download_file(uri, filename, callback) {
    request.head(uri, function (err, res, body) {
        // console.log('content-type:', res.headers['content-type']);
        // console.log('content-length:', res.headers['content-length']);
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};