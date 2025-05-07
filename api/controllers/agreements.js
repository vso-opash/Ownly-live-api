"use strict";
var mongoose = require("mongoose"),
  agreements = mongoose.model("agreements"),
  maintenances = mongoose.model("maintenances"),
  propertyModel = require("../models/Properties"),
  NotificationInfo = mongoose.model("Notification"),
  InvitationInfo = mongoose.model("invitations"),
  propertyOwnerSchema = require("../models/PropertyOwner"),
  User = mongoose.model("User"),
  AddressModel = require("../models/Address"),
  async = require("async"),
  forEach = require("async-foreach").forEach,
  GroupModel = mongoose.model("Group"),
  Chats = mongoose.model("Chats"),
  slug = require("slug"),
  moment = require("moment"),
  Config = require("../../config/config.js"),
  Constant = require("../../config/constant.js"),
  path = require("path"),
  waterfall = require("run-waterfall"),
  formidable = require("formidable"),
  easyimg = require("easyimage"),
  fs = require("fs-extra"),
  _ = require("underscore"),
  csv = require("fast-csv"),
  request = require("request"),
  Config = require("../../config/config.js"),
  validator = require("../../config/validator.js");

const mail_helper = require("../helpers/mail_helper");

module.exports = {
  addAgreements: addAgreements,
  getTenantAgreementsForProfile: getTenantAgreementsForProfile,
  editRentalcases: editRentalcases,
  getAgreementByProperty: getAgreementByProperty,
  getAgreementForPropertyDetail: getAgreementForPropertyDetail,
  getTenanciesHistory: getTenanciesHistory,
  agreementList: agreementList,
  agreementDetail: agreementDetail,
  uploadAgreementDocs: uploadAgreementDocs,
  uploadMobileAgreementDocs: uploadMobileAgreementDocs,
  deleteAgreement: deleteAgreement,
  importAgreementCSV: importAgreementCSV,
  getTenantListInProperty: getTenantListInProperty,
  getOwnerListInProperty: getOwnerListInProperty,
  agreementListForBulkUpload: agreementListForBulkUpload,
  agreementExpiryEmail: agreementExpiryEmail,
};

/**
 * getTenantAgreementForProfile - Get agreemeent for profile
   Request data - user id
 * @param  {object} req
 * @param  {object} res
 */
function getTenantAgreementsForProfile(req, res) {
  if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
    var user_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    var outputJSON = {};
    agreements
      .find(
        { "tenants.users_id": user_id, save_as_draft: false, deleted: false },
        {
          _id: 1,
          property_id: 1,
          agreement_id: 1,
          terms: 1,
          rent_price: 1,
          tenancy_start_date: 1,
          payable_advance_start_on: 1,
          tenants: 1,
          owner_id: 1,
          rental_period: 1,
          address_service_notice1: 1,
          case_validity: 1,
        }
      )
      .populate("tenants.users_id", "_id firstname lastname image")
      .populate("owner_id", "_id firstname lastname image")
      .populate("property_id", "_id title address property_id image")
      .limit(parseInt(5))
      .sort({ createdAt: -1 })
      .exec(function (err, data) {
        if (err) {
          outputJSON = {
            code: Constant.ERROR_CODE,
            message: Constant.ERROR_RETRIVING_DATA,
          };
        } else {
          outputJSON = {
            code: Constant.SUCCESS_CODE,
            data: data,
          };
        }
        res.jsonp(outputJSON);
      });
  } else {
    res.json({
      code: Constant.NOT_FOUND,
      message: Constant.ERROR_RETRIVING_DATA,
    });
  }
}

/**
 * getAgreementForPropertyDetail - Get current agreement for property detail
 * @param  {object} req
 * @param  {object} res
 */
function getAgreementForPropertyDetail(req, res) {
  if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
    var property_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    var outputJSON = {};

    // agreements.findOne({ property_id: property_id, save_as_draft: false, deleted: false }, { "_id": 1, "property_id": 1, "agreement_id": 1, "terms": 1, "rent_price": 1, "tenancy_start_date": 1, "payable_advance_start_on": 1, "tenants": 1, "owner_id": 1, "rental_period": 1, "address_service_notice1": 1,"case_validity":1 })
    //     .populate('tenants.users_id', '_id firstname lastname image')
    //     .populate('owner_id', '_id firstname lastname image')
    //     .populate('property_id', '_id title address property_id image')
    //     .sort({ createdAt: -1 }).exec(function (err, data) {
    //     if (err) {
    //         outputJSON = {
    //             'code': Constant.ERROR_CODE,
    //             'message': Constant.ERROR_RETRIVING_DATA
    //         };
    //     } else {
    //         outputJSON = {
    //             'code': Constant.SUCCESS_CODE,
    //             'data': data
    //         }
    //     }
    //     res.jsonp(outputJSON);
    // });

    waterfall(
      [
        function (callback) {
          agreements
            .findOne(
              {
                property_id: property_id,
                save_as_draft: false,
                deleted: false,
              },
              {
                _id: 1,
                property_id: 1,
                agreement_id: 1,
                terms: 1,
                rent_price: 1,
                tenancy_start_date: 1,
                payable_advance_start_on: 1,
                tenants: 1,
                owner_id: 1,
                rental_period: 1,
                address_service_notice1: 1,
                case_validity: 1,
              }
            )
            .populate("tenants.users_id", "_id firstname lastname image email")
            .populate("owner_id", "_id firstname lastname image")
            .populate("property_id", "_id title address property_id image")
            .sort({ createdAt: -1 })
            .exec(function (err, data) {
              if (err) {
                callback(err);
              } else {
                callback(null, data);
              }
            });
        },
        function (arg1, callback) {
          var dateArray = [];

          if (arg1) {
            var newItem = JSON.stringify(arg1);
            var newItem = JSON.parse(newItem);
            if (
              newItem.tenancy_start_date != null &&
              newItem.case_validity != null
            ) {
              var dateStart = moment(newItem.tenancy_start_date); // moment(item.tenancy_start_date).format("MM-DD-YYYY");
              var dateEnd = moment(newItem.case_validity); //moment(item.case_validity).format("MM-DD-YYYY");
              var timeValues = [];
              setTimeout(function () {
                while (dateEnd > dateStart) {
                  dateStart.add(6, "month");
                  if (dateEnd > dateStart)
                    timeValues.push(dateStart.format("YYYY-MM-DD"));
                }
                newItem.inspection_date = timeValues;
                callback(null, newItem);
              }, 200);
            } else {
              newItem.inspection_date = null;
              callback(null, newItem);
            }
          } else {
            callback(null, arg1);
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
      code: Constant.NOT_FOUND,
      message: Constant.ERROR_RETRIVING_DATA,
    });
  }
}

/**
 * getAgreementForPropertyDetail - Get current agreement for property detail
 * @param  {object} req
 * @param  {object} res
 */
function getTenanciesHistory(req, res) {
  if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
    var property_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    var outputJSON = {};

    waterfall(
      [
        function (callback) {
          agreements
            .find(
              {
                property_id: property_id,
                save_as_draft: false,
                deleted: false,
              },
              {
                _id: 1,
                property_id: 1,
                agreement_id: 1,
                terms: 1,
                rent_price: 1,
                tenancy_start_date: 1,
                payable_advance_start_on: 1,
                tenants: 1,
                owner_id: 1,
                rental_period: 1,
                address_service_notice1: 1,
                case_validity: 1,
              }
            )
            .populate("tenants.users_id", "_id firstname lastname image")
            .populate("owner_id", "_id firstname lastname image")
            .populate("property_id", "_id title address property_id image")
            .limit(parseInt(5))
            .sort({ createdAt: -1 })
            .exec(function (err, data) {
              if (err) {
                callback(err);
              } else {
                callback(null, data);
              }
            });
        },
        function (arg1, callback) {
          var dateArray = [];

          if (arg1.length > 0) {
            var newItem = JSON.stringify(arg1);
            var newItem = JSON.parse(newItem);

            async.each(
              newItem,
              function (item, asyncCall) {
                if (
                  item.tenancy_start_date != null &&
                  item.case_validity != null
                ) {
                  var dateStart = moment(item.tenancy_start_date); // moment(item.tenancy_start_date).format("MM-DD-YYYY");
                  var dateEnd = moment(item.case_validity); //moment(item.case_validity).format("MM-DD-YYYY");
                  var timeValues = [];
                  //console.log("dateEnd",dateEnd,"dateStart",dateStart);
                  setTimeout(function () {
                    while (dateEnd > dateStart) {
                      dateStart.add(6, "month");
                      if (dateEnd > dateStart)
                        timeValues.push(dateStart.format("YYYY-MM-DD"));
                    }
                    item.inspection_date = timeValues;
                    dateArray.push(item);
                    asyncCall(null, dateArray);
                  }, 200);
                } else {
                  item.inspection_date = null;
                  dateArray.push(item);
                  asyncCall(null, dateArray);
                }
              },
              function (err) {
                if (err) {
                  callback(err);
                } else {
                  callback(null, newItem);
                }
              }
            );
          } else {
            callback(null, arg1);
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
      code: Constant.NOT_FOUND,
      message: Constant.ERROR_RETRIVING_DATA,
    });
  }
}

/**
 * [Agreement by property - get agreement by property]
 * @param  {object} req
 * @param  {object} res
 */
function getAgreementByProperty(req, res) {
  if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
    var property_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    var outputJSON = {};
    agreements
      .find(
        { property_id: property_id, save_as_draft: false, deleted: false },
        { _id: 1, agreement_id: 1, address_service_notice1: 1 }
      )
      .sort({ createdAt: -1 })
      .exec(function (err, data) {
        if (err) {
          outputJSON = {
            code: Constant.ERROR_CODE,
            message: Constant.ERROR_RETRIVING_DATA,
          };
        } else {
          outputJSON = {
            code: Constant.SUCCESS_CODE,
            data: data,
          };
        }
        res.jsonp(outputJSON);
      });
  } else {
    res.json({
      code: Constant.NOT_FOUND,
      message: Constant.ERROR_RETRIVING_DATA,
    });
  }
}

function getTenantListInProperty(req, res) {
  if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
    var property_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    InvitationInfo.find({
      property_id: mongoose.Types.ObjectId(property_id),
      invitation_status: 2,
    })
      .populate("invited_to", "firstname lastname image email")
      .exec(function (err, data) {
        if (err) {
          res.json({
            code: Constant.ERROR_CODE,
            message: Constant.INTERNAL_ERROR,
          });
        } else {
          res.json({ code: Constant.SUCCESS_CODE, data: data });
        }
      });
  } else {
    res.json({
      code: Constant.NOT_FOUND,
      message: Constant.ERROR_RETRIVING_DATA,
    });
  }
}

