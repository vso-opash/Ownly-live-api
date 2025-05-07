"use strict";
var mongoose = require("mongoose"),
  User = mongoose.model("User"),
  Group = mongoose.model("Group"),
  Category = mongoose.model("services_cats"),
  slug = require("slug"),
  favourites = mongoose.model("favourites"),
  static_constant = require("../models/StaticConstant"),
  Address = require("../models/Address"),
  Constant = require("../../config/constant.js"),
  Config = require("../../config/config.js"),
  waterfall = require("run-waterfall"),
  async = require("async"),
  lodash = require("lodash"),
  NodeGeocoder = require("node-geocoder"),
  forEach = require("async-foreach").forEach,
  changeCase = require("change-case"),
  csv = require("fast-csv"),
  path = require("path"),
  formidable = require("formidable"),
  randomString = require("random-string"),
  fs = require("fs-extra"),
  request = require("request"),
  http = require("https"),
  _ = require("underscore"),
  validator = require("../../config/validator.js");
/* Mailgun Email setup*/
var bcrypt = require("bcrypt");
var sendmail = require("sendmail")();
var nodemailer = require("nodemailer");
var changeCase = require("change-case");
var salt = bcrypt.genSaltSync(10);
var smtpTransport = require("nodemailer-smtp-transport");
// var transporter = nodemailer.createTransport(
//     smtpTransport('smtp://' + Config.SMTP.authUser + ':' + Config.SMTP.authpass + '@smtp.gmail.com')
// );
var transporter = nodemailer.createTransport(
  smtpTransport({
    service: Config.SMTP.service,
    auth: {
      user: Config.SMTP.authUser,
      pass: Config.SMTP.authpass,
    },
  })
);
const mail_helper = require("../helpers/mail_helper");
const crypto = require("crypto");
const moment = require("moment");
const sendgridHelper = require("../helpers/sendgrid");

module.exports = {
  tradersListForMR: tradersListForMR,
  tradersListForAdmin: tradersListForAdmin,
  tradersList: tradersList,
  tradersListPublic: tradersListPublic,
  getCategoryList: getCategoryList,
  tradersOptionList: tradersOptionList,
  getAllSavedTraders: getAllSavedTraders,
  pickFromSavedTraders: pickFromSavedTraders,
  validateEmail: validateEmail,
  importTraderCSV: importTraderCSV,
  trackInitialTraderEmail: trackInitialTraderEmail,
  download_file: download_file,
  getCategoriesBusinessnamesList: getCategoriesBusinessnamesList,
  provious_existing_traders: provious_existing_traders,
  resendEmailToTrader: resendEmailToTrader,
  removeDuplicateTraders: removeDuplicateTraders,
  premiumTradersList: premiumTradersList,
};

var options = {
  provider: "google",
  // Optional depending on the providers
  httpAdapter: "https", // Default
  apiKey: Constant.GOOGLE_API_KEY, // for Mapquest, OpenCage, Google Premier
  formatter: null, // 'gpx', 'string', ...
};

/**
 * Trader List for Admin
 */
function tradersListForAdmin(req, res) {
  // console.log('req.body => ', req.body);
  (async () => {
    const geocoder = NodeGeocoder(options);
    const user_id =
      typeof req.body.user_id != "undefined" ? req.body.user_id : "";
    const page_number = req.body.current_page ? req.body.current_page - 1 : 0;
    const number_of_pages = req.body.number_of_pages
      ? req.body.number_of_pages
      : 10;

    const firstname =
      typeof req.body.firstname != "undefined" ? req.body.firstname : "";
    const lastname =
      typeof req.body.lastname != "undefined" ? req.body.lastname : "";
    const state = typeof req.body.state != "undefined" ? req.body.state : "";
    const city = typeof req.body.city != "undefined" ? req.body.city : "";
    const zip_code =
      typeof req.body.zip_code != "undefined" ? req.body.zip_code : "";
    const categories_id =
      typeof req.body.categories_id != "undefined"
        ? req.body.categories_id
        : "";
    const searchtext =
      typeof req.body.searchtext != "undefined" ? req.body.searchtext : "";
    const limit = typeof req.body.limit != "undefined" ? req.body.limit : 10;
    const check_active =
      typeof req.body.check_active != "undefined" ? req.body.check_active : "";
    const user_email_status =
      typeof req.body.user_email_status != "undefined"
        ? req.body.user_email_status
        : "";
    const sortBy = req.body.sortBy ? req.body.sortBy : "createdAt"
    const sortByCount = req.body.sortByCount ? req.body.sortByCount : -1

    const sortByLast = `data.${sortBy}`

    console.log("searchtext---->>>>>", searchtext);

    let conditions = { $and: [] };

    conditions["$and"].push({ is_deleted: false });
    conditions["$and"].push({ defaultUserRole: "trader" });

    if (user_id) {
      conditions["$and"].push({
        _id: { $ne: mongoose.Types.ObjectId(user_id) },
      });
      conditions["$and"].push({
        $or: [
          { firstname: { $regex: new RegExp(searchtext, "i") } },
          { name: { $regex: new RegExp(searchtext, "i") } },
          { lastname: { $regex: new RegExp(searchtext, "i") } },
          { suburb_postcode: { $regex: new RegExp(searchtext, "i") } },
          { state: { $regex: new RegExp(searchtext, "i") } },
          { zipCode: { $regex: new RegExp(searchtext, "i") } },
          { business_name: { $regex: new RegExp(searchtext, "i") } },
          { email: searchtext },
          { mobile_no: { $regex: new RegExp(searchtext, "i") } },
        ],
      });
      console.log("conditions mansi1111111", JSON.stringify(conditions));
    }

    if (firstname)
      conditions["$and"].push({ name: { $regex: new RegExp(firstname, "i") } });
    if (state)
      conditions["$and"].push({ state: { $regex: new RegExp(state, "i") } });
    if (city)
      conditions["$and"].push({ city: { $regex: new RegExp(city, "i") } });
    if (zip_code)
      conditions["$and"].push({
        zipCode: { $regex: new RegExp(zip_code, "i") },
      });

    if (categories_id != "") {
      // console.log("I m inside");
      conditions["$and"].push({
        categories_id: mongoose.Types.ObjectId(categories_id),
      });
    }
    console.log("user_email_status => ", user_email_status);

    if (user_email_status === "active_traders") {
      conditions["$and"].push({ is_active: true });
    } else if (user_email_status === "opened_email") {
      conditions["$and"].push({
        is_opened_trade_email: true,
        is_active: false,
      });
    } else if (user_email_status === "unopened_email") {
      conditions["$and"].push({
        is_opened_trade_email: false,
        is_active: false,
      });
    }

    if (user_id) {
      console.log("1st =================> ");
      User.count(conditions).exec(async function (err, result) {
        console.log("err :: 1st ====> ", err);
        if (err) {
          // callback(Constant.INTERNAL_ERROR, null);
          res.json({
            code: Constant.ERROR_CODE,
            message: Constant.ERROR_RETRIVING_DATA,
          });
        } else {
          console.log("total count found => ");
          let totalCount = 0;
          console.log("result => ", result);
          // if (result.len > 0) {

          if (result > 0) {
            totalCount = result;
            // totalCount = result[0].count;
            console.log("conditions", JSON.stringify(conditions));

            let userData_aggregate = [
              { $match: conditions }, // Match me
              { $sort: { [sortBy]: sortByCount } },
              { $skip: page_number * number_of_pages },
              { $limit: limit },
              {
                $unwind: {
                  path: "$categories_id",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "services_cats",
                  localField: "categories_id",
                  foreignField: "_id",
                  as: "categories_id",
                },
              },
              {
                $lookup: {
                  from: "agencies",
                  localField: "agency_id",
                  foreignField: "_id",
                  as: "agency_id",
                },
              },
              {
                $lookup: {
                  from: "groups",
                  localField: "_id",
                  foreignField: "user_id",
                  as: "groups",
                },
              },
              {
                $lookup: {
                  from: "reviews",
                  localField: "_id",
                  foreignField: "review_to",
                  as: "reviews",
                },
              },
              {
                $group: {
                  _id: "$_id",
                  data: { $first: "$$ROOT" },
                },
              },
              {
                $sort: { [sortByLast]: 1 }
              },
            ];
            User.aggregate(userData_aggregate)
              .allowDiskUse(true)
              .exec(function (err, usersList) {
                if (err) {
                  console.log("err => ", err);
                  res.json({
                    code: Constant.ERROR_CODE,
                    message: Constant.ERROR_RETRIVING_DATA,
                  });
                } else {
                  res.json({
                    code: Constant.SUCCESS_CODE,
                    data: usersList,
                    totalCount: totalCount,
                  });
                }
              });
          } else {
            res.json({
              code: Constant.SUCCESS_CODE,
              data: [],
              totalCount: totalCount,
            });
          }
        }
      });
    } else {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.REQ_DATA_MISSING,
      });
    }
  })();
}

/**
 * Old API - Trader List for admin panel
 */
