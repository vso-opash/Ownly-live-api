'use strict';

var mongoose = require('mongoose'),
    verification = require('./../models/Verification.js'),
    Groups = mongoose.model('Group'),
    User = mongoose.model('User'),
    DeviceInfo = mongoose.model('device_info'),
    LastLoggedRoleInfo = mongoose.model('LastLoggedRole'),
    NotificationInfo = mongoose.model('NotificationStatus'),
    InvitationInfo = mongoose.model('invitations'),
    Permission = mongoose.model('Permission'),
    Agency = mongoose.model('Agency'),
    Admin = mongoose.model('Admin'),
    Role = mongoose.model('Role'),
    jwt = require('jsonwebtoken'),
    AdminLog = mongoose.model('adminLog'),
    UserLastLogSchema = mongoose.model('userLastLogin'),
    validator = require('../../config/validator.js'),
    Config = require('../../config/config.js'),
    Constant = require('../../config/constant.js'),
    crypto = require("crypto"),
    async = require("async"),
    waterfall = require('run-waterfall'),
    request = require('request');
var sendmail = require('sendmail')();
var _ = require('underscore');
var changeCase = require('change-case')
var d = new Date();
var moment = require('moment');
var currentYear = d.getFullYear();
var bcrypt = require('bcrypt');
var forEach = require('async-foreach').forEach;
//Twillio 
var accountSid = (Constant.TWILLIO_ACCOUNT_ID) ? Constant.TWILLIO_ACCOUNT_ID : 'ACbc845974516c288934600a9073e0ca16';
var authToken = (Constant.TWILLIO_AUTH_TOKEN) ? Constant.TWILLIO_AUTH_TOKEN : '0bb8699484c388876590bd6dd16d45e7';
var twilio = require('twilio');
var client = new twilio(accountSid, authToken);
//OTP 
var lib = require('otplib');
var otp = lib.authenticator;
// Generate a salt
var salt = bcrypt.genSaltSync(10);


var d = new Date();
var moment = require('moment');
var currentYear = d.getFullYear();


//Twillio 
var accountSid = (Constant.TWILLIO_ACCOUNT_ID) ? Constant.TWILLIO_ACCOUNT_ID : 'ACbc845974516c288934600a9073e0ca16';
var authToken = (Constant.TWILLIO_AUTH_TOKEN) ? Constant.TWILLIO_AUTH_TOKEN : '0bb8699484c388876590bd6dd16d45e7';
var twilio = require('twilio');
var client = new twilio(accountSid, authToken);

//OTP 
var lib = require('otplib');
var otp = lib.authenticator;
// Generate a salt
var salt = bcrypt.genSaltSync(10);
var nodemailer = require("nodemailer");
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
const https = require('https');
const mail_helper = require('../helpers/mail_helper');
const { google } = require('googleapis');
const userModel = require("../models/Users");
const sendgridHelper = require("../helpers/sendgrid");

module.exports = {
    userRegister: userRegister,
    userLogin: userLogin,
    userActivation: userActivation,
    userSignIn: userSignIn,
    userSignUp: userSignUp,
    resetUserPassword: resetUserPassword,
    forgotPassword: forgotPassword,
    resendAccountActivationMail: resendAccountActivationMail,
    checkPasswordResetTokenValid: checkPasswordResetTokenValid,
    userLogout: userLogout,
    loggedin: loggedin,
    activateUserAccount: activateUserAccount,
    facebookLogin: facebookLogin,
    googleLogin: googleLogin,
    socialLogin: socialLogin,
    is_admin_loggedin: is_admin_loggedin,
    adminUserLogout: adminUserLogout,
    adminForgotPassword: adminForgotPassword,
    resetAdminPassword: resetAdminPassword,
    storeLastLoggedUserRole: storeLastLoggedUserRole,
    getLastLoggedUserRole: getLastLoggedUserRole,
    getPermissionById: getPermissionById,
    getNotificationStatus: getNotificationStatus,
    saveUserNotificationStatus: saveUserNotificationStatus,
    directLoginAfterRegistration: directLoginAfterRegistration,
    getUserRole: getUserRole,
    adminLogin: adminLogin,
    isResetUserPasswordLinkExist: isResetUserPasswordLinkExist,
    activate_account: activate_account,
    validate_account_activation_code: validate_account_activation_code,
    directLoginAfterAccountActivation: directLoginAfterAccountActivation,
    userRoleConfirmation: userRoleConfirmation,
    accountActivationRegistration: accountActivationRegistration
};

/**
 * Function is use to check admin login status
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 30-July-2017
 */
function loggedin(req, res) {
    if (req.headers && req.headers.authorization) {
        var parts = req.headers.authorization.split(' ');
        if (parts.length == 2) {
            jwt.verify(parts[1], Config.SECRET, function (err, user) {
                if (err) {
                    res.json({ code: 402, "Failure": Constant.AUTHENTICATION_FAILED });
                } else {
                    if (user) {
                        User.findById(user.id).select({ '_id': 1, 'firstname': 1, 'lastname': 1, 'email': 1 }).exec(function (err, user) {
                            if (err)
                                res.json({ code: 402, "Failure": Constant.AUTHENTICATION_FAILED });
                            else if (!user)
                                res.json({ code: 402, "Failure": Constant.AUTHENTICATION_FAILED });
                            else
                                res.json({ "code": 200, status: "OK", user: user });
                        });
                    } else {
                        res.json({ code: 402, "Failure": Constant.AUTHENTICATION_FAILED });
                    }
                }
            });
        } else {
            res.json({ code: 402, "Failure": Constant.AUTHENTICATION_FAILED });
        }
    } else {
        res.json({ code: 402, "Failure": Constant.AUTHENTICATION_FAILED });
    }
}
/**
 * Function is use to check admin login status of admin
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 20-Sep-2017
 */
function is_admin_loggedin(req, res) {
    if (req.headers && req.headers.authorization) {
        var parts = req.headers.authorization.split(' ');
        if (parts.length == 2) {
            jwt.verify(parts[1], Config.SECRET, function (err, user) {
                if (err) {
                    res.json({ code: 402, "Failure": Constant.AUTHENTICATION_FAILED });
                } else {
                    if (user) {
                        Admin.findById(user.id).select({ '_id': 1, 'firstname': 1, 'lastname': 1, 'email': 1 }).exec(function (err, user) {
                            if (err)
                                res.json({ code: 402, "Failure": Constant.AUTHENTICATION_FAILED });
                            else if (!user)
                                res.json({ code: 402, "Failure": Constant.AUTHENTICATION_FAILED });
                            else
                                res.json({ "code": 200, status: "OK", user: user });
                        });
                    } else {
                        res.json({ code: 402, "Failure": Constant.AUTHENTICATION_FAILED });
                    }
                }
            });
        } else {
            res.json({ code: 402, "Failure": Constant.AUTHENTICATION_FAILED });
        }
    } else {
        res.json({ code: 402, "Failure": Constant.AUTHENTICATION_FAILED });
    }
}
/**
 * Functionality to send sms verification code
 * @access private
 * @return json
 * created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 29-Aug-2017
 */
function sendmessage(options) {
    client.messages.create({
        to: options.to,
        from: options.from,
        body: options.body,
    }, function (err, message) {
        if (err) {
            return false;
        } else {
            return true;
        }
    });
}

/**
 * Functionality to check is user is verified
 * @access private
 * @return json
 * created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 29-Aug-2017
 */
function isVerified(data, callback) {
    verification.find({ "user": req.body.uid, "code": req.body.otp, expired: { $gt: moment.utc().format() } }, function (err, data) {
        callback(err, data)
    });

}

/**
 * Functionality to activate user account
 * @access private
 * @return json
 * created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 29-Aug-2017
 */
function activateUserAccount(req, res) {
    User.findOneAndUpdate({ '_id': req.body.userId, 'is_active': false }, { 'is_active': true, 'status': true }, function (err, data) {
        if (err) {
            return res.json({
                code: Constant.INVALID_CODE,
                message: Constant.INVALID_ACTIVATION_LINK

            });
        } else if (data) {
            return res.json({
                code: Constant.SUCCESS_CODE,
                message: Constant.USER_ACCOUNT_ACTIVATION
            });
        } else {
            return res.json({
                code: Constant.ERROR_CODE,
                message: Constant.USER_ACCOUNT_ACTIVATED
            });
        }
    });
}

/**
 * Function is use to sign up user account
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Jan-2017
 */