function getOwnerListInProperty(req, res) {
  if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
    var property_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    propertyModel
      .find(
        { _id: mongoose.Types.ObjectId(property_id) },
        { _id: 1, address: 1 }
      )
      .populate("owned_by", "_id firstname lastname image")
      .exec(function (err, data) {
        if (err) {
          res.json({
            code: Constant.ERROR_CODE,
            message: Constant.INTERNAL_ERROR,
          });
        } else {
          res.json({ code: Constant.SUCCESS_CODE, data: data });
        }
      });
  } else {
    res.json({
      code: Constant.NOT_FOUND,
      message: Constant.ERROR_RETRIVING_DATA,
    });
  }
}

// Add Agreement - old API
function addAgreement(req, res) {
  console.log("req.body :: add agreement ====> ", req.body);
  var property_id =
    typeof req.body.property_id != "undefined"
      ? mongoose.Types.ObjectId(req.body.property_id)
      : "";
  // var owner_id = (typeof req.body.owner_id != 'undefined') ? mongoose.Types.ObjectId(req.body.owner_id) : '';
  var agency_id =
    typeof req.body.agency_id != "undefined"
      ? mongoose.Types.ObjectId(req.body.agency_id)
      : "";
  var created_by_role =
    typeof req.body.created_by_role != "undefined"
      ? mongoose.Types.ObjectId(req.body.created_by_role)
      : "";
  var created_by =
    typeof req.body.created_by != "undefined"
      ? mongoose.Types.ObjectId(req.body.created_by)
      : "";

  var address_service_notice1 =
    typeof req.body.address_service_notice1 != "undefined"
      ? req.body.address_service_notice1
      : "";
  var terms = typeof req.body.terms != "undefined" ? req.body.terms : 1;
  var case_validity =
    typeof req.body.case_validity != "undefined" ? req.body.case_validity : "";
  var tenancy_start_date =
    typeof req.body.tenancy_start_date != "undefined"
      ? req.body.tenancy_start_date
      : "";
  var tenancy_length =
    typeof req.body.tenancy_length != "undefined"
      ? req.body.tenancy_length
      : "";
  var payable_advance_start_on =
    typeof req.body.payable_advance_start_on != "undefined"
      ? req.body.payable_advance_start_on
      : "";
  var detail = typeof req.body.detail != "undefined" ? req.body.detail : "";

  var rent_price =
    typeof req.body.rent_price != "undefined" ? req.body.rent_price : 0;
  var rental_period =
    typeof req.body.rental_period != "undefined" ? req.body.rental_period : "";
  var address_service_notice2 =
    typeof req.body.address_service_notice2 != "undefined"
      ? req.body.address_service_notice2
      : "";
  var tenancy_inclusion =
    typeof req.body.tenancy_inclusion != "undefined"
      ? req.body.tenancy_inclusion
      : "";
  var rent_paid_to =
    typeof req.body.rent_paid_to != "undefined" ? req.body.rent_paid_to : "";
  var rent_paid_at =
    typeof req.body.rent_paid_at != "undefined" ? req.body.rent_paid_at : "";

  var bsb_number =
    typeof req.body.bsb_number != "undefined" ? req.body.bsb_number : "";
  var account_number =
    typeof req.body.account_number != "undefined"
      ? req.body.account_number
      : "";
  var account_name =
    typeof req.body.account_name != "undefined" ? req.body.account_name : "";
  var payment_reference =
    typeof req.body.payment_reference != "undefined"
      ? req.body.payment_reference
      : "";
  var follow_as =
    typeof req.body.follow_as != "undefined" ? req.body.follow_as : "";
  var rent_bond_price =
    typeof req.body.rent_bond_price != "undefined"
      ? req.body.rent_bond_price
      : 0;

  var electricity_repairs =
    typeof req.body.electricity_repairs != "undefined"
      ? req.body.electricity_repairs
      : "";
  var electricity_repairs_phone_number =
    typeof req.body.electricity_repairs_phone_number != "undefined"
      ? req.body.electricity_repairs_phone_number
      : "";
  var plumbing_repairs =
    typeof req.body.plumbing_repairs != "undefined"
      ? req.body.plumbing_repairs
      : "";
  var plumbing_repairs_phone_number =
    typeof req.body.plumbing_repairs_phone_number != "undefined"
      ? req.body.plumbing_repairs_phone_number
      : "";
  var other_repair =
    typeof req.body.other_repair != "undefined" ? req.body.other_repair : "";
  var other_repair_phone_number =
    typeof req.body.other_repair_phone_number != "undefined"
      ? req.body.other_repair_phone_number
      : "";
  var number_of_occupants =
    typeof req.body.number_of_occupants != "undefined"
      ? req.body.number_of_occupants
      : "";
  var images = typeof req.body.images != "undefined" ? req.body.images : [];
  var tenants = typeof req.body.tenants != "undefined" ? req.body.tenants : [];

  var water_usage =
    typeof req.body.water_usage != "undefined" ? req.body.water_usage : false;
  var strata_by_laws =
    typeof req.body.strata_by_laws != "undefined"
      ? req.body.strata_by_laws
      : false;
  var save_as_draft =
    typeof req.body.save_as_draft != "undefined"
      ? req.body.save_as_draft
      : false;

  var property_address =
    typeof req.body.property_add != "undefined" ? req.body.property_add : "";
  var property_lat =
    typeof req.body.location_latitude != "undefined"
      ? req.body.location_latitude
      : "";
  var property_lng =
    typeof req.body.location_longitude != "undefined"
      ? req.body.location_longitude
      : "";
  (async () => {
    // if (property_id && created_by) {
    if (req.body.property_owner && created_by) {
      var obj = {};

      var chars = "123456789";
      var agreementId = "";
      for (var x = 0; x < 9; x++) {
        var i = Math.floor(Math.random() * chars.length);
        agreementId += chars.charAt(i);
      }
      obj.agreement_id = agreementId;

      obj.address_service_notice1 = address_service_notice1;
      obj.terms = terms;
      obj.case_validity = case_validity;
      obj.tenancy_start_date = tenancy_start_date;
      obj.tenancy_length = tenancy_length;
      obj.payable_advance_start_on = payable_advance_start_on;
      obj.number_of_occupants = number_of_occupants;

      obj.rent_price = rent_price;
      obj.rental_period = rental_period;
      obj.address_service_notice2 = address_service_notice2;
      obj.tenancy_inclusion = tenancy_inclusion;
      obj.rent_paid_to = rent_paid_to;
      obj.rent_paid_at = rent_paid_at;
      obj.detail = detail;

      obj.bsb_number = bsb_number;
      obj.account_number = account_number;
      obj.account_name = account_name;
      obj.payment_reference = payment_reference;
      obj.follow_as = follow_as;
      obj.rent_bond_price = rent_bond_price;

      obj.electricity_repairs = electricity_repairs;
      obj.electricity_repairs_phone_number = electricity_repairs_phone_number;
      obj.plumbing_repairs = plumbing_repairs;
      obj.plumbing_repairs_phone_number = plumbing_repairs_phone_number;
      obj.other_repair = other_repair;
      obj.other_repair_phone_number = other_repair_phone_number;

      obj.water_usage = water_usage;
      obj.strata_by_laws = strata_by_laws;
      obj.save_as_draft = save_as_draft;
      obj.property_address = property_address;
      obj.property_lat = property_lat;
      obj.property_lng = property_lng;

      if (validator.isValidObject(property_id)) obj.property_id = property_id;
      // if (owner_id && validator.isValidObject(owner_id))
      //     obj.owner_id = owner_id;
      if (agency_id && validator.isValidObject(agency_id))
        obj.agency_id = agency_id;
      if (created_by && validator.isValidObject(created_by))
        obj.created_by = created_by;
      if (created_by_role && validator.isValidObject(created_by_role))
        obj.created_by_role = created_by_role;

      if (tenants) {
        var tenantsArr = [];
        for (var i = 0; i < tenants.length; i++) {
          if (tenants.indexOf(tenants[i]._id) === -1) {
            tenantsArr.push({
              users_id: mongoose.Types.ObjectId(tenants[i]._id),
            });
          }
        }
        obj.tenants = tenantsArr;
        console.log("obj.tenants => ", obj.tenants);
      }

      if (images) {
        var imagesListArr = [];
        for (var i = 0; i < images.length; i++) {
          if (images.indexOf(images[i].path) === -1) {
            imagesListArr.push({ path: images[i].path, status: false });
          }
        }
        obj.images = imagesListArr;
      }

      User.find({ email: req.body.property_owner.toLowerCase() }).then(
        async function (userData) {
          console.log("userData =========================> ", userData);
          if (userData && userData.length > 0) {
            obj.owner_id = userData[0]._id;
            var owner_id = await userData[0]._id;
          } else {
            console.log("new user => ");
          }

          console.log("owner_id ===============> ", owner_id);
          var Agreements = new agreements(obj);
          await Agreements.save(async function (err, Agreementdata) {
            console.log("agreementdata ==========> ", Agreementdata);
            if (err) {
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR,
              });
            } else {
              if (property_address) {
                var options = {
                  method: "GET",
                  url: "https://api.psma.com.au/beta/v1/addresses",
                  qs: {
                    perPage: "10",
                    page: "1",
                    addressString: property_address,
                  },
                  headers: {
                    authorization: "Z6Auyhh7JOaXfvandiUb0e95Mr92GfnY",
                  },
                };
                let GNAFId;
                await request(options, async function (error, response, body) {
                  if (response) {
                    var result = JSON.parse(body);
                    console.log("result =================> ", result);
                    if (
                      result &&
                      result.data &&
                      result.data[0] &&
                      result.data[0].addressId
                    ) {
                      GNAFId = await result.data[0].addressId;
                      await AddressModel.find(
                        { GNAFId: GNAFId },
                        async function (err, addressData) {
                          console.log(
                            "addressData ============> ",
                            addressData
                          );
                          if (addressData && addressData.length > 0) {
                            console.log("Address Record Found => ");
                            let add_conditions = {};
                            add_conditions.agreement = mongoose.Types.ObjectId(
                              Agreementdata._id
                            );
                            AddressModel.update(
                              { GNAFId: GNAFId },
                              { $push: add_conditions },
                              function (updateAddressErr, updatedAddress) {
                                console.log(
                                  "updateAddressErr => ",
                                  updateAddressErr
                                );
                                console.log(
                                  "updatedAddress => ",
                                  updatedAddress
                                );
                              }
                            );
                          } else {
                            console.log("No Address Record => ");
                            const address = new AddressModel({
                              trader: [],
                              maintenance: [],
                              agreement: [Agreementdata._id],
                              GNAFId: GNAFId,
                            });
                            address.save(function (err, addedAddress) {
                              console.log("addedAddress => ", addedAddress);
                              console.log("err => ", err);
                            });
                          }
                        }
                      );
                    }
                  }
                });
              }

              await agreements
                .findById({ _id: Agreementdata._id })
                .populate(
                  "property_id",
                  "property_name description address image"
                )
                .populate("created_by", "firstname lastname image")
                .exec(async function (err, data) {
                  //Send Message to Tenants for new agreements request//
                  if (err) {
                    res.json({ code: Constant.SUCCESS_CODE, data: data });
                  } else {
                    // if (data.tenants) {
                    var to_users = [];
                    var obj2 = {};
                    obj2.subject = "Agreement";
                    obj2.message =
                      "Agreement added by " +
                      data.created_by.firstname +
                      " " +
                      data.created_by.lastname +
                      " for the  Property " +
                      req.body.property_add +
                      " on " +
                      moment().format("MMMM Do YYYY");
                    obj2.from_user = mongoose.Types.ObjectId(
                      data.created_by._id
                    );
                    await to_users.push({
                      users_id: mongoose.Types.ObjectId(owner_id),
                    });
                    // if (data.tenants) {
                    //     to_users.push.apply(to_users, data.tenants);
                    // }
                    // if (to_users.length) {
                    //     obj2.to_users = to_users;
                    // }
                    obj2.agreement_id = Agreementdata._id;
                    obj2.type = Constant.NOTIFICATION_TYPE_AGREEMENT;
                    obj2.module = 3;
                    var notification = new NotificationInfo(obj2);
                    await notification.save(function (err, notData) {
                      if (err) {
                        res.json({
                          code: Constant.ERROR_CODE,
                          message: Constant.INTERNAL_ERROR,
                        });
                      } else {
                        res.json({ code: Constant.SUCCESS_CODE, data: data });
                      }
                    });
                    // } else {
                    //     res.json({ code: Constant.SUCCESS_CODE, data: data });
                    // }
                  }
                });
            }
          });
        }
      );

      // console.log('owner_id => ', owner_id);
      // console.log('obj  :: Agreement object =====> ', obj);
    } else {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.REQ_DATA_MISSING,
      });
    }
  })();
}