function tradersListForAdminOld(req, res) {
  // console.log('req.body => ', req.body);
  var geocoder = NodeGeocoder(options);
  var user_id = typeof req.body.user_id != "undefined" ? req.body.user_id : "";
  var page_number = req.body.current_page ? req.body.current_page - 1 : 0;
  var number_of_pages = req.body.number_of_pages
    ? req.body.number_of_pages
    : 10;
  // var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
  // var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 10;

  var firstname =
    typeof req.body.firstname != "undefined" ? req.body.firstname : "";
  var lastname =
    typeof req.body.lastname != "undefined" ? req.body.lastname : "";
  var state = typeof req.body.state != "undefined" ? req.body.state : "";
  var city = typeof req.body.city != "undefined" ? req.body.city : "";
  var zip_code =
    typeof req.body.zip_code != "undefined" ? req.body.zip_code : "";
  var categories_id =
    typeof req.body.categories_id != "undefined" ? req.body.categories_id : "";
  var searchtext =
    typeof req.body.searchtext != "undefined" ? req.body.searchtext : "";
  var limit = typeof req.body.limit != "undefined" ? req.body.limit : 10;
  var check_active =
    typeof req.body.check_active != "undefined" ? req.body.check_active : "";
  const user_email_status =
    typeof req.body.user_email_status != "undefined"
      ? req.body.user_email_status
      : "";
  var conditions = { $and: [] };

  conditions["$and"].push({ is_deleted: false });

  if (user_id)
    conditions["$and"].push({ _id: { $ne: mongoose.Types.ObjectId(user_id) } });

  conditions["$and"].push({
    $or: [
      { firstname: { $regex: new RegExp(searchtext, "i") } },
      { business_name: { $regex: new RegExp(searchtext, "i") } },
      { lastname: { $regex: new RegExp(searchtext, "i") } },
      { suburb_postcode: { $regex: new RegExp(searchtext, "i") } },
      { state: { $regex: new RegExp(searchtext, "i") } },
      { zipCode: { $regex: new RegExp(searchtext, "i") } },
      { mobile_no: { $regex: new RegExp(searchtext, "i") } },
    ],
  });

  if (firstname)
    conditions["$and"].push({ name: { $regex: new RegExp(firstname, "i") } });
  if (state)
    conditions["$and"].push({ state: { $regex: new RegExp(state, "i") } });
  if (city)
    conditions["$and"].push({ city: { $regex: new RegExp(city, "i") } });
  if (zip_code)
    conditions["$and"].push({ zipCode: { $regex: new RegExp(zip_code, "i") } });

  if (categories_id) {
    // console.log("I m inside");
    conditions["$and"].push({
      categories_id: mongoose.Types.ObjectId(categories_id),
    });
  }
  console.log("user_email_status => ", user_email_status);

  if (user_email_status === "active_traders") {
    conditions["$and"].push({ is_active: true });
  } else if (user_email_status === "opened_email") {
    conditions["$and"].push({ is_opened_trade_email: true, is_active: false });
  } else if (user_email_status === "unopened_email") {
    conditions["$and"].push({ is_opened_trade_email: false, is_active: false });
  }

  if (user_id) {
    waterfall(
      [
        function (callback) {
          User.aggregate([
            { $match: conditions }, // Match me
            {
              $lookup: {
                from: "groups",
                localField: "_id",
                foreignField: "user_id",
                as: "groups",
              },
            },
            {
              $match: {
                "groups.role_id": mongoose.Types.ObjectId(Constant.TRADER),
                "groups.is_master_role": true,
                "groups.status": true,
                "groups.deleted": false,
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ])
            .allowDiskUse(true)
            .exec(function (err, result) {
              if (err) {
                callback(Constant.INTERNAL_ERROR, null);
              } else {
                var totalCount = 0;
                if (result.length > 0) {
                  totalCount = result[0].count;
                  var userData_aggregate = [
                    { $match: conditions }, // Match me
                    {
                      $lookup: {
                        from: "groups",
                        localField: "_id",
                        foreignField: "user_id",
                        as: "groups",
                      },
                    },
                    {
                      $lookup: {
                        from: "reviews",
                        localField: "_id",
                        foreignField: "review_to",
                        as: "reviews",
                      },
                    },
                    {
                      $project: {
                        _id: 1,
                        firstname: 1,
                        lastname: 1,
                        email: 1,
                        is_online: 1,
                        business_name: 1,
                        suburb_postcode: 1,
                        state: 1,
                        zipCode: 1,
                        mobile_no: 1,
                        is_active: 1,
                        address: 1,
                        totalPropertyCount: 1,
                        about_user: 1,
                        image: 1,
                        images: 1,
                        agency_id: 1,
                        categories_id: 1,
                        is_opened_trade_email: 1,
                        is_active: 1,
                        createdAt: 1,
                        groups: {
                          _id: 1,
                          role_id: 1,
                          status: 1,
                          deleted: 1,
                          is_master_role: 1,
                        },
                        reviews: {
                          _id: 1,
                          review_to: 1,
                          review_by: 1,
                          avg_total: 1,
                        },
                      },
                    },
                    {
                      $match: {
                        "groups.role_id": mongoose.Types.ObjectId(
                          Constant.TRADER
                        ),
                        "groups.is_master_role": true,
                        "groups.status": true,
                        "groups.deleted": false,
                      },
                    },
                    { $sort: { createdAt: -1 } },
                    { $skip: page_number * number_of_pages },
                    { $limit: limit },
                  ];

                  User.aggregate(userData_aggregate).exec(function (
                    err,
                    usersList
                  ) {
                    if (err) {
                      callback(Constant.INTERNAL_ERROR, null);
                    } else {
                      User.populate(
                        usersList,
                        { path: "categories_id agency_id" },
                        function (err, finalData) {
                          if (err) {
                            callback(Constant.INTERNAL_ERROR, null);
                          } else {
                            callback(null, finalData, totalCount);
                          }
                        }
                      );
                    }
                  });
                } else {
                  callback(null, [], totalCount);
                }
              }
            });
        },
      ],
      function (err, result, total_count) {
        if (err) {
          res.json({
            code: Constant.ERROR_CODE,
            message: Constant.ERROR_RETRIVING_DATA,
          });
        } else {
          res.json({
            code: Constant.SUCCESS_CODE,
            data: result,
            totalCount: total_count,
          });
        }
      }
    );
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
  }
}

function getCategoryID(category_slug) {
  return new Promise(function (resolve, reject) {
    var category_slug_id = "";
    if (category_slug && category_slug != "") {
      (async () => {
        await Category.findOne(
          { deleted: false, status: true, category_slug: category_slug },
          { name: 1, _id: 1, category_slug: 1 }
        ).exec(async function (err, category_data) {
          if (err) {
            reject(new Error("Ooops, something broke!"));
          } else {
            console.log("category_data  ", category_data);
            category_slug_id = await category_data._id;
            console.log("category_slug_id ==============> ", category_slug_id);
            resolve(category_slug_id);
          }
        });
      })();
    }
  });
}
function tradersListForMR(req, res) {
  (async () => {
    const categories_id =
      typeof req.body.categories_id != "undefined"
        ? req.body.categories_id
        : "";
    const user_id =
      typeof req.body.user_id != "undefined" ? req.body.user_id : "";
    const searchtext =
      typeof req.body.searchtext != "undefined" ? req.body.searchtext : "";
    let conditions = { $or: [], $and: [] };
    if (categories_id) {
      conditions["$and"].push({
        categories_id: mongoose.Types.ObjectId(categories_id),
      });
      conditions["$or"].push(
        { firstname: new RegExp(searchtext, "i") },
        { business_name: new RegExp(searchtext, "i") }
      );

      User.count(conditions).exec(async function (err, result) {
        if (err) {
          callback(Constant.INTERNAL_ERROR, null);
        } else {
          let totalCount = 0;
          if (result > 0) {
            totalCount = result;
            var userData_aggregate = [
              { $match: conditions }, // Match me
              { $sort: { createdAt: -1 } },
              {
                $lookup: {
                  from: "reviews",
                  localField: "_id",
                  foreignField: "review_to",
                  as: "reviews",
                },
              },
              {
                $unwind: {
                  path: "$categories_id",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "services_cats",
                  localField: "categories_id",
                  foreignField: "_id",
                  as: "categories",
                },
              },
              {
                $lookup: {
                  from: "agencies",
                  localField: "agency_id",
                  foreignField: "_id",
                  as: "agency_id",
                },
              },
              {
                $lookup: {
                  from: "groups",
                  localField: "_id",
                  foreignField: "user_id",
                  as: "groups",
                },
              },
              {
                $lookup: {
                  from: "favourites",
                  localField: "_id",
                  foreignField: "fav_to_user",
                  as: "favourites",
                },
              },
              {
                $group: {
                  _id: "$_id",
                  data: { $first: "$$ROOT" },
                  category: {
                    $addToSet: {
                      name: { $arrayElemAt: ["$categories.name", 0] },
                      status: { $arrayElemAt: ["$categories.status", 0] },
                      _id: { $arrayElemAt: ["$categories._id", 0] },
                      category_slug: {
                        $arrayElemAt: ["$categories.category_slug", 0],
                      },
                    },
                  },
                },
              },
            ];
            // console.log('userData_aggregate => ', userData_aggregate);
            User.aggregate(userData_aggregate).exec(function (err, usersList) {
              if (err) {
                console.log("err==>", err);
                res
                  .status(Constant.ERROR_CODE)
                  .json({
                    code: Constant.ERROR_CODE,
                    message: Constant.ERROR_RETRIVING_DATA,
                  });
              } else {
                usersList.map((ele) => {
                  if (ele.category.length > 0) {
                    ele.data.categories_id = ele.category;
                    delete ele.data["categories"];
                    delete ele["category"];
                  }
                  if (ele.data.favourites && ele.data.favourites.length > 0) {
                    let favArray = ele.data.favourites;
                    favArray.map((el) => {
                      if (
                        el.fav_type == 1 &&
                        el.fav_by.equals(user_id) &&
                        el.fav_to_user.equals(ele.data._id)
                      ) {
                        console.log("el.fav_status => ", el.fav_status);
                        ele.data.is_fav = el.fav_status;
                      }
                    });
                  } else {
                    ele.data.is_fav = 2;
                  }
                });
                res.json({
                  code: Constant.SUCCESS_CODE,
                  data: usersList,
                  totalCount: totalCount,
                });
              }
            });
          } else {
            res.json({
              code: Constant.SUCCESS_CODE,
              data: [],
              totalCount: totalCount,
            });
          }
        }
      });
    }
  })();
}

/**
 * New API for Traders list
 */
function tradersList(req, res) {
  (async () => {
    const geocoder = NodeGeocoder(options);
    const user_id =
      typeof req.body.user_id != "undefined" ? req.body.user_id : "";
    const page_number = req.body.page_number ? req.body.page_number - 1 : 0;
    const number_of_pages = req.body.number_of_pages
      ? req.body.number_of_pages
      : 10;
    const firstname =
      typeof req.body.firstname != "undefined" ? req.body.firstname : "";
    const lastname =
      typeof req.body.lastname != "undefined" ? req.body.lastname : "";
    const state = typeof req.body.state != "undefined" ? req.body.state : "";
    const city = typeof req.body.city != "undefined" ? req.body.city : "";
    const zip_code =
      typeof req.body.zip_code != "undefined" ? req.body.zip_code : "";
    const categories_id =
      typeof req.body.categories_id != "undefined"
        ? req.body.categories_id
        : "";
    const category_slug =
      typeof req.body.category_slug != "undefined"
        ? req.body.category_slug
        : "";
    let suburb_postcode;
    if (req.body.suburb_postcode) {
      suburb_postcode =
        typeof req.body.suburb_postcode != "undefined"
          ? req.body.suburb_postcode
          : "";
    } else if (req.body.suburb) {
      suburb_postcode =
        typeof req.body.suburb != "undefined" ? req.body.suburb : "";
    }
    console.log("suburb_postcode => ", suburb_postcode);
    const latitude =
      typeof req.body.latitude != "undefined" ? req.body.latitude : "";
    const longitude =
      typeof req.body.longitude != "undefined" ? req.body.longitude : "";
    const searchtext =
      typeof req.body.searchtext != "undefined" ? req.body.searchtext : "";
    const limit = typeof req.body.limit != "undefined" ? req.body.limit : 10;
    const check_active =
      typeof req.body.check_active != "undefined" ? req.body.check_active : "";
    let conditions = { $and: [] };

    // conditions["$and"].push({ "is_deleted": false, "is_active": true });
    conditions["$and"].push({ is_deleted: false });
    conditions["$and"].push({ defaultUserRole: "trader" });
    if (check_active) conditions["$and"].push({ is_active: true });

    if (user_id)
      conditions["$and"].push({
        _id: { $ne: mongoose.Types.ObjectId(user_id) },
      });

    if (searchtext) {
      conditions["$and"].push({
        $or: [
          { firstname: { $regex: new RegExp(searchtext, "i") } },
          // { "lastname": { $regex: new RegExp(searchtext, "i") } },
          { business_name: { $regex: new RegExp(searchtext, "i") } },
          { lastname: { $regex: new RegExp(searchtext, "i") } },
          { suburb_postcode: { $regex: new RegExp(searchtext, "i") } },
          { state: { $regex: new RegExp(searchtext, "i") } },
          { zipCode: { $regex: new RegExp(searchtext, "i") } },
          { mobile_no: { $regex: new RegExp(searchtext, "i") } },
        ],
      });
    }

    if (firstname)
      conditions["$and"].push({ name: { $regex: new RegExp(firstname, "i") } });
    // if (lastname)
    //     conditions["$and"].push({"lastname": { $regex : new RegExp(lastname, "i") }});
    if (state)
      conditions["$and"].push({ state: { $regex: new RegExp(state, "i") } });
    if (city)
      conditions["$and"].push({ city: { $regex: new RegExp(city, "i") } });
    if (zip_code)
      conditions["$and"].push({
        zipCode: { $regex: new RegExp(zip_code, "i") },
      });
    if (categories_id)
      conditions["$and"].push({
        categories_id: mongoose.Types.ObjectId(categories_id),
      });

    if (
      req.body.location &&
      req.body.location == "yes" &&
      latitude &&
      longitude &&
      latitude != "" &&
      longitude != ""
    ) {
      conditions["$and"].push({
        location: {
          $geoWithin: {
            $centerSphere: [
              [longitude, latitude],
              Constant.FIFTY_KM_INTO_MILE / Constant.RADIUS,
            ],
          },
        },
      });
    } else if (latitude && longitude && latitude != "" && longitude != "") {
      console.log("or => ");
      conditions = { $or: [] };
      if (latitude && latitude != "")
        conditions["$or"].push({ "location.coordinates": latitude });
      if (longitude && longitude != "")
        conditions["$or"].push({ "location.coordinates": longitude });
      if (suburb_postcode && suburb_postcode != "")
        conditions["$or"].push({
          suburb_postcode: { $regex: new RegExp(suburb_postcode, "i") },
        });
    } else if (suburb_postcode && suburb_postcode != "") {
      conditions["$and"].push({
        suburb_postcode: { $regex: new RegExp(suburb_postcode, "i") },
      });
    }
    console.log("category_slug => ", category_slug);
    // if (user_id) {
    // (async () => {
    if (category_slug && category_slug != "") {
      console.log("category_slug  function ===> ");
      var cate_id = await getCategoryID(category_slug);
      console.log("cate_id :: ====> ", cate_id);
      conditions["$and"].push({
        categories_id: mongoose.Types.ObjectId(cate_id),
      });
    }
    // })

    console.log("conditions === Trader List ==>  ", conditions);
    console.log("limit => ", limit);
    console.log("page_number => ", page_number);

    User.count(conditions).exec(async function (err, result) {
      if (err) {
        callback(Constant.INTERNAL_ERROR, null);
      } else {
        let totalCount = 0;
        if (result > 0) {
          totalCount = result;
          var userData_aggregate = [
            { $match: conditions }, // Match me
            // { $lookup: { from: 'reviews', localField: '_id', foreignField: 'review_to', as: 'reviews' } },
            // {
            //     "$unwind": {
            //         "path": "$categories_id",
            //         "preserveNullAndEmptyArrays": true
            //     }
            // },
            // { $lookup: { from: 'services_cats', localField: 'categories_id', foreignField: '_id', as: 'categories_id' } },
            // {
            //     $project: {
            //         _id: 1,
            //         firstname: 1, lastname: 1, email: 1, is_online: 1,
            //         business_name: 1, suburb_postcode: 1, state: 1,
            //         zipCode: 1, mobile_no: 1, is_active: 1,
            //         address: 1, totalPropertyCount: 1, about_user: 1,
            //         image: 1, images: 1, agency_id: 1, categories_id: 1,
            //         createdAt: 1,
            //         location: 1,
            //         groups: {
            //             _id: 1,
            //             role_id: 1,
            //             status: 1,
            //             deleted: 1,
            //             is_master_role: 1
            //         },
            //         reviews: { _id: 1, review_to: 1, review_by: 1, avg_total: 1 },
            //         averageRate: { $avg: "$reviews.avg_total" }
            //     }
            // },
            { $sort: { createdAt: -1 } },
            { $skip: page_number * number_of_pages },
            { $limit: limit },
            {
              $lookup: {
                from: "reviews",
                localField: "_id",
                foreignField: "review_to",
                as: "reviews",
              },
            },
            {
              $unwind: {
                path: "$categories_id",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "services_cats",
                localField: "categories_id",
                foreignField: "_id",
                as: "categories",
              },
            },
            {
              $lookup: {
                from: "agencies",
                localField: "agency_id",
                foreignField: "_id",
                as: "agency_id",
              },
            },
            {
              $lookup: {
                from: "groups",
                localField: "_id",
                foreignField: "user_id",
                as: "groups",
              },
            },
            {
              $lookup: {
                from: "favourites",
                localField: "_id",
                foreignField: "fav_to_user",
                as: "favourites",
              },
            },
            {
              $group: {
                _id: "$_id",
                data: { $first: "$$ROOT" },
                category: {
                  $addToSet: {
                    name: { $arrayElemAt: ["$categories.name", 0] },
                    status: { $arrayElemAt: ["$categories.status", 0] },
                    _id: { $arrayElemAt: ["$categories._id", 0] },
                    category_slug: {
                      $arrayElemAt: ["$categories.category_slug", 0],
                    },
                  },
                },
              },
            },
          ];
          // console.log('userData_aggregate => ', userData_aggregate);
          User.aggregate(userData_aggregate).exec(function (err, usersList) {
            if (err) {
              console.log("err==>", err);
              res
                .status(Constant.ERROR_CODE)
                .json({
                  code: Constant.ERROR_CODE,
                  message: Constant.ERROR_RETRIVING_DATA,
                });
            } else {
              usersList.map((ele) => {
                if (ele.category.length > 0) {
                  ele.data.categories_id = ele.category;
                  delete ele.data["categories"];
                  delete ele["category"];
                }
                if (ele.data.favourites && ele.data.favourites.length > 0) {
                  let favArray = ele.data.favourites;
                  favArray.map((el) => {
                    if (
                      el.fav_type == 1 &&
                      el.fav_by.equals(user_id) &&
                      el.fav_to_user.equals(ele.data._id)
                    ) {
                      console.log("el.fav_status => ", el.fav_status);
                      ele.data.is_fav = el.fav_status;
                    }
                  });
                } else {
                  ele.data.is_fav = 2;
                }
              });
              if (category_slug && category_slug != "") {
                Category.findOne(
                  {
                    deleted: false,
                    status: true,
                    category_slug: category_slug,
                  },
                  { name: 1, _id: 1, category_slug: 1 }
                ).exec(function (err, category_data) {
                  console.log("category_data");
                  res.json({
                    code: Constant.SUCCESS_CODE,
                    data: usersList,
                    totalCount: totalCount,
                    category_details: category_data,
                  });
                });
              } else {
                res.json({
                  code: Constant.SUCCESS_CODE,
                  data: usersList,
                  totalCount: totalCount,
                });
              }
            }
          });
        } else {
          res.json({
            code: Constant.SUCCESS_CODE,
            data: [],
            totalCount: totalCount,
          });
        }
      }
    });
  })();
}

/**
 * [tradersList - get list of traders]
 * @param  {object} req
 * @param  {object} res
 * Created by Rahul l
 */
function tradersListold(req, res) {
  var geocoder = NodeGeocoder(options);
  var user_id = typeof req.body.user_id != "undefined" ? req.body.user_id : "";
  // var page_number = req.body.current_page ? (req.body.current_page) - 1 : 0;
  // var number_of_pages = req.body.number_of_pages ? (req.body.number_of_pages) : 10;
  var page_number = req.body.current_page
    ? parseInt(req.body.current_page) - 1
    : 0;
  var number_of_pages = req.body.number_of_pages
    ? parseInt(req.body.number_of_pages)
    : 20;

  var firstname =
    typeof req.body.firstname != "undefined" ? req.body.firstname : "";
  var lastname =
    typeof req.body.lastname != "undefined" ? req.body.lastname : "";
  var state = typeof req.body.state != "undefined" ? req.body.state : "";
  var city = typeof req.body.city != "undefined" ? req.body.city : "";
  var zip_code =
    typeof req.body.zip_code != "undefined" ? req.body.zip_code : "";
  var categories_id =
    typeof req.body.categories_id != "undefined" ? req.body.categories_id : "";
  var category_slug =
    typeof req.body.category_slug != "undefined" ? req.body.category_slug : "";
  var suburb_postcode =
    typeof req.body.suburb_postcode != "undefined"
      ? req.body.suburb_postcode
      : "";
  var latitude =
    typeof req.body.latitude != "undefined" ? req.body.latitude : "";
  var longitude =
    typeof req.body.longitude != "undefined" ? req.body.longitude : "";
  var searchtext =
    typeof req.body.searchtext != "undefined" ? req.body.searchtext : "";
  // var limit = (typeof req.body.limit != 'undefined') ? req.body.limit : 10;
  var limit = typeof req.body.limit != "undefined" ? req.body.limit : "";
  var check_active =
    typeof req.body.check_active != "undefined" ? req.body.check_active : "";
  var conditions = { $and: [] };

  // conditions["$and"].push({ "is_deleted": false, "is_active": true });
  conditions["$and"].push({ is_deleted: false });
  if (check_active) conditions["$and"].push({ is_active: true });

  if (user_id)
    conditions["$and"].push({ _id: { $ne: mongoose.Types.ObjectId(user_id) } });

  conditions["$and"].push({
    $or: [
      { firstname: { $regex: new RegExp(searchtext, "i") } },
      // { "lastname": { $regex: new RegExp(searchtext, "i") } },
      { business_name: { $regex: new RegExp(searchtext, "i") } },
      { lastname: { $regex: new RegExp(searchtext, "i") } },
      { suburb_postcode: { $regex: new RegExp(searchtext, "i") } },
      { state: { $regex: new RegExp(searchtext, "i") } },
      { zipCode: { $regex: new RegExp(searchtext, "i") } },
      { mobile_no: { $regex: new RegExp(searchtext, "i") } },
    ],
  });

  if (firstname)
    conditions["$and"].push({ name: { $regex: new RegExp(firstname, "i") } });
  // if (lastname)
  //     conditions["$and"].push({"lastname": { $regex : new RegExp(lastname, "i") }});
  if (state)
    conditions["$and"].push({ state: { $regex: new RegExp(state, "i") } });
  if (city)
    conditions["$and"].push({ city: { $regex: new RegExp(city, "i") } });
  if (zip_code)
    conditions["$and"].push({ zipCode: { $regex: new RegExp(zip_code, "i") } });
  if (categories_id)
    conditions["$and"].push({
      categories_id: mongoose.Types.ObjectId(categories_id),
    });

  if (
    req.body.location &&
    req.body.location == "yes" &&
    latitude &&
    longitude &&
    latitude != "" &&
    longitude != ""
  ) {
    static_constant
      .findOne({
        name: "recommend_traders_radius_on_job_details_page",
        status: true,
        deleted: false,
      })
      .exec(function (err, data) {
        conditions["$and"].push({
          location: {
            $geoWithin: {
              $centerSphere: [
                [longitude, latitude],
                Constant.FIFTY_KM_INTO_MILE / Constant.RADIUS,
              ],
            },
          },
        });
      });
  } else if (latitude && longitude && latitude != "" && longitude != "") {
    conditions = { $or: [] };
    if (latitude && latitude != "")
      conditions["$or"].push({ "location.coordinates": latitude });
    if (longitude && longitude != "")
      conditions["$or"].push({ "location.coordinates": longitude });
    if (suburb_postcode && suburb_postcode != "")
      conditions["$or"].push({
        suburb_postcode: { $regex: new RegExp(suburb_postcode, "i") },
      });
  } else if (suburb_postcode && suburb_postcode != "") {
    conditions["$and"].push({
      suburb_postcode: { $regex: new RegExp(suburb_postcode, "i") },
    });
  }

  // if (user_id) {
  waterfall(
    [
      async function (callback) {
        if (category_slug && category_slug != "") {
          var cate_id = await getCategoryID(category_slug);
          console.log("cate_id==>", cate_id);
          conditions["$and"].push({
            categories_id: mongoose.Types.ObjectId(cate_id),
          });
        }
        callback();
      },
      function (callback) {
        console.log("conditions === Trader List ==>  ", conditions);
        User.aggregate([
          { $match: conditions }, // Match me
          {
            $lookup: {
              from: "groups",
              localField: "_id",
              foreignField: "user_id",
              as: "groups",
            },
          },
          {
            $match: {
              "groups.role_id": mongoose.Types.ObjectId(Constant.TRADER),
              "groups.is_master_role": true,
              "groups.status": true,
              "groups.deleted": false,
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
            },
          },
        ])
          .allowDiskUse(true)
          .exec(async function (err, result) {
            if (err) {
              callback(Constant.INTERNAL_ERROR, null);
            } else {
              var totalCount = 0;
              if (result.length > 0) {
                totalCount = result[0].count;
                var userData_aggregate = [
                  { $match: conditions }, // Match me
                  {
                    $lookup: {
                      from: "groups",
                      localField: "_id",
                      foreignField: "user_id",
                      as: "groups",
                    },
                  },
                  {
                    $lookup: {
                      from: "reviews",
                      localField: "_id",
                      foreignField: "review_to",
                      as: "reviews",
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      firstname: 1,
                      lastname: 1,
                      email: 1,
                      is_online: 1,
                      business_name: 1,
                      suburb_postcode: 1,
                      state: 1,
                      zipCode: 1,
                      mobile_no: 1,
                      is_active: 1,
                      address: 1,
                      totalPropertyCount: 1,
                      about_user: 1,
                      image: 1,
                      images: 1,
                      agency_id: 1,
                      categories_id: 1,
                      createdAt: 1,
                      location: 1,
                      groups: {
                        _id: 1,
                        role_id: 1,
                        status: 1,
                        deleted: 1,
                        is_master_role: 1,
                      },
                      reviews: {
                        _id: 1,
                        review_to: 1,
                        review_by: 1,
                        avg_total: 1,
                      },
                    },
                  },
                  {
                    $match: {
                      "groups.role_id": mongoose.Types.ObjectId(
                        Constant.TRADER
                      ),
                      "groups.is_master_role": true,
                      "groups.status": true,
                      "groups.deleted": false,
                    },
                  },
                  { $sort: { createdAt: -1, location: -1 } },
                  // { $skip: page_number * number_of_pages },
                  // { $limit: limit }
                ];

                // if (limit && limit != '')
                //     userData_aggregate.push({ $limit: limit });

                User.aggregate(userData_aggregate).exec(function (
                  err,
                  usersList
                ) {
                  if (err) {
                    callback(Constant.INTERNAL_ERROR, null);
                  } else {
                    User.populate(
                      usersList,
                      { path: "categories_id agency_id" },
                      function (err, finalData) {
                        if (err) {
                          callback(Constant.INTERNAL_ERROR, null);
                        } else {
                          callback(null, finalData, totalCount);
                        }
                      }
                    );
                  }
                });
              } else {
                callback(null, [], totalCount);
              }
            }
          });
      },
      function (arg1, arg2, callback) {
        var count = arg1.length - 1;
        var finalResponse = [];

        async.each(
          arg1,
          function (item, asyncCall) {
            if (item.address) {
              geocoder.geocode(item.address, function (err, response) {
                if (err) {
                  //console.log(err);
                  item.latitude = "";
                  item.longitude = "";
                  finalResponse.push(item);
                  asyncCall(null, finalResponse);
                } else if (Array.isArray(response) && response.length > 0) {
                  //console.log(response);
                  item.latitude = response ? response[0].latitude : "";
                  item.longitude = response ? response[0].longitude : "";
                  finalResponse.push(item);
                  asyncCall(null, finalResponse);
                } else {
                  // console.log(response);
                  item.latitude = "";
                  item.longitude = "";
                  finalResponse.push(item);
                  asyncCall(null, finalResponse);
                }
              });
            } else {
              item.latitude = "";
              item.longitude = "";
              finalResponse.push(item);
              asyncCall(null, finalResponse);
            }
          },
          function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, finalResponse, arg2);
            }
          }
        );
      },
      function (arg1, arg2, callback) {
        if (arg1.length > 0) {
          var finalResponse = [];
          async.each(
            arg1,
            function (item, asyncCall) {
              item.averageRate = 0;
              var totalReviewLength = item.reviews.length;
              if (
                typeof item.reviews != "undefined" &&
                item.reviews.length > 0
              ) {
                var temp = 0;
                async.each(
                  item.reviews,
                  function (innerItem, asyncCallInner) {
                    temp = temp + innerItem.avg_total;
                    finalResponse.push(temp);
                    asyncCallInner(null, finalResponse);
                  },
                  function (err) {
                    if (err) {
                      asyncCall(err);
                    } else {
                      var tot = finalResponse.length;
                      var finalTotalCnt =
                        finalResponse.length > 0 ? finalResponse[tot - 1] : 0;
                      var averageRate = finalTotalCnt / totalReviewLength;
                      item.averageRate = Math.round(averageRate);
                      item.totalReviewLength = totalReviewLength;
                      finalResponse.push(item);
                      asyncCall(null, finalResponse);
                    }
                  }
                );
              } else {
                asyncCall(null, arg1);
              }
            },
            function (err) {
              if (err) {
                callback(err);
              } else {
                callback(null, arg1, arg2);
              }
            }
          );
        } else {
          callback(null, [], 0);
        }
      },
      function (arg1, arg2, callback) {
        var favArray = [];
        if (arg1.length > 0) {
          async.each(
            arg1,
            function (item, asyncCall) {
              var conditions_ = {
                is_deleted: false,
                fav_to_user: mongoose.Types.ObjectId(item._id),
                fav_status: 1,
              };
              if (user_id) {
                conditions_.fav_by = mongoose.Types.ObjectId(user_id);
              }

              favourites
                .findOne(conditions_)
                // {fav_status: 1  })
                // .sort({ createdAt: -1 })
                .exec(function (err, fav) {
                  if (err) {
                    item.is_fav = 2;
                    favArray.push(item);
                    asyncCall(null, favArray);
                  } else {
                    if (fav) {
                      item.is_fav = fav.fav_status;
                      favArray.push(item);
                      asyncCall(null, favArray);
                    } else {
                      item.is_fav = 2;
                      favArray.push(item);
                      asyncCall(null, favArray);
                    }
                  }
                });
            },
            function (err) {
              if (err) {
                callback(err);
              } else {
                callback(null, favArray, arg2);
              }
            }
          );
        } else {
          callback(null, arg1, arg2);
        }
      },
    ],
    function (err, result, total_count) {
      if (err) {
        console.log("err==>", err);
        res
          .status(Constant.ERROR_CODE)
          .json({
            code: Constant.ERROR_CODE,
            message: Constant.ERROR_RETRIVING_DATA,
          });
      } else {
        var finalResponse_ = lodash.sortBy(result, "averageRate", "desc");
        finalResponse_ = finalResponse_.reverse();

        if (category_slug && category_slug != "") {
          Category.findOne(
            { deleted: false, status: true, category_slug: category_slug },
            { name: 1, _id: 1, category_slug: 1 }
          ).exec(function (err, category_data) {
            console.log("category_data");
            res.json({
              code: Constant.SUCCESS_CODE,
              data: finalResponse_,
              totalCount: total_count,
              category_details: category_data,
            });
          });
        } else {
          res.json({
            code: Constant.SUCCESS_CODE,
            data: finalResponse_,
            totalCount: total_count,
          });
        }
      }
    }
  );
  // } else {
  //     res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
  // }
}

