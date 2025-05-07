'use strict';
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Notification = mongoose.model('Notification'),
    slug = require('slug'),
    Constant = require('../../config/constant.js'),
    validator = require('../../config/validator.js');

module.exports = {
    notificationList: notificationList,
    messagesList: messagesList,
    notificationRead: notificationRead,
    markMessageAsRead: markMessageAsRead
};
/*var Schema = mongoose.Schema;
var router = express.Router();
var users_model = require('../models/users');
var device_info_model = require('../models/device_info');
var helpers = require('../constants/helper_functions.js');
var _ = require('underscore');
var async = require('async');
var concat = require('unique-concat');
var returnStatus;
var notimessage;*/


/**
 * [usereachfunction common function to send notification user basis]
 * @param  {[type]}   notiparams [all params of push notification]
 * @param  {[type]}   usereach   [each user details]
 * @param  {Function} cb         [call back]
 * CREATED bY by:Rahul Lahariya
 */
var usereachfunction = function (notiparams, usereach, cb) {

    if (notiparams['assigned_by'] == notiparams['assigned_to'] && (typeof (notiparams['assigned_by']) != 'undefined' || typeof (notiparams['assigned_to']) != 'undefined')) {
        cb(null);
    } else {
        var device_token_condititons = { users_id: usereach._id, status: true, is_deleted: false };
        device_info_model.distinct("device_token", device_token_condititons, function (err, all_device_tokens) {
            if (err) {
                cb(1);
            } else {
                // console.log("all_device_tokens ===>", all_device_tokens);
                if (all_device_tokens.length > 0) {
                    var targ;
                    usereach.target = notiparams['target'];
                    if (notiparams.hasOwnProperty("closetask") && notiparams.hasOwnProperty("type") && usereach.user_type_id == "4") {
                        notimessage = service_messages.resident_estimation_task_noti;
                    } else {
                        notimessage = notiparams['message'];
                    }

                    totalBadgeCountfunc(usereach, function (error, totalbadgecount) {
                        // console.log(" totalbadgecount ==> ", usereach._id + " == "+ totalbadgecount.totcount);
                        if (totalbadgecount.hasOwnProperty("target"))
                            targ = totalbadgecount.target;
                        else
                            targ = notiparams['target'];
                        device_info_model.distinct("user_type_id", device_token_condititons, function (err, all_device_usertype) { // added on 28072016 regarding contact redirection
                            if (err) {
                                cb(1);
                            } else {
                                //console.log("usereach....",usereach); 
                                users_model.findOne({ "_id": usereach._id, status: true, is_deleted: false }, { "property_id": true }, function (error, property) {
                                    if (err) {
                                        cb(1);
                                    } else {
                                        push_notification(all_device_tokens, property.property_id, totalbadgecount.totcount, notimessage, targ, notiparams['target_id'], notiparams['service_category_name'], function (notification_status) {
                                            if (notification_status == "success") {
                                                cb(null);
                                            } else {
                                                cb(null);
                                            }
                                        });
                                    }
                                });
                            }
                        })
                    })
                } else {
                    cb(null);
                }
            }
        })
    }
}

/*
 * 
 * @param device token and user id array of all users of a property. For emergency news publish
 * @param parameeter- property_id, users_id(who is requesting service), 
 * @param {type} next
 * @returns {undefined}
 */

function notifications_all_users(property_id, users_id, notification, notiparams, next) {
    var user_condition = { "property_id": property_id, "_id": { $ne: users_id }, status: true, is_deleted: false };
    users_model.find(user_condition, { "_id": true }, function (err, allusers) {
        if (err) {
            next(1);
        } else {
            if (empty(allusers)) {
                next(1);
            } else {
                convert_user_array(allusers, function (users_json, users_array) {
                    notification['to_users_id'] = users_json;
                    //console.log("notification",notification);
                    service_notifications(notification).save(function (err, notifications_data) {
                        if (err) {
                            next(1);
                        } else {
                            //console.log("notiparams",notiparams);
                            if (notiparams['category'] == '2' || notiparams['category'] == '5') {
                                //console.log("allusers",allusers);
                                async.eachSeries(allusers, usereachfunction.bind(usereachfunction, notiparams), function (error, response) {
                                    if (error) {
                                        next(1);
                                    } else {
                                        next(null, "success");
                                    }
                                })
                            } else {
                                next(null, "success");
                            }

                        }
                    });

                });
            }
        }
    });

}
module.exports.notifications_all_users = notifications_all_users;


