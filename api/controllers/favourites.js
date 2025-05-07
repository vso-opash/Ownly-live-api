'use strict';
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Groups = mongoose.model('Group'),
    NotificationInfo = mongoose.model('Notification'),
    favourites = mongoose.model('favourites'),
    slug = require('slug'),
    Config = require('../../config/config.js'),
    Constant = require('../../config/constant.js'),
    randomString = require('random-string'),
    validator = require('../../config/validator.js');

    module.exports = {
        addToFavouritesUser: addToFavouritesUser ,
        addToFavNoticeboard:addToFavNoticeboard,
        addToFavouritesProperty:addToFavouritesProperty ,
        getFaviourateUserList:getFaviourateUserList
    };

/**
 * [Add Favourate (addToFavNoticeboard)- Fav noticebaord]
 * @param  {object} req
 * @param  {object} res
 */
function addToFavNoticeboard(req, res) {

    var fav_by = (typeof req.body.fav_by != 'undefined') ? req.body.fav_by : '';
    var noticeboard_id = (typeof req.body.noticeboard_id != 'undefined') ? req.body.noticeboard_id : '';
    var fav_status = (typeof req.body.fav_status != 'undefined') ? req.body.fav_status : 1;
   
    if(fav_by && noticeboard_id){
        favourites.count({"is_deleted": false,
            $or: [{
                fav_type: 1
            }, {
                fav_type: 2
            }, {
                fav_type: 3
            }],fav_to_noticeboard: mongoose.Types.ObjectId(noticeboard_id),fav_by: mongoose.Types.ObjectId(fav_by)}).exec(function(err, data) {
                
                if (err) {
                    res.json({
                        code: Constant.ERROR_CODE,
                        message: Constant.ERROR_RETRIVING_DATA
                    });
                } else if (data > 0) {
                    favourites.update({fav_to_noticeboard: mongoose.Types.ObjectId(noticeboard_id),fav_by: mongoose.Types.ObjectId(fav_by)},
                        { $set: { 'fav_status': fav_status} }, function (err,data) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                        } else {
                             res.json({ code: Constant.SUCCESS_CODE, message: "Unfav noticeboard successfully" });
                        }
                    });
                } else {
                    var obj = {};   
                    obj.fav_by = mongoose.Types.ObjectId(fav_by);
                    obj.fav_to_noticeboard = mongoose.Types.ObjectId(noticeboard_id);
                    obj.fav_type = 3;
                    obj.fav_status = 1;
                    var Favourate = new favourites(obj);
                    Favourate.save(function (err, fav) {
                        if (err) {
                            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                        } else {
                            res.json({ code: Constant.SUCCESS_CODE, message: "Noticeboard added in favourate list" });
                        }
                    });
                }
        });
    }else{
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}    
 
/**
 * [Add Favourate - Add Fav to user ]
 * @param  {object} req
 * @param  {object} res
 */
function addToFavouritesUser(req, res) {

    var fav_by = (typeof req.body.fav_by != 'undefined') ? req.body.fav_by : '';
    var fav_to = (typeof req.body.fav_to != 'undefined') ? req.body.fav_to : '';
    var fav_status = (typeof req.body.fav_status != 'undefined') ? req.body.fav_status : 1;
   
    if(fav_by && fav_to){
        favourites.count({"is_deleted": false,
            $or: [{
                fav_type: 1
            }, {
                fav_type: 2
            }],
            fav_to_user: mongoose.Types.ObjectId(fav_to),
            fav_by: mongoose.Types.ObjectId(fav_by)}).exec(function(err, data) {
            if (err) {
                res.json({
                    code: Constant.ERROR_CODE,
                    message: Constant.ERROR_RETRIVING_DATA
                });
            } else if (data > 0) {
                favourites.update({fav_to_user: mongoose.Types.ObjectId(fav_to),fav_by: mongoose.Types.ObjectId(fav_by)},
                { $set: { 'fav_status': fav_status} }, function (err,data) {
                  
                    if (err) {
                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                    } else {
                         res.json({ code: Constant.SUCCESS_CODE, message: "Unfav user successfully" });
                    }
                });
            } else {
                var obj = {};   
                obj.fav_by = mongoose.Types.ObjectId(fav_by);
                obj.fav_to_user = mongoose.Types.ObjectId(fav_to);
                obj.fav_type = 1;
                obj.fav_status = 1;
                var Favourate = new favourites(obj);
                Favourate.save(function (err, fav) {
                    if (err) {
                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                    } else {
                        res.json({ code: Constant.SUCCESS_CODE, message: "User added in favourate list" });
                    }
                });
            }
        });
    }else{
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

/**
 * [Add Favourate - Add Fav to property ]
 * @param  {object} req
 * @param  {object} res
 */
function addToFavouritesProperty(req, res) {

    var fav_by = (typeof req.body.fav_by != 'undefined') ? req.body.fav_by : '';
    var fav_to_property = (typeof req.body.fav_to_property != 'undefined') ? req.body.fav_to_property : '';
    var fav_status = (typeof req.body.fav_status != 'undefined') ? req.body.fav_status : 1;
   
    if(fav_by && fav_to_property){

        favourites.count({"is_deleted": false,
            $or: [{
                fav_type: 1
            }, {
                fav_type: 2
            }],
            fav_by: mongoose.Types.ObjectId(fav_by),
            fav_to_property: mongoose.Types.ObjectId(fav_to_property)}).exec(function(err, data) {
        
            if (err) {
                res.json({
                    code: Constant.ERROR_CODE,
                    message: Constant.ERROR_RETRIVING_DATA
                });
            } else if (data > 0) {
               
                favourites.update({fav_by: mongoose.Types.ObjectId(fav_by),fav_to_property: mongoose.Types.ObjectId(fav_to_property)},
                { $set: { 'fav_status': fav_status} }, function (err) {
                    if (err) {
                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                    } else {
                         res.json({ code: Constant.SUCCESS_CODE, message: "change faviuorate property option" });
                    }
                });
            } else {
                
                var obj = {};   
                obj.fav_by = mongoose.Types.ObjectId(fav_by);
                obj.fav_to_property = mongoose.Types.ObjectId(fav_to_property);
                obj.fav_type = 2;
                obj.fav_status = 1;
                var Favourate = new favourites(obj);
                Favourate.save(function (err, fav) {
                    if (err) {
                        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                    } else {
                        res.json({ code: Constant.SUCCESS_CODE, message: "Property added in favourate list" });
                    }
                });
            }
        });
    }else{
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}


/**
 * [Add Favourate - Add Fav to property ]
 * @param  {object} req
 * @param  {object} res
 */
function getFaviourateUserList(req, res) {

    var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';

    if(user_id){
        favourites.find({"is_deleted": false,"fav_type": 1, "fav_status" :1, fav_by: mongoose.Types.ObjectId(user_id)}).populate('fav_to_user').exec(function(err, property) {
            if (err) {
                res.json({
                    code: Constant.ERROR_CODE,
                    message: Constant.ERROR_RETRIVING_DATA
                });
            } else if (property && property.length) {
                res.json({
                    code: 200,
                    message: Constant.PROPERTY_SUCCESS_GOT_DATA,
                    data: property
                });
            } else {
                res.json({
                    code: 200,
                    message: Constant.PROPERTY_SUCCESS_GOT_DATA,
                    data: []
                });
            }
        });
    }
}