function userRegister(req, res) {
    var userInfo = {};
    var outputJSON = {};
    // req.body.mobile_no = "+65" + req.body.mobile_no;
    // var user_image = req.body.user_image ? req.body.user_image : "no_image.png";
    if ((req.body.email) && (req.body.password) && (req.body.firstname) && (req.body.lastname)) {
        // if (validator.isEmail(req.body.email)) {
        User.find({ email: (req.body.email).toLowerCase(), is_deleted: false },
            {
                email: 1,
                is_active: 1
            },
            function (err, email) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    if (email.length > 0 && email[0].firstname != req.body.firstname && email[0].lastname != req.body.lastname) {
                        console.log('email => ', email[0]);
                        console.log('email[0].is_active => ', email[0].is_active);
                        if (email[0].is_active) {
                            res.json({ code: Constant.ALLREADY_EXIST, message: Constant.EMAIL_ALREADY_EXIST });
                        } else {
                            // Not active users
                            res.json({ code: Constant.INACTIVATE, message: Constant.ACCOUNT_INACTIVE });
                        }
                    } else {
                        // var secret = otp.generateSecret();
                        // var code = otp.generate(secret);
                        var hash = bcrypt.hashSync(req.body.password, salt);
                        var userData = {
                            password: hash,
                            firstname: req.body.firstname,
                            lastname: req.body.lastname,
                            email: (req.body.email).toLowerCase(),
                            mobile_no: req.body.mobile_no,
                            name: req.body.firstname + " " + req.body.lastname,
                            // otp: code,
                            is_active: false,
                            deleted: false,
                            country: 'Austrailia'
                        };
                        if (req.body.agency_id)
                            userData.agency_id = mongoose.Types.ObjectId(req.body.agency_id);
                        if (req.body.trader_id)
                            userData.trader_id = mongoose.Types.ObjectId(req.body.trader_id);
                        if (req.body.agent_id)
                            userData.agent_id = mongoose.Types.ObjectId(req.body.agent_id);

                        if (req.body.role_id === Constant.TRADER) {
                            userData.defaultUserRole = "trader"
                        }
                        var UsersRecord = new User(userData);
                        // call the built-in save method to save to the database
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
                                        // otp: userInfo.otp,
                                    }
                                    var obj = {}, obj2 = {};
                                    obj2.user_id = userInfo.userId;
                                    obj.user_id = userInfo.userId;
                                    obj.role_id = req.body.role_id;
                                    obj.is_master_role = true;
                                    var groupUser = new Groups(obj);
                                    var notification = new NotificationInfo(obj2);
                                    //  sendgrid - create contact api
                                    if (req.body.role_id === Constant.TRADER) {
                                        console.log('trader user => ', userInfo);
                                        let obj = {
                                            "contacts": [
                                                {
                                                    email: userInfo.email,
                                                    first_name: userInfo.firstname,
                                                    last_name: userInfo.lastname
                                                }
                                            ]
                                        }
                                        sendgridHelper.createSingleContact(obj);
                                    }
                                    waterfall([
                                        function (callback) {
                                            groupUser.save(function (err, group) {
                                                if (err) {
                                                    //res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                    callback(err, false);
                                                } else {
                                                    callback(null, group);
                                                }
                                            });
                                        },
                                        function (formData, callback) {
                                            // console.log('formData',formData);
                                            // console.log("==> 1");
                                            notification.save(function (err, formData) {
                                                // console.log("==> formData : ", formData);
                                                if (err) {
                                                    //res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                    callback(err, false);
                                                } else {
                                                    // console.log('formData',formData);
                                                    // console.log('req.body.role_id', req.body.role_id);
                                                    if (req.body.role_id == Constant.OWN_AGENCY || req.body.role_id == Constant.runStrataManagementCompany) {
                                                        var agency = {};
                                                        agency.name = userInfo.firstname + " " + userInfo.lastname;
                                                        agency.no_of_property = 0;
                                                        agency.principle_id = userInfo.userId;
                                                        var agencyData = new Agency(agency);
                                                        agencyData.save(function (err, agency) {
                                                            if (err) {
                                                                //res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                                callback(err, false);
                                                            } else {
                                                                User.update({ _id: userInfo.userId }, { $set: { 'agency_id': agency._id } }, function (err) {
                                                                    if (err) {
                                                                        callback(err, false);
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                    callback(null, formData);
                                                }
                                            });
                                            //console.log('formData',formData);
                                            // if (err) {
                                            //     callback(err, false);
                                            // } else {
                                            //     delete formData.file;
                                            //     callback(null, formData);
                                            // }
                                        }
                                        // ,
                                        // function(formData, callback) {
                                        //     console.log('formData 2    ',formData);
                                        //     User.update({ _id: userInfo.userId }, { $set: { 'agency_id': formData._id } }, function (err,response) {
                                        //         if (err) {
                                        //             //res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                        //             callback(err, false);
                                        //         }else{
                                        //             callback(null, response);
                                        //         } 
                                        //     });
                                        // }
                                    ],
                                        function (err, userData) {
                                            // console.log('end user data',userData);
                                            if (err) {
                                                outputJSON = {
                                                    'code': Constant.ERROR_CODE,
                                                    'message': Constant.ACCOUNT_REGISTERED
                                                };
                                            } else {
                                                // console.log('success');
                                                var mailOptions = {
                                                    from: Config.EMAIL_FROM, // sender address
                                                    to: req.body.email, // list of receivers
                                                    subject: 'Verification & account activation', // Subject line
                                                    text: 'Verification &  account activation', // plaintext body
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
                                                        '<p>Thank you for choosing Ownly. Please activate your account by clicking below.</p>' +
                                                        '<p><a target="_blank" href="' + Constant.STAGGING_URL + '#!/activeUser/' + userInfo.userId + '">' + 'click here ' + '</a><br /></p>' +
                                                        '<p></p>' +
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
                                                // send mail with defined transport object
                                                // transporter.sendMail(mailOptions, function (error, response) {
                                                //     if (error) {
                                                //         res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                                //     } else {
                                                //         res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                                //     }
                                                // });


                                                let info = transporter.sendMail({
                                                    from: mailOptions.from,
                                                    to: req.body.email,
                                                    subject: mailOptions.subject,
                                                    text: 'Verification & account activation',
                                                    html: mailOptions.html
                                                }, function (error, response) {
                                                    console.log("===============================");
                                                    if (error) {
                                                        console.log("eeeeee", error);
                                                        res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                                    } else {
                                                        console.log("Message sent: Successfully   ", mailOptions.to);
                                                        res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                                    }
                                                });

                                                // sendmail({
                                                //     from: mailOptions.from,
                                                //     to: req.body.email,
                                                //     subject: 'Verification & account activation',
                                                //     html: mailOptions.html,
                                                // }, function (err, response) {
                                                //     // console.log(err && err.stack);
                                                //     // console.dir(reply);
                                                //     if (err) {
                                                //         res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                                //     } else {
                                                //         res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                                //     }
                                                // });
                                                //res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                            }
                                        });
                                }
                            }
                        });
                    }

                }
            });
        // } else {
        //     res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL });
        // }
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQUIRED_REGISTER_FIELDS });
    }
}

/**
 * Function is use to login user
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Jan-2017
 */
function userLogin(req, res) {
    var userInfo = {};
    var roleInfo = {};
    try {
        if ((req.body.email) && (req.body.password)) {
            // if (validator.isEmail(req.body.email)) {
            User.findOne({ email: req.body.email, is_deleted: false }, function (err, userInfo) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else if (userInfo) {
                    // console.log("userInfo");
                    // console.log(userInfo);
                    if (userInfo.is_active === true && userInfo.is_suspended === false) {
                        console.log('userInfo.password => ', userInfo.password);
                        try {
                            if (bcrypt.compareSync(req.body.password, userInfo.password)) {
                                if (userInfo.status == 0) {
                                    res.json({ code: Constant.ERROR_CODE, message: Constant.ACCOUNT_INACTIVE, data: {} });
                                } else if (userInfo.deleted == true) {
                                    res.json({ code: Constant.ERROR_CODE, message: Constant.ACCOUNT_DELETED, data: {} });
                                } else {
                                    var expirationDuration = 60 * 60 * 2160 * 1; // expiration duration 90 days
                                    // var expirationDuration = 60 * 60 * 168 * 1; // expiration duration 8 Hours
                                    var params = { id: userInfo._id };

                                    var jwtToken = jwt.sign(params, Config.SECRET, {
                                        expiresIn: expirationDuration
                                    });
                                    if (validator.isValid(jwtToken)) {
                                        // console.log("roleInfo!!!!!!!!!!!!!!!!!");
                                        var device_token = (typeof (req.body.device_type) != "undefined") ? req.body.device_type : "";
                                        if (device_token != "" && device_token != null) {
                                            //console.log("here");
                                            var deviceData = {};
                                            deviceData.device_token = req.body.device_token;
                                            deviceData.uuid = req.body.uuid;
                                            deviceData.platform = req.body.platform;
                                            deviceData.model = req.body.model;
                                            deviceData.status = true;
                                            deviceData.user = userInfo._id;
                                            var Device = new DeviceInfo(deviceData);
                                            Device.save(function (err, group) {
                                                if (err) {
                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                } else {
                                                    LastLoggedRoleInfo.findOne({ user_id: userInfo._id, deleted: false }, null, { sort: { "updatedAt": -1 } }, function (err, lastlogData) {
                                                        if (err) {
                                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                        } else if (lastlogData) {
                                                            var objMerge;
                                                            objMerge = JSON.stringify(lastlogData) + JSON.stringify(userInfo);
                                                            objMerge = objMerge.replace(/\}\{/, ",");
                                                            objMerge = JSON.parse(objMerge);
                                                            res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: objMerge, 'token': 'Bearer ' + jwtToken });
                                                        } else {
                                                            Groups.findOne({ user_id: userInfo._id, deleted: false }, function (err, roleInfo) {
                                                                if (err) {
                                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                                } else {
                                                                    var obj = {};
                                                                    obj.group_id = roleInfo._id;
                                                                    obj.user_id = userInfo._id;
                                                                    obj.role_id = roleInfo.role_id;
                                                                    var roleLog = new LastLoggedRoleInfo(obj);
                                                                    roleLog.save(function (err, role) {
                                                                        if (err) {
                                                                            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
                                                                        } else {
                                                                            //Check last 
                                                                            var objMerge;
                                                                            objMerge = JSON.stringify(lastlogData) + JSON.stringify(userInfo);
                                                                            objMerge = objMerge.replace(/\}\{/, ",");
                                                                            objMerge = JSON.parse(objMerge);
                                                                            res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: objMerge, 'token': 'Bearer ' + jwtToken });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    }); //.sort({ 'updatedAt': 1 });

                                                    //res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: userInfo, 'token': 'Bearer ' + jwtToken });
                                                }
                                            })
                                        } else {
                                            LastLoggedRoleInfo.findOne({ user_id: userInfo._id, deleted: false }, null, { sort: { "updatedAt": -1 } }, function (err, lastlogData) {

                                                if (err) {
                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                } else if (lastlogData) {
                                                    var myObjectList = [];
                                                    myObjectList.push(userInfo);
                                                    myObjectList.push(lastlogData);
                                                    var myObjectList = { userInfo: userInfo, roleInfo: lastlogData };

                                                    res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: myObjectList, 'token': 'Bearer ' + jwtToken });
                                                } else {
                                                    Groups.findOne({ user_id: userInfo._id, deleted: false }, function (err, roleInfo) {
                                                        if (err) {
                                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                        } else {

                                                            var obj = {};
                                                            obj.group_id = roleInfo._id;
                                                            obj.user_id = userInfo._id;
                                                            obj.role_id = roleInfo.role_id;
                                                            var roleLog = new LastLoggedRoleInfo(obj);
                                                            roleLog.save(function (err, role) {
                                                                if (err) {
                                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
                                                                } else {
                                                                    //Check last 
                                                                    var myObjectList = [];
                                                                    myObjectList.push(userInfo);
                                                                    myObjectList.push(roleInfo);
                                                                    var myObjectList = { userInfo: userInfo, roleInfo: roleInfo };
                                                                    res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: myObjectList, 'token': 'Bearer ' + jwtToken });
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            }); //.sort({ 'updatedAt': 1 });
                                        }
                                    } else {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.AUTH_ERROR });
                                    }
                                }
                            } else {
                                console.log('invalid password => ');
                                res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_LOGIN_DETAILS });
                            }
                        } catch (error) {
                            res.json({ code: Constant.ERROR_CODE, message: error.message });
                        }
                    } else if (userInfo.is_active === false) {
                        res.json({ code: Constant.INACTIVATE, message: Constant.ACCOUNT_INACTIVE });
                    } else if (userInfo.is_suspended === true) {
                        console.log('suspended user => ');
                        res.json({ code: Constant.ERROR_CODE, message: 'Your account has been suspended.' });
                    }
                } else {
                    res.json({ code: Constant.NOT_FOUND, message: Constant.USER_NOT_EXIST });
                }
            });
            // } else {
            //     res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL });
            // }
        } else {
            res.json({ code: Constant.ERROR_CODE, message: Constant.LOGIN_REQUIRED_FIELDS });
        }
    } catch (error) {
        res.json({ code: Constant.ERROR_CODE, message: error.message });
    }

}


/**
 * Function is use to sign up user account with email and password
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 11th-April-2017
 */
function userSignUp(req, res) {
    var userInfo = {}
    if ((req.body.email) && (req.body.password)) {
        User.findOne({ email: req.body.email }, { email: 1 }, function (err, email) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                if (email) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.email_ALREADY_EXIST });
                } else {
                    var hash = bcrypt.hashSync(req.body.password, salt);
                    var userData = {
                        email: req.body.email,
                        password: hash,
                        status: 1,
                        deleted: false
                    };
                    console.log('req.body => ', req.body);

                    if (req.body.role_id === Constant.TRADER) {
                        userData.defaultUserRole = "trader"
                    }
                    var UsersRecord = new User(userData);
                    // call the built-in save method to save to the database
                    UsersRecord.save(function (err, userInfo) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                        } else {
                            if (userInfo) {
                                userInfo = {
                                    userId: userInfo._id,
                                    email: userInfo.email
                                }
                            }
                            res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                        }
                    });
                }
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.SIGNUP_REQUIRED_FIELDS });
    }
}


