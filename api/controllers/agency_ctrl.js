'use strict';

var mongoose = require('mongoose'),
    AgencyModel = mongoose.model('Agency'),
    propertyModel = require('../models/Properties'),
    User = mongoose.model('User'),
    NotificationInfo = mongoose.model('Notification'),
    Groups = mongoose.model('Group'),
    NotificationInfo = mongoose.model('NotificationStatus'),
    formidable = require('formidable'),
    async = require('async'),
    util = require('util'),
    fs = require('fs-extra'),
    path = require('path'),
    Config = require('../../config/config.js'),
    randomString = require('random-string'),
    validator = require('../../config/validator.js'),
    Constant = require('../../config/constant.js');

var bcrypt = require('bcrypt');
var salt = bcrypt.genSaltSync(10);
const mail_helper = require('../helpers/mail_helper');

//var fluent_ffmpeg = require("fluent-ffmpeg");
var d = new Date();
var currentYear = d.getFullYear();
var moment = require('moment');
var waterfall = require('run-waterfall');
module.exports = {
    getAgencyProfile: getAgencyProfile,
    adminGetAllAgencies: adminGetAllAgencies,
    getAgencyByAgentId: getAgencyByAgentId,
    getAllAgencies: getAllAgencies,
    sendAssociationReq: sendAssociationReq,
    updateAgencyLogoImage: updateAgencyLogoImage,
    updateAgencyBannerImage: updateAgencyBannerImage,
    getWatchersList: getWatchersList,
    updateAgencyBannerImage: updateAgencyBannerImage,
    addAgencyByAdmin: addAgencyByAdmin,
    agentsListWithStats: agentsListWithStats,
    BulkImportAgencies: BulkImportAgencies,
};

/**
 * Function to get Agency profile
   reequired param  is agency
 * Created Date 16-Jan-2017
 */
function getAgencyProfileOld(req, res) {

    var agency_id = (req.body.agency_id) ? mongoose.Types.ObjectId(req.body.agency_id) : '';
    var totalManagerCount = 0;
    // console.log(agency_id,"agency_id");
    if (agency_id) {

        var conditions = { "$and": [] };
        conditions["$and"].push({ "groups.is_master_role": true });
        conditions["$and"].push({ "groups.status": true });
        conditions["$and"].push({ "groups.deleted": false });

        if (req.body.role_id && req.body.role_id == Constant.RUN_STRATA_MANAGEMENT_COMPANY)
            conditions["$and"].push({ "groups.role_id": mongoose.Types.ObjectId(Constant.RUN_STRATA_MANAGEMENT_COMPANY) });
        else
            conditions["$and"].push({ "groups.role_id": mongoose.Types.ObjectId(Constant.AGENT) });

        waterfall([
            function (callback) {

                // console.log("group ==> ", JSON.stringify([
                //     { $match: { "is_deleted": false, "is_active": true, agency_id: mongoose.Types.ObjectId(agency_id) } }, // Match me
                //     { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                //     { $match: conditions }, // Match me
                //     {
                //         $group: {
                //             _id: null,
                //             "count": { $sum: 1 },
                //             "groups": { $first: "$groups" }
                //         }
                //     }
                // ]));

                User.aggregate([
                    { $match: { "is_deleted": false, "is_active": true, agency_id: mongoose.Types.ObjectId(agency_id) } }, // Match me
                    { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                    { $match: conditions }, // Match me
                    {
                        $group: {
                            _id: null,
                            "count": { $sum: 1 },
                            "groups": { $first: "$groups" }
                        }
                    }
                ])
                    .allowDiskUse(true)
                    .exec(function (err, pmcount) {
                        if (err) {
                            callback(err);
                        } else {
                            totalManagerCount = (pmcount.length > 0) ? pmcount[0].count : 0;
                            AgencyModel.findOne({ "_id": agency_id })
                                .populate('principle_id').lean().exec(function (err, agencyInfo) {
                                    if (err) {
                                        callback(err);
                                    } else if (agencyInfo) {
                                        if (pmcount && pmcount[0] && pmcount[0].groups && pmcount[0].groups[0]) {
                                            agencyInfo.groups = pmcount[0].groups[0];
                                        }
                                        else {
                                            agencyInfo.groups = {};
                                        }
                                        callback(null, agencyInfo, totalManagerCount);
                                    } else {
                                        callback(null, {}, totalManagerCount);
                                    }
                                });
                        }
                    });
            }, function (arg1, totalManagerCount, callback) {
                var finalResponse = [];
                propertyModel.count({ created_by_agency_id: agency_id, save_as_draft: false }).exec(function (err, propertycnt) {
                    var property_cnt = {};
                    if (err) {
                        property_cnt.value = 0;
                        finalResponse.push(arg1);
                        finalResponse.push(property_cnt);
                        callback(null, finalResponse, totalManagerCount);
                    } else {
                        property_cnt.value = propertycnt;
                        finalResponse.push(arg1);
                        finalResponse.push(property_cnt);
                        callback(null, finalResponse, totalManagerCount);
                    }
                });
            }], function (err, result, totalManagerCount) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA, err });
                } else {
                    res.json({ code: Constant.SUCCESS_CODE, data: result, total_manager: totalManagerCount });
                }
            });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.USER_ID_REQUIRED });
    }
}

