'use strict';
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Groups = mongoose.model('Group'),
    NotificationInfo = mongoose.model('Notification'),
    maintenances = mongoose.model('maintenances'),
    NotificationStatus = mongoose.model('NotificationStatus'),
    InvitationInfo = mongoose.model('invitations'),
    AgencyModel = mongoose.model('Agency'),
    propertyModel = require('../models/Properties'),
    propertyOwner = require('../models/PropertyOwner'),
    async = require('async'),
    forEach = require('async-foreach').forEach,
    reviews = mongoose.model('reviews'),
    favourites = mongoose.model('favourites'),
    slug = require('slug'),
    Config = require('../../config/config.js'),
    Constant = require('../../config/constant.js'),
    randomString = require('random-string'),
    waterfall = require('run-waterfall'),
    validator = require('../../config/validator.js');
/* Mailgun Email setup*/
var bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
var salt = bcrypt.genSaltSync(10);
var smtpTransport = require('nodemailer-smtp-transport');
var transporter = nodemailer.createTransport(
    smtpTransport('smtp://' + Config.SMTP.authUser + ':' + Config.SMTP.authpass + '@smtp.gmail.com')
);
module.exports = {
    getAdminDashboardStatisticsData: getAdminDashboardStatisticsData,

};
/* Function to get statistics data of dashboard
   Required param - @object 
   Response - Send count for dashboard 
   Created date - 05-Feb-2018
   Created By - Prakash Kumar Soni
   @access Private
*/
function getAdminDashboardStatisticsData(req, res) {
    var traderCount, agencyCount, agentCount, propertyCount, strataCount, maintenancesCount, propertyOwnerCount, strataStaffCount;
    propertyOwner.count({ "is_deleted": false }, function (err, result) {
        if (err) {
            res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
        } else {
            propertyOwnerCount = result;
        }
    });
    AgencyModel.count({ "is_deleted": false }, function (err, result) {
        if (err) {
            res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
        } else {
            agencyCount = result;
        }
    });
    propertyModel.count({ "save_as_draft": false, "is_deleted": false, "status": true }, function (err, result) {
        if (err) {
            res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
        } else {
            propertyCount = result;
        }
    });
    maintenances.count(
        {
            // $or: [{ "job_close_confirmation": 1 }, { "job_close_confirmation": 2 }],
            "deleted": false,
            // "is_job_completed": false
        }, function (err, result) {
            if (err) {
                res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
            } else {
                maintenancesCount = result;
            }
        });

    // getCountById(Constant.TRADER, function (err, result) {
    //     console.log('result => ', result);
    User.count({ "is_deleted": false, "is_active": true, "defaultUserRole": "trader" }, function (err, traderResult) {
        if (err) {
            res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
        } else {
            traderCount = traderResult;
            getCountById(Constant.AGENT, function (err, result) {
                if (err) {
                    res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
                } else {
                    agentCount = result;
                    getCountById(Constant.RUN_STRATA_MANAGEMENT_COMPANY, function (err, result) {
                        if (err) {
                            res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
                        } else {
                            strataCount = result;
                            getCountById(Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY, function (err, result) {
                                if (err) {
                                    res.json({ code: Constant.INTERNAL_ERROR, message: Constant.ERROR_RETRIVING_DATA });
                                } else {
                                    strataStaffCount = result;
                                    let tempObj = {};
                                    tempObj.agencyCount = agencyCount ? agencyCount : 0;
                                    tempObj.propertyCount = propertyCount ? propertyCount : 0;
                                    tempObj.maintenancesCount = maintenancesCount ? maintenancesCount : 0;
                                    tempObj.traderCount = traderCount ? traderCount : 0;
                                    tempObj.agentCount = agentCount ? agentCount : 0;
                                    tempObj.strataCount = strataCount ? strataCount : 0;
                                    tempObj.strataStaffCount = strataStaffCount ? strataStaffCount : 0;
                                    tempObj.propertyOwnerCount = propertyOwnerCount ? propertyOwnerCount : 0;
                                    res.json({ code: Constant.SUCCESS_CODE, data: tempObj });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}
function getCountById(id, cb) {
    Groups.aggregate([
        { $match: { "role_id": mongoose.Types.ObjectId(id), "deleted": false, "is_master_role": true, "status": true } }, // Match me
        { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'groupsData' } },
        { $match: { "groupsData.is_active": true, "groupsData.is_deleted": false } },
        {
            $group:
            {
                _id: null,
                "count": { $sum: 1 }
            }
        }
    ]).exec(function (err, result) {
        if (err) {
            cb(err, null);
        } else {
            if (result.length == 0) {
                cb(null, 0);
            } else {
                cb(null, result[0].count);
            }
        }
    });
}