/**
 * Function is use to login user with email and password
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 19th-July-2017
 */
function userSignIn(req, res) {
    var jwtToken = null;
    if ((req.body.email) && (req.body.password)) {
        User.findOne({ email: req.body.email }, function (err, userInfo) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                if (userInfo != null) {
                    if (bcrypt.compareSync(req.body.password, userInfo.password)) {
                        if (userInfo.status == 0) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.ACCOUNT_INACTIVE, data: {} });
                        } else if (userInfo.deleted == true) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.ACCOUNT_DELETED, data: {} });
                        } else {
                            var appenddata = {
                                device_token: req.body.device_token,
                                device_type: req.body.device_type,
                            }
                            User.update({ _id: userInfo._id }, { $set: appenddata }, function (err) {
                                if (err) {
                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                } else {
                                    var userRecords = {
                                        userId: userInfo._id,
                                        email: userInfo.email,
                                        createdAt: userInfo.createdAt
                                    }
                                    var expirationDuration = 60 * 60 * 8 * 1; // expiration duration 8 Hours
                                    var params = {
                                        id: userInfo._id
                                    }
                                    jwtToken = jwt.sign(params, Config.SECRET, {
                                        expiresIn: expirationDuration
                                    });
                                    if (validator.isValid(jwtToken)) {
                                        res.json({ code: Constant.SUCCESS_CODE, message: Constant.LOGIN_SUCCESS, data: userRecords, 'token': 'Bearer ' + jwtToken });
                                    }
                                }
                            });
                        }
                    } else {
                        res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_LOGIN_DETAILS, data: {} });
                    }
                } else {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_LOGIN_DETAILS, data: {} });
                }

            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.LOGIN_REQUIRED_FIELDS, data: {} });
    }
}

/**
 * Function is use to activate user account after sign up by user id
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-July-2017
 */
function userActivation(req, res) {
    var userId = req.swagger.params.id.value;
    var updateUserRecord = {
        status: 1,
    }
    User.update({ _id: userId }, { $set: updateUserRecord }, function (err) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_ACTIVATED });
        }
    });
}

/**
 * Resend Account Activation Email
 */
function resendAccountActivationMail(req, res) {
    if (req.body.email) {
        try {
            if (validator.isEmail(req.body.email)) {
                console.log('req.body.email => ', req.body.email);
                User.findOne({ email: req.body.email }, async function (err, userData) {
                    if (err) {
                        res.json({ code: Constant.ERROR_CODE, message: err.message });
                    } else {
                        if (userData) {
                            console.log('userData => ', userData);
                            let activation_code = userData.activation_code;
                            let userId = userData._id;
                            let infoObj = {
                                activationURL: Constant.STAGGING_URL + '#!/activeUser/' + userData._id,
                                firstName: userData.firstname,
                                lastName: userData.lastname,
                                logoURL: Constant.STAGGING_URL + 'assets/images/logo-public-home.png'
                            }
                            var options = {
                                from: Config.EMAIL_FROM, // sender address
                                to: req.body.email, // list of receivers
                                subject: 'Verification & account activation', // Subject line
                                text: 'Verification &  account activation', // plaintext body
                            }

                            let mail_response = await mail_helper.sendEmail(options, 'account_activation_email', infoObj);
                            console.log('mail_response => ', mail_response);
                            res.json({ code: Constant.SUCCESS_CODE, message: 'Email sent successfully.' });
                        } else {
                            res.json({ code: Constant.ERROR_CODE, message: 'No user data found!' });
                        }
                    }
                });
            } else {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL });
            }
        } catch (error) {
            console.log('error => ', error);
            res.json({ code: Constant.ERROR_CODE, message: error.message });
        }
    } else {
        res.json({ code: Constant.ERROR_CODE, message: 'Email is required.' });
    }
}

/**
 * Function is use to reset user password
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-July-2017
 */
function resetUserPassword(req, res) {
    User.find({ 'resetPasswordToken': req.body.id, 'is_deleted': false, 'resetPasswordExpires': { $gt: Date.now() } }, function (err, user) {
        var hash = bcrypt.hashSync(req.body.password, salt);
        if (!user) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.PASSWORD_RESET_TOKEN_EXPIRED, isTokenValid: false });
        } else if (user.length) {
            req.body.id = user[0]._id;
            User.update({ '_id': user[0]._id }, { $set: { 'password': hash, 'resetPasswordToken': ' ', resetPasswordExpires: ' ' } }, function (err, userDetails) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    res.json({ code: Constant.SUCCESS_CODE, 'message': Constant.PASSWORD_RESET, data: userDetails.email });
                }
            });
        } else {
            return res.json({ code: 400, 'message': 'Reset password token expires! Regenerate token to set password' });
        }
    });
}
/**
 * Function is use to reset user password
 * @access private
 * @return json
 * Created by Sarvesh Dwivedi
 * @smartData Enterprises (I) Ltd
 * Created Date 01st-June-2017
 */