/**
 * Traders List with soring (ratings, reviews, premium users)
 */
function tradersListPublic(req, res) {
  (async () => {
    try {
      const page_number = req.body.page_number ? req.body.page_number - 1 : 0;
      const number_of_pages = req.body.number_of_pages
        ? req.body.number_of_pages
        : 4;
      const limit = typeof req.body.limit != "undefined" ? req.body.limit : 4;

      // Get List of Trader users
      const aggregateArray = [
        {
          $match: {
            is_deleted: false,
            defaultUserRole: "trader",
          },
        },
        {
          $sort: { profileTiers: -1 },
          // { "createdAt": -1 }
        },
        { $skip: page_number * number_of_pages },
        { $limit: limit },
        {
          $lookup: {
            from: "groups",
            localField: "_id",
            foreignField: "user_id",
            as: "groups",
          },
        },
        {
          $lookup: {
            from: "reviews",
            localField: "_id",
            foreignField: "review_to",
            as: "reviews",
          },
        },
        // {
        //     $match:
        //     {
        //         "groups.role_id": mongoose.Types.ObjectId("5a1d26b26ef60c3d44e9b377"),
        //         "groups.is_master_role": true,
        //         "groups.status": true,
        //         "groups.deleted": false
        //     }
        // },
        // {
        //     $sort:
        //     {
        //         profileTiers: -1
        //     }
        // },
        // {
        //     $project: {
        //         _id: 1,
        //         firstname: 1, lastname: 1, email: 1, is_online: 1,
        //         business_name: 1, suburb_postcode: 1, state: 1,
        //         zipCode: 1, mobile_no: 1, is_active: 1,
        //         address: 1, totalPropertyCount: 1, about_user: 1,
        //         image: 1, images: 1, agency_id: 1, categories_id: 1,
        //         createdAt: 1,
        //         location: 1,
        //         groups: {
        //             _id: 1,
        //             role_id: 1,
        //             status: 1,
        //             deleted: 1,
        //             is_master_role: 1
        //         },
        //         reviews: { _id: 1, review_to: 1, review_by: 1, avg_total: 1 }
        //     }
        // }
      ];
      await User.aggregate(aggregateArray, async function (err, tradersList) {
        if (err) {
          console.log("err :: Public Trader list api => ", err);
          res.json({ code: Constant.ERROR_CODE, message: err });
        } else {
          // console.log('tradersList => ', tradersList);
          await tradersList.map((ele) => {
            // console.log('ele.reviews => ', ele.reviews);
            ele.totalReviewLength = ele.reviews.length;
            if (ele.reviews.length > 0) {
              let total = 0;
              for (let i = 0; i < ele.reviews.length; i++) {
                total += ele.reviews[i].avg_total;
              }
              const avg = total / ele.reviews.length;
              ele.averageRate = Math.round(avg);
            } else {
              ele.averageRate = 0;
            }
          });
          console.log(
            "tradersList :: check for all traders  => ",
            tradersList.length
          );
          let finalResponse_ = lodash.sortBy(
            tradersList,
            "averageRate",
            "desc"
          );
          finalResponse_ = finalResponse_.reverse();
          // let sortedTraders = [];
          // // filter premium users
          // const premiumTraders = await finalResponse_.filter(function (trader) {
          //     return trader.profileTiers == "premium";
          // });
          // const sortedPremuimTraders = await sorting(premiumTraders, 1);
          // // filter brand users
          // const brandTraders = await finalResponse_.filter(function (trader) {
          //     return trader.profileTiers != "premium";
          // });
          // const sortedBrandTraders = await sorting(brandTraders, 1);
          // // console.log('sortedBrandTraders => ', sortedBrandTraders);
          // // push records to final array
          // sortedTraders = await [...sortedPremuimTraders, ...sortedBrandTraders]
          await res.json({
            code: Constant.SUCCESS_CODE,
            message: "Traders listed successfully.",
            data: finalResponse_,
          });
          // await res.json({ code: Constant.SUCCESS_CODE, message: 'Traders listed successfully.', data: sortedTraders });
        }
      });
    } catch (error) {
      res.json({ code: Constant.ERROR_CODE, message: error });
    }
  })();
}

function sorting(data, order) {
  let t_data = _(data)
    .chain()
    .sortBy(function (t) {
      return t.totalReviewLength;
    })
    .sortBy(function (t) {
      return t.averageRate;
    })
    .value();
  if (order === 1) {
    t_data = t_data.reverse();
  }
  return t_data;
}

/**
 * Premium Traders List API for Public website
 */

function premiumTradersList(req, res) {
  console.log("req.body => ", req.body);
  (async () => {
    try {
      // const page_number = req.body.page_number ? (req.body.page_number) - 1 : 0;
      // const number_of_pages = req.body.number_of_pages ? (req.body.number_of_pages) : 4;
      // const limit = (typeof req.body.limit != 'undefined') ? req.body.limit : 4;
      // Get List of Trader users
      const aggregateArray = [
        {
          $match: {
            is_deleted: false,
            is_active: true,
            defaultUserRole: "trader",
            profileTiers: "premium",
            business_name: { $exists: true },
          },
        },
        {
          $sort: { createdAt: 1 },
        },
        // { $skip: page_number * number_of_pages },
        // { $limit: limit },
        {
          $lookup: {
            from: "groups",
            localField: "_id",
            foreignField: "user_id",
            as: "groups",
          },
        },
        {
          $unwind: {
            path: "$categories_id",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "services_cats",
            localField: "categories_id",
            foreignField: "_id",
            as: "categories",
          },
        },
        {
          $lookup: {
            from: "reviews",
            localField: "_id",
            foreignField: "review_to",
            as: "reviews",
          },
        },
        {
          $group: {
            _id: "$_id",
            data: {
              $first: "$$ROOT",
            },
            category: {
              $addToSet: {
                name: {
                  $arrayElemAt: ["$categories.name", 0],
                },
                status: {
                  $arrayElemAt: ["$categories.status", 0],
                },
                _id: {
                  $arrayElemAt: ["$categories._id", 0],
                },
              },
            },
          },
        },
      ];
      await User.aggregate(aggregateArray, async function (err, tradersList) {
        if (err) {
          console.log("err :: Premium Traders list api => ", err);
          res.json({ code: Constant.ERROR_CODE, message: err });
        } else {
          await tradersList.map((ele) => {
            // console.log('ele => ', ele);
            console.log("ele.data.reviews => ", ele.data.reviews);
            ele.data.totalReviewLength = ele.data.reviews.length;
            if (ele.data.reviews.length > 0) {
              let total = 0;
              for (let i = 0; i < ele.data.reviews.length; i++) {
                total += ele.data.reviews[i].avg_total;
              }
              const avg = total / ele.data.reviews.length;
              ele.data.averageRate = Math.round(avg);
            } else {
              ele.data.averageRate = 0;
            }
          });
          let finalResponse_ = await lodash.sortBy(
            tradersList,
            "data.averageRate",
            "desc"
          );
          finalResponse_ = await finalResponse_.reverse();
          await res.json({
            code: Constant.SUCCESS_CODE,
            message: "Premium Traders listed successfully.",
            data: finalResponse_,
          });
          // await res.json({ code: Constant.SUCCESS_CODE, message: 'Premium Traders listed successfully.', data: tradersList });
        }
      });
    } catch (error) {
      res.json({ code: Constant.ERROR_CODE, message: error });
    }
  })();
}

/**
 * [tenantsList - get all fav traders list]
 * @param  {object} req
 * @param  {object} res
 * Created By Rahul Lahariya
 */
