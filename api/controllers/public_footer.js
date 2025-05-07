'use strict';

var mongoose = require('mongoose'),
    PublicFooterModel = require('../models/PublicFooter'),
    async = require('async'),
    Config = require('../../config/config.js'),
    Constant = require('../../config/constant.js');

    module.exports = {
        getFooterData: getFooterData,
        addFooterData: addFooterData
    };


/**
 * Function is use to add footer Content
 * Created by RIDDHI
 */
function addFooterData(req, res) {
    if ((req.body.left_content)) {
        // && (req.body.right_content)
        var footerData = {
            left_content: req.body.left_content,
            right_content: req.body.right_content
        };
        var PublicFooter = new PublicFooterModel(footerData);
        // call the built-in save method to save to the database
        PublicFooter.save(function (err, footerRecord) {
            console.log("err   ", err);
            console.log("footerRecord   ", footerRecord);
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                res.json({ code: Constant.SUCCESS_CODE, message: "data created successfully", data: footerRecord });
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQUIRED_REGISTER_FIELDS });
    }
}

/**
 * Function is use to add footer Content
 * Created by RIDDHI
 */
function getFooterData(req, res) {
    PublicFooterModel.find({}, function (err, footerRecord) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                res.json({ code: Constant.SUCCESS_CODE, message: "data found successfully", data: footerRecord });
            }
        });
}