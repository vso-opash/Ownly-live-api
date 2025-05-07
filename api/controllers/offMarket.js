'use strict';
var mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Group = mongoose.model('Group'),
  Category = mongoose.model('services_cats'),
  slug = require('slug'),
  favourites = mongoose.model('favourites'),
  static_constant = require('../models/StaticConstant'),
  Address = require('../models/Address'),
  Property = require('../models/Properties'),
  Maintenances = mongoose.model('maintenances'),
  Chats = mongoose.model('Chats'),
  Constant = require('../../config/constant.js'),
  Config = require('../../config/config.js'),
  waterfall = require('run-waterfall'),
  async = require('async'),
  lodash = require('lodash'),
  NodeGeocoder = require('node-geocoder'),
  forEach = require('async-foreach').forEach,
  changeCase = require('change-case'),
  csv = require("fast-csv"),
  path = require('path'),
  formidable = require('formidable'),
  randomString = require('random-string'),
  fs = require('fs-extra'),
  request = require('request'),
  http = require("https"),
  _ = require('underscore'),
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
const mail_helper = require('../helpers/mail_helper');
const crypto = require('crypto');
const moment = require('moment');
const sendgridHelper = require("../helpers/sendgrid");
const GLOBAL_CURRENT_YEAR = moment().format("YYYY");

module.exports = {
  getOffMarketList: getOffMarketList,
  getpropertyDetailByid: getpropertyDetailByid,
  updatePropertyClaimById: updatePropertyClaimById,
  sendMailForChat: sendMailForChat,
};

var options = {
  provider: 'google',
  // Optional depending on the providers
  httpAdapter: 'https', // Default
  apiKey: Constant.GOOGLE_API_KEY, // for Mapquest, OpenCage, Google Premier
  formatter: null // 'gpx', 'string', ...
};

function getOffMarketList(req, res) {

  var limit = (typeof req.body.limit != 'undefined') ? req.body.limit : '';
  var search_text = (typeof req.body.search_text != 'undefined') ? req.body.search_text : '';
  var suburb_postcode = (typeof req.body.suburb_postcode != 'undefined') ? req.body.suburb_postcode : '';

  // console.log("limit  ", limit, ' , search_text   ', search_text, "   suburb_postcode   ", suburb_postcode);
  (async () => {
    console.log('req.body.locations', req.body.locations[0]);

    var aggregate = [
      {
        $match: {
          'status': true

        }
      }
    ]
    if (req.body.locations != '') {
      if (req.body.locations[0].suburb !== "") {
        aggregate.push(
          {
            $match: { 'city': (req.body.locations[0].suburb).toLowerCase() }
          }
        )
      }
      // if (req.body.locations[0].state !== "") {
      //     aggregate.push(
      //         {
      //             $match: { 'state': req.body.locations[0].state }
      //         }
      //     )
      // }
      if (req.body.locations[0].area !== "") {
        aggregate.push(
          {
            $match: { 'address': req.body.locations[0].area }
          }
        )
      }
      if (req.body.minBedrooms && req.body.minBedrooms !== "") {
        aggregate.push(
          {
            $match: { 'number_bedroom': { $gte: req.body.minBedrooms } }
          }
        )
      }
      if (req.body.minBathrooms && req.body.minBathrooms !== "") {
        aggregate.push(
          {
            $match: { 'number_of_bathroom': { $gte: req.body.minBathrooms } }
          }
        )
      }
      if (req.body.locations[0].postCode !== "") {
        console.log('123456 => ', 123456);

        aggregate.push(
          {
            $match: { 'postCode': req.body.locations[0].postCode }
          }
        )
      }
      if (req.body.minCarspaces && req.body.minCarspaces !== "") {
        aggregate.push(
          {
            $match: { 'number_of_parking': { $gte: req.body.minCarspaces } }
          }
        )
      }
      // if (req.body.propertyTypes !== "") {
      //     aggregate.push(
      //         {
      //             $match: { 'property_type': { $in: req.body.propertyTypes } }
      //         }
      //     )
      // }
      // if (req.body.propertyFeatures !== "") {
      //     aggregate.push(
      //         {
      //             $match: { 'amenities': { $in: req.body.propertyFeatures } }
      //         }
      //     )
      // }
      if (req.body.minLandArea && req.body.minLandArea !== "" && req.body.maxLandArea !== "") {
        aggregate.push(
          {
            $match:
            {
              'lot_erea': { $gte: req.body.minLandArea },
              'lot_erea': { $lte: req.body.maxLandArea }
            },
          }
        )
      }
      if (req.body.minPrice && req.body.minPrice !== "" && req.body.maxPrice !== "") {
        aggregate.push(
          {
            $match:
            {
              'price': { $gte: req.body.minPrice },
              'price': { $lte: req.body.maxPrice }
            },
          }
        )
      }
      if (req.body.page !== "") {
        aggregate.push(
          {
            $skip: req.body.page - 1
          }
        )
      }
      if (req.body.pageSize !== "") {
        aggregate.push(
          {
            $limit: req.body.pageSize
          }
        )
      }


    }

    var propertyData = await Property.aggregate(aggregate);
    if (propertyData && propertyData.length > 0) {

      return res.json({
        code: Constant.SUCCESS_CODE,
        data: propertyData,
        message: 'success'
      });
    }
    else {
      res.json({ code: Constant.ERROR_CODE, message: 'No result found' });
    }
  })();
}