function getAgencyProfile(req, res) {

    var agency_id = (req.body.agency_id) ? mongoose.Types.ObjectId(req.body.agency_id) : '';
    var totalManagerCount = 0;
    // console.log(agency_id, "  agency_id", "   roid  ", req.body.role_id);
    if (agency_id) {

        var conditions = { "$and": [] };
        conditions["$and"].push({ "data.groupUsers.is_master_role": true });
        conditions["$and"].push({ "data.groupUsers.status": true });
        conditions["$and"].push({ "data.groupUsers.deleted": false });

        if (req.body.role_id)
            conditions["$and"].push({ "data.groupUsers.role_id": mongoose.Types.ObjectId(req.body.role_id) });
        else
            conditions["$and"].push({ "data.groupUsers.role_id": mongoose.Types.ObjectId(Constant.OWN_AGENCY) });

        AgencyModel.aggregate([
            {
                "$match": {
                    "_id": agency_id
                }
            },
            {
                "$lookup": {
                    "from": 'users',
                    "localField": 'principle_id',
                    "foreignField": '_id',
                    "as": 'users'
                }
            },
            {
                "$unwind": "$users"
            },
            {
                "$lookup": {
                    "from": 'groups',
                    "localField": 'principle_id',
                    "foreignField": 'user_id',
                    "as": 'groupUsers'
                }
            },
            // {
            //     "$unwind": "$groupUsers"
            // },
            {
                "$unwind": {
                    "path": "$groupUsers",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$group": {
                    "_id": "$_id",
                    "total_manager": { $sum: 1 },
                    "data": { "$push": "$$ROOT" }
                }
            },
            // {
            //     "$unwind": "$data"
            // },
            {
                "$unwind": {
                    "path": "$data",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$match": conditions
            }
        ])
            .allowDiskUse(true)
            .exec(function (err, userdata) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA, err });
                } else {
                    propertyModel.count({ created_by_agency_id: agency_id, save_as_draft: false }).exec(function (err, propertycnt) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA, err });
                        } else {
                            let resp = [];
                            if (userdata && userdata[0] && userdata[0].data)
                                resp.push(userdata[0].data);
                            resp.push(propertycnt);
                            res.json({ code: Constant.SUCCESS_CODE, data: resp, total_manager: (userdata && userdata[0] && userdata[0].total_manager) ? userdata[0].total_manager : 0 });
                        }
                    });
                }

            });
    }
}

function adminGetAllAgencies(req, res) {

    var page_number = req.body.current_page ? (req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? (req.body.number_of_pages) : 10;

    var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
    var lastname = (typeof req.body.lastname != 'undefined') ? req.body.lastname : '';
    var state = (typeof req.body.state != 'undefined') ? req.body.state : '';
    var city = (typeof req.body.city != 'undefined') ? req.body.city : '';
    var zip_code = (typeof req.body.zip_code != 'undefined') ? req.body.zip_code : '';

    var totalCount = 0;
    var searchtext = (typeof req.body.searchtext != 'undefined') ? req.body.searchtext : '';
    // var searchText = decodeURIComponent(req.body.searchtext).replace(/[[\]{}()*+?,\\^$|#\s]/g, "\\s+");
    var conditions = { "$and": [] };
    conditions["$and"].push({ is_deleted: false });
    if (req.body.searchtext) {
        conditions["$and"].push({
            $or: [{ "name": { $regex: new RegExp(searchtext, "i") } }]
        });
    }
    // if (req.body.searchText) {
    //     conditions = { "$or": [] };
    //     if (firstname)
    //         conditions["$or"].push({ "firstname": { $regex: new RegExp(firstname, "i") } });
    //     if (lastname)
    //         conditions["$or"].push({ "lastname": { $regex: new RegExp(lastname, "i") } });
    // }
    /*if (state)
        conditions["$and"].push({"state": { $regex : new RegExp(state, "i") }});
    if (city)
        conditions["$and"].push({"city": { $regex : new RegExp(city, "i") }});
    if (zip_code)
        conditions["$and"].push({"zipCode": { $regex : new RegExp(zip_code, "i") }});*/

    AgencyModel.aggregate([
        { $match: conditions }, // Match me
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
                    //console.log("totalCount",totalCount);
                    AgencyModel.aggregate(
                        { $match: conditions }, // Match me
                        { $lookup: { from: 'users', localField: 'principle_id', foreignField: '_id', as: 'principle_id' } },
                        {
                            $project: {
                                _id: 1,
                                name: 1, about_agency: 1, logoImage: 1,
                                principle_id: {
                                    _id: 1, firstname: 1, lastname: 1, email: 1, address: 1, totalPropertyCount: 1, about_user: 1,
                                    image: 1, images: 1, agency_id: 1, city: 1
                                },
                                createdAt: 1
                            }
                        },
                        { $sort: { "createdAt": -1 } },
                        { $skip: page_number * number_of_pages },
                        { "$limit": number_of_pages }
                    ).exec(function (err, agencyData) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                        } else {
                            res.json({ code: Constant.SUCCESS_CODE, data: agencyData, total_count: totalCount });
                        }
                    });
                } else {
                    res.json({ code: Constant.SUCCESS_CODE, data: [], total_count: totalCount });
                }
            }
        });
}

/**
 * Function is use to get watches list
 * @access private
 * @return json
 * Created by
 * @smartData Enterprises (I) Ltd
 * Created Date 21-Dec-2017
 */
function getWatchersList(req, res) {
    //var limit = req.body.limit ? parseInt(req.body.limit) : {};
    //var sortby = req.body.sortby ? req.body.sortby : {};
    // console.log("req.swagger.params.id.value",req.swagger.params.id.value);
    if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
        var outputJSON = {};
        var query = { 'agency_id': mongoose.Types.ObjectId(req.swagger.params.id.value), is_deleted: false, is_active: true };
        User.find(query, { _id: 1, firstname: 1, lastname: 1, image: 1, email: 1 })
            .sort({ createdAt: 1 }).exec(function (err, watcherList) {
                if (err) {
                    outputJSON = {
                        'code': Constant.ERROR_CODE,
                        'message': Constant.ERROR_RETRIVING_DATA
                    };
                } else {
                    outputJSON = {
                        'code': Constant.SUCCESS_CODE,
                        'message': Constant.AGENTCY_RETRIEVE_SUCCESS,
                        'data': watcherList
                    }
                }
                res.jsonp(outputJSON);
            });
    } else {
        res.json({ code: Constant.NOT_FOUND, message: Constant.ERROR_RETRIVING_DATA });
    }
}
/**
 * Function is use to add new user
 * @access private
 * @return json
 * Created by
 * @smartData Enterprises (I) Ltd
 * Created Date 4-Dec-2017
 */
