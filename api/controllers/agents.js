'use strict';
var mongoose = require('mongoose'),
    Agency = mongoose.model('Agency'),
    User = mongoose.model('User'),
    Enquiry = require('../models/Enquiry'),
    Groups = mongoose.model('Group'),
    propertyModel = require('../models/Properties'),
    AgentRemovals = mongoose.model('AgentRemovals'),
    InvitationInfo = mongoose.model('invitations'),
    NotificationInfo = mongoose.model('NotificationStatus'),
    validator = require('../../config/validator.js'),
    waterfall = require('run-waterfall'),
    moment = require('moment'),
    bcrypt = require('bcrypt'),
    changeCase = require('change-case'),
    Config = require('../../config/config.js'),
    salt = bcrypt.genSaltSync(10),
    async = require('async'),
    forEach = require('async-foreach').forEach,
    nodemailer = require("nodemailer"),
    smtpTransport = require('nodemailer-smtp-transport'),
    transporter = nodemailer.createTransport(
        smtpTransport('smtp://' + Config.SMTP.authUser + ':' + Config.SMTP.authpass + '@smtp.gmail.com')
    ),
    randomString = require('random-string'),
    request = require('request'),
    fs = require('fs-extra'),
    Constant = require('../../config/constant.js');
var sendmail = require('sendmail')();
var bcrypt = require('bcrypt');
var salt = bcrypt.genSaltSync(10);
const mail_helper = require('../helpers/mail_helper');

module.exports = {
    getAgentProfile: getAgentProfile,
    addAgentsByPrinciple: addAgentsByPrinciple,
    agentsList: agentsList,
    myAgents: myAgents,
    adminGetAgentsList: adminGetAgentsList,
    adminAgentRemovalList: adminAgentRemovalList,
    adminAgentProperties: adminAgentProperties,
    agentRemovalsRequest: agentRemovalsRequest,
    startaUserList: startaUserList,
    send_customer_enquiry: send_customer_enquiry,
    BulkImportAgents: BulkImportAgents,
    bulkDeleteAgents: bulkDeleteAgents,

};


/**
 * Function to get agent profile
   reequired param  is agency
 * Created Date 16-Jan-2017
 */
function getAgentProfile(req, res) {

    var user_id = (req.body.user_id) ? mongoose.Types.ObjectId(req.body.user_id) : '';
    var role_id = (req.body.role_id) ? mongoose.Types.ObjectId(req.body.role_id) : mongoose.Types.ObjectId(Constant.AGENT);
    console.log("user_id ", user_id, '  role id   ', role_id);
    if (user_id) {
        waterfall([
            function (callback) {
                // User.findOne({ _id: user_id, is_deleted: false })
                // .populate({path: 'agency_id', populate: { path: 'principle_id' ,select: '_id about_user'}})
                // .exec(function (err, userInfo) {
                //     if (err) {
                //         callback(err);
                //     } else {
                //         callback(null,userInfo);
                //     }
                // });

                User.aggregate([
                    { $match: { "_id": user_id, "is_deleted": false } },
                    {
                        $lookup: {
                            from: 'groups',
                            localField: '_id',
                            foreignField: 'user_id',
                            as: 'groups'
                        }
                    },
                    {
                        "$unwind": "$groups"
                    },
                    {
                        $lookup: {
                            from: 'services_cats',
                            localField: 'categories_id',
                            foreignField: '_id',
                            as: 'categories_id'
                        }
                    },
                    {
                        $lookup: {
                            from: 'agencies',
                            localField: 'agency_id',
                            foreignField: '_id',
                            as: 'agency_id'
                        }
                    },
                    {
                        "$unwind": {
                            "path": "$agency_id",
                            "preserveNullAndEmptyArrays": true
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'agency_id.principle_id',
                            foreignField: '_id',
                            as: 'agency_id.principle_id'
                        }
                    },
                    {
                        $unwind: {
                            "path": "$agency_id.principle_id",
                            "preserveNullAndEmptyArrays": true
                        },
                    },
                    {
                        "$lookup": {
                            from: 'groups',
                            localField: 'agency_id.principle_id._id',
                            foreignField: 'user_id',
                            as: 'agency_id.principle_id.groups'
                        }
                    },
                    {
                        $unwind: {
                            "path": "$agency_id.principle_id.groups",
                            "preserveNullAndEmptyArrays": true
                        },
                        // "$unwind": "$agency_id.principle_id.groups"
                    },
                    {
                        $match: {
                            "$or": [
                                {
                                    "agency_id.principle_id.groups.role_id": role_id
                                },
                                {
                                    "agency_id.principle_id.groups.role_id": null
                                }
                            ]
                        }
                    }
                ])
                    .allowDiskUse(true)
                    .exec(function (err, userData) {
                        console.log("data: 12154 ==>", userData);
                        if (err) {
                            console.log('err : while fetching agent detail => ', err);
                            callback(err);
                        } else {
                            callback(null, userData[0]);
                        }
                    });
            },
            // commented for now
            function (arg1, callback) {
                var finalResponse = [];
                // propertyModel.count({ created_by: user_id, save_as_draft: false }).exec(function (err, propertycnt) {
                var property_cnt = {};
                // if (err) {
                property_cnt.value = 0;
                finalResponse.push(arg1);
                finalResponse.push(property_cnt);
                callback(null, finalResponse);
                // } else {
                // property_cnt.value = propertycnt;
                // finalResponse.push(arg1);
                // finalResponse.push(property_cnt);
                // callback(null, finalResponse);
                // }
                // });
            }
        ], function (err, result) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
            } else {
                res.json({ code: Constant.SUCCESS_CODE, data: result });
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.USER_ID_REQUIRED });
    }
}