function getpropertyDetailByid(req, res) {
  Property.findOne({ id: req.body.id }, function (err, data) {
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.INTERNAL_ERROR
      });
    } else {
      res.json({
        code: Constant.SUCCESS_CODE,
        message: Constant.AMENITIES_FETCHED_SUCCESSFULLY,
        data: data
      });
    }
  });
}

/**
 * Function is use to update property claim by id
 * @access private
 * @return json
 * Created by       
 * @smartData Enterprises (I) Ltd
  */
function updatePropertyClaimById(req, res) {
  if (req.body) {

    var query = { "_id": req.body._id };
    Property.findOneAndUpdate(query, req.body, { new: true, runValidators: true }, function (err, propertyData) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.UPDATE_UNSUCCESSFULL
        });
      } else {
        res.json({
          code: Constant.SUCCESS_CODE,
          data: propertyData,
          message: Constant.UPDATE_SUCCESSFULL,
        });
      }
    });
  } else {
    res.json({
      code: Constant.ERROR_CODE,
      message: Constant.NOT_PROPER_DATA
    });
  }
}

function sendMailForChat(req, res) {
  (async () => {
    console.info('---------------------------------')
    console.info('req.body send Chat Mail =>', req.body)
    console.info('---------------------------------')
    let mainAggregate = [
      {
        $match: {
          _id: mongoose.Types.ObjectId(req.body.maintenanceId)
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "created_by",
          foreignField: "_id",
          as: "user1",

        },
      },
      {
        $unwind: "$user1"
      },
      {
        $lookup: {
          from: "users",
          localField: "trader_id",
          foreignField: "_id",
          as: "user2",
        },
      },
      {
        $unwind: "$user2"
      },
    ]

    let maintenanceReq = await Maintenances.aggregate(mainAggregate)
    console.info('---------------------------------')
    console.info('maintenanceReq =>', maintenanceReq)
    console.info('---------------------------------')
    if (maintenanceReq && maintenanceReq.length > 0) {
      let user1 = maintenanceReq[0].created_by
      let user2 = maintenanceReq[0].trader_id
      let aggregate = []

      aggregate.push({
        $match: {
          from: mongoose.Types.ObjectId(req.body.from_user),
          to: mongoose.Types.ObjectId(req.body.to_user),
          maintenance_id: mongoose.Types.ObjectId(req.body.maintenanceId)
        }
      })

      Chats.aggregate(aggregate, function (err, response) {
        if (err) {
          res.json({ code: Constant.ERROR_CODE, message: "No result found" });
        } else {
          if (response && response.length > 0) {
            let findLastMsg = response[response.length - 1]
            if (findLastMsg && findLastMsg.isRead == false) {
              let fromUser = null
              let toUser = null
              if (req.body.from_user == maintenanceReq[0].user1._id) {
                fromUser = maintenanceReq[0].user1
                toUser = maintenanceReq[0].user2
              }
              if (req.body.from_user == maintenanceReq[0].user2._id) {
                fromUser = maintenanceReq[0].user2
                toUser = maintenanceReq[0].user1
              }
              if (fromUser && toUser && findLastMsg) {
                let editPropertyUrl = `${global.gConfig.STAGGING_URL}#!/maintance_detail/${req.body.maintenanceId}`;
                let imgUrl = `${global.gConfig.API_URL}${findLastMsg.document_path}`;
                let mailOptions = {
                  from: Config.EMAIL_FROM, // sender address
                  to: [toUser.email], // list of receivers
                };
                mailOptions.subject = `You have received  a message from ${changeCase.titleCase(fromUser.firstname)} ${changeCase.titleCase(fromUser.lastname)}`;
                mailOptions.html =
                  "<!DOCTYPE html>" +
                  '<html lang="en">' +
                  "<head>" +
                  '<meta charset="utf-8">' +
                  '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
                  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
                  '<meta name="description" content="">' +
                  '<meta name="author" content="">' +
                  '<link rel="icon" href="../../favicon.ico">' +
                  "<title>Ownly</title>" +
                  "</head>" +
                  "<body>" +
                  '<table style="width: 100%;font-family: SF Text;"">' +
                  "<tr>" +
                  "<td></td>" +
                  '<td bgcolor="#FFFFFF ">' +
                  '<div style="padding: 15px; max-width: 600px;margin: 0 auto;display: block; border-radius: 0px;padding: 0px;box-shadow: 0 5px 10px rgba(0,0,0,0.3);">' +
                  '<table style="width: 100%;background: #142540 ;">' +
                  "<tr>" +
                  "<td></td>" +
                  "<td>" +
                  "<div>" +
                  '<table width="100%">' +
                  "<tr>" +
                  '<td rowspan="2" style="text-align:center;padding:10px;">' +
                  // '<img src="' + Constant.STAGGING_URL + 'assets/images/logo-public-home.png"/>' +
                  "</td>" +
                  "</tr>" +
                  "</table>" +
                  "</div>" +
                  "</td>" +
                  "<td></td>" +
                  "</tr>" +
                  "</table>" +
                  '<table style="padding:10px;font-size:14px; width:100%;">' +
                  "<tr>" +
                  '<td style="padding:10px;font-size:14px; width:100%;">' +
                  "<p><strong> Hi " +
                  changeCase.titleCase(toUser.firstname) +
                  " " +
                  changeCase.titleCase(toUser.lastname) +
                  "," +
                  "</strong></p>" +
                  "<p> You have received the following message from " +
                  changeCase.titleCase(fromUser.firstname) +
                  " " +
                  changeCase.titleCase(fromUser.lastname) +
                  ":</p>" +
                  "<br />" +
                  `<p><i>"${findLastMsg.msg}"</i></p>` +
                  "<br />" +
                  `<p><a style="display:block;background:#2AA8D7; width:100px; line-height:28px; color:#fff; font-size:13px; border-radius:4px; text-decoration:none;text-align:center; margin-bottom:15px;" href="${editPropertyUrl}">View</a>` +

                  "</p><br/>" +
                  "<p>" +
                  "</p>" +
                  "<p></p>" +
                  "<p></p>" +
                  "<p>Thanks, <br /> Ownly Team.</p>" +
                  "</td>" +
                  "</tr>" +
                  "</table>" +
                  '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
                  "<tr>" +
                  "<td>" +
                  '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© ' +
                  GLOBAL_CURRENT_YEAR +
                  ' <a href="#" style="text-decoration:none;color:#fff;">ownly.com</a>' +
                  "</div>" +
                  "</td>" +
                  "</tr>" +
                  "</table>" +
                  "</div>" +
                  "</td>" +
                  "</tr>" +
                  "</table>" +
                  "</body>" +
                  "</html>";

                let info = transporter.sendMail(
                  {
                    from: mailOptions.from,
                    to: mailOptions.to,
                    subject: mailOptions.subject,
                    html: mailOptions.html,
                  },
                  function (error, response) {
                    if (error) {
                      console.log("mail not sent");
                    } else {
                      console.log("mail sent", response);
                      console.info("--------------------------");
                      console.info("global.gConfig =>", global.gConfig);
                      console.info("--------------------------");
                    }
                  }
                );
              }
              console.info('---------------------------------')
              console.info('findLastMsg =>', findLastMsg)
              console.info('---------------------------------')
            }
          }
        }
      })
    }

    res.json({
      code: Constant.SUCCESS_CODE,
      data: 'data',
      message: "success",
    });

  })();
}