function getAllSavedTraders(req, res) {
  console.log("Get All Saved Traders API ======> ", req.body.user_id);
  var page_number = req.body.current_page
    ? parseInt(req.body.current_page) - 1
    : 0;
  var number_of_pages = req.body.number_of_pages
    ? parseInt(req.body.number_of_pages)
    : 20;
  var user_id = typeof req.body.user_id != "undefined" ? req.body.user_id : "";

  var firstname =
    typeof req.body.firstname != "undefined" ? req.body.firstname : "";
  var lastname =
    typeof req.body.lastname != "undefined" ? req.body.lastname : "";
  var state = typeof req.body.state != "undefined" ? req.body.state : "";
  var city = typeof req.body.city != "undefined" ? req.body.city : "";
  var zip_code =
    typeof req.body.zip_code != "undefined" ? req.body.zip_code : "";
  var business_name =
    typeof req.body.business_name != "undefined" ? req.body.business_name : "";
  var categories_id =
    typeof req.body.categories_id != "undefined" ? req.body.categories_id : "";

  var totalCount = 0;

  if (user_id) {
    var getAllfavUsers = function (userId, callback) {
      favourites
        .find(
          {
            is_deleted: false,
            fav_type: 1,
            fav_status: 1,
            fav_by: mongoose.Types.ObjectId(user_id),
          },
          { fav_to_user: 1 }
        )
        .sort({ createdAt: -1 })
        .exec(function (err, data) {
          if (err) {
            callback(err);
          } else {
            if (!data) {
              callback(null, []);
            } else {
              var users_id_arr = [];
              for (var i = 0; i < data.length; i++) {
                var users_id = mongoose.Types.ObjectId(data[i].fav_to_user);
                users_id_arr.push(users_id);
              }
              callback(null, users_id_arr);
            }
          }
        });
    };

    getAllfavUsers(user_id, function (error, usersArr) {
      if (error) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        });
      } else if (!usersArr) {
        res.json({ code: Constant.SUCCESS_CODE, data: [] });
      } else {
        // console.log(usersArr);
        var conditions = { $and: [] };
        conditions["$and"].push({
          _id: { $in: usersArr },
          // is_active: true,
          is_deleted: false,
        });

        if (firstname)
          conditions["$and"].push({
            firstname: { $regex: new RegExp(firstname, "i") },
          });
        if (lastname)
          conditions["$and"].push({
            lastname: { $regex: new RegExp(lastname, "i") },
          });
        if (state)
          conditions["$and"].push({
            state: { $regex: new RegExp(state, "i") },
          });
        if (city)
          conditions["$and"].push({ city: { $regex: new RegExp(city, "i") } });
        if (zip_code)
          conditions["$and"].push({
            zipCode: { $regex: new RegExp(zip_code, "i") },
          });
        if (business_name)
          conditions["$and"].push({
            business_name: { $regex: new RegExp(business_name, "i") },
          });
        if (categories_id)
          conditions["$and"].push({
            categories_id: mongoose.Types.ObjectId(categories_id),
          });
        User.aggregate([
          { $match: conditions }, // Match me
          {
            $lookup: {
              from: "groups",
              localField: "_id",
              foreignField: "user_id",
              as: "groups",
            },
          },
          {
            $match: {
              "groups.role_id": mongoose.Types.ObjectId(Constant.TRADER),
              "groups.is_master_role": true,
              "groups.status": true,
              "groups.deleted": false,
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
            },
          },
        ])
          .allowDiskUse(true)
          .exec(function (err, results) {
            if (err) {
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR,
              });
            } else {
              if (results.length > 0) {
                totalCount = results[0].count;
                waterfall(
                  [
                    function (callback) {
                      User.aggregate(
                        { $match: conditions }, // Match me
                        {
                          $lookup: {
                            from: "groups",
                            localField: "_id",
                            foreignField: "user_id",
                            as: "groups",
                          },
                        },
                        {
                          $match: {
                            "groups.role_id": mongoose.Types.ObjectId(
                              Constant.TRADER
                            ),
                            "groups.is_master_role": true,
                            "groups.status": true,
                            "groups.deleted": false,
                          },
                        },
                        // {
                        //     $project: {
                        //         _id: 1,
                        //         firstname: 1, lastname: 1, email: 1, address: 1, totalPropertyCount: 1, about_user: 1, business_name: 1,
                        //         image: 1, images: 1, agency_id: 1, city: 1,
                        //         categories_id: 1,
                        //         groups: { _id: 1, role_id: 1, status: 1, deleted: 1, is_master_role: true },
                        //         reviews: { _id: 1, review_to: 1, review_by: 1, avg_total: 1 }
                        //     }
                        // },
                        // { $match: conditions }, // Match me
                        // { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
                        // { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.TRADER), "groups.is_master_role": true, "groups.status": true, "groups.deleted": false } },
                        {
                          $lookup: {
                            from: "reviews",
                            localField: "_id",
                            foreignField: "review_to",
                            as: "reviews",
                          },
                        },
                        {
                          $unwind: {
                            path: "$categories_id",
                            preserveNullAndEmptyArrays: true,
                          },
                        },
                        {
                          $lookup: {
                            from: "services_cats",
                            localField: "categories_id",
                            foreignField: "_id",
                            as: "categories",
                          },
                        },
                        { $sort: { createdAt: -1 } },
                        // { $skip: page_number * number_of_pages },
                        // { $limit: number_of_pages },
                        {
                          $group: {
                            _id: "$_id",
                            data: { $first: "$$ROOT" },
                            category: {
                              $addToSet: {
                                name: { $arrayElemAt: ["$categories.name", 0] },
                                status: {
                                  $arrayElemAt: ["$categories.status", 0],
                                },
                                _id: { $arrayElemAt: ["$categories._id", 0] },
                                category_slug: {
                                  $arrayElemAt: [
                                    "$categories.category_slug",
                                    0,
                                  ],
                                },
                              },
                            },
                          },
                        }
                      ).exec(function (err, userList) {
                        if (err) {
                          callback(err);
                        } else {
                          userList.map((ele) => {
                            if (ele.category.length > 0) {
                              ele.data.categories_id = ele.category;
                              delete ele.data["categories"];
                              delete ele["category"];
                            }
                          });
                          callback(null, userList, totalCount);
                        }
                      });
                    },
                    function (arg1, arg2, callback) {
                      if (arg1.length > 0) {
                        var finalResponse = [];
                        async.each(
                          arg1,
                          function (item, asyncCall) {
                            // console.log('item.data.reviews.length => ', item.data.reviews.length);
                            var totalReviewLength = item.data.reviews.length;
                            if (
                              typeof item.data.reviews != "undefined" &&
                              item.data.reviews.length > 0
                            ) {
                              var temp = 0;
                              async.each(
                                item.data.reviews,
                                function (innerItem, asyncCallInner) {
                                  // console.log('innerItem => ', innerItem);
                                  temp = temp + innerItem.avg_total;
                                  finalResponse.push(temp);
                                  asyncCallInner(null, finalResponse);
                                },
                                function (err) {
                                  if (err) {
                                    asyncCall(err);
                                  } else {
                                    var tot = finalResponse.length;
                                    var finalTotalCnt =
                                      finalResponse.length > 0
                                        ? finalResponse[tot - 1]
                                        : 0;
                                    var averageRate =
                                      finalTotalCnt / totalReviewLength;

                                    item.averageRate = Math.round(averageRate);
                                    item.totalReviewLength = totalReviewLength;
                                    finalResponse.push(item);
                                    asyncCall(null, finalResponse);
                                  }
                                }
                              );
                            } else {
                              asyncCall(null, arg1);
                            }
                          },
                          function (err) {
                            if (err) {
                              callback(err);
                            } else {
                              callback(null, arg1, arg2);
                            }
                          }
                        );
                      } else {
                        callback(null, [], 0);
                      }
                    },
                  ],
                  function (err, result, total_count) {
                    // console.log('result => ', result);
                    if (err) {
                      res.json({
                        code: Constant.ERROR_CODE,
                        message: Constant.ERROR_RETRIVING_DATA,
                      });
                    } else {
                      res.json({
                        code: Constant.SUCCESS_CODE,
                        data: result,
                        total_count: total_count,
                      });
                    }
                  }
                );
              } else {
                console.log("totalCount => ", totalCount);
                res.json({
                  code: Constant.SUCCESS_CODE,
                  data: [],
                  total_count: totalCount,
                });
              }
            }
          });
      }
    });
  }
}

/**
 * [categoryList - get list of service categories]
 * @param  {object} req
 * @param  {object} res
 */

function getCategoryList(req, res) {
  Category.find({ deleted: false, status: true }, "name").exec(function (
    err,
    category
  ) {
    if (err) {
      res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
    } else {
      res.json({
        code: Constant.SUCCESS_CODE,
        data: category,
        message: Constant.SUCCESS_CAT_DATA,
      });
    }
  });
}
/**
 * [tradersList - get list of traders]
 * @param  {object} req
 * @param  {object} res
 */
function tradersOptionList(req, res) {
  var user_id = typeof req.body.user_id != "undefined" ? req.body.user_id : "";
  var page_number = req.body.current_page
    ? parseInt(req.body.current_page) - 1
    : 0;
  var number_of_pages = req.body.number_of_pages
    ? parseInt(req.body.number_of_pages)
    : 20;

  var firstname =
    typeof req.body.firstname != "undefined" ? req.body.firstname : "";
  var lastname =
    typeof req.body.lastname != "undefined" ? req.body.lastname : "";
  var state = typeof req.body.state != "undefined" ? req.body.state : "";
  var city = typeof req.body.city != "undefined" ? req.body.city : "";
  var zip_code =
    typeof req.body.zip_code != "undefined" ? req.body.zip_code : "";

  var conditions = { $and: [] };
  conditions["$and"].push({
    is_deleted: false,
    is_active: true,
    _id: { $ne: mongoose.Types.ObjectId(user_id) },
  });

  if (firstname)
    conditions["$and"].push({
      firstname: { $regex: new RegExp(firstname, "i") },
    });
  if (lastname)
    conditions["$and"].push({
      lastname: { $regex: new RegExp(lastname, "i") },
    });
  if (state)
    conditions["$and"].push({ state: { $regex: new RegExp(state, "i") } });
  if (city)
    conditions["$and"].push({ city: { $regex: new RegExp(city, "i") } });
  if (zip_code)
    conditions["$and"].push({ zipCode: { $regex: new RegExp(zip_code, "i") } });

  if (user_id) {
    waterfall(
      [
        function (callback) {
          User.aggregate([
            { $match: conditions }, // Match me
            {
              $lookup: {
                from: "groups",
                localField: "_id",
                foreignField: "user_id",
                as: "groups",
              },
            },
            {
              $match: {
                "groups.role_id": mongoose.Types.ObjectId(Constant.TRADER),
                "groups.is_master_role": true,
                "groups.status": true,
                "groups.deleted": false,
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ])
            .allowDiskUse(true)
            .exec(function (err, result) {
              if (err) {
                callback(Constant.INTERNAL_ERROR, null);
              } else {
                var totalCount = 0;
                if (result.length > 0) {
                  totalCount = result[0].count;
                  User.aggregate(
                    { $match: conditions }, // Match me
                    {
                      $lookup: {
                        from: "groups",
                        localField: "_id",
                        foreignField: "user_id",
                        as: "groups",
                      },
                    },
                    // { $lookup: { from: 'reviews', localField: '_id', foreignField: 'review_to', as: 'reviews' } },
                    {
                      $project: {
                        _id: 1,
                        firstname: 1,
                        lastname: 1,
                        image: 1,
                        email: 1,
                        groups: {
                          _id: 1,
                          role_id: 1,
                          status: 1,
                          deleted: 1,
                          is_master_role: 1,
                        },
                      },
                      //reviews: {_id: 1,review_to: 1,review_by:1,avg_total:1}
                    },
                    {
                      $match: {
                        "groups.role_id": mongoose.Types.ObjectId(
                          Constant.TRADER
                        ),
                        "groups.is_master_role": true,
                        "groups.status": true,
                        "groups.deleted": false,
                      },
                    },
                    { $sort: { createdAt: -1 } }
                    // { $skip: page_number * number_of_pages },
                    // { "$limit": number_of_pages }
                  ).exec(function (err, usersList) {
                    if (err) {
                      callback(Constant.INTERNAL_ERROR, null);
                    } else {
                      if (usersList) {
                        var traderData = [];
                        forEach(usersList, function (item, key) {
                          var obj = {};
                          obj.name =
                            changeCase.sentenceCase(item.firstname) +
                            " " +
                            changeCase.sentenceCase(item.lastname) +
                            " - " +
                            item.email;
                          obj.fullname =
                            changeCase.sentenceCase(item.firstname) +
                            " " +
                            changeCase.sentenceCase(item.lastname);
                          obj.email = item.email;
                          obj.image = item.image;
                          obj._id = item._id;
                          traderData[key] = obj;
                          if (usersList.length == traderData.length) {
                            callback(null, traderData, totalCount);
                          }
                        });
                      } else {
                        callback(Constant.INTERNAL_ERROR, null);
                      }
                    }
                  });
                } else {
                  callback(null, [], totalCount);
                }
              }
            });
        },
      ],
      function (err, result, total_count) {
        if (err) {
          res.json({
            code: Constant.ERROR_CODE,
            message: Constant.ERROR_RETRIVING_DATA,
          });
        } else {
          res.json({
            code: Constant.SUCCESS_CODE,
            data: result,
            totalCount: total_count,
          });
        }
      }
    );
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
  }
}
/**
 * [tenantsList - get all fav traders list]
 * @param  {object} req
 * @param  {object} res
 * Created By Rahul Lahariya
 */
function pickFromSavedTraders(req, res) {
  var page_number = req.body.current_page
    ? parseInt(req.body.current_page) - 1
    : 0;
  var number_of_pages = req.body.number_of_pages
    ? parseInt(req.body.number_of_pages)
    : 20;
  var user_id = typeof req.body.user_id != "undefined" ? req.body.user_id : "";
  var totalCount = 0;
  if (user_id) {
    var getAllfavUsers = function (userId, callback) {
      favourites
        .find(
          {
            is_deleted: false,
            fav_type: 1,
            fav_status: 1,
            fav_by: mongoose.Types.ObjectId(user_id),
          },
          { fav_to_user: 1 }
        )
        .sort({ createdAt: -1 })
        .exec(function (err, data) {
          if (err) {
            callback(err);
          } else {
            if (!data) {
              callback(null, []);
            } else {
              var users_id_arr = [];
              for (var i = 0; i < data.length; i++) {
                var users_id = mongoose.Types.ObjectId(data[i].fav_to_user);
                users_id_arr.push(users_id);
              }
              callback(null, users_id_arr);
            }
          }
        });
    };

    getAllfavUsers(user_id, function (error, usersArr) {
      if (error) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        });
      } else if (!usersArr) {
        res.json({ code: Constant.SUCCESS_CODE, data: [] });
      } else {
        var conditions = { $and: [] };
        conditions["$and"].push({
          _id: { $in: usersArr },
          is_active: true,
          is_deleted: false,
        });

        User.aggregate([
          { $match: conditions }, // Match me
          {
            $lookup: {
              from: "groups",
              localField: "_id",
              foreignField: "user_id",
              as: "groups",
            },
          },
          {
            $match: {
              "groups.role_id": mongoose.Types.ObjectId(Constant.TRADER),
              "groups.is_master_role": true,
              "groups.status": true,
              "groups.deleted": false,
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
            },
          },
        ])
          .allowDiskUse(true)
          .exec(function (err, results) {
            if (err) {
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR,
              });
            } else {
              if (results.length > 0) {
                waterfall(
                  [
                    function (callback) {
                      User.aggregate(
                        { $match: conditions }, // Match me
                        {
                          $lookup: {
                            from: "groups",
                            localField: "_id",
                            foreignField: "user_id",
                            as: "groups",
                          },
                        },
                        {
                          $match: {
                            "groups.role_id": mongoose.Types.ObjectId(
                              Constant.TRADER
                            ),
                            "groups.is_master_role": true,
                            "groups.status": true,
                            "groups.deleted": false,
                          },
                        },
                        {
                          $project: {
                            _id: 1,
                            firstname: 1,
                            lastname: 1,
                            email: 1,
                          },
                        },
                        { $sort: { createdAt: -1 } },
                        { $skip: page_number * number_of_pages },
                        { $limit: number_of_pages }
                      ).exec(function (err, userList) {
                        if (err) {
                          callback(err);
                        } else {
                          callback(null, userList);
                        }
                      });
                    },
                    function (arg1, callback) {
                      if (arg1.length > 0) {
                        callback(null, arg1);
                      } else {
                        callback(null, []);
                      }
                    },
                  ],
                  function (err, result) {
                    if (err) {
                      res.json({
                        code: Constant.ERROR_CODE,
                        message: Constant.ERROR_RETRIVING_DATA,
                      });
                    } else {
                      res.json({ code: Constant.SUCCESS_CODE, data: result });
                    }
                  }
                );
              } else {
                res.json({
                  code: Constant.SUCCESS_CODE,
                  data: [],
                  total_count: totalCount,
                });
              }
            }
          });
      }
    });
  }
}

