'use strict';
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Groups = mongoose.model('Group'),
    NotificationInfo = mongoose.model('Notification'),
    maintenances = mongoose.model('maintenances'),
    NotificationStatus = mongoose.model('NotificationStatus'),
    InvitationInfo = mongoose.model('invitations'),
    propertyModel = require('../models/Properties'),
    async = require('async'),
    forEach = require('async-foreach').forEach,
    reviews = mongoose.model('reviews'),
    favourites = mongoose.model('favourites'),
    slug = require('slug'),
    Config = require('../../config/config.js'),
    Constant = require('../../config/constant.js'),
    randomString = require('random-string'),
    waterfall = require('run-waterfall'),
    validator = require('../../config/validator.js'),
    _ = require('underscore');
module.exports = {
    globalSearch: globalSearch
};

/* Function to search result gloablly
   Request param is text to search
   Response - Return search result
*/
function globalSearch(req, res) {

    var text = (typeof req.body.text != 'undefined') ? req.body.text : '';
    var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var request_by_role = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';

    var conditions = { "$or": [], "$and": [] };
    conditions["$or"].push({ 'address': new RegExp(text, "i") }, { 'city': new RegExp(text, "i") }, { 'state': new RegExp(text, "i") }, { 'property_type': new RegExp(text, "i") }, { 'title': new RegExp(text, "i") });
    conditions["$and"].push({ 'is_deleted': false });

    if (request_by_role == Constant.OWN_AGENCY && agency_id)
        conditions["$and"].push({ "created_by_agency_id": agency_id });
    if (request_by_role == Constant.AGENT && user_id)
        conditions["$and"].push({ "created_by": user_id });
    if (request_by_role == Constant.OWNER && user_id)
        conditions["$and"].push({ "owned_by": user_id });

    waterfall([
        function (callback) {
            propertyModel.find(conditions, { "_id": 1, "description": 1, "address": 1, "image": 1 }, function (err, propertyData) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, propertyData);
                }
            });
        },
        function (propertyData, callback) {
            var conditions = { "$or": [], "$and": [] };
            
            var get_one_index = text.split(' ')[0];
            var get_second_index = text.split(' ')[1];
            console.log("get_one_index    ", get_one_index);
            console.log("get_second_index    ", get_second_index);

            if(get_one_index && get_one_index != '' && typeof get_one_index != 'undefined')
                conditions["$or"].push({ 'firstname': new RegExp(get_one_index, "i") });
            if(get_second_index && get_second_index != '' && typeof get_second_index != 'undefined')
                conditions["$or"].push({ 'lastname': new RegExp(get_second_index, "i") });

            conditions["$or"].push({ 'firstname': new RegExp(text, "i") });
            conditions["$or"].push({ 'lastname': new RegExp(text, "i") });
            conditions["$or"].push({ 'name': new RegExp(text, "i") });
            conditions["$or"].push({ 'state': new RegExp(text, "i") });
            conditions["$or"].push({ 'about_user': new RegExp(text, "i") });
            conditions["$or"].push({ 'address': new RegExp(text, "i") });

            conditions["$or"].push(
                { 'firstname': new RegExp(get_one_index, "i") },
                // { 'lastname': new RegExp(get_second_index, "i") },
                { 'firstname': new RegExp(text, "i") },
                { 'lastname': new RegExp(text, "i") },
                { 'name': new RegExp(text, "i") },                
                { 'state': new RegExp(text, "i") },
                { 'about_user': new RegExp(text, "i") },
                { 'address': new RegExp(text, "i") }
            );
            conditions["$and"].push({ 'is_deleted': false });
            User.aggregate(
                { $match: conditions },
                { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                {
                    $project: {
                        _id: 1, firstname: 1, about_user: 1, agency_id: 1, city: 1, lastname: 1, image: 1,
                        groups: { _id: 1, role_id: 1, user_id: 1, status: 1, deleted: 1, is_master_role: true }
                    }
                },
                { $match: { "groups.is_master_role": true, "groups.status": true, "groups.deleted": false } }
            ).exec(function (err, userData) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, propertyData, userData);
                }
            });
        },
        function (propertyData, userData, callback) {
            if (userData.length > 0) {
                var i, groupData, tenantCount = 0, traderCount = 0;
                groupData = _.pluck(userData, 'groups');
                for (i = 0; i < groupData.length; i++) {
                    var check = _.first(groupData[i], 1)
                    if (check[0].role_id == Constant.TENANT) {
                        tenantCount = tenantCount + 1;
                    } else if (check[0].role_id == Constant.TRADER) {
                        traderCount = traderCount + 1;
                    }
                } if (i == groupData.length) {
                    callback(null, propertyData, userData, tenantCount, traderCount);
                }
            } else {
                callback(null, propertyData, userData, 0, 0);
            }

        }
    ], function (err, propertyData, userData, tenantCount, traderCount) {
        // requestCnt
        if (err) {
            var outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.PROPERTY_CREATE_UNSUCCESS
            };
        } else {
            var statics = { "propertyData": propertyData, "userData": userData, "tenantCount": tenantCount, "traderCount": traderCount };
            // ,"requestCnt":requestCnt};
            var outputJSON = { code: Constant.SUCCESS_CODE, data: statics };
        }
        res.jsonp(outputJSON);
    });
}