/* function to add memebers (agents) in agency
   required param is name and email 
*/

function addAgentsByPrinciple(req, res) {
    if ((req.body.email) && (req.body.password) && (req.body.firstname) && (req.body.lastname) && (req.body.agency_id)) {
        if (validator.isEmail(req.body.email)) {
            User.find({ email: (req.body.email).toLowerCase(), is_deleted: false }, { email: 1 }, function (err, email) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    if (email.length > 0) {
                        res.json({ code: Constant.ALLREADY_EXIST, message: Constant.EMAIL_ALREADY_EXIST });
                    } else {
                        var hash = bcrypt.hashSync(req.body.password, salt);
                        var userData = {
                            password: hash,
                            firstname: req.body.firstname,
                            lastname: req.body.lastname,
                            email: (req.body.email).toLowerCase(),
                            mobile_no: req.body.mobile_no,
                            name: req.body.firstname + " " + req.body.lastname,
                            agency_id: mongoose.Types.ObjectId(req.body.agency_id),
                            is_active: true,
                            deleted: false,
                            country: 'Austrailia'
                        };
                        var UsersRecord = new User(userData);
                        Agency.findOne({ _id: req.body.agency_id, is_deleted: false }, { "_id": 1, "name": 1 }, function (err, agency) {
                            if (err) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                            } else {
                                UsersRecord.save(function (err, userInfo) {
                                    if (err) {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                    } else {

                                        if (userInfo) {
                                            userInfo = {
                                                userId: userInfo._id,
                                                firstname: userInfo.firstname,
                                                lastname: userInfo.lastname,
                                                email: userInfo.email,
                                                mobile_no: userInfo.mobile_no,
                                            }
                                            var obj = {}, obj2 = {};
                                            obj2.user_id = userInfo.userId;
                                            obj.user_id = userInfo.userId;
                                            obj.role_id = mongoose.Types.ObjectId(Constant.AGENT);
                                            obj.is_master_role = true;

                                            var groupUser = new Groups(obj);
                                            var notification = new NotificationInfo(obj2);
                                            groupUser.save(function (err, group) {
                                                if (err) {
                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                } else {
                                                    notification.save(function (err, group) {
                                                        if (err) {
                                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                        } else {
                                                            var mailOptions = {
                                                                from: Config.EMAIL_FROM, // sender address
                                                                to: req.body.email, // list of receivers
                                                                subject: 'Account created as Ownly agent', // Subject line
                                                                text: 'Account created as Ownly agent', // plaintext body
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
                                                                    '<p>You are invited as a property manager  by ' + agency.name + ' agency.' +
                                                                    '<p>Your username: ' + '<strong>' + req.body.email + '</strong>' + '</p>' +
                                                                    '<p>password: ' + '<strong>' + req.body.password + '</strong>' + '<p>' +
                                                                    '<p> Go to login screen by clicking on below link:-</p>' +
                                                                    '<p><a target="_blank" href="' + Constant.STAGGING_URL + '#!/login' + '">' + 'click here ' + '</a><br /></p>' +
                                                                    '<p></p>' +
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
            });
        } else {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL });
        }
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQUIRED_REGISTER_FIELDS });
    }
}
function adminAgentRemovalList(req, res) {
    AgentRemovals.find({ is_approved_by_admin: false })
        .populate('removed_req_by_user', '_id firstname lastname email address image')
        .populate('removed_req_to_user', '_id firstname lastname email address image')
        .populate('property_id', '_id title image address description')
        .sort({
            createdAt: 1
        }).exec(function (err, data) {
            if (err) {
                var outputJSON = {
                    'code': Constant.ERROR_CODE,
                    'message': Constant.ERROR_RETRIVING_DATA
                };
            } else {
                var outputJSON = {
                    'code': Constant.SUCCESS_CODE,
                    'data': data
                }
            }
            res.jsonp(outputJSON);
        });
}

/* Function to add remove agents request
   Send message to admin for approval
   Request data - Agents and request id are mendatory
*/

function agentRemovalsRequest(req, res) {

    var property_id = (typeof req.body.property_id != 'undefined') ? mongoose.Types.ObjectId(req.body.property_id) : '';
    var removed_req_by_user = (typeof req.body.removed_req_by_user != 'undefined') ? mongoose.Types.ObjectId(req.body.removed_req_by_user) : '';
    var removed_req_to_user = (typeof req.body.removed_req_to_user != 'undefined') ? req.body.removed_req_to_user : [];
    var reason_of_removal_req = (typeof req.body.reason_of_removal_req != 'undefined') ? req.body.reason_of_removal_req : '';

    if (removed_req_by_user && removed_req_to_user) {

        var finalResponse = [];
        var obj = {};
        obj.reason_of_removal_req = reason_of_removal_req;
        obj.removed_req_by_user = removed_req_by_user;
        obj.property_id = property_id;
        //console.log(removed_req_to_user);
        waterfall([
            function (callback) {
                propertyModel.findOne({ _id: property_id, is_deleted: false }, { "_id": 1, "owned_by": 1, "address": 1 })
                    .populate("owned_by", "firstname lastname")
                    .populate("created_by", "firstname lastname")
                    //.populate({ path: 'created_by', select: 'name', populate: { path: 'agency_id' } },{'principle_id':1})
                    .exec(function (err, property) {
                        if (err) {
                            callback(err);
                        } else {
                            // console.log("property", property);
                            callback(null, property);
                        }
                    });
            },
            function (arg1, callback) {
                if (arg1) {
                    async.each(removed_req_to_user, function (data, asyncCall) {
                        obj.removed_req_to_user = mongoose.Types.ObjectId(data);
                        var AgentRemovalsModel = new AgentRemovals(obj);
                        AgentRemovalsModel.save(function (err, agentdata) {
                            if (err) {
                                asyncCall(error, false);
                            } else {
                                finalResponse.push(agentdata);
                                asyncCall(null, finalResponse);
                            }
                        });
                    }, function (err, arg1) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, arg1);
                        }
                    });
                } else {
                    callback(null, arg1);

                }
            }, function (arg2, callback) {
                // if(arg2){
                //     var to_users = [];
                //     var obj2 = {};
                //     obj2.subject = "Agent Removal Request";
                //     obj2.message = arg2.owned_by.firstname+" "+arg2.owned_by.lastname+"sent agent removal request to you for the removal of "+arg2.created_by.firstname+" "+arg2.created_by.lastname+" as an agent for his/her property "+arg2.address+" "+moment().format("MMMM Do YYYY");
                //     obj2.from_user = mongoose.Types.ObjectId(arg2.owned_by._id);
                //     to_users.push({ "users_id": mongoose.Types.ObjectId(removed_req_to_user) });
                //     obj2.to_users = to_users;
                //     obj2.type = Constant.AGENT_REMOVAL_REQUEST;
                //     obj2.module = 5;
                //     console.log("obj2!!!!!!!",obj2);
                //     var notification = new NotificationInfo(obj2);
                //     notification.save(function (err, notData) {
                //         console.log( notData," notData");
                //         if (err) {
                //             callback(err);
                //         } else {
                //             callback(null,arg2);
                //         }
                //     });
                // }else{
                callback(null, arg2);
                // }
            },
        ], function (err, result) {
            // console.log("called result", result);
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
            } else {
                res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

/*  @api : adminAgentProperties
 *  @author  :  
 *  @created  : 
 *  @modified :
 *  @purpose  : To get the property by agent id.
 */
function adminAgentProperties(req, res) {
    var limit = req.body.limit ? parseInt(req.body.limit) : {};
    var sortby = req.body.sortby ? req.body.sortby : {};
    var outputJSON = {};
    var query = {
        'created_by': req.body.agentId,
        is_deleted: false
    };
    propertyModel.find(query).populate('owned_by', '_id firstname lastname email address about_user image agency_id city').limit(parseInt(limit)).sort({
        createdDate: 1
    }).exec(function (err, propetyData) {
        if (err) {
            outputJSON = {
                'code': Constant.ERROR_CODE,
                'message': Constant.ERROR_RETRIVING_DATA
            };
        } else {
            outputJSON = {
                'code': Constant.SUCCESS_CODE,
                'message': Constant.PROPERTY_RETRIEVE_SUCCESS,
                'data': propetyData
            }
        }
        res.jsonp(outputJSON);
    });
}


/**
 * [adminGetAgentsList - get list of all admin agents]
 * @param  {object} req
 * @param  {object} res
 */
function adminGetAgentsList(req, res) {

    var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 100;
    var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
    var lastname = (typeof req.body.lastname != 'undefined') ? req.body.lastname : '';
    var state = (typeof req.body.state != 'undefined') ? req.body.state : '';
    var city = (typeof req.body.city != 'undefined') ? req.body.city : '';
    var zip_code = (typeof req.body.zip_code != 'undefined') ? req.body.zip_code : '';

    var conditions = { "$and": [] };
    conditions["$and"].push({ "is_deleted": false, "is_active": true, agency_id: mongoose.Types.ObjectId(agency_id) });


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


    if (agency_id) {
        User.aggregate([
            { $match: conditions }, // Match me
            { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
            { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.AGENT), "groups.is_master_role": true, "groups.status": true, "groups.deleted": false } },
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
                    // console.log(err);
                    return;
                } else {
                    var totalCount = 0;
                    if (result.length > 0) {
                        totalCount = result[0].count;
                        User.aggregate(
                            { $match: conditions }, // Match me
                            { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                            {
                                $project: {
                                    _id: 1, firstname: 1, lastname: 1,
                                    email: 1, address: 1, totalPropertyCount: 1, about_user: 1,
                                    image: 1, images: 1, city: 1, state: 1, agency_id: 1,
                                    groups: { _id: 1, role_id: 1, status: 1, deleted: 1, is_master_role: 1 }
                                }
                            },
                            { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.AGENT), "groups.is_master_role": true, "groups.status": true, "groups.deleted": false } },
                            { $sort: { "createdAt": -1 } },
                            { $skip: page_number * number_of_pages },
                            { "$limit": number_of_pages }
                        ).exec(function (err, usersList) {
                            if (err) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                            } else {
                                Agency.populate(usersList, { "path": "agency_id" }, function (err, finalData) {
                                    if (err) {
                                        //console.log(err);
                                        return;
                                    } else {
                                        res.json({ code: Constant.SUCCESS_CODE, data: finalData, total_count: totalCount });
                                    }
                                });
                            }
                        });
                    } else {
                        res.json({ code: Constant.SUCCESS_CODE, data: [], total_count: totalCount });
                    }
                }
            });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}
/**
 * [agentsList - get list of all agents]
 * @param  {object} req
 * @param  {object} res
 */
function agentsList(req, res) {

    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;

    var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
    var lastname = (typeof req.body.lastname != 'undefined') ? req.body.lastname : '';
    var state = (typeof req.body.state != 'undefined') ? req.body.state : '';
    var city = (typeof req.body.city != 'undefined') ? req.body.city : '';
    var zip_code = (typeof req.body.zip_code != 'undefined') ? req.body.zip_code : '';

    var conditions = { "$and": [] };
    conditions["$and"].push({ "is_deleted": false, "is_active": true, "is_suspended": false });


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
        { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.AGENT), "groups.status": true, "groups.is_master_role": true, "groups.deleted": false } },
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
                // console.log(err);
                // Response need to send
                res.json({ code: Constant.ERROR_CODE, message: 'temp error' });
                return;
            } else {
                var totalCount = 0;
                if (result.length > 0) {
                    totalCount = result[0].count;
                    waterfall([
                        function (callback) {
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
                                { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.AGENT), "groups.is_master_role": true, "groups.status": true, "groups.deleted": false } },
                                { $sort: { "createdAt": -1 } },
                                // { $skip: page_number * number_of_pages },
                                // { "$limit": number_of_pages }
                            ).exec(function (err, usersList) {
                                if (err) {
                                    callback(err);
                                } else {
                                    Agency.populate(usersList, { "path": "agency_id" }, function (err, finalData) {
                                        if (err) {
                                            callback(err);
                                        } else {
                                            callback(null, finalData, totalCount);
                                        }
                                    });
                                }
                            });
                        }, function (arg1, arg2, callback) {
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
                    ], function (err, result, total_count) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
                        } else {
                            res.json({ code: Constant.SUCCESS_CODE, data: result, total_count: total_count });
                        }
                    });
                } else {
                    res.json({ code: Constant.SUCCESS_CODE, data: [], total_count: totalCount });
                }
            }
        });
}