function forgotPassword(req, res) {
    var token;
    var isUserExist = 0;
    var username;
    var local = 'http://localhost:5074/#!/resetPassword/';
    var server = 'http://52.39.212.226:5074/#!/resetPassword/';
    async.series([ //you can use "async.series" as well
        function (callback) {
            crypto.randomBytes(20, function (err, buf) {
                token = buf.toString('hex');
                callback(null);
            });
        },
        function (callback) {
            User.findOne({ email: req.body.email, is_deleted: false, is_active: true }, function (err, user) {
                if (!user) {
                    callback(Constant.EMAIL_INCORRECT);
                } else {
                    console.log('user.is_suspended => ', user.is_suspended);
                    if (!user.is_suspended) {
                        username = changeCase.sentenceCase(user.firstname);
                        var UserData = {
                            resetPasswordToken: token,
                            resetPasswordExpires: Date.now() + 3600000, // 1 hour
                        }
                        User.update({ _id: user._id }, { $set: UserData }, function (err) {
                            if (err) {
                                callback(err);
                            } else {
                                isUserExist = 1;
                                callback(null);
                            }
                        });
                    } else {
                        res.json({ code: Constant.ERROR_CODE, message: 'Your account has been suspended.' });
                    }
                }
            });
        },
        function (callback) {
            if (isUserExist == 1) {
                var html = '<!DOCTYPE html>' +
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
                    '<table style="width: 100%;font-family: SF Text;">' +
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
                    '<p><strong> Hi' + ' ' + username + ',' + '</strong></p>' +
                    ' <p>You are receiving this because you (or someone else) have requested the reset of the password for your account. Please click below and reset your password for the security of your account:</p>' +
                    // '<p><a target="_blank" href="'+Constant.LOCAL_URL + 'resetPassword/' + token + '">' + 'click here to reset' + '</a><br /></p>' +
                    // '<p><a target="_blank" href="'+Constant.LOCAL_URL + 'forgotPassword'+ '">' + 'click here to reset' + '</a><br /></p>' +
                    '<p><a target="_blank" href="' + Constant.STAGGING_URL + '#!/resetPassword/' + token + '">' + 'click here ' + '</a><br /></p>' +
                    '<p></p>' +
                    '<p><br />Thanks for choosing Ownly,</p>' +
                    '<p>Ownly Team.</p>' +
                    '</td>' +
                    '</tr>' +
                    '</table>' +
                    '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
                    '<tr>' +
                    '<td>' +
                    '<div align="center" style="font-size:12px;font-family: SF UI Text;margin: 10px 0px; padding:5px; width:100%;">© ' +
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
                transporter.sendMail({
                    from: Config.EMAIL_FROM, // sender address
                    to: req.body.email, //Config.EMAIL_TEMP, // 'smartData@yopmail.com' For Sandbox subdomains add the address to authorized recipients in Account Settings or Please add your own domain for email
                    subject: 'Forgot Password', // Subject line
                    text: 'Forgot Password', // plaintext body
                    html: html
                }, function (err, info) {
                    if (err) {
                        console.log('err', err);
                        callback(Constant.SENT_FORGOT_EMAIL_FAILED);
                    } else {
                        callback(null);
                    }
                });
                // sendmail({
                //     from: Config.EMAIL_FROM,
                //     to: req.body.email,
                //     subject: 'Forgot Password',
                //     html: html,
                // }, function (err, response) {
                //     console.log("err    ", err);
                //     if (err) {
                //         callback(Constant.SENT_FORGOT_EMAIL_FAILED);
                //     } else {
                //         callback(null);
                //     }
                // });
            } else {
                callback(err);
            }
        },
    ], function (err) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: err });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, message: Constant.SENT_FORGOT_EMAIL });
        }
    });
}

/**
 * Function is use to check whether password reset token valid or not
 * @access private
 * @return json
 * Created by Sarvesh Dwivedi
 * @smartData Enterprises (I) Ltd
 * Created Date 01st-June-2017
 */
function checkPasswordResetTokenValid(req, res) {
    User.findOne({ resetPasswordToken: req.body.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
        if (!user) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.PASSWORD_RESET_TOKEN_EXPIRED, isTokenValid: false });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, 'message': Constant.PASSWORD_RESET_TOKEN_VALID, isTokenValid: true, userId: user._id });
        }
    });
}

/**
 * Function is use to create JWT
 * @access private
 * @return json
 * Created by Sarvesh Dwivedi
 * @smartData Enterprises (I) Ltd
 * Created Date 01st-June-2017
 */
function createJWT(user) {
    var expirationDuration = 60 * 60 * 8 * 1;
    var params = { id: User._id };
    return jwtToken = jwt.sign(params, Config.SECRET, { expiresIn: expirationDuration });
}


/**
 * Function is use to login user
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 13-June-2017
 */
function userLogout(req, res) {
    if (typeof (req.body.user_id) != "undefined") {
        User.update({ "_id": req.body.user_id }, {
            $set: { "is_online": false }
        }, function (err, devicInfo) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                res.json({ code: Constant.SUCCESS_CODE, message: Constant.USER_LOG_OUT });
            }
        })
    }
    else {
        res.json({ code: Constant.SUCCESS_CODE, message: Constant.USER_LOG_OUT });
    }
}
/**
 * Function is use to logout
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 13-June-2017
 */
function adminUserLogout(req, res) {
    res.json({ code: Constant.SUCCESS_CODE, message: Constant.USER_LOG_OUT });
}