/**
 * [Notification List - get list of notifications]
 * @param  {object} req
 * @param  {object} res
 */
function messagesList(req, res) {
    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 10;
    var outputJSON = {};
    var query = {
        "to_users.users_id": mongoose.Types.ObjectId(user_id), "to_users.is_read": false, "type": Constant.NOTIFICATION_TYPE_CONTACT_MESSAGE, deleted: false
    };
    Notification.find(query).populate('from_user').limit(parseInt(number_of_pages)).sort({ createdAt: -1 }).exec(function (err, notificationData) {
        if (err) {
            console.log('err :: notification => ', err);
            outputJSON = {
                'code': Constant.ERROR_CODE,
                'message': Constant.ERROR_RETRIVING_DATA
            };
        } else {
            // console.log('notificationData => ', notificationData);
            outputJSON = {
                'code': Constant.SUCCESS_CODE,
                'data': notificationData
            }
        }
        res.jsonp(outputJSON);
    });
}

/**
 * [Notification List - get list of messages]
 * @param  {object} req
 * @param  {object} res
 */
function notificationList(req, res) {

    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    // var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 10;
    var outputJSON = {};
    var query = {
        "to_users.users_id": { $eq: mongoose.Types.ObjectId(user_id) },
        "type": { $ne: Constant.NOTIFICATION_TYPE_CONTACT_MESSAGE },
        // "to_users.is_read": { $eq: false },
        "deleted": false

    };
    // Notification.find(query).populate('from_user').limit(parseInt(number_of_pages)).sort({ createdAt: -1 }).exec(function (err, notificationData) {
    Notification.find(query).populate('from_user').sort({ createdAt: -1 }).exec(function (err, notificationData) {
        if (err) {
            outputJSON = {
                'code': Constant.ERROR_CODE,
                'message': Constant.ERROR_RETRIVING_DATA
            };
        } else {
            outputJSON = {
                'code': Constant.SUCCESS_CODE,
                'data': notificationData
            }
        }
        res.jsonp(outputJSON);
    });
}

/*
 * users_id_json - will return all users id in json format to put in to_users_id subschema
 * users_id_array - will return all users id in array format to find device token 
 */

function convert_user_array(allusers, next) {
    var users_id_json = [];
    var users_id_array = [];

    for (var i = 0; i < allusers.length; i++) {
        if (users_id_array.indexOf(allusers[i]._id) === -1) {
            users_id_array.push(allusers[i]._id);
            users_id_json.push({
                "users_id": allusers[i]._id
            });
        }

    }
    next(users_id_json, users_id_array);
}
module.exports.convert_user_array = convert_user_array;

function empty(data) {
    if (typeof (data) == 'number' || typeof (data) == 'boolean') {
        return false;
    }
    if (typeof (data) == 'undefined' || data === null) {
        return true;
    }
    if (typeof (data.length) != 'undefined') {
        return data.length == 0;
    }
    var count = 0;
    for (var i in data) {
        if (data.hasOwnProperty(i)) {
            count++;
        }
    }
    return count == 0;
}
var isEmptyObject = function (obj) {
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
};