function validateEmail(email) {
  var re =
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

// New API
function importTraderCSV(req, res) {
  (async () => {
    try {
      const file = req.swagger.params.file.value;
      const timestamp = Number(new Date()); // current time as number
      const splitFile = file.originalname.split(".");
      const filename =
        +timestamp +
        "_" +
        "trader" +
        "." +
        (splitFile.length > 0
          ? splitFile[splitFile.length - 1]
          : file.originalname);
      const filePath = "./api/uploads/trader_csv/" + filename;
      await fs.writeFile(
        path.resolve(filePath),
        file.buffer,
        async function (err) {
          if (err) {
            console.log("err :: Error occured while file Write => ", err);
            res.json({
              code: Constant.ERROR_CODE,
              message: err,
            });
          } else {
            const csvheaders = {
              headers: [
                "business_trading_name",
                "category",
                "suburb",
                "state",
                "post_code",
                "phone_number",
                "email",
                "ABN",
                "logo",
                "first_name",
                "last_name",
              ],
              discardUnmappedColumns: true,
              headers: true,
              ignoreEmpty: false,
              trim: true,
              rtrim: true,
              ltrim: true,
            };
            let is_success = true;
            let errorMessage = "";
            let count = 1;
            let errorCount = 0;
            let successCount = 0;
            let mapErrorCount = 0;
            const stream = fs.createReadStream(filePath);
            let userArray = [];
            let savedUserData = [];
            let parser = csv
              .fromStream(stream, csvheaders)
              .validate(function (data) {
                // console.log('data :: 1 ==============> ', data);
                if (
                  data.business_trading_name &&
                  data.email &&
                  validateEmail(data.email)
                ) {
                  if (
                    data.business_trading_name.length == 0 ||
                    data.email.length == 0
                  ) {
                    errorCount++;
                    errorMessage = "Please insert proper datatype values";
                    return false;
                  } else {
                    return true;
                  }
                } else if (errorMessage) {
                  return false;
                } else {
                  errorCount++;
                  errorMessage =
                    "Some of the values are missing on row number " +
                    errorCount;
                  return false;
                }
              })
              .on("data-invalid", function (data) {
                console.log("data :: data invalid => ", data);
                if (errorMessage) {
                  // console.log('errorMessage :: data invalid => ', errorMessage);
                  is_success = false;
                } else if (data) {
                  errorCount++;
                  errorMessage = "Data not valid, Please insert proper value";
                  is_success = false;
                }
              })
              .on("data", async function (data) {
                // console.log('data :: on function => ', data);
                count++;
                // console.log("on Data called ");
                // parser.pause();
                // console.log("on Data paused ");
                userArray.push(data);
              })
              .on("end", async function () {
                console.log("end => ", count);
                console.log("userArray.length => ", userArray.length);

                let uniqueRecords;
                uniqueRecords = await getUnique(userArray, "email");
                console.log("uniqueRecords => ", uniqueRecords.length);
                // console.log('uniqueRecords => ', uniqueRecords);
                let actions = uniqueRecords.map((data_) => {
                  return new Promise(function (resolve) {
                    setTimeout(async function () {
                      // console.log('data_ => ', data_);
                      if (data_) {
                        // check for Existing users
                        // console.log('data_.email => ', data_.email);
                        await User.find({
                          email: data_.email,
                          is_deleted: false,
                        })
                          .then(async function (userRecord) {
                            // console.log('userRecord => ', userRecord);
                            if (userRecord && userRecord.length > 0) {
                              console.log(
                                "userRecord :: existing user => ",
                                userRecord[0].email
                              );
                              // Duplicate record found
                              errorCount++;
                            } else {
                              // console.log('new user => ');
                              // New user
                              const activation_code =
                                Math.random().toString(36).substring(2, 10) +
                                Math.random().toString(36).substring(2, 10);
                              let userData = {};
                              userData.firstname = data_.first_name
                                ? data_.first_name
                                : "";
                              userData.lastname = data_.last_name
                                ? data_.last_name
                                : "";
                              userData.email = data_.email;
                              userData.mobile_no = data_.phone_number
                                ? data_.phone_number
                                : "";
                              userData.business_trading_name =
                                data_.business_trading_name;
                              userData.suburb_postcode = data_.suburb
                                ? data_.suburb
                                : "";
                              userData.city = data_.suburb ? data_.suburb : "";
                              userData.zipCode = data_.post_code
                                ? data_.post_code
                                : "";
                              userData.abn_number = data_.ABN ? data_.ABN : "";
                              userData.business_name =
                                data_.business_trading_name;
                              userData.status = true;
                              userData.is_deleted = false;
                              userData.is_active = false;
                              userData.activation_code = activation_code;
                              userData.defaultUserRole = "trader";
                              // console.log('userData :: 1 => ', userData);
                              if (data_.category) {
                                let re;
                                let value;
                                re = new RegExp(
                                  "^" + data_.category + "$",
                                  "i"
                                );
                                value = {
                                  $regex: re,
                                };
                                await Category.findOne(
                                  { name: value },
                                  { status: true },
                                  async function (err, category) {
                                    if (err) {
                                      console.log(
                                        "err while finding category => ",
                                        err
                                      );
                                    } else {
                                      if (category) {
                                        let categories_id = [];
                                        categories_id.push(
                                          mongoose.Types.ObjectId(category._id)
                                        );
                                        userData.categories_id =
                                          await categories_id;
                                      } else {
                                        console.log("category not found => ");
                                      }
                                    }
                                  }
                                );
                              }
                              if (data_.state) {
                                if (
                                  data_.state.toLowerCase() ==
                                  "New South Wales".toLowerCase() ||
                                  data_.state.toLowerCase() ==
                                  "NSW".toLowerCase()
                                ) {
                                  userData.state = await "New South Wales";
                                }
                                if (
                                  data_.state.toLowerCase() ==
                                  "Australian Capital Territory".toLowerCase() ||
                                  data_.state.toLowerCase() ==
                                  "ACT".toLowerCase()
                                ) {
                                  userData.state =
                                    await "Australian Capital Territory";
                                }
                                if (
                                  data_.state.toLowerCase() ==
                                  "Victoria".toLowerCase() ||
                                  data_.state.toLowerCase() ==
                                  "VIC".toLowerCase()
                                ) {
                                  userData.state = await "Victoria";
                                }
                                if (
                                  data_.state.toLowerCase() ==
                                  "Queensland".toLowerCase() ||
                                  data_.state.toLowerCase() ==
                                  "QLD".toLowerCase()
                                ) {
                                  userData.state = await "Queensland";
                                }
                                if (
                                  data_.state.toLowerCase() ==
                                  "South Australia".toLowerCase() ||
                                  data_.state.toLowerCase() ==
                                  "SA".toLowerCase()
                                ) {
                                  userData.state = await "South Australia";
                                }
                                if (
                                  data_.state.toLowerCase() ==
                                  "Western Australia".toLowerCase() ||
                                  data_.state.toLowerCase() ==
                                  "WA".toLowerCase()
                                ) {
                                  userData.state = await "Western Australia";
                                }
                                if (
                                  data_.state.toLowerCase() ==
                                  "Tasmania".toLowerCase() ||
                                  data_.state.toLowerCase() ==
                                  "TAS".toLowerCase()
                                ) {
                                  userData.state = await "Tasmania";
                                }
                                if (
                                  data_.state.toLowerCase() ==
                                  "Northern Territory".toLowerCase() ||
                                  data_.state.toLowerCase() ==
                                  "NT".toLowerCase()
                                ) {
                                  userData.state = await "Northern Territory";
                                }
                              }

                              // console.log('userData => ', userData);
                              if (
                                userData.state &&
                                data_.post_code &&
                                data_.suburb
                              ) {
                                userData.address =
                                  (await data_.suburb) +
                                  "," +
                                  data_.post_code +
                                  "," +
                                  userData.state +
                                  "," +
                                  "Australia";
                                // Google Map API
                                // console.log('userData.address => ', userData.address);
                                const address1 = await escape(userData.address);
                                console.log("address1 => ", await address1);
                                let result = await googleMapRes(address1);
                                if (result && result.length > 0) {
                                  const locData = result[0];
                                  // console.log("locData :: CSV ===========>", locData);
                                  if (
                                    locData.address_components &&
                                    locData.address_components.length > 0
                                  ) {
                                    locData.address_components.map(
                                      async function (location_part) {
                                        if (
                                          location_part.types &&
                                          location_part.types[0] &&
                                          location_part.types[0] ==
                                          "administrative_area_level_1"
                                        )
                                          userData.suburb =
                                            await location_part.long_name;
                                        if (
                                          location_part.types &&
                                          location_part.types[0] &&
                                          location_part.types[0] ==
                                          "postal_code"
                                        )
                                          userData.location_postal_code =
                                            await location_part.long_name;
                                      }
                                    );
                                  }
                                  if (
                                    locData.geometry &&
                                    locData.geometry.location &&
                                    locData.geometry.location.lat &&
                                    locData.geometry.location.lng
                                  ) {
                                    userData.location_latitude = await locData
                                      .geometry.location.lat;
                                    userData.location_longitude = await locData
                                      .geometry.location.lng;
                                  }
                                  if (
                                    userData.location_latitude &&
                                    userData.location_longitude
                                  ) {
                                    userData.location = {
                                      coordinates: [
                                        userData.location_longitude,
                                        userData.location_latitude,
                                      ],
                                      type: "Point",
                                    };
                                    // saveUserRecord(data, userData);
                                    successCount++;
                                    console.log(
                                      "save user record function => "
                                    );
                                    const users_ = await new User(userData);
                                    console.log(
                                      "userData.location => ",
                                      userData.location
                                    );
                                    if (userData.location) {
                                      await users_
                                        .save()
                                        .then(async (savedUser) => {
                                          if (
                                            data_.logo &&
                                            data_.logo.length > 0
                                          ) {
                                            const timestamp = Number(
                                              new Date()
                                            ); // current time as number
                                            const dir = "./api/uploads/users";
                                            const temp_path =
                                              dir + "/" + timestamp + ".jpeg";
                                            await download_file(
                                              data_.logo,
                                              temp_path,
                                              async function () {
                                                savedUser.image =
                                                  timestamp + ".jpeg";
                                                const uploaded_image_name =
                                                  timestamp + ".jpeg";
                                                await User.findOneAndUpdate(
                                                  { _id: savedUser._id },
                                                  {
                                                    $set: {
                                                      image:
                                                        uploaded_image_name,
                                                    },
                                                  },
                                                  {
                                                    new: true,
                                                    runValidators: true,
                                                  },
                                                  function (err, updatedUser) {
                                                    // console.log("Image Name Updated");
                                                  }
                                                );
                                              }
                                            );
                                          }
                                          const group_ = await new Group({
                                            user_id: mongoose.Types.ObjectId(
                                              savedUser._id
                                            ),
                                            role_id: mongoose.Types.ObjectId(
                                              Constant.TRADER
                                            ),
                                            is_master_role: true,
                                            status: true,
                                            is_deleted: false,
                                          });
                                          await group_.save(async function (
                                            err1,
                                            groupData
                                          ) {
                                            if (err1) {
                                              console.log(
                                                "grop insert err  ",
                                                err1
                                              );
                                            } else {
                                              // console.log('userData._id => ', userData._id);
                                              let crypto;
                                              let user_id;
                                              try {
                                                crypto = require("crypto");
                                                user_id = savedUser._id;
                                                let mykey = crypto.createCipher(
                                                  "aes-128-cbc",
                                                  "6V4k45onEC"
                                                );
                                                let userId = mykey.update(
                                                  JSON.stringify(user_id),
                                                  "utf8",
                                                  "hex"
                                                );
                                                userId += mykey.final("hex");
                                                let api_url =
                                                  Constant.API_URL +
                                                  "api/initialTrader/trackEmail?token=" +
                                                  userId;
                                                // Create User data obj for saved user to send email
                                                let savedUserObj = await {
                                                  click_here:
                                                    Constant.PUBLIC_STAGGING_URL +
                                                    "trader_account_activation/" +
                                                    savedUser.activation_code,
                                                  api_url:
                                                    Constant.API_URL +
                                                    "api/initialTrader/trackEmail?token=" +
                                                    userId,
                                                  email: savedUser.email,
                                                  first_name:
                                                    savedUser.firstname,
                                                  last_name: savedUser.lastname,
                                                };
                                                // console.log('savedUserObj =================> ', savedUserObj);
                                                await savedUserData.push(
                                                  savedUserObj
                                                );
                                              } catch (err) {
                                                console.log(
                                                  "crypto support is disabled!",
                                                  err
                                                );
                                              }
                                            }
                                          });
                                        })
                                        .catch((err) => {
                                          console.log(
                                            "err :: error while saving user => ",
                                            err
                                          );
                                          is_success = false;
                                          errorCount++;
                                        });
                                    }
                                  }
                                } else {
                                  console.log(
                                    "no result from google map api => ",
                                    data_.email
                                  );
                                  mapErrorCount++;
                                }
                              } else {
                                console.log("no address => ");
                                successCount++;
                                console.log("save user record function => ");
                                const users_ = await new User(userData);
                                await users_.save(async function (
                                  err,
                                  savedUser
                                ) {
                                  if (err) {
                                    console.log(
                                      "err :: error while saving user => ",
                                      err
                                    );
                                    is_success = false;
                                    errorCount++;
                                  } else {
                                    let crypto;
                                    let user_id;
                                    try {
                                      crypto = require("crypto");
                                      user_id = savedUser._id;
                                      let mykey = crypto.createCipher(
                                        "aes-128-cbc",
                                        "6V4k45onEC"
                                      );
                                      let userId = mykey.update(
                                        JSON.stringify(user_id),
                                        "utf8",
                                        "hex"
                                      );
                                      userId += mykey.final("hex");
                                      // let api_url = Constant.API_URL + 'api/initialTrader/trackEmail?token=' + userId

                                      // Create User data obj for saved user to send email

                                      let savedUserObj = await {
                                        click_here:
                                          Constant.PUBLIC_STAGGING_URL +
                                          "trader_account_activation/" +
                                          savedUser.activation_code,
                                        api_url:
                                          Constant.API_URL +
                                          "api/initialTrader/trackEmail?token=" +
                                          userId,
                                        email: savedUser.email,
                                        first_name: savedUser.firstname,
                                        last_name: savedUser.lastname,
                                      };

                                      console.log(
                                        "savedUserObj =================> ",
                                        savedUserObj
                                      );
                                      await savedUserData.push(savedUserObj);
                                    } catch (err) {
                                      console.log(
                                        "crypto support is disabled!",
                                        err
                                      );
                                    }

                                    if (data_.logo && data_.logo.length > 0) {
                                      const timestamp = Number(new Date()); // current time as number
                                      const dir = "./api/uploads/users";
                                      const temp_path =
                                        dir + "/" + timestamp + ".jpeg";
                                      download_file(
                                        data_.logo,
                                        temp_path,
                                        async function () {
                                          savedUser.image = timestamp + ".jpeg";
                                          const uploaded_image_name =
                                            timestamp + ".jpeg";
                                          await User.findOneAndUpdate(
                                            { _id: savedUser._id },
                                            {
                                              $set: {
                                                image: uploaded_image_name,
                                              },
                                            },
                                            { new: true, runValidators: true },
                                            function (err, updatedUser) {
                                              // console.log("Image Name Updated");
                                            }
                                          );
                                        }
                                      );
                                    }
                                    const group_ = await new Group({
                                      user_id: mongoose.Types.ObjectId(
                                        savedUser._id
                                      ),
                                      role_id: mongoose.Types.ObjectId(
                                        Constant.TRADER
                                      ),
                                      is_master_role: true,
                                      status: true,
                                      is_deleted: false,
                                    });
                                    await group_.save(async function (
                                      err1,
                                      groupData
                                    ) {
                                      if (err1) {
                                        console.log("grop insert err  ", err1);
                                      } else {
                                        // console.log('userData._id => ', userData._id);
                                        console.log("group data is added => ");
                                      }
                                    });
                                  }
                                });
                              }
                            }
                          })
                          .then((data) => {
                            resolve();
                          });
                      }
                    }, 1000);
                  });
                }); // run the function over all items
                // we now have a promises array and we want to wait for it
                Promise.all(actions).then((data) => {
                  // console.log('savedUserData :: check here for email sending => ', savedUserData);
                  // Email sending in bunch of 2000
                  var key = 1;
                  for (const value of savedUserData) {
                    // console.log('value :: savedUserData => ', value);
                    setTimeout(async function timer() {
                      // send claim your profile mail to trader
                      let infoObj = {
                        click_here: value.click_here,
                        api_url: value.api_url,
                      };
                      const options = {
                        from: Config.EMAIL_FROM, // sender address
                        to: value.email, // list of receivers
                        subject: "The OWNLY way forward", // Subject line
                        text: "The OWNLY way forward", // plaintext body
                      };
                      let mail_response = await mail_helper.sendEmail(
                        options,
                        "initial_trader_email",
                        infoObj
                      );
                      //  sendgrid - create contact api
                      let obj = {
                        contacts: [
                          {
                            email: value.email,
                            first_name: value.first_name,
                            last_name: value.last_name,
                          },
                        ],
                      };
                      console.log("obj :: Trader bulk upload => ", obj);
                      sendgridHelper.createSingleContact(obj);
                      key++;
                    }, key * 2000);
                  }
                  console.log("userArray.length => ", userArray.length);
                  console.log("errorCount => ", errorCount);
                  console.log("successCount => ", successCount);
                  console.log("mapErrorCount => ", mapErrorCount);
                  if (userArray.length === errorCount) {
                    console.log("all records are already in db => ");
                    res.json({
                      code: Constant.ERROR_CODE,
                      message: errorCount + " Duplicate Record(s) found!",
                    });
                  } else if (errorMessage) {
                    res.json({
                      code: Constant.ERROR_CODE,
                      message: errorMessage,
                    });
                  } else {
                    let msg;
                    if (successCount > 0 && errorCount > 0) {
                      msg =
                        successCount +
                        " Trader(s) added successfully" +
                        ", " +
                        errorCount +
                        " Duplicate record(s) found!";
                    } else if (successCount > 0 && errorCount === 0) {
                      msg = successCount + " Trader(s) added successfully";
                    } else {
                      console.log("else => ");
                      msg =
                        successCount +
                        " Trader(s) added successfully" +
                        ", " +
                        errorCount +
                        " Duplicate record(s) found!";
                    }
                    console.log("msg => ", msg);
                    res.json({
                      code: Constant.SUCCESS_CODE,
                      message: msg,
                      mapError: mapErrorCount,
                    });
                  }
                });
              });
          }
        }
      );
    } catch (error) {
      console.log("error => ", error);
    }
  })();
}

async function googleMapRes(address) {
  let addResult;
  let promise = new Promise((resolve, reject) => {
    // setTimeout(() => resolve("done!"), 1000)
    setTimeout(async function () {
      const options = {
        method: "GET",
        hostname: "maps.googleapis.com",
        port: null,
        path:
          "/maps/api/geocode/json?address=" +
          address +
          "&key=AIzaSyCGWZqTcVNj2IeuAud3EsdL3ewktb0yCFo",
      };

      let req1 = await http.request(options, function (res1) {
        let chunks = [];
        res1.on("data", function (chunk) {
          chunks.push(chunk);
        });
        res1.on("end", async function () {
          let body = Buffer.concat(chunks);
          let address2 = body.toString();
          addResult = JSON.parse(address2).results;
          console.log("addResult :: function => ", await addResult);
          resolve(addResult);
        });
      });
      req1.end();
    }, 0);
  });
  let result = await promise;
  return result;
}
async function userPromise(user, id) {
  let addResult;
  let promise = new Promise((resolve, reject) => {
    setTimeout(async function () {
      console.log("user => ", user);
      let savedUserObj = {
        click_here:
          Constant.PUBLIC_STAGGING_URL +
          "trader_account_activation/" +
          user.activation_code,
        api_url: Constant.API_URL + "api/initialTrader/trackEmail?token=" + id,
        email: user.email,
        first_name: user.firstname,
        last_name: user.lastname,
      };
      resolve(savedUserObj);
    }, 0);
  });
  let result = await promise;
  return result;
}

// Old API
function importTraderCSVOLD(req, res) {
  console.log("API :: Upload CSV  => ");
  var timestamp = Number(new Date()); // current time as number
  var form = new formidable.IncomingForm();
  var file = req.swagger.params.file.value;

  var outputJSON = {};
  var splitFile = file.originalname.split(".");
  var filename =
    +timestamp +
    "_" +
    "trader" +
    "." +
    (splitFile.length > 0
      ? splitFile[splitFile.length - 1]
      : file.originalname);
  var filePath = "./api/uploads/trader_csv/" + filename;
  var errorfilename = Date.now() + ".csv";
  var errorMessage = "";
  var count = 1;
  var errorCount = 0;
  var csvArray = [];
  var agreementData = {};
  var successCount = 0;
  async.waterfall(
    [
      function (callback) {
        fs.writeFile(path.resolve(filePath), file.buffer, async function (err) {
          if (err) {
            callback(err, false);
          } else {
            var csvheaders;
            csvheaders = {
              headers: [
                "business_trading_name",
                "category",
                "suburb",
                "state",
                "post_code",
                "phone_number",
                "email",
                "ABN",
                "logo",
                "first_name",
                "last_name",
              ],
              discardUnmappedColumns: true,
              headers: true,
              ignoreEmpty: false,
              trim: true,
              rtrim: true,
              ltrim: true,
            };
            var dataArray = [];
            var is_success = true;
            var stream = fs.createReadStream(filePath);
            var parser = csv
              .fromStream(stream, csvheaders)
              .validate(function (data) {
                console.log("data :: 1 ==============> ", data);
                // if (data.business_trading_name && data.first_name && data.last_name && data.email && validateEmail(data.email)) {
                if (
                  data.business_trading_name &&
                  data.email &&
                  validateEmail(data.email)
                ) {
                  console.log("check here 1 => ");
                  // if (data.business_trading_name && data.first_name && data.email && validateEmail(data.email)) {
                  // if (data.business_trading_name.length == 0 || data.first_name.length == 0 || data.last_name.length == 0 || data.email.length == 0) {
                  // if (data.business_trading_name.length == 0 || data.first_name.length == 0 || data.email.length == 0) {
                  if (
                    data.business_trading_name.length == 0 ||
                    data.email.length == 0
                  ) {
                    errorCount++;
                    errorMessage = "Please insert proper datatype values";
                    return false;
                  } else {
                    console.log("check here 2 : true => ");
                    return true;
                  }
                } else if (errorMessage) {
                  // console.log('errorMessage =============> ', errorMessage);
                  return false;
                } else {
                  errorCount++;
                  errorMessage =
                    "Some of the values are missing on row number " +
                    errorCount;
                  return false;
                }
              })
              .on("data-invalid", function (data) {
                console.log("data :: data invalid => ", data);
                if (errorMessage) {
                  // console.log('errorMessage :: data invalid => ', errorMessage);
                  is_success = false;
                } else if (data) {
                  errorCount++;
                  errorMessage = "Data not valid, Please insert proper value";
                  is_success = false;
                }
              })
              .on("data", async function (data) {
                console.log("data :: on function => ", data);
                count++;
                // console.log("on Data called ");
                parser.pause();
                // console.log("on Data paused ");

                var trader_id = "";
                // setTimeout(async function () {
                User.findOne({ email: data.email, is_deleted: false }).exec(
                  async function (err, email) {
                    if (err) {
                      console.log(
                        "err :: while finding user from table => ",
                        err
                      );
                      is_success = false;
                    } else if (email) {
                      // console.log('email  ::  whilw finding user from table => ', email);
                      console.log(
                        "email  ::  User already exist => ",
                        email.email
                      );
                      is_success = false;
                      parser.resume();
                    } else {
                      console.log("New User =======> ");
                      successCount++;
                      var activation_code =
                        Math.random().toString(36).substring(2, 10) +
                        Math.random().toString(36).substring(2, 10);
                      var click_here =
                        Constant.PUBLIC_STAGGING_URL +
                        "trader_account_activation/" +
                        activation_code;
                      // console.log('click_here => ', click_here);
                      var userData = {};
                      var userData = {
                        firstname: data.first_name,
                        lastname: data.last_name,
                        email: data.email,
                        mobile_no: data.phone_number,
                        business_trading_name: data.business_trading_name,
                        suburb_postcode: data.suburb,
                        city: data.suburb,
                        zipCode: data.post_code,
                        abn_number: data.ABN,
                        business_name: data.business_trading_name,
                        status: true,
                        is_deleted: false,
                        is_active: false,
                        activation_code: activation_code,
                      };
                      // console.log('data.state  => ', data.state);
                      if (data.category && data.category != "") {
                        // console.log("data.category  =>  ", data.category);
                        let re;
                        let value;
                        re = new RegExp("^" + data.category + "$", "i");
                        value = {
                          $regex: re,
                        };
                        await Category.findOne(
                          { name: value },
                          { status: true }
                        ).exec(function (err, category) {
                          if (err) {
                            console.log("err while finding category => ", err);
                          } else {
                            if (category) {
                              var categories_id = [];
                              categories_id.push(
                                mongoose.Types.ObjectId(category._id)
                              );
                              userData.categories_id = categories_id;
                            } else {
                              console.log("category not found => ");
                            }
                            // console.log("Cats : ", category);
                          }
                        });
                      }

                      if (data.state && data.state != "") {
                        if (
                          data.state.toLowerCase() ==
                          "New South Wales".toLowerCase() ||
                          data.state.toLowerCase() == "NSW".toLowerCase()
                        ) {
                          userData.state = "New South Wales";
                        }
                        if (
                          data.state.toLowerCase() ==
                          "Australian Capital Territory".toLowerCase() ||
                          data.state.toLowerCase() == "ACT".toLowerCase()
                        ) {
                          userData.state = "Australian Capital Territory";
                        }
                        if (
                          data.state.toLowerCase() ==
                          "Victoria".toLowerCase() ||
                          data.state.toLowerCase() == "VIC".toLowerCase()
                        ) {
                          userData.state = "Victoria";
                        }
                        if (
                          data.state.toLowerCase() ==
                          "Queensland".toLowerCase() ||
                          data.state.toLowerCase() == "QLD".toLowerCase()
                        ) {
                          userData.state = "Queensland";
                        }
                        if (
                          data.state.toLowerCase() ==
                          "South Australia".toLowerCase() ||
                          data.state.toLowerCase() == "SA".toLowerCase()
                        ) {
                          userData.state = "South Australia";
                        }
                        if (
                          data.state.toLowerCase() ==
                          "Western Australia".toLowerCase() ||
                          data.state.toLowerCase() == "WA".toLowerCase()
                        ) {
                          userData.state = "Western Australia";
                        }
                        if (
                          data.state.toLowerCase() ==
                          "Tasmania".toLowerCase() ||
                          data.state.toLowerCase() == "TAS".toLowerCase()
                        ) {
                          userData.state = "Tasmania";
                        }
                        if (
                          data.state.toLowerCase() ==
                          "Northern Territory".toLowerCase() ||
                          data.state.toLowerCase() == "NT".toLowerCase()
                        ) {
                          userData.state = "Northern Territory";
                        }
                      }

                      if (userData.state && data.post_code && data.suburb) {
                        userData.address =
                          data.suburb +
                          "," +
                          data.post_code +
                          "," +
                          userData.state +
                          "," +
                          "Australia";

                        // Google Map API
                        console.log("userData.address => ", userData.address);
                        var address1 = escape(userData.address);
                        console.log(
                          "address1 ======================> ",
                          address1
                        );
                        var options = {
                          method: "GET",
                          hostname: "maps.googleapis.com",
                          port: null,
                          path:
                            "/maps/api/geocode/json?address=" +
                            address1 +
                            "&key=AIzaSyCGWZqTcVNj2IeuAud3EsdL3ewktb0yCFo",
                        };
                        var req1 = await http.request(options, function (res1) {
                          var chunks = [];
                          res1.on("data", function (chunk) {
                            chunks.push(chunk);
                          });

                          res1.on("end", function () {
                            var body = Buffer.concat(chunks);
                            var address2 = body.toString();
                            var result = JSON.parse(address2).results;
                            console.log(
                              "result :: data of google map api => ",
                              result
                            );
                            if (result && result.length > 0) {
                              const locData = result[0];
                              // console.log("locData :: CSV ===========>", locData);
                              if (
                                locData.address_components &&
                                locData.address_components.length > 0
                              ) {
                                locData.address_components.map(function (
                                  location_part
                                ) {
                                  if (
                                    location_part.types &&
                                    location_part.types[0] &&
                                    location_part.types[0] ==
                                    "administrative_area_level_1"
                                  )
                                    userData.suburb = location_part.long_name;
                                  if (
                                    location_part.types &&
                                    location_part.types[0] &&
                                    location_part.types[0] == "postal_code"
                                  )
                                    userData.location_postal_code =
                                      location_part.long_name;
                                });
                              }
                              if (
                                locData.geometry &&
                                locData.geometry.location &&
                                locData.geometry.location.lat &&
                                locData.geometry.location.lng
                              ) {
                                userData.location_latitude =
                                  locData.geometry.location.lat;
                                userData.location_longitude =
                                  locData.geometry.location.lng;
                              }
                              if (
                                userData.location_latitude &&
                                userData.location_longitude
                              ) {
                                userData.location = {
                                  coordinates: [
                                    userData.location_longitude,
                                    userData.location_latitude,
                                  ],
                                  type: "Point",
                                };

                                var users_ = new User(userData);
                                if (userData.location) {
                                  // console.log('userData.location => ', userData.location);
                                  users_.save(function (err, userData) {
                                    if (err) {
                                      console.log(
                                        "err :: error while saving user => ",
                                        err
                                      );
                                      is_success = false;
                                    } else {
                                      console.log("user saved :: if=> ");
                                      if (data.logo && data.logo.length > 0) {
                                        var timestamp = Number(new Date()); // current time as number
                                        var dir = "./api/uploads/users";
                                        var temp_path =
                                          dir + "/" + timestamp + ".jpeg";

                                        download_file(
                                          data.logo,
                                          temp_path,
                                          function () {
                                            // console.log('image upload done');
                                            userData.image =
                                              timestamp + ".jpeg";
                                            var uploaded_image_name =
                                              timestamp + ".jpeg";
                                            User.findOneAndUpdate(
                                              { _id: userData._id },
                                              {
                                                $set: {
                                                  image: uploaded_image_name,
                                                },
                                              },
                                              {
                                                new: true,
                                                runValidators: true,
                                              },
                                              function (err, userData) {
                                                // console.log("Image Name Updated");
                                              }
                                            );
                                          }
                                        );
                                      }

                                      var groupData = {
                                        user_id: mongoose.Types.ObjectId(
                                          userData._id
                                        ),
                                        role_id: mongoose.Types.ObjectId(
                                          Constant.TRADER
                                        ),
                                        is_master_role: true,
                                        status: true,
                                        is_deleted: false,
                                      };
                                      var group_ = new Group(groupData);
                                      group_.save(async function (
                                        err1,
                                        groupData
                                      ) {
                                        if (err1) {
                                          // console.log("grop insert err  ", err1);
                                        } else {
                                          // console.log('userData._id => ', userData._id);

                                          let crypto;
                                          let user_id;
                                          try {
                                            crypto = require("crypto");
                                            user_id = userData._id;
                                            var mykey = crypto.createCipher(
                                              "aes-128-cbc",
                                              "6V4k45onEC"
                                            );
                                            var userId = mykey.update(
                                              JSON.stringify(user_id),
                                              "utf8",
                                              "hex"
                                            );
                                            userId += mykey.final("hex");

                                            let api_url =
                                              Constant.API_URL +
                                              "api/initialTrader/trackEmail?token=" +
                                              userId;
                                            // console.log('api_url => ', api_url);
                                            // console.log("group success  ", groupData);
                                            var mailOptions = {
                                              from: Config.EMAIL_FROM, // sender address
                                              to: data.email, // list of receivers
                                              subject: "The OWNLY way forward", // Subject line
                                              text: "The OWNLY way forward", // plaintext body
                                              html:
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
                                                "<style> *{margin:0; padding:0;} @media only screen and (max-width:479px){td {font-size: 40px!important;} h1 {font-size: 40px!important;}} @media only screen and(min-width: 480px) and(max-width: 599px) { td { font-size: 40px!important;} h1 {font-size: 40px!important; } }</style>" +
                                                "</head>" +
                                                '<body style="margin:0 auto;">' +
                                                '<table style="border:0; width:700px; margin:0 auto; border-spacing:0; font-family:arial;">' +
                                                "<tr>" +
                                                '<td style="padding:0 0 25px;">' +
                                                '<table style="border:0; width:700px; margin:0 auto; border-spacing:0; font-family:arial;">' +
                                                "<tr>" +
                                                '<td style="width:100%; text-align:center;">' +
                                                '<table style="border:0; text-align:center; width:700px; margin:0 auto; border-spacing:0; font-family:arial; ">' +
                                                "<tr>" +
                                                '<td style="padding:0 0 25px;"><img src="' +
                                                Constant.STAGGING_URL +
                                                'assets/images/logo-dark@2x.png" alt="" style="width: 250px;" /></td>' +
                                                "</tr>" +
                                                // '<tr><td style="padding:0 0 20px; text-align:center;"><img src="' + Constant.STAGGING_URL + 'assets/images/img-01.png" alt="" /></td></tr>' +
                                                "<tr>" +
                                                "<td>" +
                                                '<h1  style="font-size: 24px;color: #131954;">ATTENION TRADIES! Australia’s first ever FREE trade platform offering a free subscription in the spirit of a fair go! </h1>' +
                                                "<br/>" +
                                                "</td>" +
                                                "</tr>" +
                                                "<tr>" +
                                                ' <td style="padding: 0 0 20px;text-align: center;color: #131954;color:#2c3486; font-size: 20px; font-weight: normal;" >' +
                                                "A trade platform connecting all trades, property managers, real estate agencies, builders, architects, consumers and more, all under one roof." +
                                                "</td >" +
                                                "</tr>" +
                                                // comparision table
                                                '<tr><td style="padding:0 0 20px; text-align:center;"><img style="width:700px" src="' +
                                                Constant.STAGGING_URL +
                                                'assets/images/UPDATEDComparisonTable_EmailMarketing.png" alt="" /></td></tr>' +
                                                '<td style="padding: 0 0 20px;text-align: center;color: #131954;font-size: 20px;font-weight: normal;">' +
                                                "Trades build the bones of a house. You may not have considered your business as a brand, but Ownly provides a new set of tools to build your brand, gain exposure, grow and secure your business. Ownly is a proud Australian business built on Aussie values." +
                                                "</td>" +
                                                "</tr>" +
                                                // vdo pic
                                                '<tr><td style="padding:0 0 20px; text-align:center;"><a href="https://www.facebook.com/OwnlySearch/videos/184677396120799/?v=184677396120799" target="_blank"> <img style="width:700px;" src="' +
                                                Constant.STAGGING_URL +
                                                'assets/images/vdo-pic.jpg" alt="" /></a></td></tr>' +
                                                "<tr>" +
                                                '<td style="padding: 0 0 20px;text-align: center;color: #131954;font-size: 20px;font-weight: normal;">' +
                                                "Register your trade and your next job is only moments away." +
                                                "</td>" +
                                                "</tr>" +
                                                '<tr><td style="padding: 0 0 20px ; font-size: 16px ; color: #606382 ; font-weight: normal ; text-align: center;"><a target="_blank" href="' +
                                                click_here +
                                                '" style="display: inline-block;font-size: 30px;background: #f44eff;border: 1px solid #eee;padding: 8px 20px;border-radius: 4px;color: #fff;margin: 0 0 15px;text-decoration: none;">Claim Your Profile</a></td></tr>' +
                                                '<tr><td style="text-align:center;padding: 0 0 20px ;" >' +
                                                '<a style="margin:0 5px; display:inline-block; vertical-align:top;" href="http://instagram.com/ownlyproperty"  target="_blank"><img src="' +
                                                Constant.STAGGING_URL +
                                                'assets/images/instagram.png"</a>' +
                                                '<a style="margin:0 5px; display:inline-block; vertical-align:top;" href="https://www.facebook.com/OwnlySearch/"  target="_blank"><img src="' +
                                                Constant.STAGGING_URL +
                                                'assets/images/facebook.png"</a>' +
                                                '<a href="https://www.linkedin.com/company/ownly-group"  target="_blank" style="margin:0 5px; display:inline-block; vertical-align:top;"><img src="' +
                                                Constant.STAGGING_URL +
                                                'assets/images/linkedin.png" alt="" /></a>' +
                                                "</td></tr>" +
                                                '<tr><td style="text-align:center;" >' +
                                                '<a style="margin:0 5px; display:inline-block; vertical-align:top;" href="https://play.google.com/store/apps/details?id=com.syncitt"  target="_blank"><img src="' +
                                                Constant.STAGGING_URL +
                                                'assets/images/google-play.png"</a>' +
                                                '<a style="margin:0 5px; display:inline-block; vertical-align:top;" href="https://apps.apple.com/app/id1370287924"  target="_blank"><img src="' +
                                                Constant.STAGGING_URL +
                                                'assets/images/app-store.png"</a>' +
                                                "</td></tr>" +
                                                "</table>" +
                                                "</td>" +
                                                "</tr>" +
                                                "</table>" +
                                                "</td>" +
                                                "</tr>" +
                                                "</table>" +
                                                '<img src="' +
                                                api_url +
                                                '"  alt="" style="background-color:#ffffff12; width:1px;">' +
                                                "</body>" +
                                                "</html>",
                                              // html: '<!DOCTYPE html>' +
                                              //     '<html lang="en">' +
                                              //     '<head>' +
                                              //     '<meta charset="utf-8">' +
                                              //     '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
                                              //     '<meta name="viewport" content="width=device-width, initial-scale=1">' +
                                              //     '<meta name="description" content="">' +
                                              //     '<meta name="author" content="">' +
                                              //     '<link rel="icon" href="../../favicon.ico">' +
                                              //     '<title>Ownly</title>' +
                                              //     '<style> *{margin:0; padding:0;}</style>' +
                                              //     '</head>' +
                                              //     '<body style="margin:0 auto;">' +

                                              //     '<table style="border:0; width:700px; margin:0 auto; border-spacing:0; font-family:arial;">' +
                                              //     '<tr>' +
                                              //     '<td style="padding:0 0 25px;">' +
                                              //     '<table style="border:0; width:700px; margin:0 auto; border-spacing:0; font-family:arial;">' +
                                              //     '<tr>' +
                                              //     '<td style="width:100%; text-align:center;">' +
                                              //     '<table style="border:0; text-align:center; width:700px; margin:0 auto; border-spacing:0; font-family:arial; ">' +
                                              //     '<tr>' +
                                              //     '<td style="padding:0 0 25px;"><img src="' + Constant.STAGGING_URL + 'assets/images/logo-dark.png" alt="" /></td>' +
                                              //     '</tr>' +
                                              //     '<tr> <td style="padding:0 0 15px; color:#606382; font-weight:700; text-align:center; font-size:18px;">Lets connect…</td> </tr>' +
                                              //     '<tr><td style="padding:0 0 20px; text-align:center; color:#606382; font-size:15px; font-weight:normal;" >These are uncertain times where business is not as usual.  It’s time to get back on the tools and build ourselves a better, stronger future.</td></tr >' +
                                              //     '<tr><td style="padding:0 0 20px; text-align:center;"><img src="' + Constant.STAGGING_URL + 'assets/images/img-01.png" alt="" /></td></tr>' +
                                              //     '<tr>' +
                                              //     '<td style="padding: 0 0 20px ; text-align: center ; color: #606382 ; font-size: 15px ; font-weight: normal" >' +
                                              //     'Ownly lays the foundation of a digitally built house, where all respective trades, architects, agencies, property managers, consumers and more, are housed under the same roof.  Ownly powers the search engine of the property world that connects you to your next job and logs all of your work through a property fingerprint.  This fingerprint is unique to every individual property across Australia.' +
                                              //     '</td>' +
                                              //     '</tr>' +
                                              //     '<tr>' +
                                              //     ' <td style="padding: 0 0 20px ; text-align: center ; color: #606382 ; font-size: 15px ; font-weight: normal" >' +
                                              //     'Trades build the bones of a house. You may not have considered your business as a brand, but Ownly provides a new set of tools to build your brand, gain exposure, grow and secure your business.' +
                                              //     '</td >' +
                                              //     '</tr>' +

                                              //     '<tr>' +
                                              //     '<td style="padding: 0 0 20px ; text-align: center ; color: #606382 ; font-size: 15px ; font-weight: normal">' +
                                              //     'Ownly is a proud Australian business built on Aussie values.  Tough times don’t last but tough people do and Ownly believes in a bright future ahead.  More than ever, we need mateship and Ownly is offering a helping hand by offering a free subscription in the spirit of a fair go.  Click to activate your profile and  your next job is only moments away.' +
                                              //     '</td>' +
                                              //     '</tr>' +
                                              //     '<tr>' +
                                              //     '<td style="padding: 0 0 20px ; text-align: center ; color: #606382 ; font-size: 15px ; font-weight: normal">' +
                                              //     'Don’t be left out to weather the storm alone. Build yourself a weatherproof future that will withstand the test of time.' +
                                              //     '</td>' +
                                              //     '</tr>' +
                                              //     '<tr><td style="padding:0 0 20px;font-size:16px; color:#606382; font-weight:normal; text-align:center;"><a target="_blank" href="' + click_here + '" style="display:inline-block; font-size:13px; background:#606382; border:1px solid #eee; padding:8px 20px;border-radius:4px; color:#fff; margin:0 0 15px; text-decoration:none;">Claim Your Profile</a></td></tr>' +
                                              //     '<tr><td style="text-align:center;" >' +
                                              //     '<a style="margin:0 5px; display:inline-block; vertical-align:top;" href="https://www.facebook.com/OwnlySearch/"  target="_blank"><img src="' + Constant.STAGGING_URL + 'assets/images/facebook.png"</a>' +
                                              //     '<a href="https://www.linkedin.com/company/ownly-group"  target="_blank" style="margin:0 5px; display:inline-block; vertical-align:top;"><img src="' + Constant.STAGGING_URL + 'assets/images/linkedin.png" alt="" /></a>' +
                                              //     '</td></tr>' +
                                              //     '</table>' +
                                              //     '</td>' +
                                              //     '</tr>' +
                                              //     '</table>' +
                                              //     '</td>' +
                                              //     '</tr>' +
                                              //     '</table>' +
                                              //     '<img src="' + api_url + '"  alt="" style="background-color:#ffffff12; width:1px;">' +
                                              //     '</body>' +
                                              //     '</html>'
                                            };
                                            transporter.sendMail(
                                              {
                                                from: mailOptions.from,
                                                to: mailOptions.to,
                                                subject: mailOptions.subject,
                                                html: mailOptions.html,
                                              },
                                              function (error, response) {
                                                if (error) {
                                                  console.log(
                                                    "Email not sent : ",
                                                    error
                                                  );
                                                } else {
                                                  console.log(
                                                    "Message sent: Successfully",
                                                    mailOptions.to
                                                  );
                                                }
                                              }
                                            );
                                          } catch (err) {
                                            console.log(
                                              "crypto support is disabled!",
                                              err
                                            );
                                          }
                                        }
                                        parser.resume();
                                      });
                                    }
                                  });
                                }
                              }
                            } else {
                              console.log("error :: No Result => ");
                              console.log(
                                "errorMessage :: 1 => ",
                                errorMessage
                              );
                              console.log("errorCount :: 1 => ", errorCount);
                              res.json({
                                code: Constant.ERROR_CODE,
                                message:
                                  "Trader not added : check added address",
                              });
                            }
                          });
                        });
                        req1.end();
                      } else {
                        var users_ = new User(userData);
                        console.log(
                          "userData :: saving :: else ===============> ",
                          userData
                        );
                        users_.save(function (err, userData) {
                          if (err) {
                            console.log(
                              "err :: error while saving user => ",
                              err
                            );
                            is_success = false;
                          } else {
                            // console.log('user saved => ');
                            if (data.logo && data.logo.length > 0) {
                              var timestamp = Number(new Date()); // current time as number
                              var dir = "./api/uploads/users";
                              var temp_path = dir + "/" + timestamp + ".jpeg";

                              download_file(data.logo, temp_path, function () {
                                // console.log('image upload done');
                                userData.image = timestamp + ".jpeg";
                                var uploaded_image_name = timestamp + ".jpeg";
                                User.findOneAndUpdate(
                                  { _id: userData._id },
                                  { $set: { image: uploaded_image_name } },
                                  { new: true, runValidators: true },
                                  function (err, userData) {
                                    // console.log("Image Name Updated");
                                  }
                                );
                              });
                            }

                            var groupData = {
                              user_id: mongoose.Types.ObjectId(userData._id),
                              role_id: mongoose.Types.ObjectId(Constant.TRADER),
                              is_master_role: true,
                              status: true,
                              is_deleted: false,
                            };
                            var group_ = new Group(groupData);
                            group_.save(async function (err1, groupData) {
                              if (err1) {
                                // console.log("grop insert err  ", err1);
                              } else {
                                // console.log('userData._id => ', userData._id);

                                let crypto;
                                let user_id;
                                try {
                                  crypto = require("crypto");
                                  user_id = userData._id;
                                  var mykey = crypto.createCipher(
                                    "aes-128-cbc",
                                    "6V4k45onEC"
                                  );
                                  var userId = mykey.update(
                                    JSON.stringify(user_id),
                                    "utf8",
                                    "hex"
                                  );
                                  userId += mykey.final("hex");

                                  let api_url =
                                    Constant.API_URL +
                                    "api/initialTrader/trackEmail?token=" +
                                    userId;
                                  // console.log('api_url => ', api_url);
                                  // console.log("group success  ", groupData);
                                  var mailOptions = {
                                    from: Config.EMAIL_FROM, // sender address
                                    to: data.email, // list of receivers
                                    subject: "The OWNLY way forward", // Subject line
                                    text: "The OWNLY way forward", // plaintext body
                                    html:
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
                                      "<style> *{margin:0; padding:0;} @media only screen and (max-width:479px){td {font-size: 40px!important;} h1 {font-size: 40px!important;}} @media only screen and(min-width: 480px) and(max-width: 599px) { td { font-size: 40px!important;} h1 {font-size: 40px!important; } }</style>" +
                                      "</head>" +
                                      '<body style="margin:0 auto;">' +
                                      '<table style="border:0; width:700px; margin:0 auto; border-spacing:0; font-family:arial;">' +
                                      "<tr>" +
                                      '<td style="padding:0 0 25px;">' +
                                      '<table style="border:0; width:700px; margin:0 auto; border-spacing:0; font-family:arial;">' +
                                      "<tr>" +
                                      '<td style="width:100%; text-align:center;">' +
                                      '<table style="border:0; text-align:center; width:700px; margin:0 auto; border-spacing:0; font-family:arial; ">' +
                                      "<tr>" +
                                      '<td style="padding:0 0 25px;"><img src="' +
                                      Constant.STAGGING_URL +
                                      'assets/images/logo-dark@2x.png" alt="" style="width: 250px;" /></td>' +
                                      "</tr>" +
                                      // '<tr><td style="padding:0 0 20px; text-align:center;"><img src="' + Constant.STAGGING_URL + 'assets/images/img-01.png" alt="" /></td></tr>' +
                                      "<tr>" +
                                      "<td>" +
                                      '<h1  style="font-size: 24px;color: #131954;">ATTENION TRADIES! Australia’s first ever FREE trade platform offering a free subscription in the spirit of a fair go! </h1>' +
                                      "<br/>" +
                                      "</td>" +
                                      "</tr>" +
                                      "<tr>" +
                                      ' <td style="padding: 0 0 20px;text-align: center;color: #131954;color:#2c3486; font-size: 20px; font-weight: normal;" >' +
                                      "A trade platform connecting all trades, property managers, real estate agencies, builders, architects, consumers and more, all under one roof." +
                                      "</td >" +
                                      "</tr>" +
                                      // comparision table
                                      '<tr><td style="padding:0 0 20px; text-align:center;"><img style="width:700px" src="' +
                                      Constant.STAGGING_URL +
                                      'assets/images/UPDATEDComparisonTable_EmailMarketing.png" alt="" /></td></tr>' +
                                      '<td style="padding: 0 0 20px;text-align: center;color: #131954;font-size: 20px;font-weight: normal;">' +
                                      "Trades build the bones of a house. You may not have considered your business as a brand, but Ownly provides a new set of tools to build your brand, gain exposure, grow and secure your business. Ownly is a proud Australian business built on Aussie values." +
                                      "</td>" +
                                      "</tr>" +
                                      // vdo pic
                                      '<tr><td style="padding:0 0 20px; text-align:center;"><a href="https://www.facebook.com/OwnlySearch/videos/184677396120799/?v=184677396120799" target="_blank"> <img style="width:700px;" src="' +
                                      Constant.STAGGING_URL +
                                      'assets/images/vdo-pic.jpg" alt="" /></a></td></tr>' +
                                      '<td style="padding: 0 0 20px;text-align: center;color: #131954;font-size: 20px;font-weight: normal;">' +
                                      "Register your trade and your next job is only moments away." +
                                      "</td>" +
                                      "</tr>" +
                                      '<tr><td style="padding: 0 0 20px ; font-size: 16px ; color: #606382 ; font-weight: normal ; text-align: center;"><a target="_blank" href="' +
                                      click_here +
                                      '" style="display: inline-block;font-size: 30px;background: #f44eff;border: 1px solid #eee;padding: 8px 20px;border-radius: 4px;color: #fff;margin: 0 0 15px;text-decoration: none;">Claim Your Profile</a></td></tr>' +
                                      '<tr><td style="text-align:center;padding: 0 0 20px ;" >' +
                                      '<a style="margin:0 5px; display:inline-block; vertical-align:top;" href="http://instagram.com/ownlyproperty"  target="_blank"><img src="' +
                                      Constant.STAGGING_URL +
                                      'assets/images/instagram.png"</a>' +
                                      '<a style="margin:0 5px; display:inline-block; vertical-align:top;" href="https://www.facebook.com/OwnlySearch/"  target="_blank"><img src="' +
                                      Constant.STAGGING_URL +
                                      'assets/images/facebook.png"</a>' +
                                      '<a href="https://www.linkedin.com/company/ownly-group"  target="_blank" style="margin:0 5px; display:inline-block; vertical-align:top;"><img src="' +
                                      Constant.STAGGING_URL +
                                      'assets/images/linkedin.png" alt="" /></a>' +
                                      "</td></tr>" +
                                      '<tr><td style="text-align:center;" >' +
                                      '<a style="margin:0 5px; display:inline-block; vertical-align:top;" href="https://play.google.com/store/apps/details?id=com.syncitt"  target="_blank"><img src="' +
                                      Constant.STAGGING_URL +
                                      'assets/images/google-play.png"</a>' +
                                      '<a style="margin:0 5px; display:inline-block; vertical-align:top;" href="https://apps.apple.com/app/id1370287924"  target="_blank"><img src="' +
                                      Constant.STAGGING_URL +
                                      'assets/images/app-store.png"</a>' +
                                      "</td></tr>" +
                                      "</table>" +
                                      "</td>" +
                                      "</tr>" +
                                      "</table>" +
                                      "</td>" +
                                      "</tr>" +
                                      "</table>" +
                                      '<img src="' +
                                      api_url +
                                      '"  alt="" style="background-color:#ffffff12; width:1px;">' +
                                      "</body>" +
                                      "</html>",
                                  };
                                  transporter.sendMail(
                                    {
                                      from: mailOptions.from,
                                      to: mailOptions.to,
                                      subject: mailOptions.subject,
                                      html: mailOptions.html,
                                    },
                                    function (error, response) {
                                      if (error) {
                                        console.log("Email not sent : ", error);
                                      } else {
                                        console.log(
                                          "Message sent: Successfully",
                                          mailOptions.to
                                        );
                                      }
                                    }
                                  );

                                  // console.log("mailOptions  ", mailOptions);
                                  // sendmail({
                                  //     from: mailOptions.from,
                                  //     to: mailOptions.to,
                                  //     subject: mailOptions.subject,
                                  //     html: mailOptions.html,
                                  // }, function (err, response) {
                                  //     if (err) {
                                  //         // console.log("Email not sent : ", err);
                                  //     } else {
                                  //         // console.log("credetials email sent");
                                  //     }
                                  // });
                                } catch (err) {
                                  console.log(
                                    "crypto support is disabled!",
                                    err
                                  );
                                }
                              }
                              parser.resume();
                            });
                          }
                        });
                      }
                    }
                  }
                );
                // }, 3000);
              })
              .on("end", function () {
                if (successCount > 0) {
                  res.json({
                    code: Constant.SUCCESS_CODE,
                    message: successCount + " Trader(s) created successfully",
                  });
                } else {
                  console.log("errorCount => ", errorCount);
                  console.log(
                    "errorMessage :: Trader not added  => ",
                    errorMessage
                  );
                  res.json({
                    code: Constant.ERROR_CODE,
                    message: errorCount + "Trader(s) not added",
                  });
                }
              });
          }
        });
      },
    ],
    function (err, TraderData) {
      console.log("err1 =>", err);
      if (err == "not_valid") {
        outputJSON = {
          code: Constant.ERROR_CODE,
          message: Constant.NOT_VALID_CSV,
          error_row: count,
        };
      } else if (err) {
        console.log("err2 => ", err);
        count++;
        outputJSON = {
          code: Constant.ERROR_CODE,
          message: Constant.CSV_UPLOAD_UNSUCCESS + " " + count,
          error_row: count,
        };
      } else {
        outputJSON = {
          code: Constant.SUCCESS_CODE,
          message: Constant.CSV_UPLOAD_SUCCESS,
        };
      }
      res.jsonp(outputJSON);
    }
  );
}

function trackInitialTraderEmail(req, res) {
  if (req && req.query) {
    try {
      console.log("req.query.token => ", req.query.token);
      let crypto;
      crypto = require("crypto");
      var mykey = crypto.createDecipher("aes-128-cbc", "6V4k45onEC");
      var decrypted = mykey.update(req.query.token, "hex", "utf8");
      decrypted += mykey.final("utf8");
      User.findOneAndUpdate(
        {
          _id: mongoose.Types.ObjectId(JSON.parse(decrypted)),
          is_opened_trade_email: false,
        },
        { is_opened_trade_email: true },
        (err, doc) => {
          console.log("doc => ", doc);
          if (err) {
            console.log("err occured while status update=> ", err);
          } else if (!doc) {
            console.log(
              " user does not exist with this id || is_open is already true.=> "
            );
          } else {
            console.log("status updated successfully for open email => ");
          }
        }
      );
    } catch (error) {
      console.log("error=>", error);
    }
  }
}

function download_file(uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);
    request(uri).pipe(fs.createWriteStream(filename)).on("close", callback);
  });
}