// Add Agreement - New API
function addAgreements(req, res) {
  (async () => {
    try {
      if (req.body.created_by && req.body.property_owner) {
        let ownerId;
        let ownerUser = {};
        let pending_owner = false;
        await User.find(
          { email: req.body.property_owner.toLowerCase() },
          async function (err, foundUserData) {
            if (err) {
              res.json({
                code: Constant.ERROR_CODE,
                message: err.message,
              });
            } else {
              if (foundUserData.length > 0) {
                // check for user role
                ownerUser = {
                  // set proerty for mail options
                  firstName: foundUserData[0].firstname,
                  lastName: foundUserData[0].lastname,
                  email: foundUserData[0].email,
                };
                // for existing user - having same owner role - ExistingOwner
                // for existing user - not having owner role - notOwner
                // for new user - newOwner

                await GroupModel.find(
                  { user_id: foundUserData[0]._id },
                  async function (err, groupData) {
                    console.log("err :: while finding group :: owner=> ", err);
                    console.log(
                      "groupData :: groupdata for existing owner =======> ",
                      groupData
                    );
                    if (groupData && groupData.length > 0) {
                      let group = groupData.filter(function (value) {
                        return value.role_id == Constant.OWNER;
                      });
                      if (group && group.length === 0) {
                        //  send inviation link to accept agreement as a owner
                        pending_owner = true;
                        ownerUser.userType = "notOwner";
                      } else {
                        console.log("existing owner user role => ");
                        ownerUser.userType = "ExistingOwner";
                      }
                    } else {
                      console.log("existing owner == but no groups found => ");
                      pending_owner = true;
                      // ownerUser.userType = 'newOwner';
                      // ownerUser.activationCode = foundUserData[0].activation_code;

                      ownerUser = {
                        userType: "newOwner",
                        firstName: "Owner",
                        lastName: "",
                        email: foundUserData[0].email,
                        activationCode: foundUserData[0].activation_code,
                      };

                      let grpObject = {
                        user_id: mongoose.Types.ObjectId(foundUserData[0]._id),
                        role_id: mongoose.Types.ObjectId(Constant.OWNER),
                        is_master_role: false
                      }
                      let groupUser = new GroupModel(grpObject);
                      groupUser.save(function (err, group) {
                        if (err) {
                          res.json({
                            code: Constant.ERROR_CODE,
                            message: 'Error occur while existing owner but no groups found',
                          });
                        }
                      })
                    }
                  }
                );
                ownerId = foundUserData[0]._id;
              } else {
                // New Owner
                const activation_code =
                  Math.random().toString(36).substring(2, 10) +
                  Math.random().toString(36).substring(2, 10);
                pending_owner = true;
                const newOwner = User({
                  email: req.body.property_owner,
                  activation_code: activation_code,
                  status: false,
                  is_deleted: false,
                });
                await newOwner.save(async function (newOwnerErr, newOwnerData) {
                  console.log("newOwnerErr => ", newOwnerErr);
                  // save group for user
                  if (newOwnerErr) {
                    res.json({
                      code: Constant.ERROR_CODE,
                      message: newOwnerErr.message,
                    });
                  } else {
                    // console.log('new owner is created successfully. => ');
                    ownerId = newOwnerData._id;
                    console.log("newOwnerData => ", newOwnerData);
                    console.log("newOwnerData.email => ", newOwnerData.email);
                    ownerUser = {
                      // set proerty for mail options
                      userType: "newOwner",
                      firstName: "Owner",
                      lastName: "",
                      email: newOwnerData.email,
                      activationCode: newOwnerData.activation_code,
                    }
                    console.log("ownerUser => ", ownerUser);

                    let grpObject = {
                      user_id: mongoose.Types.ObjectId(ownerId),
                      role_id: mongoose.Types.ObjectId(Constant.OWNER),
                      is_master_role: false
                    }
                    let groupUser = new GroupModel(grpObject);
                    groupUser.save(function (err, group) {
                      if (err) {
                        res.json({
                          code: Constant.ERROR_CODE,
                          message: 'Error occur while existing owner but no groups found',
                        });
                      }
                    })
                  }
                });
              }
              if (ownerId) {
                // console.log('ownerId => ', ownerId);
                let tenants = req.body.tenants;
                let tenantsArr = [];
                let tenantUser = {};
                let tenantUserArray = [];
                console.log("tenants => ", tenants);
                let actions = tenants.map(async (tenant) => {
                  return new Promise(function (resolve) {
                    setTimeout(function () {
                      User.find({ email: tenant.toLowerCase() })
                        .then(async function (foundTenantUser) {
                          console.log("foundTenantUser => ", foundTenantUser);
                          let pending_tenant = false;
                          if (foundTenantUser && foundTenantUser.length > 0) {
                            // check for user role id
                            await GroupModel.find(
                              { user_id: foundTenantUser[0]._id },
                              async function (err2, groupData) {
                                console.log(
                                  "err2 :: finding group :: tenant => ",
                                  err2
                                );
                                console.log("groupData => ", groupData);
                                if (groupData && groupData.length > 0) {
                                  let group = groupData.filter(function (
                                    value
                                  ) {
                                    return value.role_id == Constant.TENANT;
                                  });
                                  console.log("group :: tenant => ", group);
                                  if (group && group.length === 0) {
                                    console.log("if => ");
                                    pending_tenant = true;
                                    tenantUser = {
                                      firstName: foundTenantUser[0].firstname,
                                      lastName: foundTenantUser[0].lastname,
                                      email: foundTenantUser[0].email,
                                      userType: "notTenant",
                                      id: foundTenantUser[0]._id,
                                    };
                                    tenantUserArray.push(tenantUser);

                                    let grpObject = {
                                      user_id: mongoose.Types.ObjectId(foundTenantUser[0]._id),
                                      role_id: mongoose.Types.ObjectId(Constant.TENANT),
                                      is_master_role: false
                                    }
                                    let groupUser = new GroupModel(grpObject);
                                    groupUser.save(function (err, group) {
                                      if (err) {
                                        res.json({
                                          code: Constant.ERROR_CODE,
                                          message: 'Error occur while existing user but role not found',
                                        });
                                      }
                                    })
                                  } else {
                                    console.log("else => ");
                                    // user does have tenant role
                                    tenantUser = {
                                      firstName: foundTenantUser[0].firstname,
                                      lastName: foundTenantUser[0].lastname,
                                      email: foundTenantUser[0].email,
                                      userType: "ExistingTenant",
                                      id: foundTenantUser[0]._id,
                                    };
                                    tenantUserArray.push(tenantUser);
                                  }
                                } else {
                                  tenantUser = {
                                    firstName: "Tenant",
                                    lastName: "",
                                    email: foundTenantUser[0].email,
                                    userType: "newTenant",
                                    id: foundTenantUser[0]._id,
                                    activationCode:
                                      foundTenantUser[0].activation_code,
                                  };
                                  pending_tenant = true;
                                  tenantUserArray.push(tenantUser);

                                  let grpObject = {
                                    user_id: mongoose.Types.ObjectId(foundTenantUser[0]._id),
                                    role_id: mongoose.Types.ObjectId(Constant.TENANT),
                                    is_master_role: true
                                  }
                                  let groupUser = new GroupModel(grpObject);
                                  groupUser.save(function (err, group) {
                                    if (err) {
                                      res.json({
                                        code: Constant.ERROR_CODE,
                                        message: 'Error occur while existing user but role not found',
                                      });
                                    }
                                  })
                                }
                              }
                            );
                            tenantsArr.push({
                              users_id: mongoose.Types.ObjectId(
                                foundTenantUser[0]._id
                              ),
                              pending_email: pending_tenant,
                            });
                          } else {
                            // new tenant
                            const activation_code =
                              Math.random().toString(36).substring(2, 10) +
                              Math.random().toString(36).substring(2, 10);
                            pending_tenant = true;
                            const newTenant = User({
                              email: tenant,
                              activation_code: activation_code,
                              status: false,
                              is_deleted: false,
                            });
                            await newTenant.save(async function (
                              newTenantErr,
                              newTenantData
                            ) {
                              console.log("newTenantErr => ", newTenantErr);
                              // save group for user
                              if (newTenantErr) {
                                res.json({
                                  code: Constant.ERROR_CODE,
                                  message: newTenantErr.message,
                                });
                              } else {
                                tenantUser = {
                                  firstName: "Tenant",
                                  lastName: "",
                                  email: newTenantData.email,
                                  userType: "newTenant",
                                  id: newTenantData._id,
                                  activationCode: newTenantData.activation_code,
                                };
                                // push tenant in tenantArr
                                tenantsArr.push({
                                  users_id: mongoose.Types.ObjectId(
                                    newTenantData._id
                                  ),
                                  pending_email: pending_tenant,
                                });
                                console.log("tenantUser :: 2 => ", tenantUser);
                                await tenantUserArray.push(tenantUser);

                                let grpObject = {
                                  user_id: mongoose.Types.ObjectId(newTenantData._id),
                                  role_id: mongoose.Types.ObjectId(Constant.TENANT),
                                  is_master_role: false
                                }
                                let groupUser = new GroupModel(grpObject);
                                groupUser.save(function (err, group) {
                                  if (err) {
                                    res.json({
                                      code: Constant.ERROR_CODE,
                                      message: 'Error occur while existing user but role not found',
                                    });
                                  }
                                })
                              }
                            });
                          }
                        })
                        .then((data) => {
                          resolve();
                        });
                    }, 0);
                  });
                });

                Promise.all(actions).then((data) => {
                  if (tenantsArr) {
                    const chars = "123456789";
                    let agreementId = "";
                    for (var x = 0; x < 9; x++) {
                      var i = Math.floor(Math.random() * chars.length);
                      agreementId += chars.charAt(i);
                    }
                    const agreementObj = new agreements({
                      agreement_id: agreementId,
                      owner_id: ownerId,
                      agency_id: req.body.agency_id ? req.body.agency_id : "",
                      created_by_role: req.body.created_by_role,
                      created_by: req.body.created_by,
                      detail: req.body.detail,
                      payable_advance_start_on:
                        req.body.payable_advance_start_on,
                      property_address: req.body.property_address,
                      property_lat: req.body.property_lat,
                      property_lng: req.body.property_lng,
                      rent_price: req.body.rent_price,
                      rental_period: req.body.rental_period,
                      save_as_draft: req.body.save_as_draft,
                      tenancy_length: req.body.tenancy_length,
                      tenancy_start_date: req.body.tenancy_start_date,
                      tenants: tenantsArr,
                      owner_pending_email: pending_owner,
                    });
                    agreementObj.save(async function (
                      errAgreement,
                      agreementData
                    ) {
                      if (errAgreement) {
                        res.json({
                          code: Constant.ERROR_CODE,
                          message: errAgreement.message,
                        });
                      } else {
                        if (agreementData) {
                          console.log(
                            "agreementData :: saved agreement data => ",
                            agreementData
                          );
                          if (agreementData.property_address) {
                            var options = {
                              method: "GET",
                              url: "https://api.psma.com.au/beta/v1/addresses",
                              qs: {
                                perPage: "10",
                                page: "1",
                                addressString: agreementData.property_address,
                              },
                              headers: {
                                authorization:
                                  "Z6Auyhh7JOaXfvandiUb0e95Mr92GfnY",
                              },
                            };
                            let GNAFId;
                            await request(
                              options,
                              async function (error, response, body) {
                                if (response) {
                                  var result = JSON.parse(body);
                                  console.log(
                                    "result =================> ",
                                    result
                                  );
                                  if (
                                    result &&
                                    result.data &&
                                    result.data[0] &&
                                    result.data[0].addressId
                                  ) {
                                    GNAFId = await result.data[0].addressId;
                                    await AddressModel.find(
                                      { GNAFId: GNAFId },
                                      async function (err, addressData) {
                                        console.log(
                                          "addressData ============> ",
                                          addressData
                                        );
                                        if (
                                          addressData &&
                                          addressData.length > 0
                                        ) {
                                          console.log(
                                            "Address Record Found => "
                                          );
                                          let add_conditions = {
                                            agreement: mongoose.Types.ObjectId(
                                              agreementData._id
                                            ),
                                          };
                                          await AddressModel.update(
                                            { GNAFId: GNAFId },
                                            {
                                              $push: add_conditions,
                                              $set: {
                                                address:
                                                  result.data[0]
                                                    .formattedAddress,
                                                lat: agreementData.property_lat,
                                                lng: agreementData.property_lng,
                                              },
                                            },
                                            function (
                                              updateAddressErr,
                                              updatedAddress
                                            ) {
                                              console.log(
                                                "updateAddressErr => ",
                                                updateAddressErr
                                              );
                                              console.log(
                                                "updatedAddress => ",
                                                updatedAddress
                                              );
                                            }
                                          );
                                        } else {
                                          console.log("No Address Record => ");
                                          const address = new AddressModel({
                                            trader: [],
                                            maintenance: [],
                                            agreement: [agreementData._id],
                                            GNAFId: GNAFId,
                                            address:
                                              result.data[0].formattedAddress,
                                            lat: agreementData.property_lat,
                                            lng: agreementData.property_lng,
                                          });
                                          await address.save(function (
                                            err,
                                            addedAddress
                                          ) {
                                            console.log(
                                              "addedAddress => ",
                                              addedAddress
                                            );
                                            console.log("err => ", err);
                                          });
                                        }
                                      }
                                    );
                                  }
                                }
                              }
                            );
                          }
                          await agreements
                            .findById({ _id: agreementData._id })
                            .populate("created_by", "firstname lastname image")
                            .populate("agency_id", "name")
                            .exec(async function (err, data) {
                              if (err) {
                                console.log("err => ", err);
                              } else {
                                if (data) {
                                  let toUsers = [];
                                  await toUsers.push({
                                    users_id: mongoose.Types.ObjectId(ownerId),
                                  });
                                  var notificationObj = new NotificationInfo({
                                    subject: "Agreement",
                                    message:
                                      "Agreement added by " +
                                      data.created_by.firstname +
                                      " " +
                                      data.created_by.lastname +
                                      " for the Property " +
                                      req.body.property_address +
                                      " on " +
                                      moment().format("MMMM Do YYYY"),
                                    from_user: mongoose.Types.ObjectId(
                                      data.created_by._id
                                    ),
                                    agreement_id: agreementData._id,
                                    type: Constant.NOTIFICATION_TYPE_AGREEMENT,
                                    module: 3,
                                    to_users: toUsers,
                                  });
                                  notificationObj.save(async function (
                                    notificationErr,
                                    notificationData
                                  ) {
                                    if (notificationErr) {
                                      res.json({
                                        code: Constant.ERROR_CODE,
                                        message: notificationErr.message,
                                      });
                                    } else {
                                      // send email to owner
                                      let infoObj = {
                                        firstName: ownerUser.firstName,
                                        lastName: ownerUser.lastName,
                                        propertyAddress:
                                          agreementData.property_address,
                                        agentName: data.agency_id.name,
                                        logoURL:
                                          Constant.STAGGING_URL +
                                          "assets/images/logo-public-home.png",
                                      };
                                      const options = {
                                        from: Config.EMAIL_FROM, // sender address
                                        to: ownerUser.email, // list of receivers
                                        subject: "Invitation for New Agreement", // Subject line
                                        text: "Invitation for New Agreement", // plaintext body
                                      };
                                      if (ownerUser.userType === "newOwner") {
                                        //  New owner email
                                        infoObj.redirectURL =
                                          Constant.STAGGING_URL +
                                          "#!/account_activation/" +
                                          agreementData._id +
                                          "/" +
                                          Constant.OWNER +
                                          "/" +
                                          ownerUser.activationCode;
                                        let mail_response =
                                          mail_helper.sendEmail(
                                            options,
                                            "agreement_notification_for_new_owner",
                                            infoObj
                                          );
                                      } else {
                                        if (
                                          ownerUser.userType === "ExistingOwner"
                                        ) {
                                          infoObj.redirectURL =
                                            Constant.STAGGING_URL +
                                            "#!/detail_agreement/" +
                                            agreementData._id;
                                        } else {
                                          infoObj.redirectURL =
                                            Constant.STAGGING_URL +
                                            "#!/confirm_role/" +
                                            agreementData._id +
                                            "/" +
                                            Constant.OWNER +
                                            "/" +
                                            ownerId;
                                        }
                                        // existing user email
                                        let mail_response =
                                          mail_helper.sendEmail(
                                            options,
                                            "agreement_notification_for_existing_owner",
                                            infoObj
                                          );
                                      }

                                      //  send email to tenants
                                      tenantUserArray.map((tenantDetail) => {
                                        console.log(
                                          "tenantDetail => ",
                                          tenantDetail
                                        );
                                        let tenantInfo = {
                                          firstName: tenantDetail.firstName,
                                          lastName: tenantDetail.lastName,
                                          propertyAddress:
                                            agreementData.property_address,
                                          agentName: data.agency_id.name,
                                          logoURL:
                                            Constant.STAGGING_URL +
                                            "assets/images/logo-public-home.png",
                                        };
                                        const tenantMailOptions = {
                                          from: Config.EMAIL_FROM, // sender address
                                          to: tenantDetail.email, // list of receivers
                                          subject:
                                            "Invitation for New Agreement", // Subject line
                                          text: "Invitation for New Agreement", // plaintext body
                                        };
                                        if (
                                          tenantDetail.userType === "newTenant"
                                        ) {
                                          //  New owner email
                                          tenantInfo.redirectURL =
                                            Constant.STAGGING_URL +
                                            "#!/account_activation/" +
                                            agreementData._id +
                                            "/" +
                                            Constant.TENANT +
                                            "/" +
                                            tenantDetail.activationCode;
                                          let mail_response =
                                            mail_helper.sendEmail(
                                              tenantMailOptions,
                                              "agreement_notification_for_new_tenant",
                                              tenantInfo
                                            );
                                        } else {
                                          // existing user email
                                          if (
                                            tenantDetail.userType ===
                                            "ExistingTenant"
                                          ) {
                                            tenantInfo.redirectURL =
                                              Constant.STAGGING_URL +
                                              "#!/detail_agreement/" +
                                              agreementData._id;
                                          } else {
                                            tenantInfo.redirectURL =
                                              Constant.STAGGING_URL +
                                              "#!/confirm_role/" +
                                              agreementData._id +
                                              "/" +
                                              Constant.TENANT +
                                              "/" +
                                              tenantDetail.id;
                                          }
                                          let mail_response =
                                            mail_helper.sendEmail(
                                              tenantMailOptions,
                                              "agreement_notification_for_existing_tenant",
                                              tenantInfo
                                            );
                                        }
                                      });
                                      res.json({
                                        code: Constant.SUCCESS_CODE,
                                        data: agreementData,
                                      });
                                    }
                                  });
                                }
                              }
                            });
                        }
                      }
                    });
                  }
                });
              }
            }
          }
        );
      } else {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.REQ_DATA_MISSING,
        });
      }
    } catch (error) {
      console.log("error :: catch error=> ", error);
      res.json({
        code: Constant.ERROR_CODE,
        message: error.message,
      });
    }
  })();
}