/**
 * [Notification read - mark notification as read]
 * @param  {object} req
 * @param  {object} res
 */

 function notificationRead(req, res) {
    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var notification_type = (typeof req.body.notification_type != 'undefined') ? req.body.notification_type : '';
    var notification_type_id = (typeof req.body.notification_type_id != 'undefined') ? req.body.notification_type_id : '';

    var outputJSON = {};

    var conditions = { "$and": [] };
    conditions["$and"].push({
        "deleted": false,
        "to_users.users_id": mongoose.Types.ObjectId(user_id),
        "to_users.is_read": false
    });

    if (notification_type) {
        if (notification_type == 'maintenance') {
            conditions["$and"].push({ "maintenence_id": notification_type_id });
        } else if (notification_type == 'agreements') {
            conditions["$and"].push({ "agreement_id": notification_type_id });
        } else if (notification_type == 'dispute') {
            conditions["$and"].push({ "dispute_id": notification_type_id });
        } else if (notification_type == 'noticeboard') {
            conditions["$and"].push({ "noticeboard_id": notification_type_id });
        } else if (notification_type == 'application') {
            conditions["$and"].push({ "application_id": notification_type_id });
        }
    }

    // console.log("conditions      ", conditions);

    // var query = {
    //   "to_users.users_id": mongoose.Types.ObjectId(user_id), "type": { $ne:Constant.NOTIFICATION_TYPE_CONTACT_MESSAGE } ,"to_users.is_read": false, deleted: false
    // };
    // Notification.updateMany({ "to_users.users_id": mongoose.Types.ObjectId(user_id), "type": { $ne: Constant.NOTIFICATION_TYPE_CONTACT_MESSAGE }, "to_users.is_read": false, deleted: false }, { $set: { "to_users.$.is_read": true } }, function (err, notificationData) {
    Notification.find(conditions, function (err, findNotificationData) {
        if (err) {
            outputJSON = {
                'code': Constant.ERROR_CODE,
                'message': Constant.ERROR_RETRIVING_DATA
            };
        }
        if(findNotificationData && findNotificationData.length > 0) {
            let new_to_users = findNotificationData[0]['to_users']
           
            let to_users = []
           new_to_users.forEach(item => {
            to_users.push({...item, is_read: true, users_id: mongoose.Types.ObjectId(user_id)})
           });
            
            Notification.updateMany(conditions,
                { $set: { "to_users": to_users }}, {new: true}, function (err, notificationData) {
                    if (err) {
                        outputJSON = {
                            'code': Constant.ERROR_CODE,
                            'message': Constant.ERROR_RETRIVING_DATA
                        };
                    } else {
                        console.log("notificationData", notificationData);
                        outputJSON = {
                            'code': Constant.SUCCESS_CODE,
                            'data': notificationData
                        }
                    }
                    res.jsonp(outputJSON);
            });
        } else {
            // console.log("notificationData", notificationData);
            outputJSON = {
                'code': Constant.SUCCESS_CODE,
                'data': []
            }
            res.jsonp(outputJSON);
        }
    })
    
}

/**
 * [Notification read - mark message as read]
 * @param  {object} req
 * @param  {object} res
 */
function markMessageAsRead(req, res) {
    console.log('mark message as read api => ');
    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var from_user_id = (typeof req.body.from_user_id != 'undefined') ? req.body.from_user_id : '';
    var outputJSON = {};

    var conditions = { "$and": [] };
    conditions["$and"].push({
        "to_users.users_id": mongoose.Types.ObjectId(user_id),
        "type": { $eq: Constant.NOTIFICATION_TYPE_CONTACT_MESSAGE },
        "to_users.is_read": false,
        "deleted": false
    });
    if (from_user_id) {
        conditions["$and"].push({ "from_user": mongoose.Types.ObjectId(from_user_id) });
    }
    // console.log("query    ", conditions);
    // Notification.updateMany({ "to_users.users_id": mongoose.Types.ObjectId(user_id), "type": { $eq: Constant.NOTIFICATION_TYPE_CONTACT_MESSAGE }, "to_users.is_read": false, deleted: false }, { $set: { "to_users.$.is_read": true } }, function (err, notificationData) {
    Notification.updateMany(conditions, { $set: { "to_users.$.is_read": true } }, function (err, notificationData) {
        if (err) {
            outputJSON = {
                'code': Constant.ERROR_CODE,
                'message': Constant.ERROR_RETRIVING_DATA
            };
        } else {
            outputJSON = {
                'code': Constant.SUCCESS_CODE,
                'data': notificationData
            }
        }
        res.jsonp(outputJSON);
    });
}