// Facebook Login API for Portal Users
function facebookLogin(req, res) {
    console.log('req.body :: facebooklogin => ', req.body);
    var fields = ['id', 'email', 'first_name', 'last_name', 'name'];
    var accessTokenUrl = 'https://graph.facebook.com/v2.5/oauth/access_token';
    var graphApiUrl = 'https://graph.facebook.com/v2.5/me?fields=' + fields.join(',');
    var params = {
        code: req.body.code,
        client_id: req.body.clientId,

        // for staging - syncitt
        // client_secret: "b7d9f601c04b3fc6d3d33900bce4a5de",
        client_secret: "e78f3fda2fa6b0ef95408335b55e85b0",
        // for Production - ownly
        // client_secret: "b60087da0a2c06a21c9d5a82e8b75ea3",

        // client_secret: "8ecb821fe948a1eba126228b860929f1",
        redirect_uri: req.body.redirectUri
    };
    // Step 1. Exchange authorization code for access token
    request.get({
        url: accessTokenUrl,
        qs: params,
        json: true
    }, function (err, response, accessToken) {
        if (response.statusCode !== 200) {
            return res.status(500).send({
                message: accessToken.error.message
            });
        }
        // Step 2. Retrieve profile information about the current user.
        request.get({
            url: graphApiUrl,
            qs: accessToken,
            json: true
        }, function (err, response, profile) {
            console.log('profile => ', profile);
            if (response.statusCode !== 200) {
                return res.status(500).send({
                    message: profile.error.message
                });
            }
            User.findOne({ 'email': profile.email }, function (err, existingUser) {
                if (err) {
                    console.log('err => ', err);
                    return res.status(500).send({
                        message: err.message
                    });
                } else {
                    var jwtToken;
                    if (existingUser) {
                        var userData = {};
                        userData.data = existingUser;
                        var expirationDuration = 60 * 60 * 8 * 1;
                        var params = { id: existingUser._id };
                        jwtToken = jwt.sign(params, Config.SECRET, { expiresIn: expirationDuration });
                        jwtToken = "Bearer " + jwtToken;
                        userData.token = jwtToken;
                        LastLoggedRoleInfo.findOne({ user_id: existingUser._id, deleted: false }, null, function (err, lastlogData) {
                            if (err) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                            } else if (lastlogData) {
                                var myObjectList = [];
                                myObjectList.push(existingUser);
                                myObjectList.push(lastlogData);
                                var myObjectList = { userInfo: existingUser, roleInfo: lastlogData };
                                res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: myObjectList, token: jwtToken });
                            } else {
                                Groups.findOne({ user_id: existingUser._id, deleted: false }, function (err, roleInfo) {
                                    if (err) {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                    } else {
                                        var obj = {};
                                        obj.group_id = roleInfo._id;
                                        obj.user_id = existingUser._id;
                                        obj.role_id = roleInfo.role_id;
                                        var roleLog = new LastLoggedRoleInfo(obj);
                                        roleLog.save(function (err, role) {
                                            if (err) {
                                                res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
                                            } else {
                                                //Check last 
                                                var myObjectList = [];
                                                myObjectList.push(existingUser);
                                                myObjectList.push(roleInfo);
                                                var myObjectList = { userInfo: existingUser, roleInfo: roleInfo };
                                                res.json({ code: Constant.SUCCESS_CODE, message: 'already exist', data: myObjectList, token: jwtToken });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                        // return res.json({ code: Constant.SUCCESS_CODE, 'message': 'already exist', data: userData });
                    } else {
                        console.log('accessToken => ', accessToken);
                        if (req.body.role_id) {
                            // var user = {};
                            // user.facebook = profile.id;
                            // user.profile_pic = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
                            // user.firstname = profile.first_name;
                            // user.lastname = profile.last_name;
                            // user.email = profile.email;
                            // user.status = true;
                            // user.is_active = true;
                            const user = new User({
                                social_provider: 'FACEBOOK',
                                profile_pic: 'https://graph.facebook.com/' + profile.id + '/picture?type=large',
                                firstname: profile.first_name,
                                lastname: profile.last_name,
                                email: profile.email,
                                status: true,
                                is_active: true,
                                social_token: accessToken.access_token,
                                social_id: profile.id,
                                name: profile.name
                            });
                            // var expirationDuration = 60 * 60 * 8 * 1;
                            // var params = { id: profile.id };
                            // jwtToken = jwt.sign(params, Config.SECRET, { expiresIn: expirationDuration });
                            // user.token = jwtToken;
                            // User(user).save(function (err, data) {
                            user.save(function (err, data) {
                                if (err) {
                                    console.log('err :: while saving user record=> ', err);
                                    res.json({ code: Constant.ERROR_CODE, message: err.message });
                                } else {
                                    var expirationDuration = 60 * 60 * 8 * 1;
                                    console.log('data => ', data);
                                    var params = { id: data._id };
                                    jwtToken = jwt.sign(params, Config.SECRET, { expiresIn: expirationDuration });
                                    jwtToken = "Bearer " + jwtToken;

                                    var obj = {};
                                    obj.user_id = data._id;
                                    obj.role_id = req.body.role_id;
                                    obj.is_master_role = true;
                                    var groupUser = new Groups(obj);
                                    if (groupUser) {
                                        groupUser.save(function (error, grpData) {
                                            if (error) {
                                                console.log('err :: error occured while saving group record =========> ', error);
                                            } else {
                                                console.log('grpData => ', grpData);
                                                if (grpData) {
                                                    var obj = {};
                                                    obj.group_id = grpData._id;
                                                    obj.user_id = data._id;
                                                    obj.role_id = grpData.role_id;
                                                    var roleLog = new LastLoggedRoleInfo(obj);
                                                    roleLog.save(function (err, role) {
                                                        if (err) {
                                                            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
                                                        } else {
                                                            //Check last 
                                                            var myObjectList = [];
                                                            myObjectList.push(data);
                                                            myObjectList.push(role);
                                                            var myObjectList = { userInfo: data, roleInfo: role };
                                                            console.log('myObjectList => ', myObjectList);
                                                            res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: myObjectList, token: jwtToken });
                                                        }
                                                    });
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                        } else {
                            // res.json({ code: Constant.ERROR_CODE, message: 'Please select User role.' });
                            return res.status(500).send({
                                code: 500,
                                message: 'Please select User role.'
                            });
                        }
                    }
                }
            });
        });

    });
}

// Google Login API for Portal Users
function googleLogin(req, res) {
    console.log('req.body :: googlelogin => ', req.body);
    console.log('req.body.code => ', req.body.code);
    const oauth2Client = new google.auth.OAuth2(
        '1057447651047-n6trglkmmcu55de5j0etr4jj6pbo7i1v.apps.googleusercontent.com',
        'SgfLWH1XMKzXzwppwGDg1urd',
        // for Production - ownly
        // 'https://portal.ownly.com.au'
        // for staging - syncitt
        'http://portal.syncitt.world'
        // 'http://localhost:5094'
    );
    const { tokens } = oauth2Client.getToken(req.body.code);
    console.log('tokens :: check here => ', tokens);
    let authToken;
    oauth2Client.getToken(req.body.code, function (err, tokens) {
        console.log('tokens => ', tokens);
        // Now tokens contains an access_token and an optional refresh_token. Save them.
        if (!err) {
            oauth2Client.setCredentials(tokens);
            oauth2Client.on('tokens', (tokens) => {
                if (tokens.refresh_token) {
                    // store the refresh_token in my database!
                    console.log(tokens.refresh_token);
                }
                console.log(tokens.access_token);
                authToken = tokens.access_token;
            });

            var oauth2 = google.oauth2({
                auth: oauth2Client,
                version: 'v2'
            });

            // Fetch User data
            oauth2.userinfo.v2.me.get(
                function (err, response) {
                    if (err) {
                        console.log('Error while getting data ==>', err);
                        return response.status(500).send({
                            message: err.message
                        });
                    } else {
                        console.log('res :: Data fetched successfully ==>', response.data);
                        User.findOne({ 'email': response.data.email }, function (err, existingUser) {
                            if (err) {
                                console.log('err => ', err);
                                return res.status(500).send({
                                    message: err.message
                                });
                            } else {
                                var jwtToken;
                                if (existingUser) {
                                    // var userData = {};
                                    // userData.data = existingUser;
                                    var expirationDuration = 60 * 60 * 8 * 1;
                                    var params = { id: existingUser._id };
                                    jwtToken = jwt.sign(params, Config.SECRET, { expiresIn: expirationDuration });
                                    jwtToken = "Bearer " + jwtToken;
                                    // userData.token = jwtToken;
                                    LastLoggedRoleInfo.findOne({ user_id: existingUser._id, deleted: false }, null, function (err, lastlogData) {
                                        if (err) {
                                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                        } else if (lastlogData) {
                                            var myObjectList = [];
                                            myObjectList.push(existingUser);
                                            myObjectList.push(lastlogData);
                                            var myObjectList = { userInfo: existingUser, roleInfo: lastlogData };

                                            res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: myObjectList, token: jwtToken });
                                        } else {
                                            Groups.findOne({ user_id: existingUser._id, deleted: false }, function (err, roleInfo) {
                                                if (err) {
                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                } else {
                                                    var obj = {};
                                                    obj.group_id = roleInfo._id;
                                                    obj.user_id = existingUser._id;
                                                    obj.role_id = roleInfo.role_id;
                                                    var roleLog = new LastLoggedRoleInfo(obj);
                                                    roleLog.save(function (err, role) {
                                                        if (err) {
                                                            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
                                                        } else {
                                                            //Check last 
                                                            var myObjectList = [];
                                                            myObjectList.push(existingUser);
                                                            myObjectList.push(roleInfo);
                                                            var myObjectList = { userInfo: existingUser, roleInfo: roleInfo };
                                                            res.json({ code: Constant.SUCCESS_CODE, message: 'already exist', data: myObjectList, token: jwtToken });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                    // return res.json({ code: Constant.SUCCESS_CODE, 'message': 'already exist', data: userData });

                                } else {
                                    if (req.body.role_id) {
                                        // var user = {};
                                        // user.facebook = profile.id;
                                        // user.profile_pic = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
                                        // user.firstname = profile.first_name;
                                        // user.lastname = profile.last_name;
                                        // user.email = profile.email;
                                        // user.status = true;
                                        // user.is_active = true;
                                        console.log('authToken ===============================> ', authToken);
                                        const user = new User({
                                            social_provider: 'GOOGLE',
                                            profile_pic: response.data.picture,
                                            firstname: response.data.given_name,
                                            lastname: response.data.family_name,
                                            email: response.data.email,
                                            status: true,
                                            is_active: true,
                                            social_token: authToken,
                                            social_id: response.data.id,
                                            name: response.data.name
                                        });
                                        // var expirationDuration = 60 * 60 * 8 * 1;
                                        // var params = { id: profile.id };
                                        // jwtToken = jwt.sign(params, Config.SECRET, { expiresIn: expirationDuration });
                                        // user.token = jwtToken;
                                        // User(user).save(function (err, data) {
                                        user.save(function (err, data) {
                                            var expirationDuration = 60 * 60 * 8 * 1;
                                            var params = { id: data._id };
                                            jwtToken = jwt.sign(params, Config.SECRET, { expiresIn: expirationDuration });
                                            jwtToken = "Bearer " + jwtToken;
                                            if (err) {
                                                console.log('err :: while saving user record=> ', err);
                                                res.json({ code: Constant.ERROR_CODE, message: err.message });
                                            } else {
                                                var obj = {};
                                                obj.user_id = data._id;
                                                obj.role_id = req.body.role_id;
                                                obj.is_master_role = true;
                                                var groupUser = new Groups(obj);
                                                if (groupUser) {
                                                    groupUser.save(function (error, grpData) {
                                                        if (error) {
                                                            console.log('err :: error occured while saving group record =========> ', error);
                                                        } else {
                                                            console.log('grpData => ', grpData);
                                                            if (grpData) {
                                                                var obj = {};
                                                                obj.group_id = grpData._id;
                                                                obj.user_id = data._id;
                                                                obj.role_id = grpData.role_id;
                                                                var roleLog = new LastLoggedRoleInfo(obj);
                                                                roleLog.save(function (err, role) {
                                                                    if (err) {
                                                                        return res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
                                                                    } else {
                                                                        //Check last 
                                                                        var myObjectList = [];
                                                                        myObjectList.push(data);
                                                                        myObjectList.push(role);
                                                                        var myObjectList = { userInfo: data, roleInfo: role };
                                                                        console.log('myObjectList => ', myObjectList);
                                                                        return res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: myObjectList, token: jwtToken });
                                                                    }
                                                                });
                                                            }
                                                        }
                                                    });
                                                }
                                            }

                                            // data.token = jwtToken;
                                            // return res.json({ code: Constant.SUCCESS_CODE, 'message': 'added successfully', data: data });
                                        });
                                    } else {
                                        // res.json({ code: Constant.ERROR_CODE, message: 'Please select User role.' });
                                        return res.status(500).send({
                                            code: 500,
                                            message: 'Please select User role.'
                                        });
                                    }
                                }
                            }
                        });
                    }
                });

        } else {
            console.log('err => ', err);
            res.status(500).send({
                message: 'not authorized app'
            });
        }
    });
}

// Facebook and Google Login for Public website
function socialLogin(req, res) {
    console.log('req.body :: Social Login api => ', req.body);
    try {
        if ((req.body.email) && (req.body.firstname) && (req.body.social_provider) && (req.body.social_id) && (req.body.social_token)) {
            if (validator.isEmail(req.body.email)) {

                User.findOne({ email: (req.body.email).toLowerCase(), is_deleted: false }, function (err, existingUser) {
                    if (err) {
                        console.log('err :: Error occured while getting UserData =========> ', err);
                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                    } else {
                        console.log('existingUser :: User table =========> ', existingUser);
                        var jwtToken;
                        if (existingUser) {
                            var userData = {};
                            userData.data = existingUser;
                            var expirationDuration = 60 * 60 * 8 * 1;
                            var params = { id: existingUser._id };
                            jwtToken = jwt.sign(params, Config.SECRET, { expiresIn: expirationDuration });
                            jwtToken = "Bearer " + jwtToken;
                            userData.token = jwtToken;
                            return res.json({ code: Constant.SUCCESS_CODE, 'message': 'already exist', data: userData });
                        } else {
                            console.log('new user => ');
                            const user = new User({
                                social_provider: req.body.social_provider,
                                profile_pic: req.body.photoUrl,
                                firstname: req.body.firstname,
                                lastname: req.body.lastname,
                                email: req.body.email,
                                status: true,
                                is_active: true,
                                social_token: req.body.social_token,
                                social_id: req.body.social_id
                            });
                            console.log('user ====================================================> ', user);
                            if (user) {
                                user.save(async function (err, data) {
                                    if (err) {
                                        console.log('err :: Error while saving new user record =========> ', err);
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                    } else {
                                        var expirationDuration = 60 * 60 * 8 * 1;
                                        var params = { id: data._id };
                                        jwtToken = jwt.sign(params, Config.SECRET, { expiresIn: expirationDuration });
                                        jwtToken = "Bearer " + jwtToken;
                                        console.log('jwtToken => ', jwtToken);
                                        // data.token = await jwtToken;
                                        var obj = {};
                                        obj.user_id = data._id;
                                        obj.role_id = req.body.role_id;
                                        obj.is_master_role = true;
                                        var groupUser = new Groups(obj);
                                        if (groupUser) {
                                            groupUser.save(function (error, grpData) {
                                                if (error) {
                                                    console.log('err :: error occured while saving group record =========> ', error);
                                                } else {
                                                    userData = { ...data.toObject(), token: jwtToken };
                                                    console.log('userData => ', userData);
                                                    return res.json({ code: Constant.SUCCESS_CODE, 'message': 'added successfully', data: userData });
                                                }
                                            })
                                        }
                                    }
                                });
                            }
                        }
                    }
                });
            } else {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL });
            }
        } else {
            res.json({ code: Constant.ERROR_CODE, message: Constant.REQUIRED_REGISTER_FIELDS });
        }
    } catch (error) {
        console.log('error => ', error);
    }
}



/**
 * Function is use to reset user password
 * @access private
 * @return json
 * Created by Minakshi K
 * @smartData Enterprises (I) Ltd
 * Created Date 11-Oct-2017
 */
function adminForgotPassword(req, res) {
    var token;
    var isUserExist = 0;
    var username;
    var local = 'http://localhost:5074/#!/resetPassword/';
    var server = 'http://52.39.212.226:5074/#!/resetPassword/';
    async.series([ //you can use "async.series" as well
        function (callback) {
            crypto.randomBytes(20, function (err, buf) {
                token = buf.toString('hex');
                callback(null);
            });
        },
        function (callback) {
            Admin.findOne({ email: req.body.email, is_deleted: false }, function (err, user) {
                if (!user) {
                    callback(Constant.EMAIL_INCORRECT);
                } else {
                    username = changeCase.sentenceCase(user.firstname);
                    var UserData = {
                        resetPasswordToken: token,
                        resetPasswordExpires: Date.now() + 3600000, // 1 hour
                    }
                    Admin.update({ _id: user._id }, { $set: UserData }, function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            isUserExist = 1;
                            callback(null);
                        }
                    });
                }
            });
        },
        function (callback) {
            if (isUserExist == 1) {
                var html = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
                    '<html xmlns="http://www.w3.org/1999/xhtml">' +
                    '<title>OH</title>' +
                    '</head>' +
                    '<meta charset="utf-8">' +
                    '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
                    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
                    '<meta name="description" content="">' +
                    '<meta name="author" content="">' +
                    '<link rel="icon" href="../../favicon.ico">' +
                    '</head>' +
                    '<body>' +
                    '<table style="width: 100%;font-family: Helvetica Neue, Helvetica, Helvetica, Arial, sans-serif;">' +
                    '<tr>' +
                    '<td></td>' +
                    '<td bgcolor="#FFFFFF ">' +
                    '<div style="padding: 15px; max-width: 600px;margin: 0 auto;display: block; border-radius: 0px;padding: 0px;box-shadow: 0 5px 10px rgba(0,0,0,0.3);">' +
                    '<table style="width: 100%;background: #0099ff ;">' +
                    '<tr>' +
                    '<td></td>' +
                    '<td>' +
                    '<div>' +
                    ' <table width="100%">' +
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
                    '<p>' +
                    '<strong> Hi' + ' ' + username + ',' + '</strong></p>' +
                    ' <p> You are receiving this because you (or someone else) have requested the reset of the password for your account. Please click below to complete the process:</p>' +
                    // '<p><p class="email-button">Click or copy link: <a class="trial-trigger standard-trigger" target="_blank" href=" '+ Constant.STAGGING_URL + 'resetPassword/'+token+">"+Constant.STAGGING_URL+'verifyUser'+'</a></p></p>' +
                    '<p><a target="_blank" href="' + Constant.LOCAL_URL_ADMIN + 'resetPassword/' + token + '">' + 'click here to reset' + '</a><br /></p>' +
                    '<br/>' +
                    '<br/>' +
                    '<p><br />Thanks for choosing Ownly,</p>' +
                    '<p>Ownly Team.</p>' +
                    '</td>' +
                    '</tr>' +
                    ' </table>' +
                    '<table style="width: 100%;background: #333; color: #fff;">' +
                    '<tr>' +
                    '<td>' +
                    ' <div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© ' +
                    Config.CURRENT_YEAR +
                    ' <a href="#" style="text-decoration:none;color:#fff;">syncitt.com</a>' +
                    '</div>' +
                    '</td> ' +
                    '</tr>' +
                    '</table>' +
                    '</div>' +
                    ' </td>' +
                    '</tr>' +
                    '</table>' +
                    '</body>' +
                    '</html>';
                // transporter.sendMail({
                //     from: Config.EMAIL_FROM, // sender address
                //     to: req.body.email, //Config.EMAIL_TEMP, // 'smartData@yopmail.com' For Sandbox subdomains add the address to authorized recipients in Account Settings or Please add your own domain for email
                //     subject: 'Forgot Password', // Subject line
                //     text: 'Forgot Password', // plaintext body
                //     html: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
                //     '<html xmlns="http://www.w3.org/1999/xhtml">' +
                //     '<title>OH</title>' +
                //     '</head>' +
                //     '<meta charset="utf-8">' +
                //     '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
                //     '<meta name="viewport" content="width=device-width, initial-scale=1">' +
                //     '<meta name="description" content="">' +
                //     '<meta name="author" content="">' +
                //     '<link rel="icon" href="../../favicon.ico">' +
                //     '</head>' +
                //     '<body>' +
                //     '<table style="width: 100%;font-family: Helvetica Neue, Helvetica, Helvetica, Arial, sans-serif;">' +
                //     '<tr>' +
                //     '<td></td>' +
                //     '<td bgcolor="#FFFFFF ">' +
                //     '<div style="padding: 15px; max-width: 600px;margin: 0 auto;display: block; border-radius: 0px;padding: 0px;box-shadow: 0 5px 10px rgba(0,0,0,0.3);">' +
                //     '<table style="width: 100%;background: #0099ff ;">' +
                //     '<tr>' +
                //     '<td></td>' +
                //     '<td>' +
                //     '<div>' +
                //     ' <table width="100%">' +
                //     '<tr>' +
                //     '<td rowspan="2" style="text-align:center;padding:10px;">' +
                //     '<img class="pull-left" src="http://13.210.134.130:5094/assets/images/logo.png" style="margin: -34px;margin-left: -632px; padding: 11px;">' +
                //     '<h3 style="text-align:center;color:white;margin-top: -8px;"><strong>Forgot Password</strong><h3>' +
                //     '</td>' +
                //     '</tr>' +
                //     '</table>' +
                //     '</div>' +
                //     '</td>' +
                //     '<td></td>' +
                //     '</tr>' +
                //     '</table>' +
                //     '<table style="padding:10px;font-size:14px; width:100%;">' +
                //     '<tr>' +
                //     '<td style="padding:10px;font-size:14px; width:100%;">' +
                //     '<p>' +
                //     '<strong> Hi' + ' ' + username + ',' + '</strong></p>' +
                //     ' <p>You are receiving this because you (or someone else) have requested the reset of the password for your account. Please click below to complete the process:</p>' +
                //     // '<p><p class="email-button">Click or copy link: <a class="trial-trigger standard-trigger" target="_blank" href=" '+ Constant.STAGGING_URL + 'resetPassword/'+token+">"+Constant.STAGGING_URL+'verifyUser'+'</a></p></p>' +
                //     '<p><a target="_blank" href="' + Constant.LOCAL_URL_ADMIN + 'resetPassword/' + token + '">' + 'click here to reset' + '</a><br /></p>' +
                //     '<br/>' +
                //     '<br/>' +
                //     '<p><br />Cheers,</p>' +
                //     '<p>Team OpenHaus</p>' +
                //     '<p>The link between property buyers and sellers</p>' +
                //     '</td>' +
                //     '</tr>' +
                //     ' </table>' +
                //     '<table style="width: 100%;background: #333; color: #fff;">' +
                //     '<tr>' +
                //     '<td>' +
                //     ' <div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© 2018 <a href="#" style="text-decoration:none;color:#fff;">syncitt.com</a>' +
                //     '</div>' +
                //     '</td> ' +
                //     '</tr>' +
                //     '</table>' +
                //     '</div>' +
                //     ' </td>' +
                //     '</tr>' +
                //     '</table>' +
                //     '</body>' +
                //     '</html>'

                // }, function (err, info) {
                //     if (err) {
                //         callback(Constant.SENT_FORGOT_EMAIL_FAILED);
                //     } else {
                //         callback(null);
                //     }
                // });
                sendmail({
                    from: Config.EMAIL_FROM,
                    to: req.body.email,
                    subject: 'Forgot Password',
                    html: html,
                }, function (err, response) {
                    if (err) {
                        callback(Constant.SENT_FORGOT_EMAIL_FAILED);
                    } else {
                        callback(null);
                    }
                });
            } else {
                callback(err);
            }
        },
    ], function (err) {
        if (err) {
            // console.log('err', err);
            res.json({ code: Constant.ERROR_CODE, message: err });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, message: Constant.SENT_FORGOT_EMAIL });
        }
    });
}
/**
 * Function is use to reset admin password
 * @access private
 * @return json
 * Created by Minakshi K
 * @smartData Enterprises (I) Ltd
 * Created Date 13-Oct-2017
 */
function resetAdminPassword(req, res) {
    var hash = bcrypt.hashSync(req.body.password, salt);
    var updateUserRecord = {
        password: hash,
        resetPasswordToken: ' ',
        resetPasswordExpires: ' '
    }
    Admin.find({ 'resetPasswordToken': req.body.id, 'is_deleted': false, 'resetPasswordExpires': { $gt: Date.now() } }, function (err, user) {
        if (!user) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.PASSWORD_RESET_TOKEN_EXPIRED, isTokenValid: false });
        } else if (user.length) {

            req.body.id = user[0]._id;
            Admin.update({ '_id': user[0]._id }, { $set: { 'password': hash, 'resetPasswordToken': ' ', resetPasswordExpires: ' ' } }, function (err, userDetails) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    res.json({ code: Constant.SUCCESS_CODE, 'message': Constant.PASSWORD_RESET, data: userDetails.email });
                }
            });
        } else {
            return res.json({ code: 400, 'message': 'Reset password token expires! Regenerate token to set password' });
        }
    });
}
/**
 * Get permission by user id
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function getPermissionById(req, res) {
    var roles = [];
    Groups.findOne({
        "deleted": false,
        "user_id": req.body.user_id,
        "role_id": req.body.role_id,
    }, function (err, groupsArr) {
        if (!groupsArr) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.PASSWORD_RESET_TOKEN_EXPIRED, isTokenValid: false });
        } else {
            Groups.populate(groupsArr, { path: 'role_id', model: 'Role' }, function (err, roleArr) {
                if (!roleArr) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.PASSWORD_RESET_TOKEN_EXPIRED, isTokenValid: false });
                } else {
                    Groups.populate(roleArr, { path: 'role_id.permission_id', model: 'Permission', select: 'title name' }, function (err, permissionArr) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                        } else {
                            var arr = [], finalArr = [];
                            arr = permissionArr.role_id.permission_id;
                            finalArr = _.pluck(arr, 'name')
                            res.json({ code: Constant.SUCCESS_CODE, 'message': Constant.GROUP_FETCHED_SUCCESS, data: finalArr });
                        }
                    });
                }
            });
        }
    });
}

/**
 * Store logged in user role
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function storeLastLoggedUserRole(req, res) {
    // console.log("storeLastLoggedUserRole req.body", req.body);

    Groups.findOne({ 'user_id': req.body.user_id, 'role_id': req.body.role_id }, '_id', function (err, groupdata) {
        // console.log("groupdata", groupdata);
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
        } else if (groupdata) {
            LastLoggedRoleInfo.findOneAndUpdate({ 'group_id': groupdata._id }, { $set: { 'group_id': groupdata._id } }, function (err, lastLogged) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
                } else if (lastLogged) {
                    res.json({ code: Constant.SUCCESS_CODE, 'message': Constant.SUCCESS_IN_SAVING_LAST_LOGGED_IN_USER });
                } else {
                    var obj = {};
                    obj.group_id = groupdata._id;
                    obj.user_id = req.body.user_id;
                    obj.role_id = req.body.role_id;
                    var roleLog = new LastLoggedRoleInfo(obj);
                    // console.log(obj, "obj!!!!!!!");
                    roleLog.save(function (err, role) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
                        } else {
                            res.json({ code: Constant.SUCCESS_CODE, 'message': Constant.SUCCESS_IN_SAVING_LAST_LOGGED_IN_USER });
                        }
                    });
                }
            });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
        }
    });
}

/**
 * Store logged in user role
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function getLastLoggedUserRole(req, res) {
    Groups.findOne({ 'user_id': req.body.user_id }, 'role_id', function (err, lastRoleLogged) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_GETTING_LAST_LOGGED_IN_USER, isTokenValid: false });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, message: Constant.SUCCESS_IN_SAVISUCCESS_IN_GETTING_LAST_LOGGED_IN_USERNG_LAST_LOGGED_IN_USER, data: lastRoleLogged });
        }

    });
}
/**
 * Store logged in user role
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function getNotificationStatus(req, res) {
    NotificationInfo.findOne({ 'user_id': req.body.user_id }, 'status', function (err, setting) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_GETTING_LAST_LOGGED_IN_USER, isTokenValid: false });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, message: Constant.SUCCESS_IN_SAVISUCCESS_IN_GETTING_LAST_LOGGED_IN_USERNG_LAST_LOGGED_IN_USER, data: setting });
        }

    });
}
/**
 * Save notification status
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function saveUserNotificationStatus(req, res) {
    NotificationInfo.findOneAndUpdate({ 'user_id': req.body.user_id }, { $set: { 'status': req.body.status } }, function (err, lastLogged) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
        } else {
            res.json({ code: Constant.SUCCESS_CODE, 'message': Constant.SUCCESS_IN_SAVING_LAST_LOGGED_IN_USER });

        }
    });
}

/**
 * get user email & password
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function directLoginAfterRegistration(req, res) {
    console.log(' direct Login After Registration api => ');
    var jwtToken = null;
    User.findOne({ '_id': req.body.user_id, is_deleted: false }, function (err, userInfo) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
        } else if (userInfo) {
            User.update({ _id: userInfo._id }, { $set: { 'is_active': true } }, function (err) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    var expirationDuration = 60 * 60 * 8 * 1; // expiration duration 8 Hours
                    var params = {
                        id: userInfo._id
                    }
                    jwtToken = jwt.sign(params, Config.SECRET, {
                        expiresIn: expirationDuration
                    });
                    // if (validator.isValid(jwtToken)) {
                    //     res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: userInfo, 'token': 'Bearer ' + jwtToken });
                    // }
                    // console.log("req.body",req.body);
                    // console.log("typeof(device_type)",typeof(req.body.device_type));
                    if (typeof (req.body.device_type) != "undefined") {
                        var deviceData = {};
                        deviceData.device_token = req.body.device_token;
                        deviceData.uuid = req.body.uuid;
                        deviceData.platform = req.body.platform;
                        deviceData.model = req.body.model;
                        deviceData.status = true;
                        deviceData.user = userInfo._id;
                        var Device = new DeviceInfo(deviceData);
                        Device.save(function (err, group) {
                            if (err) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                            } else {
                                res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: userInfo, 'token': 'Bearer ' + jwtToken });
                            }
                        })
                    } else {

                        LastLoggedRoleInfo.findOne({ user_id: userInfo._id, deleted: false }, null, { sort: { "updatedAt": -1 } }, function (err, lastlogData) {

                            if (err) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                            } else if (lastlogData) {
                                var myObjectList = [];
                                myObjectList.push(userInfo);
                                myObjectList.push(lastlogData);
                                var myObjectList = { userInfo: userInfo, roleInfo: lastlogData };
                                console.log('lastlogData => ', lastlogData);

                                res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: myObjectList, 'token': 'Bearer ' + jwtToken });

                            } else {
                                console.log('no last logged data => ');
                                Groups.findOne({ user_id: userInfo._id, deleted: false }, async function (err, roleInfo) {
                                    if (err) {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                    } else {
                                        console.info('---------------------------------')
                                        console.info('roleInfo =>', roleInfo)
                                        console.info('userInfo =>', userInfo)
                                        console.info('---------------------------------')
                                        var obj = {};
                                        obj.group_id = roleInfo._id;
                                        obj.user_id = userInfo._id;
                                        obj.role_id = roleInfo.role_id;
                                        console.log('roleInfo.role_id :: check for the condition=> ', roleInfo.role_id);
                                        console.log('typeof roleInfo.role_id => ', typeof roleInfo.role_id);

                                        if (roleInfo.role_id == Constant.TRADER) {
                                            console.log('trader user => ');
                                            // shared code for email sending
                                            var options = {
                                                from: Config.EMAIL_FROM, // sender address
                                                to: userInfo.email, // list of receivers
                                                subject: 'A secure tomorrow starts today', // Subject line
                                                text: 'A secure tomorrow starts today', // plaintext body
                                            }

                                            let mail_response = await mail_helper.sendEmail(options, 'welcome_email_for_trader', {});
                                            console.log('mail_response => ', mail_response);
                                            // shared code for email sending
                                        }

                                        var roleLog = new LastLoggedRoleInfo(obj);
                                        roleLog.save(function (err, role) {
                                            if (err) {
                                                res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
                                            } else {
                                                //Check last 
                                                var myObjectList = [];
                                                myObjectList.push(userInfo);
                                                myObjectList.push(roleInfo);
                                                var myObjectList = { userInfo: userInfo, roleInfo: roleInfo };
                                                res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: myObjectList, 'token': 'Bearer ' + jwtToken });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                }
            })
        } else {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL });
        }
    });
}

/**
 * get user roles
 * @param {type} req
 * @param {type} res
 * @returns {undefined}
 */
function getUserRole(req, res) {
    Groups.find({ 'user_id': req.body.user_id }, 'role_id').populate('role_id', 'title description').exec(function (err, lastLogged) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
        } else {
            var obj = {};
            obj.finalArr = [];
            obj.finalArr = _.pluck(lastLogged, 'role_id');
            obj.finalId = _.pluck(obj.finalArr, '_id');
            res.json({ code: Constant.SUCCESS_CODE, 'message': Constant.GROUP_FETCHED_SUCCESS, data: obj });
        }
    });
}
/**
 * Function is use for admin login
 * @access private
 * @return json
 * Created
 * @smartData Enterprises (I) Ltd
 * Created Date 15-Sep-2017
 */
function adminLogin(req, res) {
    var jwtToken = null;
    if ((req.body.email) && (req.body.password)) {
        if (validator.isEmail(req.body.email)) {
            Admin.findOne({ email: req.body.email }, function (err, userInfo) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    if (userInfo != null) {
                        if (bcrypt.compareSync(req.body.password, userInfo.password)) {
                            if (userInfo.status == 0) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.ACCOUNT_INACTIVE, data: {} });
                            } else if (userInfo.deleted == true) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.ACCOUNT_DELETED, data: {} });
                            } else {
                                var appenddata = {
                                    device_token: req.body.device_token,
                                    device_type: req.body.device_type,
                                }
                                Admin.update({ _id: userInfo._id }, { $set: appenddata }, function (err) {
                                    if (err) {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                    } else {
                                        var userRecords = {
                                            userId: userInfo._id,
                                            email: userInfo.email,
                                            firstname: userInfo.firstname,
                                            lastname: userInfo.lastname,
                                            image: userInfo.image,
                                            phone_number: userInfo.phone_number,
                                            state: userInfo.state,
                                            city: userInfo.city,
                                            country: userInfo.country,
                                            createdAt: userInfo.createdAt
                                        }
                                        var expirationDuration = 60 * 60 * 8 * 1; // expiration duration 8 Hours
                                        var params = {
                                            id: userInfo._id
                                        }
                                        jwtToken = jwt.sign(params, Config.SECRET, {
                                            expiresIn: expirationDuration
                                        });
                                        if (validator.isValid(jwtToken)) {
                                            res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: userInfo, 'token': 'Bearer ' + jwtToken });
                                        }
                                        var userData = {
                                            user_id: userInfo._id,
                                            type: 'Login',
                                            ip: req.ip,
                                            token: jwtToken,
                                            status: 0,
                                            deleted: false
                                        }
                                        AdminLog(userData);
                                    }
                                });
                            }
                        } else {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_LOGIN_DETAILS, data: {} });
                        }
                    } else {
                        res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_LOGIN_DETAILS, data: {} });
                    }

                }
            });
        } else {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL, data: {} });
        }
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.LOGIN_REQUIRED_FIELDS, data: {} });
    }
}