// Update Agreement / New API
function editRentalcases(req, res) {
  console.log("req.body :: Update Agreement => ", req.body);
  (async () => {
    try {
      if (
        req.body.agreement_id &&
        req.body.created_by &&
        req.body.payable_advance_start_on &&
        req.body.property_address &&
        req.body.property_lat &&
        req.body.property_lng &&
        req.body.rent_price &&
        req.body.rental_period &&
        req.body.tenancy_length &&
        req.body.tenancy_start_date
      ) {
        let imagesListArr = [];
        if (req.body.images) {
          for (let i = 0; i < images.length; i++) {
            if (images.indexOf(images[i].path) === -1) {
              imagesListArr.push({ path: images[i].path, status: false });
            }
          }
        }
        let obj = {
          created_by: req.body.created_by,
          detail: req.body.detail ? req.body.detail : "",
          payable_advance_start_on: req.body.payable_advance_start_on,
          property_address: req.body.property_address,
          property_lat: req.body.property_lat,
          property_lng: req.body.property_lng,
          rent_price: req.body.rent_price,
          rental_period: req.body.rental_period,
          tenancy_length: req.body.tenancy_length,
          tenancy_start_date: req.body.tenancy_start_date,
          images: imagesListArr,
          save_as_draft: req.body.save_as_draft,
        };
        await agreements.findByIdAndUpdate(
          req.body.agreement_id,
          obj,
          async function (err, updatedAgreement) {
            console.log("err => ", err);
            console.log(
              "updatedAgreement :: Updated Record => ",
              updatedAgreement
            );
            if (err) {
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR,
              });
            } else {
              await agreements
                .findById(req.body.agreement_id)
                .populate("created_by", "_id firstname lastname")
                .exec(async function (err, foundAgreement) {
                  console.log("err => ", err);
                  if (err) {
                    res.json({
                      code: Constant.ERROR_CODE,
                      message: Constant.INTERNAL_ERROR,
                    });
                  } else {
                    console.log("foundAgreement => ", foundAgreement);
                    // notification for updated agreeemnt
                    let to_users = [];
                    to_users.push({
                      users_id: mongoose.Types.ObjectId(
                        foundAgreement.owner_id
                      ),
                    });
                    if (foundAgreement.tenants) {
                      to_users.push.apply(to_users, foundAgreement.tenants);
                    }
                    const editor =
                      foundAgreement.created_by.firstname +
                      " " +
                      foundAgreement.created_by.lastname;

                    const notification = new NotificationInfo({
                      subject: "Agreement",
                      message:
                        "Agreement edited by " +
                        editor +
                        " for the  Property " +
                        foundAgreement.property_address +
                        " on " +
                        moment().format("MMMM Do YYYY"),
                      from_user: mongoose.Types.ObjectId(
                        foundAgreement.created_by._id
                      ),
                      agreement_id: req.body.agreement_id,
                      type: Constant.NOTIFICATION_TYPE_AGREEMENT,
                      module: 3,
                      to_users: to_users,
                    });
                    await notification.save(function (err, notData) {
                      console.log("notData => ", notData);
                      if (err) {
                        res.json({
                          code: Constant.ERROR_CODE,
                          message: Constant.INTERNAL_ERROR,
                        });
                      } else {
                        res.json({
                          code: Constant.SUCCESS_CODE,
                          data: foundAgreement,
                        });
                      }
                    });
                  }
                });
            }
          }
        );
      } else {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.REQ_DATA_MISSING,
        });
      }
    } catch (error) {
      console.log("error :: catch error=> ", error);
      res.json({
        code: Constant.ERROR_CODE,
        message: error.message,
      });
    }
  })();
}