function getCategoriesBusinessnamesList(req, res) {
  var limit = typeof req.body.limit != "undefined" ? req.body.limit : "";
  var search_text =
    typeof req.body.search_text != "undefined" ? req.body.search_text : "";
  var suburb_postcode =
    typeof req.body.suburb_postcode != "undefined"
      ? req.body.suburb_postcode
      : "";

  // console.log("limit  ", limit, ' , search_text   ', search_text, "   suburb_postcode   ", suburb_postcode);
  (async () => {
    var catgory_data = {};
    var user_data = {};
    if (search_text != "") {
      await Category.find({
        name: { $regex: new RegExp(search_text, "i") },
        deleted: false,
        status: true,
      })
        // .select('_id, name')
        .exec(async function (err, categoryData) {
          if (err) {
            // return res.json({
            //     code: Constant.INVALID_CODE,
            //     message: Constant.INTERNAL_ERROR
            // });
          } else {
            catgory_data = categoryData;
            // console.log("categoryData   ", categoryData);
          }
        });
    }
    if (suburb_postcode != "" || search_text != "") {
      var conditions = { is_deleted: false, is_active: true };

      if (suburb_postcode != "") {
        conditions.suburb_postcode = new RegExp(suburb_postcode, "i");
      }
      if (search_text != "") {
        console.log("123-------------", 123);

        conditions.business_name = new RegExp(search_text, "i");
      }
      // console.log("conditions   ", conditions);

      await User.find(conditions)
        .select("{_id : 1, suburb_postcode : 1, business_name : 1, image : 1}")
        .exec(async function (err, userData) {
          if (err) {
          } else {
            user_data = userData;
          }
        });
    }
    var cats = await catgory_data;
    // console.log("cats   ", cats);
    var users = await user_data;
    // console.log("user_data   ", user_data);
    if (cats && users) {
      var result = {};
      result.categories = cats;
      result.users = users;
      // console.log("resilt   ", result.users);
      return res.json({
        code: Constant.SUCCESS_CODE,
        data: result,
        message: "success",
      });
    } else {
      res.json({ code: Constant.ERROR_CODE, message: "No result found" });
    }
  })();
}

