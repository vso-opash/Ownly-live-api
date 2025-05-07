'use strict';
var mongoose = require('mongoose'),
    disputes = mongoose.model('Disputes'),
    propertyModel = require('../models/Properties'),
    // userModel = require('../models/Users'),
    NotificationInfo = mongoose.model('Notification'),
    slug = require('slug'),
    moment = require('moment'),
    Constant = require('../../config/constant.js'),
    path = require('path'),
    waterfall = require('run-waterfall'),
    formidable = require('formidable'),
    fs = require('fs-extra'),
    moment = require('moment'),
    _ = require('underscore'),
    InvitationInfo = mongoose.model('invitations'),
    NotificationInfo = mongoose.model('Notification'),
    csv = require("fast-csv"),
    validator = require('../../config/validator.js');

module.exports = {
    addDisputes: addDisputes,
    getDisputes: getDisputes,
    getDisputesById: getDisputesById,
    updateDisputeStatus: updateDisputeStatus,
    getDisputeSearchData: getDisputeSearchData
};
/**
 Defination-
 Request param
 Response 
 created date
 created by
 */
function addDisputes(req, res) {
    var createdById = (typeof req.body.created_by_id != 'undefined') ? mongoose.Types.ObjectId(req.body.created_by_id) : '';
    var propertyId = (typeof req.body.property_id != 'undefined') ? mongoose.Types.ObjectId(req.body.property_id) : '';
    var requestByRole = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';
    var agency_id = (typeof req.body.agency_id != 'undefined') ? mongoose.Types.ObjectId(req.body.agency_id) : '';
    var ownerId = (typeof req.body.owner_id != 'undefined') ? mongoose.Types.ObjectId(req.body.owner_id) : '';
    var tenantId = (typeof req.body.tenant_id != 'undefined') ? mongoose.Types.ObjectId(req.body.tenant_id) : '';
    var agentId = (typeof req.body.agent_id != 'undefined') ? mongoose.Types.ObjectId(req.body.agent_id) : '';
    var subject = (typeof req.body.subject != 'undefined') ? req.body.subject : '';
    var message = (typeof req.body.message != 'undefined') ? req.body.message : '';
    var city = (typeof req.body.city != 'undefined') ? req.body.city : '';
    var state = (typeof req.body.state != 'undefined') ? req.body.state : '';
    var creatorName =(req.body.creator_name)?req.body.creator_name:'';

    var chars = "123456789";
    var disputeId = "aus_"+state+'_';
    for (var x = 0; x < 9; x++) {
        var i = Math.floor(Math.random() * chars.length);
        disputeId += chars.charAt(i);
    }
    var obj = {};
    if (createdById && propertyId) {
        obj.dispute_id = disputeId;

        if(createdById != '')
            obj.created_by_id = createdById;
        if(propertyId != '')
            obj.property_id = propertyId;
        if(ownerId != '')
            obj.owner_id = ownerId;
        if(tenantId != '')
            obj.tenant_id = tenantId;
        if(agentId != '')
            obj.agent_id = agentId;
        if(agency_id)
            obj.agency_id = agency_id;

        obj.subject = subject;
        obj.message = message;
        // fetch the data from propertyId
        var Disputes = new disputes(obj);
        Disputes.save(function (err, Disputes) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            }else {

                var to_users = [];
                var obj2 = {};
                obj2.subject = "Dispute";
                obj2.message = "Dispute added by " + creatorName + " for the subject " + Disputes.subject +" on "+moment().format("MMMM Do YYYY");
                obj2.from_user = mongoose.Types.ObjectId(createdById);
                if(Constant.AGENT == requestByRole){
                    to_users.push({ "users_id": mongoose.Types.ObjectId(ownerId) });   
                    to_users.push({ "users_id": mongoose.Types.ObjectId(tenantId) });
                }
                if(Constant.TENANT == requestByRole){
                    to_users.push({ "users_id": mongoose.Types.ObjectId(ownerId) });   
                    to_users.push({ "users_id": mongoose.Types.ObjectId(agentId) });
                }
                if(to_users.length){
                    obj2.to_users =  to_users;     
                }
                obj2.dispute_id = Disputes._id;
                obj2.type = Constant.NOTIFICATION_TYPE_DISPUTE;
                obj2.module = 6;
                var notification = new NotificationInfo(obj2);
                notification.save(function (err, notData) {
                    if (err) {
                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                    } else {
                        res.json({ code: Constant.SUCCESS_CODE, data: Disputes });
                    }
                });
            }
        });
    }
}

/**
 * [disputesList list - get disputesList]
 * @param  {object} req
 * @param  {object} res
 */