// Update Agreement / Old API
function editRentalcasesOld(req, res) {
  var agreement_id =
    typeof req.body.agreement_id != "undefined"
      ? mongoose.Types.ObjectId(req.body.agreement_id)
      : "";
  if (agreement_id) {
    agreements
      .findOne({ _id: mongoose.Types.ObjectId(agreement_id) })
      .populate("created_by", "_id firstname lastname")
      .populate("property_id", "_id address owned_by")
      .exec(function (err, data) {
        if (err) {
          res.json({
            code: Constant.ERROR_CODE,
            message: Constant.INTERNAL_ERROR,
          });
        } else {
          if (data) {
            var address = data.property_id.address;
            var owner_id = data.owner_id;
            // var owner_id = data.property_id.owned_by;
            var editor =
              data.created_by.firstname + " " + data.created_by.lastname;
            // console.log("owner_id", owner_id);

            data._id =
              typeof req.body.agreement_id != "undefined"
                ? mongoose.Types.ObjectId(req.body.agreement_id)
                : data._id;
            data.property_id =
              typeof req.body.property_id != "undefined"
                ? mongoose.Types.ObjectId(req.body.property_id)
                : data.property_id._id;
            data.agency_id =
              typeof req.body.agency_id != "undefined"
                ? mongoose.Types.ObjectId(req.body.agency_id)
                : data.agency_id;
            data.detail =
              typeof req.body.detail != "undefined"
                ? req.body.detail
                : data.detail;
            data.created_by_role =
              typeof req.body.created_by_role != "undefined"
                ? mongoose.Types.ObjectId(req.body.created_by_role)
                : data.created_by_role;
            data.created_by =
              typeof req.body.created_by != "undefined"
                ? mongoose.Types.ObjectId(req.body.created_by)
                : data.created_by._id;

            data.address_service_notice1 =
              typeof req.body.address_service_notice1 != "undefined"
                ? req.body.address_service_notice1
                : data.address_service_notice1;
            data.terms =
              typeof req.body.terms != "undefined"
                ? req.body.terms
                : data.terms;
            data.case_validity =
              typeof req.body.case_validity != "undefined"
                ? req.body.case_validity
                : data.case_validity;
            data.tenancy_start_date =
              typeof req.body.tenancy_start_date != "undefined"
                ? req.body.tenancy_start_date
                : data.tenancy_start_date;
            data.tenancy_length =
              typeof req.body.tenancy_length != "undefined"
                ? req.body.tenancy_length
                : data.tenancy_length;
            data.payable_advance_start_on =
              typeof req.body.payable_advance_start_on != "undefined"
                ? req.body.payable_advance_start_on
                : data.payable_advance_start_on;

            data.rent_price =
              typeof req.body.rent_price != "undefined"
                ? req.body.rent_price
                : data.rent_price;
            data.rental_period =
              typeof req.body.rental_period != "undefined"
                ? req.body.rental_period
                : data.rental_period;
            data.address_service_notice2 =
              typeof req.body.address_service_notice2 != "undefined"
                ? req.body.address_service_notice2
                : data.address_service_notice2;
            data.tenancy_inclusion =
              typeof req.body.tenancy_inclusion != "undefined"
                ? req.body.tenancy_inclusion
                : "";
            data.rent_paid_to =
              typeof req.body.rent_paid_to != "undefined"
                ? req.body.rent_paid_to
                : data.rent_paid_to;
            data.rent_paid_at =
              typeof req.body.rent_paid_at != "undefined"
                ? req.body.rent_paid_at
                : data.rent_paid_at;

            data.bsb_number =
              typeof req.body.bsb_number != "undefined"
                ? req.body.bsb_number
                : data.bsb_number;
            data.account_number =
              typeof req.body.account_number != "undefined"
                ? req.body.account_number
                : data.account_number;
            data.account_name =
              typeof req.body.account_name != "undefined"
                ? req.body.account_name
                : data.account_name;
            data.payment_reference =
              typeof req.body.payment_reference != "undefined"
                ? req.body.payment_reference
                : data.payment_reference;
            data.follow_as =
              typeof req.body.follow_as != "undefined"
                ? req.body.follow_as
                : data.follow_as;
            data.rent_bond_price =
              typeof req.body.rent_bond_price != "undefined"
                ? req.body.rent_bond_price
                : data.rent_bond_price;

            data.electricity_repairs =
              typeof req.body.electricity_repairs != "undefined"
                ? req.body.electricity_repairs
                : data.electricity_repairs;
            data.electricity_repairs_phone_number =
              typeof req.body.electricity_repairs_phone_number != "undefined"
                ? req.body.electricity_repairs_phone_number
                : data.electricity_repairs_phone_number;
            data.plumbing_repairs =
              typeof req.body.plumbing_repairs != "undefined"
                ? req.body.plumbing_repairs
                : data.plumbing_repairs;
            data.plumbing_repairs_phone_number =
              typeof req.body.plumbing_repairs_phone_number != "undefined"
                ? req.body.plumbing_repairs_phone_number
                : data.plumbing_repairs_phone_number;
            data.other_repair =
              typeof req.body.other_repair != "undefined"
                ? req.body.other_repair
                : data.other_repair;
            data.other_repair_phone_number =
              typeof req.body.other_repair_phone_number != "undefined"
                ? req.body.other_repair_phone_number
                : data.other_repair_phone_number;
            data.number_of_occupants =
              typeof req.body.number_of_occupants != "undefined"
                ? req.body.number_of_occupants
                : data.number_of_occupants;
            var tenantsArr = [];
            var imagesListArr = [];
            var creatorId = data.created_by;
            var tenants =
              typeof req.body.tenants != "undefined" ? req.body.tenants : [];
            var images =
              typeof req.body.images != "undefined" ? req.body.images : [];
            if (req.body.tenants) {
              for (var i = 0; i < tenants.length; i++) {
                if (tenants.indexOf(tenants[i]._id) === -1) {
                  tenantsArr.push({
                    users_id: mongoose.Types.ObjectId(tenants[i]._id),
                  });
                }
              }
            }
            if (req.body.images) {
              for (var i = 0; i < images.length; i++) {
                if (images.indexOf(images[i].path) === -1) {
                  imagesListArr.push({ path: images[i].path, status: false });
                }
              }
            }
            // console.log("tenantsArr!!!!!!!!!", tenantsArr);

            data.water_usage =
              typeof req.body.water_usage != "undefined"
                ? req.body.water_usage
                : data.water_usage;
            data.strata_by_laws =
              typeof req.body.strata_by_laws != "undefined"
                ? req.body.strata_by_laws
                : data.strata_by_laws;
            data.save_as_draft =
              typeof req.body.save_as_draft != "undefined"
                ? req.body.save_as_draft == true
                  ? true
                  : false
                : data.save_as_draft;
            data.is_csv_uploade =
              req.body.is_csv_uploade == true ? true : false;

            data.images =
              typeof req.body.images != "undefined"
                ? imagesListArr
                : data.images;
            data.tenants =
              typeof req.body.tenants != "undefined" && tenantsArr.length > 0
                ? tenantsArr
                : data.tenants;
            // console.log("data!!!!!!!!!", data);
            // if (property_id) {
            data.save(function (err, noticeData) {
              if (err) {
                res.json({
                  code: Constant.ERROR_CODE,
                  message: Constant.INTERNAL_ERROR,
                });
              } else {
                var to_users = [];
                var obj2 = {};
                obj2.subject = "Agreement";
                obj2.message =
                  "Agreement edited by " +
                  editor +
                  " for the  Property " +
                  address +
                  " on " +
                  moment().format("MMMM Do YYYY");
                obj2.from_user = mongoose.Types.ObjectId(data.created_by);

                to_users.push({ users_id: mongoose.Types.ObjectId(owner_id) });
                if (data.tenants) {
                  to_users.push.apply(to_users, data.tenants);
                }
                if (to_users.length) {
                  obj2.to_users = to_users;
                }
                obj2.agreement_id = agreement_id;
                obj2.type = Constant.NOTIFICATION_TYPE_AGREEMENT;
                obj2.module = 3;
                var notification = new NotificationInfo(obj2);
                notification.save(function (err, notData) {
                  if (err) {
                    res.json({
                      code: Constant.ERROR_CODE,
                      message: Constant.INTERNAL_ERROR,
                    });
                  } else {
                    res.json({ code: Constant.SUCCESS_CODE, data: data });
                  }
                });
              }
            });

            // }
          } else {
            res.json({
              code: Constant.ERROR_CODE,
              message: Constant.REQ_DATA_MISSING,
            });
          }
        }
      });
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
  }
}