/**
 * [agentsList - get list of agents with in the agency]
 * @param  {object} req
 * @param  {object} res
 */
function myAgents(req, res) {

    var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;
    var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
    var lastname = (typeof req.body.lastname != 'undefined') ? req.body.lastname : '';
    var state = (typeof req.body.state != 'undefined') ? req.body.state : '';
    var city = (typeof req.body.city != 'undefined') ? req.body.city : '';
    var zip_code = (typeof req.body.zip_code != 'undefined') ? req.body.zip_code : '';

    var conditions = { "$and": [] };
    conditions["$and"].push({ "is_deleted": false, "is_active": true, "is_suspended": false });

    if (agency_id) {
        if (Array.isArray(agency_id)) {
            var agency_id_arr = [];
            agency_id.map(function (agent_loop) {
                // console.log(agent_loop);
                agency_id_arr.push(mongoose.Types.ObjectId(agent_loop));
            });
            conditions["$and"].push({ "agency_id": { $in: agency_id_arr } });
        }
        else
            conditions["$and"].push({ "agency_id": mongoose.Types.ObjectId(agency_id) });
    }



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


    waterfall([
        function (callback) {
            if (agency_id) {
                User.aggregate([
                    { $match: conditions }, // Match me
                    { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                    { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.AGENT), "groups.is_master_role": true, "groups.status": true, "groups.deleted": false } },
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
                                    { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.AGENT), "groups.is_master_role": true, "groups.status": true, "groups.deleted": false } },
                                    { $sort: { "createdAt": -1 } },
                                    // { $skip: page_number * number_of_pages },
                                    // { "$limit": number_of_pages }
                                ).exec(function (err, usersList) {
                                    // console.log('usersList :: check here=> ', usersList);
                                    if (err) {
                                        callback({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                    } else {

                                        Agency.populate(usersList, { "path": "agency_id" }, function (err, finalData) {
                                            // console.log('finalData :: Agent List=> ', finalData);
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

/**
 * [startaUserList - get list of all agents]
 * @param  {object} req
 * @param  {object} res
 */
function startaUserList(req, res) {
    //console.log('startaUserList called');
    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;

    var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
    var lastname = (typeof req.body.lastname != 'undefined') ? req.body.lastname : '';
    var state = (typeof req.body.state != 'undefined') ? req.body.state : '';
    var city = (typeof req.body.city != 'undefined') ? req.body.city : '';
    var zip_code = (typeof req.body.zip_code != 'undefined') ? req.body.zip_code : '';

    var conditions = { "$and": [] };
    conditions["$and"].push({ "is_deleted": false, "is_active": true });

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
            if (err) {
                // console.log(err);
                return;
            } else {
                var totalCount = 0;
                if (result.length > 0) {
                    totalCount = result[0].count;
                    waterfall([
                        function (callback) {
                            User.aggregate(
                                { $match: conditions }, // Match me
                                { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                                { $lookup: { from: 'reviews', localField: '_id', foreignField: 'review_to', as: 'reviews' } },
                                {
                                    $project: {
                                        _id: 1, firstname: 1, lastname: 1,
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
                                    callback(err);
                                } else {
                                    Agency.populate(usersList, { "path": "agency_id" }, function (err, finalData) {
                                        if (err) {
                                            callback(err);
                                        } else {
                                            callback(null, finalData, totalCount);
                                        }
                                    });
                                }
                            });
                        }, function (arg1, arg2, callback) {
                            var finalResponse = [];
                            async.each(arg1, function (item, asyncCall) {
                                propertyModel.count({ created_by: item._id }).exec(function (err, propertycnt) {
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
                    ], function (err, result, total_count) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
                        } else {
                            res.json({ code: Constant.SUCCESS_CODE, data: result, total_count: total_count });
                        }
                    });
                } else {
                    res.json({ code: Constant.SUCCESS_CODE, data: [], total_count: totalCount });
                }
            }
        });
}

function send_customer_enquiry(req, res) {
    console.log("req.body.enquiries    ", req.body.enquiries);

    console.log("send_customer_enquiry called");
    var html_text = '<!DOCTYPE html>' +
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
        '<p><strong> Hi' + ' ' + changeCase.sentenceCase(req.body.agent_name) + ',' + '</strong></p>' +
        '<p>Customer Name: ' + '<strong>' + changeCase.sentenceCase(req.body.first_name) + ' ' + changeCase.sentenceCase(req.body.last_name) + '</strong>' + '</p>' +
        '<p>Email Address : ' + '<strong>' + req.body.email + '</strong>' + '<p>' +
        '<p>Phone : ' + '<strong>' + req.body.phone + '</strong>' + '<p>' +
        '<p>Post Code : ' + '<strong>' + req.body.post_code + '</strong>' + '<p><br><br>';

    if (req.body.enquiries && req.body.enquiries.length > 0) {
        req.body.enquiries.map(function (value, key) {
            html_text += '<p>Enquiry : ' + '<strong>' + value + '</strong>' + '<p>';
        });
    }

    if (req.body.property_query && req.body.property_query != '') {
        html_text += '<p>Message : ' + '<strong>' + req.body.property_query + '</strong>' + '<p>';
    }

    if (req.body.property_url && req.body.property_url != '') {
        html_text += '<p>Property URL : ' + '<strong>' + req.body.property_url + '</strong>' + '<p>';
    }

    html_text += '<p></p>' +
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
        '</html>';

    var mailOptions = {
        from: Config.EMAIL_FROM, // sender address
        to: req.body.agent_email_id, // list of receivers
        subject: 'Customer Enquiry', // Subject line
        text: 'Customer Enquiry', // plaintext body
        html: html_text
    }
    console.log("mailOptions   ", mailOptions);
    sendmail({
        from: mailOptions.from,
        to: req.body.agent_email_id,
        subject: mailOptions.subject,
        html: mailOptions.html,
    }, function (err, response) {
        if (err) {
            console.log("i m in err part");
            return res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
        } else {
            console.log("i m in success part")
            var enquiry = {};
            enquiry.first_name = req.body.first_name;
            enquiry.last_name = req.body.last_name;
            enquiry.email = req.body.email;
            enquiry.phone = req.body.phone;
            enquiry.post_code = req.body.post_code;
            enquiry.property_query = req.body.property_query;
            enquiry.enquiries = req.body.enquiries;
            enquiry.agent_email_id = req.body.agent_email_id;
            enquiry.agent_name = req.body.agent_name;
            enquiry.agent_id = req.body.agent_id;

            var enquiryRecord = new Enquiry(enquiry);

            enquiryRecord.save(function (err, LogRecord) {
                console.log("Err  ", err);
                console.log("LogRecord  ", LogRecord);
                res.json({ code: Constant.SUCCESS_CODE, message: 'success', data: LogRecord });
            });
        }
    });
}

/**
 * Bulk Import Agents by Admin
 */
function BulkImportAgents(req, res) {
    try {
        console.log('req.body.agency_id => ', req.body.agency_id);
        if (!req.body.agency_id || !req.body.created_by) {
            res.json({
                code: Constant.ERROR_CODE,
                message: 'Agency id and created by are required.'
            });
        } else {
            if (req.body.created_by === Constant.ADMIN_ID) {
                let agencyId = req.body.agency_id;
                let agentArray = req.body.agent_arr;
                let successCount = 0;
                let errorCount = 0;

                Agency.findById(req.body.agency_id)
                    .then(agencyData => {
                        console.log('agencyData => ', agencyData);

                        let actions = agentArray.map(data_ => {
                            return new Promise(function (resolve) {
                                setTimeout(function () {
                                    let agentData = JSON.parse(data_);
                                    console.log('agentData => ', agentData);
                                    if (agentData) {
                                        // check for Existing users
                                        User.find({ email: (agentData.email).toLowerCase() })
                                            .then(async function (userData) {
                                                if (userData && userData.length > 0) {
                                                    console.log('userData :: existing user => ', userData);
                                                    if (userData[0].agency_id && (userData[0].agency_id == agencyId)) {
                                                        console.log('Existing user with same agency id => ');
                                                        // Duplicate record found
                                                        errorCount++;
                                                    } else {
                                                        // send invite email to Existing users
                                                        let infoObj = {
                                                            loginURL: Constant.STAGGING_URL + '#!/login',
                                                            firstName: userData[0].firstname,
                                                            agencyName: agencyData.name,
                                                            logoURL: Constant.STAGGING_URL + 'assets/images/logo-public-home.png'
                                                        }
                                                        var options = {
                                                            from: Config.EMAIL_FROM, // sender address
                                                            to: userData[0].email, // list of receivers
                                                            subject: 'Invited to join Agency', // Subject line
                                                            text: 'Invited to join Agency', // plaintext body
                                                        }
                                                        let mail_response = mail_helper.sendEmail(options, 'invitation_to_join_agency', infoObj);
                                                        successCount++;
                                                    }
                                                } else {
                                                    // New user
                                                    let password;
                                                    password = randomString({ length: 8, numeric: true, letters: true });
                                                    password = password + "@s1";
                                                    console.log('password :: for agency=> ', password);
                                                    const hash = bcrypt.hashSync(password, salt);
                                                    const agent = new User({
                                                        firstname: agentData.first_name,
                                                        lastname: (agentData.last_name).trim(),
                                                        email: (agentData.email).toLowerCase(),
                                                        mobile_no: agentData.phone_number,
                                                        name: agentData.first_name + " " + (agentData.last_name).trim(),
                                                        is_active: true,
                                                        deleted: false,
                                                        country: 'Australia',
                                                        suburb_postcode: agentData.suburb,
                                                        agency_id: agencyId,
                                                        state: agentData.state,
                                                        zipCode: agentData.post_code,
                                                        city: agentData.suburb ? agentData.suburb : '',
                                                    });
                                                    // Store user to system
                                                    await agent.save()
                                                        .then(async function (savedAgentRecord) {
                                                            if (savedAgentRecord) {
                                                                // Store User Profile pic 
                                                                if (agentData.logo) {
                                                                    console.log('logo => ');
                                                                    var timestamp = Number(new Date()); // current time as number
                                                                    var dir = './api/uploads/users';
                                                                    var temp_path = dir + '/' + timestamp + '.jpeg';
                                                                    download_file(agentData.logo, temp_path, async function () {
                                                                        var uploaded_image_name = timestamp + ".jpeg";
                                                                        console.log('uploaded_image_name => ', uploaded_image_name);
                                                                        await User.findByIdAndUpdate(savedAgentRecord._id, { image: uploaded_image_name })
                                                                            .then(async function (updatedUserImage) {
                                                                                console.log('updatedUserImage => ', updatedUserImage);
                                                                            })
                                                                    });
                                                                }
                                                                const groupUser = new Groups({
                                                                    user_id: savedAgentRecord._id,
                                                                    role_id: Constant.AGENT,
                                                                    is_master_role: true
                                                                });
                                                                // Group for new user
                                                                await groupUser.save()
                                                                    .then(async function (savedGroup) {
                                                                        console.log('savedGroup => ', savedGroup);
                                                                        if (savedGroup) {
                                                                            const notification = new NotificationInfo({
                                                                                user_id: savedAgentRecord._id
                                                                            });
                                                                            // notification status for new user
                                                                            await notification.save()
                                                                                .then(async function (savedNotification) {
                                                                                    console.log('savedNotification => ', savedNotification);
                                                                                    if (savedNotification) {
                                                                                        // send email with temp pass
                                                                                        let infoObj = {
                                                                                            loginURL: Constant.STAGGING_URL + '#!/login',
                                                                                            firstName: savedAgentRecord.firstname,
                                                                                            email: savedAgentRecord.email,
                                                                                            password: password,
                                                                                            logoURL: Constant.STAGGING_URL + 'assets/images/logo-public-home.png'
                                                                                        }
                                                                                        var options = {
                                                                                            from: Config.EMAIL_FROM, // sender address
                                                                                            to: savedAgentRecord.email, // list of receivers
                                                                                            subject: 'Account created as Agent', // Subject line
                                                                                            text: 'Account created as Agent', // plaintext body
                                                                                        }

                                                                                        let mail_response = mail_helper.sendEmail(options, 'welcome_email_for_agency', infoObj);
                                                                                        // store hash pass to db
                                                                                        await User.findByIdAndUpdate(savedAgentRecord._id, { password: hash })
                                                                                            .then(async function (updatedUserRecord) {
                                                                                                console.log('updatedUserRecord => ', updatedUserRecord);
                                                                                                await successCount++;
                                                                                                return [errorCount, successCount];
                                                                                            })
                                                                                    }
                                                                                })
                                                                        }
                                                                    })
                                                            }
                                                        })
                                                        .catch(userErr => {
                                                            console.log('userErr :: Error while saving new user record=> ', userErr);
                                                            res.json({
                                                                code: Constant.ERROR_CODE,
                                                                message: userErr
                                                            });
                                                        })
                                                }
                                            })
                                            .then(data => {
                                                console.log('data :: then => ', data);
                                                resolve()
                                            })
                                    }
                                }, 0);
                            });
                        }); // run the function over all items

                        // we now have a promises array and we want to wait for it

                        Promise.all(actions).then(data => {
                            console.log('agentArray.length => ', agentArray.length);
                            console.log('errorCount => ', errorCount);
                            console.log('successCount => ', successCount);
                            if (agentArray.length === errorCount) {
                                console.log('all records are already in db => ');
                                res.json({
                                    code: Constant.ERROR_CODE,
                                    message: errorCount + ' Duplicate Record(s) found!'
                                });
                            } else {
                                let msg;
                                if (successCount > 0 && errorCount > 0) {
                                    msg = successCount + ' Agent(s) added successfully' + ', ' + errorCount + ' Duplicate record(s) found!';
                                } else if (successCount > 0 && errorCount === 0) {
                                    msg = successCount + ' Agent(s) added successfully'
                                }
                                console.log('msg => ', msg);
                                res.json({
                                    code: Constant.SUCCESS_CODE,
                                    message: msg,
                                });
                            }
                        });
                    })
                    .catch(agencyErr => {
                        console.log('agencyErr => ', agencyErr);
                    })
            } else {
                res.json({
                    code: Constant.ERROR_CODE,
                    message: 'You are not authorized to perform this action.'
                });
            }
        }
    } catch (error) {
        console.log('error => ', error);
        res.json({
            code: Constant.ERROR_CODE,
            message: error.message
        });
    }
}

function download_file(uri, filename, callback) {
    request.head(uri, function (err, res, body) {
        console.log('err :: file ======> ', err);
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

/**
 * Bulk Delete Agents by Agency Principle
 */
function bulkDeleteAgents(req, res) {
    console.log('req.body :: bulk delete agents ====> ', req.body);
    try {
        if (req.body.agentId && req.body.agentId.length > 0) {
            const agentArr = req.body.agentId;
            let successCount = 0;
            let errorCount = 0;
            let actions = agentArr.map(agentID => {
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        console.log('agentID => ', agentID);
                        if (agentID) {
                            // check for Existing users
                            User.findByIdAndUpdate(agentID, { "is_suspended": true })
                                .then(async function (userData) {
                                    console.log('userData => ', userData);
                                    if (userData) {
                                        // console.log('userData :: existing user => ', userData);
                                        successCount++;
                                    }
                                }).catch(err => {
                                    console.log('err => ', err);
                                    errorCount++;
                                }).then(data => {
                                    console.log('data :: then => ', data);
                                    resolve()
                                })
                        }
                    }, 0);
                });
            }); // run the function over all items

            // we now have a promises array and we want to wait for it

            Promise.all(actions).then(data => {
                console.log('agentArr.length => ', agentArr.length);
                console.log('errorCount => ', errorCount);
                console.log('successCount => ', successCount);
                if (agentArr.length === errorCount) {
                    console.log('all records are already in db => ');
                    res.json({
                        code: Constant.ERROR_CODE,
                        message: 'Error occured while deleting ' + errorCount + '  Record(s)!'
                    });
                } else {
                    console.log('res :: delete agent=> ');
                    // let msg;
                    // if (successCount > 0 && errorCount > 0) {
                    //     msg = successCount + ' Agent(s) deleted successfully' + ', ' + errorCount + ' Duplicate record(s) found!';
                    // } else if (successCount > 0 && errorCount === 0) {
                    //     msg = successCount + ' Agent(s) added successfully'
                    // }
                    // console.log('msg => ', msg);
                    res.json({
                        code: Constant.SUCCESS_CODE,
                        message: 'Agents deleted successfully.',
                    });
                }
            });
        } else {
            res.json({ code: Constant.ERROR_CODE, message: 'Agent Id is required.' });
        }
    } catch (error) {
        console.log('error => ', error);
        res.json({
            code: Constant.ERROR_CODE,
            message: error.message
        });
    }
}