/**
 * Function is use to reset user password
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-July-2017
 */
function isResetUserPasswordLinkExist(req, res) {
    User.findOne({ 'resetPasswordToken': req.body.id, 'is_deleted': false, 'resetPasswordExpires': { $gt: Date.now() } }, function (err, user) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
        } else if (user) {
            res.json({ code: Constant.SUCCESS_CODE, 'message': Constant.REST_LINK_EXIST });
        } else {
            return res.json({ code: Constant.NOT_FOUND, 'message': Constant.REST_LINK_EXPIRE });
        }
    });
}

function activate_account(req, res) {
    console.log('activation account api => ');
    var password = (typeof req.body.password != 'undefined') ? bcrypt.hashSync(req.body.password, salt) : '';
    var activation_code = (typeof req.body.activation_code != 'undefined') ? req.body.activation_code : '';

    if (activation_code && activation_code != '' && password && password != '') {

        var updateUserRecord = {
            is_active: true,
            password: password
        }

        User.findOneAndUpdate({ is_active: false, is_deleted: false, activation_code: activation_code },
            { $set: updateUserRecord, $unset: { activation_code: 1 } }
            , async function (err, userData) {
                if (err) {
                    return res.json({
                        code: Constant.INVALID_CODE,
                        message: Constant.INTERNAL_ERROR
                    });
                }
                else if (userData) {

                    var group = new Groups();
                    group.user_id = mongoose.Types.ObjectId(userData._id);
                    // group.role_id = mongoose.Types.ObjectId(Constant.OWNER);
                    group.role_id = mongoose.Types.ObjectId(req.body.role_id);
                    group.deleted = false;
                    group.is_master_role = true;
                    group.status = true;

                    group.save(async function (err, data) {
                        console.log('data => ', data);
                        if (data.role_id == "5a1d295034240d4077dff208") {
                            // shared code for email sending
                            var options = {
                                from: Config.EMAIL_FROM, // sender address
                                to: userData.email, // list of receivers
                                subject: 'Hire your next tradie' + `,` + 'the OWNLY way', // Subject line
                                text: 'Hire your next tradie' + `,` + 'the OWNLY way', // plaintext body
                                // subject: 'Welcome to Australia' + `'` + 's most exciting Property and Trade Platform', // Subject line
                                // text: 'Welcome to Australia' + `'` + 's most exciting Property and Trade Platform', // plaintext body
                            }

                            console.log('userData => ', userData);
                            let mail_response = await mail_helper.sendEmail(options, 'welcome_email_for_consumer', userData);
                            console.log('mail_response => ', mail_response);
                            // shared code for email sending
                        }
                    });


                    return res.json({
                        code: Constant.SUCCESS_CODE,
                        message: 'success'
                    });

                } else {
                    return res.json({
                        code: Constant.ERROR_CODE,
                        message: 'Not Valid User'
                    });
                }
            });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

function validate_account_activation_code(req, res) {
    var activation_code = (typeof req.body.activation_code != 'undefined') ? req.body.activation_code : '';

    if (activation_code && activation_code != '') {
        User.findOne({ activation_code: activation_code, is_deleted: false, is_active: false }, { email: 1 }, function (err, email) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                if (email)
                    res.json({ code: Constant.SUCCESS_CODE, message: 'success', data: email });
                else
                    res.json({ code: Constant.ERROR_CODE, message: 'Not Valid User' });
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

function directLoginAfterAccountActivation(req, res) {
    console.log("test    ", mongoose.Types.ObjectId(req.body.user_id));
    // , is_deleted: false, is_active: true
    // _id: mongoose.Types.ObjectId(req.body.user_id)
    var jwtToken = null;
    User.findOne({ _id: mongoose.Types.ObjectId(req.body.user_id), is_deleted: false, is_active: true }, function (err, userInfo) {
        if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
        } else if (userInfo) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {

                var expirationDuration = 60 * 60 * 8 * 1; // expiration duration 8 Hours
                var params = {
                    id: userInfo._id
                }
                jwtToken = jwt.sign(params, Config.SECRET, {
                    expiresIn: expirationDuration
                });

                LastLoggedRoleInfo.findOne({ user_id: userInfo._id, deleted: false }, null, { sort: { "updatedAt": -1 } }, function (err, lastlogData) {

                    if (err) {
                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                    } else if (lastlogData) {
                        var myObjectList = [];
                        myObjectList.push(userInfo);
                        myObjectList.push(lastlogData);
                        var myObjectList = { userInfo: userInfo, roleInfo: lastlogData };

                        res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: myObjectList, 'token': 'Bearer ' + jwtToken });

                    } else {

                        Groups.findOne({ user_id: userInfo._id, deleted: false }, function (err, roleInfo) {
                            if (err) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                            } else {

                                var obj = {};
                                obj.group_id = roleInfo._id;
                                obj.user_id = userInfo._id;
                                obj.role_id = roleInfo.role_id;
                                var roleLog = new LastLoggedRoleInfo(obj);
                                roleLog.save(function (err, role) {
                                    if (err) {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_IN_SAVING_LAST_LOGGED_IN_USER, isTokenValid: false });
                                    } else {
                                        //Check last 
                                        var myObjectList = [];
                                        myObjectList.push(userInfo);
                                        myObjectList.push(roleInfo);
                                        var myObjectList = { userInfo: userInfo, roleInfo: roleInfo };
                                        res.json({ code: Constant.SUCCESS_CODE, message: Constant.SIGNIN_SUCCESS, data: myObjectList, 'token': 'Bearer ' + jwtToken });
                                    }
                                });
                            }
                        });
                    }
                });
            }

        } else {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL });
        }
    });
}