function provious_existing_traders(req, res) {
  console.log("req :: Previous Traders API => ", req.body);

  (async () => {
    var address = req.body.address;
    var categories_id = req.body.categories_id;
    var search_text = req.body.search_text;

    var GNAFId = "";
    var previous_traders_list = {};
    var other_existing_traders_list = {};
    var options = {
      method: "GET",
      url: "https://api.psma.com.au/beta/v1/addresses",
      qs: { perPage: "10", page: "1", addressString: address },
      headers: { authorization: "Z6Auyhh7JOaXfvandiUb0e95Mr92GfnY" },
    };

    await request(options, async function (error, response, body) {
      // console.log('categories_id :: previous trader api => ', categories_id);
      // if (categories_id) {
      var conditions = { $and: [] };
      conditions["$and"].push({ is_deleted: false });
      if (categories_id) {
        conditions["$and"].push({
          categories_id: mongoose.Types.ObjectId(categories_id),
        });
      }

      var aggregate = [
        // {
        //     "$match": conditions
        // },
        {
          $unwind: {
            path: "$categories_id",
          },
        },
        {
          $lookup: {
            from: "services_cats",
            localField: "categories_id",
            foreignField: "_id",
            as: "categories",
          },
        },
        {
          $match: {
            "categories.deleted": false,
            "categories.status": true,
          },
        },
        {
          $group: {
            _id: "$_id",
            data: {
              $first: "$$ROOT",
            },
            category_ids: {
              $push: "$categories_id",
            },
            category: {
              $addToSet: {
                name: {
                  $arrayElemAt: ["$categories.name", 0],
                },
                status: {
                  $arrayElemAt: ["$categories.status", 0],
                },
                _id: {
                  $arrayElemAt: ["$categories._id", 0],
                },
              },
            },
          },
        },
      ];
      // }

      if (response) {
        var result = JSON.parse(body);
        if (
          result &&
          result.data &&
          result.data[0] &&
          result.data[0].addressId
        ) {
          GNAFId = await result.data[0].addressId;
          console.log("result.data[0].addressId =======>", GNAFId);
          await Address.find(
            { GNAFId: GNAFId },
            { trader: 1 },
            async function (err, previous_traders) {
              // console.log('previous_traders => ', previous_traders);
              if (err) {
              } else {
                if (previous_traders) {
                  if (
                    previous_traders &&
                    previous_traders[0] &&
                    previous_traders[0].trader &&
                    previous_traders[0].trader.length > 0
                  ) {
                    conditions._id = await { $in: previous_traders[0].trader };
                    // conditions._id = {$in : previous_traders}
                    var aggregate1 = [
                      {
                        $match: conditions,
                      },
                    ];
                    // console.log('aggregate =======> ', aggregate);
                    aggregate1 = aggregate1.concat(aggregate);
                    // console.log("aggregate1 ================>", JSON.stringify(aggregate1));
                    await User.aggregate(aggregate1).exec(async function (
                      err,
                      userData
                    ) {
                      previous_traders_list = await userData;
                      console.log(
                        "previous_traders_list.length => ",
                        previous_traders_list.length
                      );
                    });
                  } else {
                    if (previous_traders && previous_traders.length === 0) {
                      previous_traders_list = [];
                    }
                  }
                }
              }
            }
          );
        }

        var aggregate1 = [
          {
            $match: conditions,
          },
        ];
        aggregate1 = aggregate1.concat(aggregate);
        // console.log('aggregate1 :: check here for other existing traders =========> ', JSON.stringify(aggregate1));
        await User.aggregate(aggregate1).exec(async function (err, userData) {
          console.log("err :: other existing traders list => ", err);
          other_existing_traders_list = await userData;
          // console.log('other_existing_traders_list.length => ', other_existing_traders_list.length);
        });
        var previous_traders = await previous_traders_list;
        var other_existing_traders = await other_existing_traders_list;

        // console.log('previous_traders.length => ', previous_traders.length);
        // console.log('other_existing_traders.length => ', other_existing_traders.length);

        if (previous_traders && other_existing_traders) {
          var result = {};
          result.previous_traders = previous_traders;
          // result.other_existing_traders = other_existing_traders;
          // console.log("other_existing_traders ===================>  ", result.other_existing_traders);
          // console.log('result :: final data :: previous_traders +  other_existing_traders => ', result);
          return res.json({
            code: Constant.SUCCESS_CODE,
            data: result,
            message: "success",
          });
        } else {
          res.json({ code: Constant.ERROR_CODE, message: "No result found" });
        }
      } else {
        res.json({ code: Constant.ERROR_CODE, message: "No result found" });
      }
    });
  })();
}