function getDisputes(req, res) {
    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
    var request_by_role = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';
    var outputJSON = {};
    var conditions = { "$and": [] };
    conditions["$and"].push({ "is_deleted": false });

    if (request_by_role == Constant.AGENT)
        conditions["$and"].push({ "agent_id": user_id });

    if (request_by_role == Constant.OWN_AGENCY)
        conditions["$and"].push({ "agency_id": agency_id });

    if (request_by_role == Constant.OWNER)
        conditions["$and"].push({ "owner_id": user_id });

    if (req.body.dispute_status){
        (req.body.dispute_status==1)? conditions["$and"].push({ "dispute_status": req.body.dispute_status}):conditions["$and"].push({ "dispute_status": {$ne: 1}});
    }

    if (request_by_role == Constant.TENANT)
        conditions["$and"].push({ "tenant_id": user_id });     

    // console.log("Condition",conditions);
    disputes.find(conditions)
        .populate("property_id","title image")
        .populate("created_by_id","firstname lastname image")
        .populate("tenant_id","firstname lastname image")
        .populate("owner_id","firstname lastname image")
        .populate("agent_id","firstname lastname image")
        .sort({createdAt: -1 }).exec(function(err, disputesData) {
            if (err) {
                outputJSON = {
                    'code': Constant.ERROR_CODE,
                    'message': Constant.ERROR_RETRIVING_DATA
                };
            } else {
                outputJSON = {
                    'code': Constant.SUCCESS_CODE,
                    'data':disputesData
                };
            }
        res.json(outputJSON);
    }); 
   
}

/**
 * [disputesList list - getDisputesById]
 * @param  {object} req
 * @param  {object} res
 */
function getDisputesById(req, res) {
    var disputeId = (typeof req.body.disputeId != 'undefined') ? req.body.disputeId : '';
    var conditions = { "$and": [] };
    conditions["$and"].push({ "is_deleted": false,"_id": disputeId });
    var outputJSON = {};
    disputes.findOne(conditions)
        .populate("property_id","title image address description owned_by number_bedroom number_of_bathroom number_of_parking property_type")
        .populate("created_by_id","firstname lastname image is_online")
        .populate("tenant_id","firstname lastname image is_online")
        .populate("owner_id","firstname lastname image is_online")
        .populate("agent_id","firstname lastname image is_online")
        .sort({createdAt: -1 }).exec(function(err, disputesData) {
            if (err) {
                outputJSON = {
                    'code': Constant.ERROR_CODE,
                    'message': Constant.ERROR_RETRIVING_DATA
                };
            } else {
                outputJSON = {
                    'code': Constant.SUCCESS_CODE,
                    'data':disputesData
                };
            }
        res.json(outputJSON);
    }); 
}
/*
    Function is used to change dispute status
*/
function updateDisputeStatus(req,res){
    if(req.body.dispute_id){
        var query = {"_id": req.body.dispute_id};
        var postData={
            'dispute_status': req.body.status
        }
        disputes.findOneAndUpdate(query, postData, { new: true, runValidators: true }, function (err, disputeData) {
            if (err) {
                res.json({
                    code: Constant.ERROR_CODE,
                    message: Constant.UPDATE_UNSUCCESSFULL
                });
            } else {
                res.json({
                    code: Constant.SUCCESS_CODE,
                    data: disputeData,
                    message: Constant.UPDATE_SUCCESSFULL,
                });
            }
        });
    }
}


/**
 * [disputesList list - get searched disputesList]
 * @param  {object} req
 * @param  {object} res
 */
function getDisputeSearchData(req, res) {
    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var request_by_role = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';
    var msg = (typeof req.body.message != 'undefined') ? req.body.message : '';
    
    var conditions = { "$and": [] };
    conditions["$and"].push({ "is_deleted": false });
    conditions["$and"].push({"message": new RegExp(msg, "i")});
    
    if (request_by_role == Constant.AGENT)
        conditions["$and"].push({ "agent_id": user_id });

    if (request_by_role == Constant.OWNER)
        conditions["$and"].push({ "owner_id": user_id });


    if (request_by_role == Constant.TENANT)
        conditions["$and"].push({ "tenant_id": user_id });        
    var outputJSON = {};
    disputes.find(conditions)
        .populate("property_id","title image")
        .populate("created_by_id","firstname lastname image")
        .populate("tenant_id","firstname lastname image")
        .populate("owner_id","firstname lastname image")
        .populate("agent_id","firstname lastname image")
        .sort({createdAt: -1 }).exec(function(err, disputesData) {
            // console.log("disputesData",disputesData);
            if (err) {
                outputJSON = {
                    'code': Constant.ERROR_CODE,
                    'message': Constant.ERROR_RETRIVING_DATA
                };
            } else {
                outputJSON = {
                    'code': Constant.SUCCESS_CODE,
                    'data':disputesData
                };
            }
        res.json(outputJSON);
    }); 
   
}