function userRoleConfirmation(req, res) {
    console.log('req.body :: user role confirmation api => ', req.body);
    (async () => {
        try {
            if (req.body.user_id && req.body.role_id) {
                const newGroup = new Groups({
                    role_id: req.body.role_id,
                    user_id: req.body.user_id
                });
                if (newGroup) {
                    await newGroup.save(function (grpErr, grpData) {
                        console.log('grpErr :: error occured while storing new group => ', grpErr);
                        console.log('grpData :: new group added :: owner=> ', grpData);
                        if (grpErr) {
                            res.json({ code: Constant.ERROR_CODE, message: err.message });
                        } else {
                            if (grpData) {
                                res.json({ code: Constant.SUCCESS_CODE, data: grpData });
                            }
                        }
                    });
                }
            } else {
                res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
            }
        } catch (error) {
            console.log('error :: catch error=> ', error);
            res.json({
                code: Constant.ERROR_CODE,
                message: error.message
            });
        }
    })();
}

function accountActivationRegistration(req, res) {
    console.log('req.body :: user role confirmation api => ', req.body);
    (async () => {
        try {
            if (req.body.first_name && req.body.last_name && req.body.mobile_no && req.body.activation_code && req.body.password) {

                const updateUserRecord = {
                    firstname: req.body.first_name,
                    lastname: req.body.last_name,
                    mobile_no: req.body.mobile_no,
                    is_active: true,
                    password: bcrypt.hashSync(req.body.password, salt)
                }

                await User.findOneAndUpdate(
                    { is_active: false, is_deleted: false, activation_code: req.body.activation_code },
                    { $set: updateUserRecord, $unset: { activation_code: 1 } }
                    , async function (err, userData) {
                        if (err) {
                            return res.json({
                                code: Constant.INVALID_CODE,
                                message: Constant.INTERNAL_ERROR
                            });
                        } else if (userData) {
                            console.log('userData => ', userData);
                            const group = new Groups({
                                user_id: mongoose.Types.ObjectId(userData._id),
                                role_id: mongoose.Types.ObjectId(req.body.role_id),
                                deleted: false,
                                is_master_role: true,
                                status: true
                            });
                            await group.save(function (err, data) {
                                console.log('data => ', data);
                                return res.json({
                                    code: Constant.SUCCESS_CODE,
                                    message: 'User updated Successfully.'
                                });
                            });
                        } else {
                            return res.json({
                                code: Constant.ERROR_CODE,
                                message: 'Not Valid User'
                            });
                        }
                    });
            } else {
                res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
            }
        } catch (error) {
            console.log('error :: catch error=> ', error);
            res.json({
                code: Constant.ERROR_CODE,
                message: error.message
            });
        }
    })();
}