function getAgencyByAgentId(req, res) {
    var limit = req.body.limit ? parseInt(req.body.limit) : {};
    var sortby = req.body.sortby ? req.body.sortby : {};
    var outputJSON = {};
    var query = {
        '_id': req.body._id,
        is_deleted: false
    };
    AgencyModel.findOne(query).populate('principle_id').limit(parseInt(limit)).sort({
        createdDate: 1
    }).exec(function (err, agencyData) {
        if (err) {
            outputJSON = {
                'code': Constant.ERROR_CODE,
                'message': Constant.ERROR_RETRIVING_DATA
            };
        } else {
            outputJSON = {
                'code': Constant.SUCCESS_CODE,
                'message': Constant.AGENTCY_RETRIEVE_SUCCESS,
                'data': agencyData
            }
        }
        res.jsonp(outputJSON);
    });
}

/**
 * Function is use to add new user
 * @access private
 * @return json
 * Created by
 * @smartData Enterprises (I) Ltd
 * Created Date 4-Dec-2017
 */
function getAllAgencies(req, res) {
    AgencyModel.find({}, 'name logoImage principle_id')
        .populate('principle_id', 'email')
        .exec(function (err, agencyData) {
            var outputJSON = {};
            if (err) {
                outputJSON = {
                    'code': Constant.ERROR_CODE,
                    'message': Constant.ERROR_RETRIVING_DATA
                };
            } else {
                outputJSON = {
                    'code': Constant.SUCCESS_CODE,
                    'message': Constant.AGENTCY_RETRIEVE_SUCCESS,
                    'data': agencyData
                }
            }
            res.jsonp(outputJSON);
        });
}
/**
 * Function is use to send association request to agency
 * @access private
 * @return json
 * Created by
 * @smartData Enterprises (I) Ltd
 * Created Date 4-Dec-2017
 */
function sendAssociationReq(req, res) {
    if (typeof req.body.sender_id != 'undefined' && typeof req.body.receiver_id != 'undefined') {
        var obj = {};
        var to_users = [];
        // console.log("sender_id", req.body.sender_id);
        var userName = (typeof req.body.userName != 'undefined') ? req.body.userName : '';
        obj.subject = userName + " has sent request to associate  with your " + req.body.agencyName + " agency on " + moment().format("MMMM Do YYYY");
        obj.message = userName + " request sent";
        obj.from_user = mongoose.Types.ObjectId(req.body.sender_id);
        obj.type = Constant.NOTIFICATION_TYPE_USER_ASSOCIATION; //Contact message type

        AgencyModel.findOne({ _id: mongoose.Types.ObjectId(req.body.receiver_id) }, { _id: 1, principle_id: 1 })
            .exec(function (err, agency_data) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    if (agency_data) {
                        to_users.push({ "users_id": agency_data.principle_id });
                        obj.to_users = to_users;
                        var notification = new NotificationInfo(obj);
                        // console.log("obj!!!!!!!!!!!!",obj);
                        notification.save(function (err, data) {
                            if (err) {
                                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                            } else {
                                // console.log("data@@@@@@@@@@",data);
                                var updateUserRecord = {
                                    agency_id: mongoose.Types.ObjectId(req.body.receiver_id),
                                }
                                User.update({ '_id': req.body.sender_id }, { $set: updateUserRecord }, { new: true }, function (err, response) {
                                    if (err) {
                                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                    } else {
                                        res.json({ code: Constant.SUCCESS_CODE, message: Constant.SUCCESS_CONTACT_MESSAGE, data: agency_data });
                                    }
                                });
                            }
                        });
                    } else {
                        res.json({ code: Constant.REQ_DATA_ERROR_CODE, message: Constant.NO_AGENCY_EXIST });
                    }
                }
            });
    } else {
        res.json({ code: Constant.REQ_DATA_ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }


}

/**
 * Function to upload logo image
 * @access private and request param is sender and reciever ids
 * @return json
 * Created by
 * @smartData Enterprises (I) Ltd
 * Created Date 8-Dec-2017
 */
function updateAgencyLogoImage(req, res) {
    var formData = {};
    var outputJSON = {};
    var userSavedObj = {};
    var validFileExt = ['jpeg', 'jpg', 'png', 'gif'];
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
                var dir = './api/uploads/users';
                var temp_path = dir + '/' + filename;
                var data = file.buffer;
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
        },
        function (formData, callback) {
            var updateImage = [];
            var imageData = {};
            userSavedObj._id = req.body._id;
            if (userSavedObj._id) {
                var field = "";
                var query = {
                    _id: userSavedObj._id
                };
                delete formData._id;
                AgencyModel.findOne(query, function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if (!data.logoImage) {
                            data.logoImage = [];
                        }
                        data.logoImage = formData;
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
    ], function (err, userData) {
        if (err) {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR
            };
        } else {
            outputJSON = {
                code: Constant.SUCCESS_CODE,
                data: userData,
                message: Constant.UPLOAD_SUCCESSFULL,
            };
        }
        res.jsonp(outputJSON);
    });
}

/**
 * Function to upload banner image
 * @access private and request param is sender and reciever ids
 * @return json
 * Created by
 * @smartData Enterprises (I) Ltd
 * Created Date 8-Dec-2017
 */
function updateAgencyBannerImage(req, res) {
    var formData = {};
    var outputJSON = {};
    var userSavedObj = {};
    var validFileExt = ['jpeg', 'jpg', 'png', 'gif'];
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
                // console.log("long sized file");
                callback('Upload file must be less than 10 MB', false);
            }
        },
        function (file, callback) {
            if (file) {
                var timestamp = Number(new Date()); // current time as number
                var splitFile = file.originalname.split('.');
                var filename = +timestamp + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
                var dir = './api/uploads/users';
                var temp_path = dir + '/' + filename;
                var data = file.buffer;
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
        },
        function (formData, callback) {
            var updateImage = [];
            var imageData = {};
            userSavedObj._id = req.body._id;
            if (userSavedObj._id) {
                var field = "";
                var query = {
                    _id: userSavedObj._id
                };
                delete formData._id;
                AgencyModel.findOne(query, function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if (!data.banner) {
                            data.banner = [];
                        }
                        data.banner = formData;
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
    ], function (err, userData) {
        if (err) {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR
            };
        } else {
            outputJSON = {
                code: Constant.SUCCESS_CODE,
                data: userData,
                message: Constant.UPLOAD_SUCCESSFULL,
            };
        }
        res.jsonp(outputJSON);
    });
}