/**
 * [Agreement list - get list of all agreement]
 * @param  {object} req
 * @param  {object} res
 */
function agreementList(req, res) {
  var request_by_role = req.body.request_by_role
    ? req.body.request_by_role
    : "";
  var request_by_id = req.body.created_by ? req.body.created_by : "";
  var agency_id = req.body.agency_id ? req.body.agency_id : "";
  var type = req.body.type ? req.body.type : "";

  var rent_price =
    typeof req.body.rent_price != "undefined" ? req.body.rent_price : "";
  var agreement_id =
    typeof req.body.agreement_id != "undefined" ? req.body.agreement_id : "";
  var terms = typeof req.body.terms != "undefined" ? req.body.terms : "";
  // var totalCount = 0;

  // 1 for sent , 2 for accepted, 3 for booked, 4 for completed, 5 for closed, 6 for due
  // var request_id = req.body.request_id ? req.body.request_id: '';
  if (request_by_role && request_by_id) {
    var conditions = { $and: [] };
    conditions["$and"].push({ deleted: false, is_csv_uploade: false });

    if (
      (request_by_role == Constant.AGENT ||
        request_by_role == Constant.RUN_STRATA_MANAGEMENT_COMPANY ||
        request_by_role == Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY) &&
      request_by_id
    )
      conditions["$and"].push({
        created_by: mongoose.Types.ObjectId(request_by_id),
      });
    if (request_by_role == Constant.OWN_AGENCY && agency_id)
      conditions["$and"].push({
        agency_id: mongoose.Types.ObjectId(agency_id),
      });
    if (request_by_role == Constant.TENANT && request_by_id)
      conditions["$and"].push({
        "tenants.users_id": mongoose.Types.ObjectId(request_by_id),
      });
    if (
      request_by_role == Constant.OWNER ||
      request_by_role == Constant.PROPERTY_OWNER
    )
      conditions["$and"].push({
        owner_id: mongoose.Types.ObjectId(request_by_id),
      });
    if (agreement_id) {
      agreement_id = parseInt(agreement_id);
      // conditions["$and"].push({"agreement_id": agreement_id });
      conditions["$and"].push({ agreement_id: agreement_id });
    }
    if (rent_price) {
      rent_price = parseInt(rent_price);
      conditions["$and"].push({ rent_price: rent_price });
    }
    if (terms) {
      terms = parseInt(terms);
      conditions["$and"].push({ terms: terms });
    }

    // var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    // var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;
    var outputJSON = {};

    waterfall(
      [
        function (callback) {
          agreements
            .find(conditions)
            .populate(
              "property_id",
              "property_name description address image property_id"
            )
            .populate("owner_id", "firstname lastname image")
            .populate("created_by_role", "title name")
            .populate("created_by", "firstname lastname image")
            .populate("tenants.users_id", "firstname lastname image")
            // .limit(parseInt(number_of_pages))
            // .skip(page_number * number_of_pages)
            .sort({ createdAt: -1 })
            .exec(function (err, data) {
              if (err) {
                callback(err);
              } else {
                // console.log('data => ', data);
                callback(null, data);
              }
            });
        },
        // removed for now
        // function (propertyData, callback) {
        //     var newItem = JSON.stringify(propertyData);
        //     var newItem = JSON.parse(newItem);
        //     // console.log("newItem    ", newItem);
        //     var last_message_Array = [];
        //     if (newItem.length > 0) {
        //         async.each(newItem, function (item, asyncCall) {
        //             if (item.tenants && item.tenants[0] && item.tenants[0].users_id && item.tenants[0].users_id._id) {
        //                 Chats.findOne({
        //                     "$or": [{ "from": mongoose.Types.ObjectId(item.tenants[0].users_id._id) }, { "to": mongoose.Types.ObjectId(item.tenants[0].users_id._id) }]
        //                 })
        //                     .sort({ created: -1 }).exec(function (err, fav) {
        //                         if (err) {
        //                             item.last_message_date = '';
        //                             item.createdAt = '';
        //                             last_message_Array.push(item);
        //                             asyncCall(null, last_message_Array);
        //                         } else {
        //                             if (fav) {
        //                                 item.last_message_date = fav.time;
        //                                 item.createdAt = fav.created;
        //                                 last_message_Array.push(item);
        //                                 asyncCall(null, last_message_Array);
        //                             } else {
        //                                 item.last_message_date = '';
        //                                 item.createdAt = '';
        //                                 last_message_Array.push(item);
        //                                 asyncCall(null, last_message_Array);
        //                             }
        //                         }
        //                     });
        //             } else {
        //                 callback(null, propertyData);
        //             }
        //         }, function (err) {
        //             if (err) {
        //                 callback(err);
        //             } else {
        //                 callback(null, newItem);
        //             }
        //         });
        //     } else {
        //         callback(null, propertyData);
        //     }
        // }
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

    // agreements.find(conditions).populate('property_id', 'property_name description address image property_id')
    //     .populate('owner_id', 'firstname lastname image')
    //     .populate('created_by_role', 'title name')
    //     .populate('created_by', 'firstname lastname image')
    //     .populate('tenants.users_id', 'firstname lastname image')
    //     .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
    //     .sort({ createdAt: -1 }).exec(function (err, data) {
    //         if (err) {
    //             outputJSON = {
    //                 'code': Constant.ERROR_CODE,
    //                 'message': Constant.ERROR_RETRIVING_DATA
    //             };
    //         } else {
    //             outputJSON = {
    //                 'code': Constant.SUCCESS_CODE,
    //                 'data': data
    //             }
    //         }
    //         res.jsonp(outputJSON);
    //     });
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
  }
}
/**
 * [Agreement list - get list of all bulk upload agreement]
 * @param  {object} req
 * @param  {object} res
 */
function agreementListForBulkUpload(req, res) {
  var request_by_role = req.body.request_by_role
    ? req.body.request_by_role
    : "";
  var request_by_id = req.body.request_by_id ? req.body.request_by_id : "";
  var agency_id = req.body.agency_id ? req.body.agency_id : "";
  var type = req.body.type ? req.body.type : "";
  // 1 for sent , 2 for accepted, 3 for booked, 4 for completed, 5 for closed, 6 for due
  // var request_id = req.body.request_id ? req.body.request_id: '';

  if (request_by_role && request_by_id) {
    var conditions = { $and: [] };
    conditions["$and"].push({ deleted: false, is_csv_uploade: true });

    if (
      (request_by_role == Constant.AGENT ||
        request_by_role == Constant.RUN_STRATA_MANAGEMENT_COMPANY ||
        request_by_role == Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY) &&
      request_by_id
    )
      conditions["$and"].push({
        created_by: mongoose.Types.ObjectId(request_by_id),
      });
    if (request_by_role == Constant.OWN_AGENCY && agency_id)
      conditions["$and"].push({
        agency_id: mongoose.Types.ObjectId(agency_id),
      });
    if (request_by_role == Constant.TENANT && request_by_id)
      conditions["$and"].push({
        "tenants.users_id": mongoose.Types.ObjectId(request_by_id),
      });
    if (
      request_by_role == Constant.OWNER ||
      request_by_role == Constant.PROPERTY_OWNER
    )
      conditions["$and"].push({
        owner_id: mongoose.Types.ObjectId(request_by_id),
      });
    var page_number = req.body.current_page
      ? parseInt(req.body.current_page) - 1
      : 0;
    var number_of_pages = req.body.number_of_pages
      ? parseInt(req.body.number_of_pages)
      : 20;
    var outputJSON = {};
    // console.log('conditions',conditions);
    agreements
      .find(conditions)
      .populate("property_id", "property_name description address image")
      .populate("owner_id", "firstname lastname image")
      .populate("created_by_role", "title name")
      .populate("created_by", "firstname lastname image")
      .populate("tenants.users_id", "firstname lastname image")
      .limit(parseInt(number_of_pages))
      .skip(page_number * number_of_pages)
      .sort({ createdAt: -1 })
      .exec(function (err, data) {
        if (err) {
          outputJSON = {
            code: Constant.ERROR_CODE,
            message: Constant.ERROR_RETRIVING_DATA,
          };
        } else {
          outputJSON = {
            code: Constant.SUCCESS_CODE,
            data: data,
          };
        }
        res.jsonp(outputJSON);
      });
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
  }
}
function agreementDetail(req, res) {
  var outputJSON = {};
  if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
    var agreement_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    waterfall(
      [
        function (callback) {
          agreements
            .findById({ _id: agreement_id, deleted: false })
            .populate(
              "tenants.users_id",
              "firstname lastname image mobile_no createdAt address email"
            )
            .populate("created_by_role", "title name")
            .populate(
              "created_by",
              "firstname lastname image mobile_no createdAt address"
            )
            .populate("owner_id", "firstname lastname name email")
            .exec(function (err, data) {
              console.log("data => ", data);
              if (err) {
                callback({
                  code: Constant.ERROR_CODE,
                  message: Constant.ERROR_RETRIVING_DATA,
                });
              } else if (data) {
                callback(null, data);
              } else {
                callback({
                  code: Constant.ERROR_CODE,
                  message: Constant.ERROR_RETRIVING_DATA,
                });
              }
            });
        },
        async function (propertyData, callback) {
          console.log("propertyData=>>>", propertyData);
          if (propertyData) {
            // await AddressModel.find({ "agreement": agreement_id })
            // .populate('maintenance')
            await AddressModel.aggregate([
              {
                $match: { agreement: mongoose.Types.ObjectId(agreement_id) },
              },
              {
                $unwind: {
                  path: "$maintenance",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "maintenances",
                  localField: "maintenance",
                  foreignField: "_id",
                  as: "maintenance_grp",
                },
              },
              {
                $unwind: {
                  path: "$maintenance_grp",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "users",
                  localField: "maintenance_grp.trader_id",
                  foreignField: "_id",
                  as: "maintenance_grp.trader_id",
                },
              },
              {
                $unwind: {
                  path: "$maintenance_grp.trader_id",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $group: {
                  _id: "$_id",
                  data: { $first: "$$ROOT" },
                  maintenance_data: {
                    $push: "$maintenance_grp",
                  },
                },
              },
            ])
              .exec(function (err, addressRecord) {
                console.log("err => ", err);
                if (err) {
                  callback({
                    code: Constant.ERROR_CODE,
                    message: Constant.ERROR_RETRIVING_DATA,
                  });
                }
                // else if (addressRecord && addressRecord.length > 0 && addressRecord[0].maintenance && addressRecord[0].maintenance.length) {
                //     var myObjectList = [];
                //     myObjectList.push({ "propertyData": propertyData });
                //     myObjectList.push({ "maintenanceData": addressRecord[0].maintenance });
                //     callback(null, myObjectList);
                // }
                else if (
                  addressRecord &&
                  addressRecord.length > 0 &&
                  addressRecord[0].maintenance_data &&
                  addressRecord[0].maintenance_data &&
                  addressRecord[0].maintenance_data.length
                ) {
                  var myObjectList = [];
                  myObjectList.push({ propertyData: propertyData });
                  myObjectList.push({
                    maintenanceData: addressRecord[0].maintenance_data,
                  });
                  callback(null, myObjectList);
                } else {
                  var myObjectList = [];
                  myObjectList.push({ propertyData: propertyData });
                  if (
                    addressRecord &&
                    addressRecord.length > 0 &&
                    addressRecord[0].maintenance
                  ) {
                    myObjectList.push({
                      maintenanceData: addressRecord[0].maintenance,
                    });
                  } else {
                    myObjectList.push({ maintenanceData: [] });
                  }
                  callback(null, myObjectList);
                }
              })
              .catch(function (err) {
                callback({
                  code: Constant.ERROR_CODE,
                  message: Constant.ERROR_RETRIVING_DATA,
                });
              });
          } else {
            var myObjectList = [];
            myObjectList.push({ propertyData: [] });
            myObjectList.push({ maintenanceData: [] });
            callback(null, myObjectList);
          }
        },
      ],
      function (err, result) {
        console.log("err :: check here for error ====> ", err);
        if (err) {
          res.json({
            code: Constant.ERROR_CODE,
            message: Constant.ERROR_RETRIVING_DATA,
          });
        } else {
          console.log("result => ", result);
          res.json({ code: Constant.SUCCESS_CODE, data: result });
        }
      }
    );
  } else {
    res.json({
      code: Constant.NOT_FOUND,
      message: Constant.ERROR_RETRIVING_DATA,
    });
  }
}

function agreementDetailOld(req, res) {
  var outputJSON = {};
  if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
    var agreement_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    waterfall(
      [
        function (callback) {
          agreements
            .findById({ _id: agreement_id, deleted: false })
            .populate({ path: "property_id", populate: { path: "owned_by" } })
            .populate(
              "tenants.users_id",
              "firstname lastname image mobile_no createdAt address email"
            )
            .populate("created_by_role", "title name")
            .populate(
              "created_by",
              "firstname lastname image mobile_no createdAt address"
            )
            .exec(function (err, data) {
              if (err) {
                callback({
                  code: Constant.ERROR_CODE,
                  message: Constant.ERROR_RETRIVING_DATA,
                });
              } else if (data) {
                callback(null, data);
              } else {
                callback({
                  code: Constant.ERROR_CODE,
                  message: Constant.ERROR_RETRIVING_DATA,
                });
              }
            });
        },
        function (propertyData, callback) {
          // console.log(propertyData);
          if (propertyData) {
            var property_id = propertyData.property_id._id;
            maintenances
              .find({ property_id: property_id, deleted: false })
              .populate("created_by", "image")
              .exec(function (err, maintenanceData) {
                if (err) {
                  callback({
                    code: Constant.ERROR_CODE,
                    message: Constant.ERROR_RETRIVING_DATA,
                  });
                } else if (maintenanceData && maintenanceData.length) {
                  var myObjectList = [];
                  myObjectList.push({ propertyData: propertyData });
                  myObjectList.push({ maintenanceData: maintenanceData });
                  callback(null, myObjectList);
                } else {
                  var myObjectList = [];
                  myObjectList.push({ propertyData: propertyData });
                  myObjectList.push({ maintenanceData: maintenanceData });
                  callback(null, myObjectList);
                }
              })
              .catch(function (err) {
                callback({
                  code: Constant.ERROR_CODE,
                  message: Constant.ERROR_RETRIVING_DATA,
                });
              });
          } else {
            var myObjectList = [];
            myObjectList.push({ propertyData: [] });
            myObjectList.push({ maintenanceData: [] });
            callback(null, myObjectList);
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
      code: Constant.NOT_FOUND,
      message: Constant.ERROR_RETRIVING_DATA,
    });
  }
}

/*  @api : upload Agreements Documents
 *  @author  :  Rahul L
 *  @created  :
 *  @modified :
 */
function uploadAgreementDocs(req, res) {
  var formData = {};
  var outputJSON = {};
  var agreementSavedObj = {};
  var validFileExt = [
    "jpeg",
    "jpg",
    "png",
    "gif",
    "pdf",
    "txt",
    "doc",
    "xls",
    "xlsx",
  ];
  waterfall(
    [
      function (callback) {
        var uploaded_file = req.swagger.params.file.value;
        formData = {
          document_name: "",
          path: "",
        };
        var file = uploaded_file;
        if (file.size < 10574919) {
          var mimeExtension = file.mimetype.split("/");
          if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
            callback(null, file);
          } else {
            callback(null, file);
            //callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false);
          }
        } else {
          callback("Upload file must be less than 10 MB", false);
        }
      },
      function (file, callback) {
        if (file) {
          var date = new Date();
          // var newDate = date.getTime();
          var newDate = Date.now();
          var timestamp = Number(new Date()); // current time as number
          var splitFile = file.originalname.split(".");
          var filename =
            +timestamp +
            "." +
            (splitFile.length > 0
              ? splitFile[splitFile.length - 1]
              : file.originalname);
          var dir = "./api/uploads/agreements";
          var temp_path = dir + "/" + filename;
          var mediaNameArr = file.originalname.split(".");
          var n = mediaNameArr.length;
          var mediaExt = mediaNameArr[n - 1];
          var fileName = mediaNameArr[0];
          formData.document_name = fileName + "." + mediaExt;
          formData.path = newDate + "." + mediaExt;
          // console.log(" formData.path", formData.path);
          // console.log("mediaExt", mediaExt);
          var data = file.buffer;

          fs.writeFile(path.resolve(temp_path), data, function (err, data) {
            if (err) {
              callback(err, false);
            } else {
              callback(null, formData);
            }
          });
        } else {
          callback("No files selected", false);
        }
      },
      function (formData, callback) {
        var updateImage = [];
        var maintenanceData = {};
        agreementSavedObj._id = req.body._id;
        if (agreementSavedObj._id) {
          var field = "";
          var query = { _id: agreementSavedObj._id };
          delete formData._id;
          agreements
            .findOne(query)
            .populate("created_by", "_id firstname lastname")
            .populate("property_id", "_id address owned_by")
            .exec(function (err, data) {
              if (err) {
                callback(err, null);
              } else {
                if (!data.images) {
                  data.images = [];
                }
                data.images.push(formData);
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
      },
      function (agreementData, callback) {
        var to_users = [];
        var obj2 = {};
        obj2.subject = "Agreement";
        obj2.message =
          "Some files are uploaded by " +
          agreementData.created_by.firstname +
          " " +
          agreementData.created_by.lastname +
          " for the agreement# " +
          agreementData.agreement_id +
          " of the  Property " +
          agreementData.property_address +
          " on " +
          moment().format("MMMM Do YYYY");
        obj2.from_user = mongoose.Types.ObjectId(agreementData.created_by._id);
        to_users.push({
          users_id: mongoose.Types.ObjectId(agreementData.owner_id),
        });
        if (agreementData.tenants) {
          to_users.push.apply(to_users, agreementData.tenants);
        }
        if (to_users.length) {
          obj2.to_users = to_users;
        }
        obj2.agreement_id = agreementData._id;
        obj2.type = Constant.NOTIFICATION_TYPE_AGREEMENT;
        obj2.module = 3;
        var notification = new NotificationInfo(obj2);
        notification.save(function (err, notData) {
          if (err) {
            res.json({
              code: Constant.ERROR_CODE,
              message: Constant.INTERNAL_ERROR,
            });
          } else {
            callback(null, agreementData);
          }
        });
      },
    ],
    function (err, agreementData) {
      if (err) {
        outputJSON = {
          code: Constant.ERROR_CODE,
          message: err,
        };
      } else {
        outputJSON = {
          code: Constant.SUCCESS_CODE,
          data: agreementData,
          message: Constant.PROPERTY_CREATE_SUCCESS,
        };
      }
      res.jsonp(outputJSON);
    }
  );
}

function uploadMobileAgreementDocs(req, res) {
  var formData = {};
  var outputJSON = {};
  var propertySavedObj = {};
  var validFileExt = ["jpeg", "jpg", "png", "gif", "pdf", "docx"];
  waterfall(
    [
      function (callback) {
        var uploaded_file = req.swagger.params.file.value;
        formData = {};
        var file = uploaded_file;
        if (file.size < 10574919) {
          var mimeExtension = file.mimetype.split("/");
          if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
            callback(null, file);
          } else {
            callback(
              "File format you have entered is not supported (jpg,png,gif,pdf,txt)",
              false
            );
          }
        } else {
          callback("Upload file must be less than 10 MB", false);
        }
      },
      function (file, callback) {
        if (file) {
          var timestamp = Number(new Date()); // current time as number
          var splitFile = file.originalname.split(".");
          var filename =
            +timestamp +
            "." +
            (splitFile.length > 0
              ? splitFile[splitFile.length - 1]
              : file.originalname);
          var dir = "./api/uploads/agreements";
          var temp_path = dir + "/" + filename;
          var data = file.buffer;
          //var uploadedImage = '/uploads/property/'+filename;
          fs.writeFile(path.resolve(temp_path), data, function (err, data) {
            if (err) {
              callback(err, false);
            } else {
              callback(null, filename);
            }
          });
        } else {
          callback("No files selected", false);
        }
        // if(file){
        //     var date = new Date();
        //     var newDate = date.getTime();
        //     var timestamp = Number(new Date()); // current time as number
        //     var splitFile = file.originalname.split('.');
        //     var filename = +timestamp + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
        //     var dir = './api/uploads/agreements';
        //     var temp_path = dir + '/' + filename;
        //     var mediaNameArr = file.originalname.split('.');
        //     var mediaExt = mediaNameArr[1];
        //     var fileName = mediaNameArr[0];
        //     formData.document_name = fileName + '.' + mediaExt;
        //     formData.path = newDate + '.' + mediaExt;
        //     var data = file.buffer;

        //     fs.writeFile(path.resolve(temp_path), data, function (err, data) {
        //         if (err) {
        //             callback(err, false);
        //         } else {
        //             callback(null, formData);
        //         }
        //     });
        // }
      },
    ],
    function (err, imageData) {
      if (err) {
        outputJSON = {
          code: Constant.ERROR_CODE,
          message: "Unsuccessfully upload image",
        };
      } else {
        outputJSON = {
          code: Constant.SUCCESS_CODE,
          data: imageData,
          message: "Image upload sucessfully",
        };
      }
      res.jsonp(outputJSON);
    }
  );
}

/**
 * Function to remove agreement
 * @return json
 * Created by Rahul Lahariya
 * @smartData Enterprises (I) Ltd
 * Created Date 7-Dec-2017
 */
function deleteAgreement(req, res) {
  if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
    var agreement_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    agreements.findOneAndUpdate(
      { _id: agreement_id },
      { $set: { deleted: true } },
      function (err, data) {
        if (err) {
          res.json({
            code: Constant.INVALID_CODE,
            message: Constant.INTERNAL_ERROR,
          });
        } else {
          res.json({
            code: Constant.SUCCESS_CODE,
            message: "Agreement deleted sucessfully",
          });
        }
      }
    );
  } else {
    res.json({
      code: Constant.NOT_FOUND,
      message: Constant.ERROR_RETRIVING_DATA,
    });
  }
}

/**
 * function used to upload agreement CSV file
 * Date :- 05-Dec-2017
 * @author: Rahul
 *
 */

function importAgreementCSV(req, res) {
  var timestamp = Number(new Date()); // current time as number
  var form = new formidable.IncomingForm();
  var file = req.swagger.params.file.value;

  var outputJSON = {};
  var splitFile = file.originalname.split(".");
  var filename =
    +timestamp +
    "_" +
    "import_agreement" +
    "." +
    (splitFile.length > 0
      ? splitFile[splitFile.length - 1]
      : file.originalname);
  var filePath = "./api/uploads/agreement_csv/" + filename;
  var errorfilename = Date.now() + ".csv";
  var errorMessage = "";
  var count = 1;
  var errorCount = 0;
  var csvArray = [];
  var agreementData = {};

  fs.writeFile(path.resolve(filePath), file.buffer, function (err) {
    if (err) {
      callback(err, false);
    } else {
      var csvheaders;
      csvheaders = {
        headers: [
          "property_unique_id",
          "address_service_notice1",
          "tanant_email_id",
          "terms_of_agreement",
          "rental_case_validity",
          "tenancy_start_date",
          "tenancy_length",
          "Rent_amount",
          "rental_period",
          "payable_advance_start_on",
          "address_service_notice2",
          "tenancy_inclusion",
          "water_usage",
          "strata_by_laws",
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
      console.log("stream", stream);
      csv
        .fromStream(stream, csvheaders)
        .validate(function (data) {
          console.info("--------------------------");
          console.info("data =>", data);
          console.info("--------------------------");
          if (
            data.property_unique_id &&
            data.address_service_notice1 &&
            data.tanant_email_id &&
            data.terms_of_agreement &&
            data.rental_case_validity &&
            data.tenancy_start_date &&
            data.tenancy_length &&
            data.Rent_amount &&
            data.rental_period &&
            data.payable_advance_start_on &&
            data.address_service_notice2 &&
            data.tenancy_inclusion &&
            data.water_usage &&
            data.strata_by_laws
          ) {
            if (
              data.property_unique_id.length == 0 ||
              isNaN(data.property_unique_id) == true ||
              isNaN(data.address_service_notice1) == false ||
              data.address_service_notice1.length == 0 ||
              data.tanant_email_id.length == 0 ||
              data.terms_of_agreement.length == 0 ||
              isNaN(data.rental_case_validity) == false ||
              data.rental_case_validity.length == 0 ||
              data.tenancy_start_date.length == 0 ||
              isNaN(data.tenancy_length) ||
              data.tenancy_length.length == 0 ||
              (isNaN(data.Rent_amount) && data.Rent_amount.length == 0) ||
              data.rental_period.length == 0 ||
              data.payable_advance_start_on.length == 0 ||
              data.address_service_notice2.length == 0 ||
              data.tenancy_inclusion.length == 0 ||
              data.water_usage.length == 0 ||
              data.strata_by_laws.length == 0
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
              "Some of the values are missing on row number " + errorCount;
            return false;
          }
        })
        .on("data-invalid", function (data) {
          if (errorMessage) {
            is_success = false;
          } else if (data) {
            errorCount++;
            errorMessage = "Data not valid, Please insert proper value";
            is_success = false;
          }
        })
        .on("data", function (data) {
          // console.log('called');
          var chars = "1234567890";
          var agreementId = "";
          count++;
          for (var x = 0; x < 10; x++) {
            var i = Math.floor(Math.random() * chars.length);
            agreementId += chars.charAt(i);
          }
          var query = {
            property_id: data.property_unique_id,
            is_deleted: false,
          };
          propertyModel.findOne(query).exec(function (err, response) {
            if (err) {
              is_success = false;
            } else {
              if (response != null) {
                var tenant_id = "";
                User.findOne({
                  email: data.tanant_email_id,
                  is_deleted: false,
                }).exec(function (err, userResponse) {
                  if (err) {
                    is_success = false;
                  } else if (userResponse != null) {
                    agreementData = {
                      created_by: req.body._id,
                      agreement_id: agreementId,
                      property_id: response._id,
                      owner_id: response.owned_by,
                      agency_id: req.body.agency_id,
                      tenants: [{ users_id: userResponse._id }],
                      address_service_notice1: data.address_service_notice1,
                      terms: data.terms_of_agreement == "Monthly" ? 1 : 2,
                      case_validity: moment(data.rental_case_validity).format(
                        "YYYY-MM-DD"
                      ),
                      tenancy_start_date: moment(
                        data.tenancy_start_date
                      ).format("YYYY-MM-DD"),
                      tenancy_length: data.tenancy_length,
                      rent_price: data.Rent_amount,
                      rental_period: data.rental_period == "Monthly" ? 1 : 2,
                      payable_advance_start_on: moment(
                        data.payable_advance_start_on
                      ).format("YYYY-MM-DD"),
                      address_service_notice2: data.address_service_notice2,
                      tenancy_inclusion: data.tenancy_inclusion,
                      water_usage: data.water_usage == "yes" ? true : false,
                      strata_by_laws:
                        data.strata_by_laws == "yes" ? true : false,
                      is_csv_uploade: true,
                      save_as_draft: true,
                    };
                    var agreement = new agreements(agreementData);
                    agreement.save(function (err, agreementData) {
                      if (err) {
                        is_success = false;
                      }
                    });
                  } else {
                    // console.log('Tenant not found in the record');
                    is_success = false;
                    errorCount++;
                    errorMessage = "Tenant not found in the record";
                  }
                });
              } else {
                // console.log('Property not found in the record');
                is_success = false;
                errorCount++;
                errorMessage = "Property not found in the record";
              }
            }
          });
        })
        .on("end", function () {
          if (is_success) {
            res.json({
              code: Constant.SUCCESS_CODE,
              message: "Agreement created sucessfully",
            });
          } else {
            res.json({
              code: Constant.ERROR_CODE,
              message: errorMessage,
            });
          }
        });
    }
  });
}

/**
 * Send email notification to agent when agreement is about to expire - 90 days prior expiry date
 */

function agreementExpiryEmail() {
  // console.log('req.body => ', req.body);
  (async () => {
    console.log(
      "Send email to when agreement is about to expire - 90 days prior expiry date => "
    );
    try {
      // get list of all agreements
      await agreements
        .find({ deleted: false })
        .populate("created_by", "firstname lastname email")
        .populate("owner_id", "firstname lastname email")
        .exec(async function (err, agreementsList) {
          if (err) {
            console.log(
              "err :: occured while fetching agreements from db => ",
              err
            );
          } else {
            if (agreementsList && agreementsList.length > 0) {
              console.log("agreements.length => ", agreementsList.length);
              // check for each agreement
              await agreementsList.map(async (data) => {
                const today = moment().format("DD-MM-YYYY");
                console.log("today => ", today);
                const expirationDate = moment()
                  .add(90, "d")
                  .format("YYYY-MM-DD");
                let enddateFormat = new Date(data.tenancy_length);
                let enddate = moment(enddateFormat);
                const endDate = enddate.utc().format("DD-MM-YYYY");
                if (
                  today < endDate &&
                  endDate < expirationDate &&
                  !data.send_expiration_email
                ) {
                  // send an email to agent regarding tenancy renewal
                  await agreements.findByIdAndUpdate(
                    data._id,
                    { send_expiration_email: true },
                    async function (updateErr, updatedAgreement) {
                      if (updateErr) {
                        console.log(
                          "updateErr :: occured while updating agreement => ",
                          updateErr
                        );
                      } else {
                        let infoObj = {
                          agent_name: data.created_by.firstname
                            ? data.created_by.firstname
                            : "",
                          property_add: data.property_address,
                          end_date: endDate,
                        };
                        const options = {
                          from: Config.EMAIL_FROM, // sender address
                          to: data.created_by.email, // list of receivers
                          subject: "Rental lease Agreement Renewal", // Subject line
                          text: "Rental lease Agreement Renewal", // plaintext body
                        };
                        let mail_response = mail_helper.sendEmail(
                          options,
                          "Agreement_renewal_email",
                          infoObj
                        );

                        // send owner
                        let infoObjOwner = {
                          agent_name: data.owner_id.firstname
                            ? data.owner_id.firstname
                            : "",
                          property_add: data.property_address,
                          end_date: endDate,
                        };
                        const optionsOwner = {
                          from: Config.EMAIL_FROM, // sender address
                          to: data.owner_id.email, // list of receivers
                          subject: "Rental lease Agreement Renewal", // Subject line
                          text: "Rental lease Agreement Renewal", // plaintext body
                        };
                        let mail_response_owner = mail_helper.sendEmail(
                          optionsOwner,
                          "Agreement_renewal_email",
                          infoObjOwner
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
      console.log(
        "error :: Send email to when agreement is about to expire => ",
        error
      );
    }
  })();
}