/**
 * Check for inactive Traders and Resend claim your profile email after 14 days
 */
function resendEmailToTrader() {
  (async () => {
    console.log("Resend email to not active traders after 14 days => ");
    try {
      // Get List of Trader users
      const aggregateArray = [
        {
          $lookup: {
            from: "groups",
            localField: "_id",
            foreignField: "user_id",
            as: "groups",
          },
        },
        {
          $match: {
            "groups.role_id": mongoose.Types.ObjectId(Constant.TRADER),
            "groups.is_master_role": true,
            "groups.status": true,
            "groups.deleted": false,
          },
        },
      ];
      await User.aggregate(aggregateArray, async function (err, tradersList) {
        console.log("err => ", err);
        if (err) {
          console.log("err :: occured while finding traders from db => ", err);
        } else {
          if (tradersList && tradersList.length > 0) {
            console.log("tradersList.length => ", tradersList.length);
            // check for each user - activated account or not
            await tradersList.map(async (trader) => {
              var today = moment();
              if (trader && trader.resendmailDate) {
                var dateofvisit = moment(trader.resendmailDate, "DD-MM-YYYY");
                var diff = today.diff(dateofvisit, "days");
              } else {
                var dateofvisit = moment(trader.createdAt, "DD-MM-YYYY");
                var diff = today.diff(dateofvisit, "days");
              }

              // console.log('email  => ', trader.email);
              // console.log('diff => ', diff);
              // console.log('trader.resend_activation_email => ', trader.resend_activation_email);
              if (!trader.is_active && diff > 12) {
                // Resend initial trader email and update user => resend_activation_email as true
                await User.findByIdAndUpdate(
                  trader._id,
                  { resendmailDate: Date.now() },
                  async function (updateErr, updatedUser) {
                    if (updateErr) {
                      console.log(
                        "updateErr :: occured while updating user => ",
                        updateErr
                      );
                    } else {
                      // console.log('updatedUser => ', updatedUser);
                      const user_id = trader._id;
                      let mykey = crypto.createCipher(
                        "aes-128-cbc",
                        "6V4k45onEC"
                      );
                      let userId = mykey.update(
                        JSON.stringify(user_id),
                        "utf8",
                        "hex"
                      );
                      userId += mykey.final("hex");
                      let infoObj = {
                        click_here:
                          Constant.PUBLIC_STAGGING_URL +
                          "trader_account_activation/" +
                          trader.activation_code,
                        api_url:
                          Constant.API_URL +
                          "api/initialTrader/trackEmail?token=" +
                          userId,
                      };
                      const options = {
                        from: Config.EMAIL_FROM, // sender address
                        to: trader.email, // list of receivers
                        subject: "The OWNLY way forward", // Subject line
                        text: "The OWNLY way forward", // plaintext body
                      };
                      let mail_response = mail_helper.sendEmail(
                        options,
                        "initial_trader_email",
                        infoObj
                      );
                    }
                  }
                );
              }
            });
          }
        }
      });
    } catch (error) {
      console.log("error :: Resend Email to Traders => ", error);
    }
  })();
}

function removeDuplicateTraders(req, res) {
  console.log("remove duplicate api => ");
  try {
    (async () => {
      if (req.body.admin_id) {
        await User.aggregate([
          { $sort: { createdAt: -1 } },
          { $skip: 0 },
          { $limit: 2000 },
          {
            $lookup: {
              from: "groups",
              localField: "_id",
              foreignField: "user_id",
              as: "groups",
            },
          },
          {
            $match: {
              "groups.role_id": mongoose.Types.ObjectId(Constant.TRADER),
              "groups.is_master_role": true,
            },
          },
        ])
          // await User.find({ "defaultUserRole": "trader" })
          .allowDiskUse(true)
          .exec(async function (err, result) {
            console.log("err :: 1st ====> ", err);
            if (err) {
              // callback(Constant.INTERNAL_ERROR, null);
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.ERROR_RETRIVING_DATA,
              });
            } else {
              let totalCount = result.length;

              let successCount = 0;

              // result.forEach(ele => {
              //     console.log('ele => ', ele);
              // })
              console.log("result.length => ", result.length);
              let uniqueTraders;
              uniqueTraders = await getUnique(result, "email");
              // console.log('uniqueTraders => ', uniqueTraders);
              // console.log('uniqueTraders.length => ', uniqueTraders.length);

              // const values = [{ id: 10, name: 'someName1' }, { id: 10, name: 'someName2' }, { id: 11, name: 'someName3' }, { id: 12, name: 'someName4' }];

              const lookup = result.reduce((a, e) => {
                // console.log('a,e.email => ', a, e.email);
                a[e.email] = ++a[e.email] || 0;
                return a;
              }, {});

              // console.log('check here for result =>', result.filter(e => lookup[e.email]));
              let duplicateRecords = result.filter((e) => lookup[e.email]);
              console.log("duplicateRecords => ", duplicateRecords);
              // uniqueTraders.forEach(element => {
              //     console.log('check for unique record =>', element.email, '::', result.includes(element));
              //     console.log('check for duplicate record =>', element.email, '::', !(result.includes(element)));
              // });
              // result.forEach(all_ele => {
              //     console.log('all_ele.email => ', all_ele.email);
              //     uniqueTraders.forEach(unique_ele => {
              //         console.log('unique_ele.email => ', unique_ele.email);
              //     })
              // })

              res.json({ code: Constant.SUCCESS_CODE, data: duplicateRecords });
            }
          });
      }
    })();
  } catch (error) {
    console.log("error => ", error);
  }
}

function getUnique(arr, comp) {
  // store the comparison  values in array
  const unique = arr
    .map((e) => e[comp])
    // store the indexes of the unique objects
    .map((e, i, final) => final.indexOf(e) === i && i)
    // eliminate the false indexes & return unique objects
    .filter((e) => arr[e])
    .map((e) => arr[e]);
  // console.log('unique => ', unique);
  return unique;
}