function updateAgencyBannerImage(req, res) {

    let base64Image = req.swagger.params.file.value.split(';base64,').pop();

    var timestamp = Number(new Date()); // current time as number
    var dir = './api/uploads/users';
    var temp_path = dir + '/' + timestamp + '.jpeg';

    // console.log("Filename : ", temp_path);

    fs.writeFile(temp_path, base64Image, { encoding: 'base64' }, function (err) {
        var userSavedObj = {
            '_id': req.body._id,
            'banner': timestamp + '.jpeg'
        };

        var outputJSON = {
            code: Constant.SUCCESS_CODE,
            message: Constant.UPLOAD_SUCCESSFULL,
        };
        if (userSavedObj._id) {
            var query = {
                _id: userSavedObj._id
            };
            AgencyModel.findOne(query, function (err, data) {
                if (err) {
                    outputJSON = {
                        code: Constant.ERROR_CODE,
                        message: Constant.INTERNAL_ERROR
                    };
                } else {
                    if (!data.banner) {
                        data.banner = [];
                    }
                    data.banner = userSavedObj.banner;
                    data.save(function (err, data) {
                        if (err) {
                            outputJSON = {
                                code: Constant.ERROR_CODE,
                                message: Constant.INTERNAL_ERROR
                            };
                        } else {
                            outputJSON.code = Constant.SUCCESS_CODE;
                            outputJSON.message = Constant.UPLOAD_SUCCESSFULL;
                            outputJSON.data = data;
                        }
                    });
                }
            });
        } else {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR
            };
        }
        res.jsonp(outputJSON);
    });
}


/**
 * Function to add agency - only for Admin
 * Created Date 26-May-2020
 */
function addAgencyByAdmin(req, res) {
    console.log('req.body :: add agency ==> ', req.body);
    try {
        (async () => {
            if (req.body.created_by === Constant.ADMIN_ID) {
                console.log('admin user :: created_by => ');
                await User.find({ email: req.body.email }, async function (err, userData) {
                    if (err) {
                        await res.json({
                            code: Constant.ERROR_CODE,
                            message: err.message
                        });
                    } else {
                        if (userData && userData.length > 0) {
                            console.log('User already existed => ', userData);
                            await res.json({
                                code: Constant.ERROR_CODE,
                                message: 'User already exists. Please use a different email.'
                            });
                        } else {
                            console.log('New User => ');
                            let password;
                            password = randomString({ length: 8, numeric: true, letters: true });
                            password = password + "@s1";
                            console.log('password :: for agency=> ', password);
                            if ((req.body.email) && (password) && (req.body.firstname) && (req.body.lastname)) {
                                if (validator.isEmail(req.body.email)) {
                                    await AgencyModel.find({ email: (req.body.email).toLowerCase() }, async function (err, agencyData) {
                                        if (err) {
                                            await res.json({
                                                code: Constant.ERROR_CODE,
                                                message: err.message
                                            });
                                        } else {
                                            if (agencyData && agencyData.length > 0) {
                                                await res.json({ code: Constant.ALLREADY_EXIST, message: Constant.EMAIL_ALREADY_EXIST });
                                            } else {
                                                let hash = bcrypt.hashSync(password, salt);
                                                const userData = new User({
                                                    // password: hash,
                                                    firstname: req.body.firstname,
                                                    lastname: req.body.lastname,
                                                    email: (req.body.email).toLowerCase(),
                                                    mobile_no: req.body.mobile_no,
                                                    name: req.body.firstname + " " + req.body.lastname,
                                                    is_active: true,
                                                    deleted: false,
                                                    country: req.body.country,
                                                    suburb_postcode: req.body.suburb_postcode,
                                                    address: req.body.suburb_postcode,
                                                    location_latitude: req.body.location_latitude,
                                                    location_longitude: req.body.location_longitude,
                                                    location_administrative_area_level_1: (req.body.location_administrative_area_level_1) ? req.body.location_administrative_area_level_1 : '',
                                                    location_country: req.body.location_country,
                                                    location_postal_code: req.body.location_postal_code,
                                                    location_locality: req.body.location_locality,
                                                    location_street_number: req.body.location_street_number,
                                                    location: {
                                                        coordinates: [req.body.location_longitude, req.body.location_latitude],
                                                        type: 'Point'
                                                    }
                                                });
                                                await userData.save(async function (err, savedUserRecord) {
                                                    if (err) {
                                                        console.log('err :: while saving user=> ', err);
                                                        await res.json({
                                                            code: Constant.ERROR_CODE,
                                                            message: err.message
                                                        });
                                                    } else {
                                                        const groupUser = new Groups({
                                                            user_id: savedUserRecord._id,
                                                            role_id: req.body.role_id,
                                                            is_master_role: true
                                                        });
                                                        await groupUser.save(async function (err, savedGroup) {
                                                            if (err) {
                                                                console.log('err :: while storing groupdata=> ', err);
                                                                await res.json({
                                                                    code: Constant.ERROR_CODE,
                                                                    message: err.message
                                                                });
                                                            } else {
                                                                console.log('saved group record => ');
                                                                const notification = new NotificationInfo({
                                                                    user_id: savedUserRecord._id
                                                                });
                                                                await notification.save(async function (err, savedNotification) {
                                                                    if (err) {
                                                                        console.log('err :: while storing notification data => ', err);
                                                                        await res.json({
                                                                            code: Constant.ERROR_CODE,
                                                                            message: err.message
                                                                        });
                                                                    } else {
                                                                        if (req.body.role_id == Constant.OWN_AGENCY || req.body.role_id == Constant.RUN_STRATA_MANAGEMENT_COMPANY) {
                                                                            const agencyData = new AgencyModel({
                                                                                name: req.body.agency_name,
                                                                                no_of_property: 0,
                                                                                principle_id: savedUserRecord._id
                                                                            });
                                                                            await agencyData.save(async function (err, agency) {
                                                                                if (err) {
                                                                                    console.log('err :: while storing agency data => ', err);
                                                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                                                } else {
                                                                                    await User.update({ _id: savedUserRecord._id }, { $set: { 'agency_id': agency._id } }, async function (err) {
                                                                                        if (err) {
                                                                                            console.log('err :: while updating user record => ', err);
                                                                                            await res.json({
                                                                                                code: Constant.ERROR_CODE,
                                                                                                message: err.message
                                                                                            });
                                                                                        } else {
                                                                                            // var hash = bcrypt.hashSync(savedUserRecord.password, salt);
                                                                                            let infoObj = {
                                                                                                loginURL: Constant.STAGGING_URL + '#!/login',
                                                                                                firstName: savedUserRecord.firstname,
                                                                                                email: savedUserRecord.email,
                                                                                                password: password,
                                                                                                // lastName: userData.lastname,
                                                                                                logoURL: Constant.STAGGING_URL + 'assets/images/logo-public-home.png'
                                                                                            }
                                                                                            let options = {
                                                                                                from: Config.EMAIL_FROM, // sender address
                                                                                                to: savedUserRecord.email, // list of receivers
                                                                                                subject: 'Account created as Ownly Agency Principle', // Subject line
                                                                                                text: 'Account created as Ownly Agency Principle', // plaintext body
                                                                                            }

                                                                                            let mail_response = mail_helper.sendEmail(options, 'welcome_email_for_agency', infoObj);

                                                                                            await User.findByIdAndUpdate(savedUserRecord._id, { password: hash }, async function (err, updatedUserRecord) {
                                                                                                if (updatedUserRecord) {
                                                                                                    await res.json({
                                                                                                        code: Constant.SUCCESS_CODE,
                                                                                                        message: 'User added successfully!',
                                                                                                        data: savedUserRecord
                                                                                                    });
                                                                                                } else if (err) {
                                                                                                    await res.json({
                                                                                                        code: Constant.ERROR_CODE,
                                                                                                        message: err.message
                                                                                                    });
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    });
                                                                                }
                                                                            });
                                                                        }
                                                                    }
                                                                })
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        }
                                    });
                                } else {
                                    await res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL });
                                }
                            }
                        }
                    }
                })
            } else {
                await res.json({
                    code: Constant.ERROR_CODE,
                    message: 'You are not authorized to perform this action.'
                });
            }
        })();
    } catch (error) {
        console.log('error => ', error);
        res.json({
            code: Constant.ERROR_CODE,
            message: error.message
        });
    }

}

/**
 * Function to list my agencts within agency with all stats
 * created date 23-07-2020
 */
function agentsListWithStats(req, res) {
    console.log('req.body :: agency hub listing api  => ', req.body);
    try {
        (async () => {
            if (req.body.agency_id && req.body.start_date && req.body.end_date) {
                // let startdate = moment(req.body.start_date);
                // let enddate = moment(req.body.end_date);
                // const startDate = startdate.utc().format('YYYY-MM-DD');
                // const endDate = enddate.utc().format('YYYY-MM-DD');
                // console.log('startDate => ', startDate);
                // console.log('endDate => ', endDate);
                const startDate = req.body.start_date;
                const endDate = req.body.end_date;
                await User.aggregate([
                    {
                        $match: {
                            "agency_id": mongoose.Types.ObjectId(req.body.agency_id),
                            "is_deleted": false,
                            "is_active": true,
                            "is_suspended": false
                        }
                    },
                    {
                        $lookup:
                        {
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
                        $match:
                        {
                            "groups.role_id": mongoose.Types.ObjectId(Constant.AGENT),
                            "groups.status": true,
                            "groups.deleted": false
                        }
                    },
                    {
                        $lookup:
                        {
                            from: 'maintenances',
                            localField: '_id',
                            foreignField: 'created_by',
                            as: 'maintenances'
                        }
                    },
                    // {
                    //     $match: {
                    //         "maintenances.deleted": false
                    //         // "maintenances.created_by_role": mongoose.Types.ObjectId(Constant.AGENT)
                    //     }
                    // },
                    // {
                    //     "$unwind": {
                    //         "path": "$maintenances",
                    //         "preserveNullAndEmptyArrays": true
                    //     }
                    // },
                    {
                        $lookup:
                        {
                            from: 'agreements',
                            localField: '_id',
                            foreignField: 'created_by',
                            as: 'agreements'
                        }
                    },
                    // {
                    //     "$unwind": {
                    //         "path": "$agreements",
                    //         "preserveNullAndEmptyArrays": true
                    //     }
                    // },
                    // {
                    //     $match: {
                    //         "agreements.deleted": false
                    //     }
                    // },
                    {
                        $lookup:
                        {
                            from: 'disputes',
                            localField: '_id',
                            foreignField: 'agent_id',
                            as: 'disputes'
                        }
                    },
                    // {
                    //     $match: {
                    //         "disputes.is_deleted": false
                    //     }
                    // },
                    {
                        $lookup:
                        {
                            from: 'chats',
                            localField: '_id',
                            foreignField: 'from',
                            as: 'sentmsgs'
                        }
                    },
                    {
                        $lookup:
                        {
                            from: 'chats',
                            localField: '_id',
                            foreignField: 'to',
                            as: 'receivedmsgs'
                        }
                    },
                    {
                        $group: {
                            // _id: null,
                            _id: "$_id",
                            // "count": { $sum: 1 },
                            // "groups": { $first: "$groups" }
                            data: { $push: '$$ROOT' },
                        }
                    },
                    {
                        $unwind: "$data"
                    }
                ])
                    .allowDiskUse(true)
                    .exec(async function (err, agents) {
                        // console.log('agents => ', agents);
                        console.log('agents.length => ', agents.length);
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: err });
                        } else {
                            if (agents && agents.length > 0) {
                                let promises = await agents.map(async (ele) => {
                                    let point = 0;
                                    let obj = await {
                                        firstname: ele.data.firstname,
                                        lastname: ele.data.lastname,
                                        email: ele.data.email,
                                        image: ele.data.image,
                                        _id: ele.data._id
                                    }
                                    // console.log('ele.maintenance => ', ele.maintenance);
                                    // console.log('ele.email => ', ele.data.email);
                                    // console.log('ele._id => ', ele._id);
                                    // console.log('ele.data.groups => ', ele.data.groups);
                                    // console.log('ele.data.maintenances => ', ele.data.maintenances);
                                    // if (ele.data.groups) {
                                    //     console.log('ele.data.groups.length => ', ele.data.groups.length);
                                    // }
                                    if (ele.data.maintenances && ele.data.maintenances.length > 0) {
                                        let sentMRcount = 0;
                                        let acceptedMRcount = 0;
                                        let bookedMRcount = 0;
                                        let completedMRcount = 0;
                                        let closedMRcount = 0;
                                        let totalMRcount = 0;
                                        let openMRcount = 0;
                                        let comp_days = 0;
                                        await ele.data.maintenances.map(async maintenance => {
                                            // check for is deleted and is created by role
                                            // console.log('maintenance => ', maintenance);
                                            let date = moment(maintenance.createdAt);
                                            const MRdate = date.utc().format('YYYY-MM-DD');
                                            let completeddate = moment(maintenance.completed_date);
                                            const complatedDate = completeddate.utc().format('YYYY-MM-DD');
                                            if (!(maintenance.deleted) && (maintenance.created_by_role == Constant.AGENT)
                                                && (MRdate > startDate && MRdate < endDate) && (complatedDate > startDate && complatedDate < endDate)) {
                                                await totalMRcount++;
                                                if (maintenance.req_status == 1) {
                                                    await sentMRcount++;
                                                    await openMRcount++;
                                                } else if (maintenance.req_status == 2) {
                                                    await acceptedMRcount++;
                                                    await openMRcount++;
                                                } else if (maintenance.req_status == 3) {
                                                    await bookedMRcount++;
                                                    await openMRcount++;
                                                } else if (maintenance.req_status == 4) {
                                                    await closedMRcount++;
                                                } else if (maintenance.req_status == 5) {
                                                    comp_days = comp_days + completeddate.diff(date, 'days') + 1;
                                                    await completedMRcount++;
                                                    await openMRcount++;
                                                }
                                            }
                                        })
                                        // console.log('totalMRcount => ', totalMRcount);
                                        // console.log('sentMRcount => ', await sentMRcount);
                                        // console.log('acceptedMRcount => ', await acceptedMRcount);
                                        // console.log('bookedMRcount => ', await bookedMRcount);
                                        // console.log('closedMRcount => ', await closedMRcount);
                                        // console.log('completedMRcount => ', await completedMRcount);
                                        obj.totalMR = await totalMRcount;
                                        obj.sentMR = await sentMRcount;
                                        obj.acceptedMR = await acceptedMRcount;
                                        obj.bookedMR = await bookedMRcount;
                                        obj.completedMR = await completedMRcount;
                                        obj.closedMR = await closedMRcount;
                                        // obj.completedMR = await closedMRcount;
                                        // obj.closedMR = await completedMRcount;
                                        // count avg completion days - agent
                                        obj.avg_comp_days = await (comp_days / completedMRcount)
                                        // console.log('comp_days => ', await comp_days);
                                        // count MR perc
                                        const mr_per = await ((completedMRcount * 100 / openMRcount));
                                        // console.log('mr_per => ', await mr_per);
                                        const mrPerNumber = await (mr_per ? mr_per : 0);
                                        // console.log('mrPerNumber => ', mrPerNumber);
                                        let mrPerCount = 0;
                                        // count poits as per perc
                                        if (mrPerNumber >= 0 && mrPerNumber <= 40) {
                                            // console.log('1st => ');
                                            mrPerCount = await 2;
                                        } else if (mrPerNumber > 40 && mrPerNumber < 61) {
                                            // console.log('2nd =>')
                                            mrPerCount = await 5;
                                        } else if (mrPerNumber > 60) {
                                            // console.log('3th =>')
                                            mrPerCount = await 10;
                                        }
                                        // console.log('mrPerCount => ', await mrPerCount);
                                        const mrPoint = await (mrPerCount * completedMRcount)
                                        // console.log('mrPoint => ', await mrPoint);
                                        point = point + mrPoint;
                                    } else {
                                        // console.log('else => ');
                                        obj.sentMR = await 0;
                                        obj.acceptedMR = await 0;
                                        obj.bookedMR = await 0;
                                        obj.completedMR = await 0;
                                        obj.closedMR = await 0;
                                        obj.totalMR = await 0;
                                    }
                                    if (ele.data.agreements) {
                                        // console.log('ele.data.agreements.length => ', ele.data.agreements.length);
                                        //  check for is deleted
                                        let agreement_count = 0;
                                        if (ele.data.agreements && ele.data.agreements.length > 0) {
                                            ele.data.agreements.map(async agreement => {
                                                // console.log('agreement => ', agreement);
                                                let date = moment(agreement.createdAt);
                                                const agreementDate = date.utc().format('YYYY-MM-DD');
                                                // console.log('agreementDate => ', agreementDate);
                                                if (!(agreement.deleted) && (agreementDate > startDate && agreementDate < endDate)) {
                                                    point = point + 5;
                                                    await agreement_count++;
                                                }
                                            })
                                        }
                                        obj.agreementCount = await agreement_count;
                                    }
                                    if (ele.data.disputes) {
                                        console.log('ele.data.disputes.length => ', ele.data.disputes.length);
                                        let open_disputes = 0;
                                        let closed_disputes = 0;
                                        if (ele.data.disputes.length > 0) {
                                            ele.data.disputes.map(async dispute => {
                                                // console.log('ele :: disputes => ', dispute);
                                                let date = moment(dispute.createdAt);
                                                const disputeDate = date.utc().format('YYYY-MM-DD');
                                                if (!(dispute.deleted) && dispute.dispute_status == 1 && (disputeDate > startDate && disputeDate < endDate)) {
                                                    // open request
                                                    await open_disputes++;
                                                } else if (!(dispute.deleted) && (dispute.dispute_status == 2 || dispute.dispute_status == 3) && (disputeDate > startDate && disputeDate < endDate)) {
                                                    // closed request
                                                    await closed_disputes++;
                                                }
                                            })
                                        }
                                        obj.openDisputes = await open_disputes;
                                        obj.closedDisputes = await closed_disputes;
                                    }

                                    if (ele.data.sentmsgs) {
                                        let sent_msg_count = 0;
                                        if (ele.data.sentmsgs.length > 0) {
                                            ele.data.sentmsgs.map(async sentmsg => {
                                                let date = moment(sentmsg.created);
                                                const sentmsgDate = date.utc().format('YYYY-MM-DD');
                                                // console.log('sentmsgDate => ', sentmsgDate);
                                                if (sentmsgDate > startDate && sentmsgDate < endDate) {
                                                    await sent_msg_count++;
                                                }
                                            })
                                        }
                                        obj.sentMsgs = await sent_msg_count;
                                        // obj.sentMsgs = await ele.data.sentmsgs.length;
                                    }

                                    if (ele.data.receivedmsgs) {
                                        // console.log('ele.data.receivedmsgs.length => ', ele.data.receivedmsgs.length);
                                        let rcv_msg_count = 0;
                                        if (ele.data.receivedmsgs.length > 0) {
                                            ele.data.receivedmsgs.map(async rcvmsg => {
                                                let date = moment(rcvmsg.created);
                                                const rcvmsgDate = date.utc().format('YYYY-MM-DD');
                                                if (rcvmsgDate > startDate && rcvmsgDate < endDate) {
                                                    await rcv_msg_count++;
                                                }
                                            })
                                        }

                                        obj.receivedMsgs = await rcv_msg_count;
                                        // obj.receivedMsgs = await ele.data.receivedmsgs.length;
                                    }

                                    obj.points = await point;
                                    // console.log('obj => ', obj);
                                    //  await finalResponse.push(obj);
                                    return obj;
                                })

                                Promise.all(promises).then(async function (results) {
                                    // console.log('results=>', results)
                                    let totalCompDays = 0;
                                    let totalAgreements = 0;
                                    let totalOpenDisputes = 0
                                    let totalClosedDisputes = 0;
                                    let points = 0;
                                    let totalMR = 0;
                                    let totalClosedMR = 0;

                                    await results.map(async ele => {
                                        // console.log('ele => ', ele);
                                        if (ele.avg_comp_days) {
                                            totalCompDays = totalCompDays + ele.avg_comp_days
                                        }
                                        totalAgreements = totalAgreements + ele.agreementCount;
                                        totalOpenDisputes = totalOpenDisputes + ele.openDisputes;
                                        totalClosedDisputes = totalClosedDisputes + ele.closedDisputes;
                                        points = points + ele.points;
                                        totalMR = totalMR + ele.totalMR;
                                        totalClosedMR = totalClosedMR + ele.closedMR;
                                    })
                                    let agencyObj = await {
                                        totalAvgDaysCount: totalCompDays,
                                        totalAgreementsCount: totalAgreements,
                                        totalOpenDisputesCount: totalOpenDisputes,
                                        totalClosedDisputesCount: totalClosedDisputes,
                                        totalPoints: points,
                                        totalMRcount: totalMR,
                                        totalClosedMRcount: totalClosedMR
                                    }
                                    // console.log('agencyObj => ', agencyObj);
                                    await res.json({ code: Constant.SUCCESS_CODE, data: results, agencyData: agencyObj })
                                })

                                // console.log('totalCount => ', totalCount);
                                // console.log('finalResponse => ', await finalResponse);
                                // await res.json({ code: Constant.SUCCESS_CODE, data: finalResponse })
                            } else {
                                res.json({ code: Constant.ERROR_CODE, message: 'No agent found!' });
                            }
                        }
                    })
            } else {
                res.json({ code: Constant.ERROR_CODE, message: 'Agency Id is required.' });
            }
        })();

    } catch (error) {
        console.log('error => ', error);
        res.json({
            code: Constant.ERROR_CODE,
            message: error.message
        });
    }
}

function BulkImportAgencies(req, res) {
    try {
        console.info('---------------------------------')
        console.info('BULK IMPORT AGENCIES =>')
        console.info('---------------------------------')
        console.info('---------------------------------')
        console.info('req.body =>', req.body)
        console.info('---------------------------------')
        if (!req.body.created_by) {
            res.json({
                code: Constant.ERROR_CODE,
                message: 'created by is required.'
            });
        } else {
            if (req.body.created_by === Constant.ADMIN_ID) {
                let agencyArray = req.body.agency_arr;
                let successCount = 0;
                let errorCount = 0;

                let actions = agencyArray.map(data_ => {
                    return new Promise(function (resolve) {
                        setTimeout(function () {
                            let agencyData = JSON.parse(data_);
                            console.log('agencyData => ', agencyData);
                            if (agencyData) {
                                User.find({ email: (agencyData.email).toLowerCase() })
                                    .then(async function (userData) {
                                        if (userData && userData.length > 0) {
                                            errorCount++
                                            console.log('User already existed => ', userData);
                                            // await res.json({
                                            //     code: Constant.ERROR_CODE,
                                            //     message: 'User already exists. Please use a different email.'
                                            // });
                                        } else {
                                            console.log('New User => ');
                                            let password;
                                            password = randomString({ length: 8, numeric: true, letters: true });
                                            password = password + "@s1";
                                            console.log('password :: for agency=> ', password);
                                            if ((agencyData.agencyName) && (password) && (agencyData.firstName) && (agencyData.lastName)) {
                                                if (validator.isEmail(agencyData.email)) {
                                                    await AgencyModel.find({ email: (agencyData.email).toLowerCase() }, async function (err, agencyModalData) {
                                                        if (err) {
                                                            errorCount++;
                                                            await res.json({
                                                                code: Constant.ERROR_CODE,
                                                                message: err.message
                                                            });
                                                        } else {
                                                            if (agencyModalData && agencyModalData.length > 0) {
                                                                console.info('---------------------------------')
                                                                console.info('agency already find =>')
                                                                console.info('---------------------------------')
                                                            }
                                                            else {
                                                                let hash = bcrypt.hashSync(password, salt);
                                                                const userData = new User({
                                                                    // password: hash,
                                                                    firstname: agencyData.firstName,
                                                                    lastname: agencyData.lastName,
                                                                    email: (agencyData.email).toLowerCase(),
                                                                    mobile_no: agencyData.phoneNumber,
                                                                    name: agencyData.agencyName,
                                                                    is_active: true,
                                                                    deleted: false,
                                                                    country: '',
                                                                    suburb_postcode: '',
                                                                    address: agencyData.address,
                                                                    location_latitude: '',
                                                                    location_longitude: '',
                                                                    location_administrative_area_level_1: '',
                                                                    location_country: '',
                                                                    location_postal_code: '',
                                                                    location_locality: '',
                                                                    location_street_number: '',
                                                                    location: {
                                                                        coordinates: [],
                                                                        type: 'Point'
                                                                    }
                                                                });

                                                                await userData.save(async function (err, savedUserRecord) {
                                                                    if (err) {
                                                                        errorCount++
                                                                        console.log('err :: while saving user=> ', err);
                                                                        await res.json({
                                                                            code: Constant.ERROR_CODE,
                                                                            message: err.message
                                                                        });
                                                                    } else {
                                                                        const groupUser = new Groups({
                                                                            user_id: savedUserRecord._id,
                                                                            role_id: req.body.role_id,
                                                                            is_master_role: true
                                                                        });
                                                                        await groupUser.save(async function (err, savedGroup) {
                                                                            if (err) {
                                                                                console.log('err :: while storing groupdata=> ', err);
                                                                                await res.json({
                                                                                    code: Constant.ERROR_CODE,
                                                                                    message: err.message
                                                                                });
                                                                            } else {
                                                                                console.log('saved group record => ');
                                                                                const notification = new NotificationInfo({
                                                                                    user_id: savedUserRecord._id
                                                                                });
                                                                                await notification.save(async function (err, savedNotification) {
                                                                                    if (err) {
                                                                                        console.log('err :: while storing notification data => ', err);
                                                                                        await res.json({
                                                                                            code: Constant.ERROR_CODE,
                                                                                            message: err.message
                                                                                        });
                                                                                    } else {
                                                                                        if (req.body.role_id == Constant.OWN_AGENCY || req.body.role_id == Constant.RUN_STRATA_MANAGEMENT_COMPANY) {
                                                                                            const agencyData1 = new AgencyModel({
                                                                                                name: agencyData.agencyName,
                                                                                                no_of_property: 0,
                                                                                                principle_id: savedUserRecord._id
                                                                                            });
                                                                                            await agencyData1.save(async function (err, agency) {
                                                                                                if (err) {
                                                                                                    console.log('err :: while storing agency data => ', err);
                                                                                                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                                                                                                } else {
                                                                                                    await User.update({ _id: savedUserRecord._id }, { $set: { 'agency_id': agency._id } }, async function (err) {
                                                                                                        if (err) {
                                                                                                            console.log('err :: while updating user record => ', err);
                                                                                                            await res.json({
                                                                                                                code: Constant.ERROR_CODE,
                                                                                                                message: err.message
                                                                                                            });
                                                                                                        } else {
                                                                                                            // var hash = bcrypt.hashSync(savedUserRecord.password, salt);
                                                                                                            let infoObj = {
                                                                                                                loginURL: Constant.STAGGING_URL + '#!/login',
                                                                                                                firstName: savedUserRecord.firstname,
                                                                                                                email: savedUserRecord.email,
                                                                                                                password: password,
                                                                                                                // lastName: userData.lastname,
                                                                                                                logoURL: Constant.STAGGING_URL + 'assets/images/logo-public-home.png'
                                                                                                            }
                                                                                                            let options = {
                                                                                                                from: Config.EMAIL_FROM, // sender address
                                                                                                                to: savedUserRecord.email, // list of receivers
                                                                                                                subject: 'Account created as Ownly Agency Principle', // Subject line
                                                                                                                text: 'Account created as Ownly Agency Principle', // plaintext body
                                                                                                            }

                                                                                                            let mail_response = mail_helper.sendEmail(options, 'welcome_email_for_agency', infoObj);

                                                                                                            await User.findByIdAndUpdate(savedUserRecord._id, { password: hash }, async function (err, updatedUserRecord) {
                                                                                                                if (updatedUserRecord) {
                                                                                                                    // await res.json({
                                                                                                                    //     code: Constant.SUCCESS_CODE,
                                                                                                                    //     message: 'User added successfully!',
                                                                                                                    //     data: savedUserRecord
                                                                                                                    // });
                                                                                                                    successCount++
                                                                                                                    console.info('---------------------------------')
                                                                                                                    console.info('Add Agency successfully =>')
                                                                                                                    console.info('---------------------------------')
                                                                                                                    return [errorCount, successCount];
                                                                                                                } else if (err) {
                                                                                                                    await res.json({
                                                                                                                        code: Constant.ERROR_CODE,
                                                                                                                        message: err.message
                                                                                                                    });
                                                                                                                }
                                                                                                            });
                                                                                                        }
                                                                                                    });
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    }
                                                                                })
                                                                            }
                                                                        });
                                                                    }
                                                                })



                                                            }
                                                        }
                                                    })
                                                }

                                            }
                                        }
                                    })
                                    .then(data => {
                                        console.log('data :: then => ', data);
                                        resolve()
                                    })
                            }
                        }, 0);
                    });
                })

                Promise.all(actions).then(data => {
                    console.log('agentArray.length => ', agencyArray.length);
                    console.log('errorCount => ', errorCount);
                    console.log('successCount => ', successCount);
                    if (agencyArray.length === errorCount) {
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

            }
        }



    }
    catch (error) {
        res.json({
            code: Constant.ERROR_CODE,
            message: error.message
        });
    }
}