'use strict';

var mongoose = require('mongoose'),
  propertyModel = require('../models/Properties'),
  applicationModel = require('../models/Application'),
  reviewModel = require('../models/Reviews'),
  userModel = require('../models/Users'),
  propertyOwnerSchema = require('../models/PropertyOwner'),
  amenitiesModel = require('../models/Amenities'),
  documentsModel = require('../models/Documents'),
  identification_documentsModel = require('../models/Identification_documents'),
  maintenances = mongoose.model('maintenances'),
  agreements = mongoose.model('agreements'),
  Chats = mongoose.model('Chats'),
  async = require('async'),
  InvitationInfo = mongoose.model('invitations'),
  utility = require('../lib/utility.js'),
  Config = require('../../config/config.js'),
  validator = require('../../config/validator.js'),
  Constant = require('../../config/constant.js'),
  favourites = mongoose.model('favourites'),
  NodeGeocoder = require('node-geocoder'),
  reviews = mongoose.model('reviews'),
  application = mongoose.model('application'),
  moment = require('moment'),
  Groups = mongoose.model('Group'),
  thumb = require('node-thumbnail').thumb,
  csv = require("fast-csv"),
  randomString = require('random-string'),
  NotificationInfo = mongoose.model('Notification'),
  forEach = require('async-foreach').forEach,
  path = require('path');
var sendmail = require('sendmail')();
var bcrypt = require('bcrypt');
var salt = bcrypt.genSaltSync(10);
var changeCase = require('change-case');
var d = new Date();
var currentYear = d.getFullYear();
var waterfall = require('run-waterfall');
var formidable = require('formidable');
var fs = require('fs-extra');
var _ = require('underscore');
var moment = require('moment');
const uuidv4 = require('uuid/v4');
//GEOLOCATION SETTINGS
var options = {
  provider: 'google',
  // Optional depending on the providers
  httpAdapter: 'https', // Default
  apiKey: Constant.GOOGLE_API_KEY, // for Mapquest, OpenCage, Google Premier
  formatter: null // 'gpx', 'string', ...
};

/* Mailgun Email setup*/
var nodemailer = require('nodemailer');
var mg = require('nodemailer-mailgun-transport');

var nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');
const sharp = require('sharp');

var transporter = nodemailer.createTransport(smtpTransport({
  service: Config.SMTP.service,
  auth: {
    user: Config.SMTP.authUser,
    pass: Config.SMTP.authpass
  }
}));

module.exports = {
  getpropertyByid: getpropertyByid,
  createProperty: createProperty,
  createPropertyApplication: createPropertyApplication,
  getAllProperty: getAllProperty,
  getFaviouratePropertyList: getFaviouratePropertyList,
  getTenantedPropertyList: getTenantedPropertyList,
  getDatabaseProperty: getDatabaseProperty,
  getSingleProperty: getSingleProperty,
  getpropertyListByid: getpropertyListByid,
  getSalesProperty: getSalesProperty,
  createPropertyImage: createPropertyImage,
  deletePropertyById: deletePropertyById,
  getPropertyOwner: getPropertyOwner,
  addAmenites: addAmenites,
  updatePropertyById: updatePropertyById,
  savePropertyAsDraft: savePropertyAsDraft,
  getAmenites: getAmenites,
  addPropertyOwner: addPropertyOwner,
  uploadMobilePropertyImage: uploadMobilePropertyImage,
  getAcencyProperties: getAcencyProperties,
  getPropertyByAgentId: getPropertyByAgentId,
  importCSV: importCSV,
  getAllPropertyBySearch: getAllPropertyBySearch,
  uploadDocument: uploadDocument,
  uploadIdentificationDocument: uploadIdentificationDocument,
  getUploadedDocument: getUploadedDocument,
  getUploadedIdentificationDocument: getUploadedIdentificationDocument,
  addDocumentToFav: addDocumentToFav,
  getFavUploadedDocument: getFavUploadedDocument,
  deleteDocument: deleteDocument,
  deleteIdentificationDocument: deleteIdentificationDocument,
  admin_getAllProperty: admin_getAllProperty,
  admin_getSingleProperty: admin_getSingleProperty,
  adminGetUserUploadedDocument: adminGetUserUploadedDocument,
  uploadDocumentForChat: uploadDocumentForChat,
  getFileBySearch: getFileBySearch,
  getPropertyForAgentRemoval: getPropertyForAgentRemoval,
  getPropertyRelatedUser: getPropertyRelatedUser,
  getPropertyDataForUploadingDoc: getPropertyDataForUploadingDoc,
  addDocumentToTags: addDocumentToTags,
  checkUserAssociationWithProperty: checkUserAssociationWithProperty,
  getpropertyApplicationByPropertyid: getpropertyApplicationByPropertyid,
  getpropertyApplicationByid: getpropertyApplicationByid,
  updateapplicationStatus: updateapplicationStatus
};



/**
 * Function is use to all property details
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 */
function getAllProperty(req, res) {

  var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
  var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
  var request_by_id = (typeof req.body.request_by_id != 'undefined') ? req.body.request_by_id : '';
  var request_by_role = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';
  var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
  var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 100;

  var conditions = { "$and": [] };
  conditions["$and"].push({ "is_deleted": false });

  if ((request_by_role == Constant.RUN_STRATA_MANAGEMENT_COMPANY || request_by_role == Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY) && request_by_id)
    conditions["$and"].push({ "created_by": mongoose.Types.ObjectId(request_by_id) });

  if (request_by_role == Constant.OWN_AGENCY && agency_id)
    conditions["$and"].push({ "created_by_agency_id": agency_id });

  if (request_by_role == Constant.AGENT && user_id)
    conditions["$and"].push({ "created_by": user_id });

  if (request_by_role == Constant.OWNER && user_id)
    conditions["$and"].push({ "owned_by": user_id });

  if (request_by_role == Constant.TENANT && user_id) {

    var getAssociateProperty = function (user_id, callback) {
      InvitationInfo.find({ invited_to: mongoose.Types.ObjectId(user_id), deleted: false, status: true },
        { property_id: 1 }).sort({ createdAt: -1 }).exec(function (err, data) {
          if (err) {
            callback(err);
          } else {
            if (!data) {
              callback(null, []);
            } else {
              var property_id_arr = [];
              for (var i = 0; i < data.length; i++) {
                var property_id = mongoose.Types.ObjectId(data[i].property_id);
                property_id_arr.push(property_id);
              }
              callback(null, property_id_arr);
            }
          }
        });
    }

    getAssociateProperty(user_id, function (error, PropertyArr) {
      if (error) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
      } else if (!PropertyArr) {
        res.json({ code: Constant.SUCCESS_CODE, data: [] });
      } else {
        waterfall([
          function (callback) {
            propertyModel.find({ _id: { $in: PropertyArr }, save_as_draft: false, is_deleted: false })
              .populate("owned_by", "firstname lastname image")
              .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
              .sort({ created: -1 }).exec(function (err, property) {
                if (err) {
                  callback(err);
                } else {
                  callback(null, property);
                }
              });
          },
          function (arg1, callback) {
            var favArray = [];
            if (arg1.length > 0) {
              var newItem = JSON.stringify(arg1);
              var newItem = JSON.parse(newItem);
              async.each(newItem, function (item, asyncCall) {

                favourites.findOne({
                  "is_deleted": false,
                  "fav_to_property": mongoose.Types.ObjectId(item._id),
                  "fav_by": mongoose.Types.ObjectId(user_id)
                },
                  { fav_status: 1 })
                  .sort({ createdAt: -1 }).exec(function (err, fav) {
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
              }, function (err) {
                if (err) {
                  callback(err);
                } else {
                  callback(null, newItem);
                }
              });
            } else {
              callback(null, arg1);
            }
          },
        ], function (err, result) {
          if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
          } else {
            res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
          }
        });
      }
    });
  }

  else if (request_by_role == Constant.TRADER && user_id) {

    var getAssociateProperty = function (user_id, callback) {

      maintenances.find({ trader_id: mongoose.Types.ObjectId(user_id), deleted: false, is_forward: true }, { property_id: 1 })
        .limit(parseInt(number_of_pages)).sort({ createdAt: -1 }).exec(function (err, data) {
          if (err) {
            callback(err);
          } else {
            if (!data) {
              callback(null, []);
            } else {
              var property_id_arr = [];
              for (var i = 0; i < data.length; i++) {
                var property_id = mongoose.Types.ObjectId(data[i].property_id);
                property_id_arr.push(property_id);
              }
              callback(null, property_id_arr);
            }
          }
        });
    }

    getAssociateProperty(user_id, function (error, PropertyArr) {
      if (error) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
      } else if (!PropertyArr) {
        res.json({ code: Constant.SUCCESS_CODE, data: [] });
      } else {
        waterfall([
          function (callback) {
            propertyModel.find({ _id: { $in: PropertyArr }, save_as_draft: false, is_deleted: false })
              .populate("owned_by", "firstname lastname image")
              .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
              .sort({ created: -1 }).exec(function (err, property) {
                if (err) {
                  callback(err);
                } else {
                  callback(null, property);
                }
              });
          },
          function (arg1, callback) {
            var favArray = [];
            if (arg1.length > 0) {
              var newItem = JSON.stringify(arg1);
              var newItem = JSON.parse(newItem);
              async.each(newItem, function (item, asyncCall) {
                favourites.findOne({
                  "is_deleted": false,
                  "fav_to_property": mongoose.Types.ObjectId(item._id),
                  "fav_by": mongoose.Types.ObjectId(user_id)
                },
                  { fav_status: 1 })
                  .sort({ createdAt: -1 }).exec(function (err, fav) {
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
              }, function (err) {
                if (err) {
                  callback(err);
                } else {
                  callback(null, newItem);
                }
              });
            } else {
              callback(null, arg1);
            }
          },
        ], function (err, result) {
          if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
          } else {
            res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
          }
        });
      }
    });
  }
  else {
    waterfall([
      function (callback) {
        propertyModel.find(conditions)
          .populate("owned_by", "firstname lastname image")
          .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
          .sort({ created: -1 }).exec(function (err, property) {
            if (err) {
              callback(err);
            } else {
              callback(null, property);
            }
          });
      },
      function (arg1, callback) {
        var favArray = [];
        if (arg1.length > 0) {
          var newItem = JSON.stringify(arg1);
          var newItem = JSON.parse(newItem);

          async.each(newItem, function (item, asyncCall) {
            favourites.findOne({
              "is_deleted": false,
              "fav_to_property": mongoose.Types.ObjectId(item._id),
              "fav_by": mongoose.Types.ObjectId(user_id)
            },
              { fav_status: 1 })
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
          }, function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, newItem);
            }
          });
        } else {
          callback(null, arg1);
        }
      },

      function (arg2, callback) {
        var favArray = [];
        if (arg2.length > 0) {
          var newItem1 = JSON.stringify(arg2);
          var newItem1 = JSON.parse(newItem1);

          async.each(newItem1, function (item, asyncCall) {
            applicationModel.find({
              "is_deleted": false,
              "property_id": mongoose.Types.ObjectId(item._id),
              "status": 0
            })
              .exec(function (err, application) {
                // console.log("Length : ", application.length);
                if (err) {
                  item.application_count = 0;
                  favArray.push(item);
                  asyncCall(null, favArray);
                } else {
                  item.application_count = application.length;
                  favArray.push(item);
                  asyncCall(null, favArray);
                }
              });
          }, function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, newItem1);
            }
          });
        } else {
          callback(null, arg2);
        }
      },


    ], function (err, result) {

      result = result.map((r) => {
        var isFeatured = false;
        r.image = r.image.map((i) => {
          if (i.isFeatured) {
            isFeatured = true;
          }
          return i;
        });
        if (!isFeatured && r.image && r.image.length > 0) {
          r.image[0].isFeatured = true;
        }
        return r;
      });
      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      } else {
        res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
      }
    });
  }
}
/**
 * Function is use to get listing property
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 */
function getSalesProperty(req, res) {
  var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
  var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
  var request_by_role = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';
  var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
  var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 100;

  var conditions = { "$or": [], "$and": [] };
  conditions["$and"].push({ "is_deleted": false, "save_as_draft": false });

  conditions["$or"].push({ "property_category": 'sale' });
  // conditions["$or"].push({"property_category" : 'rental'});
  if (request_by_role == Constant.OWN_AGENCY && agency_id)
    conditions["$and"].push({ "created_by_agency_id": agency_id });
  if (request_by_role == Constant.AGENT && user_id)
    conditions["$and"].push({ "created_by": user_id });
  if (request_by_role == Constant.OWNER && user_id)
    conditions["$and"].push({ "owned_by": user_id });
  //console.log("PropertyArr",conditions);
  if (request_by_role == Constant.TENANT && user_id) {
    var getAssociateProperty = function (user_id, callback) {
      InvitationInfo.find({ invited_to: mongoose.Types.ObjectId(user_id), deleted: false, status: true, invitation_status: 2 }, { property_id: 1 }, function (err, data) {
        if (err) {
          callback(err);
        } else {
          if (!data) {
            callback(null, []);
          } else {
            var property_id_arr = [];
            for (var i = 0; i < data.length; i++) {
              var property_id = mongoose.Types.ObjectId(data[i].property_id);
              property_id_arr.push(property_id);
            }
            callback(null, property_id_arr);
          }
        }
      });
    }
    waterfall([
      function (callback) {
        getAssociateProperty(user_id, function (error, PropertyArr) {
          // console.log("PropertyArr",PropertyArr);
          if (error) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
          } else if (!PropertyArr) {
            res.json({ code: Constant.SUCCESS_CODE, data: [] });
          } else {
            propertyModel.find({ _id: { $in: PropertyArr }, save_as_draft: false, is_deleted: false })
              .populate("owned_by", "firstname lastname image")
              .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
              .sort({ created: -1 }).exec(function (err, property) {
                if (err) {
                  callback(err);
                } else {
                  callback(null, property);
                }
              });
          }
        });
      },
      function (arg1, callback) {
        var favArray = [];
        if (arg1.length > 0) {
          var newItem = JSON.stringify(arg1);
          var newItem = JSON.parse(newItem);

          async.each(newItem, function (item, asyncCall) {
            favourites.findOne({
              "is_deleted": false,
              "fav_to_property": mongoose.Types.ObjectId(item._id),
              "fav_by": mongoose.Types.ObjectId(user_id)
            },
              { fav_status: 1 })
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
          }, function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, newItem);
            }
          });
        } else {
          callback(null, arg1);
        }
      },
    ], function (err, result) {
      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      } else {
        res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
      }
    });
  } else {
    waterfall([
      function (callback) {
        propertyModel.find(conditions)
          .populate("owned_by", "firstname lastname image")
          .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
          .sort({ created: -1 }).exec(function (err, property) {
            if (err) {
              callback(err);
            } else {
              callback(null, property);
            }
          });
      },
      function (arg1, callback) {
        var favArray = [];
        if (arg1.length > 0) {
          var newItem = JSON.stringify(arg1);
          var newItem = JSON.parse(newItem);

          async.each(newItem, function (item, asyncCall) {
            favourites.findOne({
              "is_deleted": false,
              "fav_to_property": mongoose.Types.ObjectId(item._id),
              "fav_by": mongoose.Types.ObjectId(user_id)
            },
              { fav_status: 1 })
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
          }, function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, newItem);
            }
          });
        } else {
          callback(null, arg1);
        }
      },
    ], function (err, result) {
      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      } else {
        res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
      }
    });
  }
}
/**
 * Function is use to all property details
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 */
function getDatabaseProperty(req, res) {
  var page_number = (req.body.current_page) ? parseInt(req.body.current_page) - 1 : 0;
  var number_of_pages = (req.body.number_of_pages) ? parseInt(req.body.number_of_pages) : 100;
  var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';

  waterfall([
    function (callback) {
      propertyModel.find({ "is_deleted": false, "save_as_draft": false })
        .populate("owned_by", "firstname lastname image")
        .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
        .sort({ created: -1 }).exec(function (err, property) {
          if (err) {
            callback(err);
          } else {
            callback(null, property);
          }
        });
    },
    function (arg1, callback) {
      var favArray = [];
      if (arg1.length > 0) {
        var newItem = JSON.stringify(arg1);
        var newItem = JSON.parse(newItem);
        async.each(newItem, function (item, asyncCall) {
          favourites.findOne({
            "is_deleted": false,
            "fav_to_property": mongoose.Types.ObjectId(item._id),
            "fav_by": mongoose.Types.ObjectId(user_id)
          },
            { fav_status: 1 })
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
        }, function (err) {
          if (err) {
            callback(err);
          } else {
            callback(null, newItem);
          }
        });
      } else {
        callback(null, arg1);
      }
    },
  ], function (err, result) {
    if (err) {
      res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
    } else {
      res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
    }
  });
}


/**
 * [Add Faviourate - Get Faviourate Property list ]
 * @param  {object} req
 * @param  {object} res
 */
function getFaviouratePropertyList(req, res) {

  var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
  var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
  var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 100;

  if (user_id) {
    var getAssociateProperty = function (user_id, callback) {
      favourites.find({ "is_deleted": false, fav_status: 1, fav_by: mongoose.Types.ObjectId(user_id) }, { fav_to_property: 1 }, function (err, data) {
        // console.log('  err', err);
        // console.log('  data', data);
        if (err) {
          callback(err);
        } else {
          if (!data) {
            callback(null, []);
          } else {
            var property_id_arr = [];
            for (var i = 0; i < data.length; i++) {
              var property_id = mongoose.Types.ObjectId(data[i].fav_to_property);
              property_id_arr.push(property_id);
            }
            callback(null, property_id_arr);
          }
        }
      });
    }

    getAssociateProperty(user_id, function (error, PropertyArr) {

      if (error) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
      } else if (!PropertyArr) {
        res.json({ code: Constant.SUCCESS_CODE, data: [] });
      } else {
        propertyModel.find({ _id: { $in: PropertyArr }, save_as_draft: false, is_deleted: false })
          .populate("owned_by", "firstname lastname image")
          .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
          .sort({ created: -1 }).exec(function (err, property) {
            // console.log(' property  err', err);
            // console.log(' property  property', property);
            if (err) {
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.ERROR_RETRIVING_DATA
              });
            } else {
              res.json({
                code: 200,
                message: Constant.PROPERTY_SUCCESS_GOT_DATA,
                data: property
              });
            }
          });
      }
    });
  } else {
    res.json({
      code: Constant.ERROR_CODE,
      message: Constant.ERROR_RETRIVING_DATA
    });
  }

}


/**
 * [Add Favourate - Get Tenanted Property list ]
 * @param  {object} req
 * @param  {object} res
 */
function getTenantedPropertyList(req, res) {

  var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
  var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
  var request_by_role = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';
  var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
  var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 100;

  var conditions = { "$or": [], "$and": [] };
  conditions["$and"].push({ "is_deleted": false, "save_as_draft": false });
  //conditions["$or"].push({"property_category":'sale'});
  conditions["$or"].push({ "property_category": 'rental' });

  if (request_by_role == Constant.OWN_AGENCY && agency_id)
    conditions["$and"].push({ "created_by_agency_id": agency_id });
  if (request_by_role == Constant.AGENT && user_id)
    conditions["$and"].push({ "created_by": user_id });
  if (request_by_role == Constant.OWNER && user_id)
    conditions["$and"].push({ "owned_by": user_id });
  //console.log("PropertyArr",conditions);
  if (request_by_role == Constant.TENANT && user_id) {
    var getAssociateProperty = function (user_id, callback) {
      InvitationInfo.find({ invited_to: mongoose.Types.ObjectId(user_id), deleted: false, status: true, invitation_status: 2 }, { property_id: 1 }, function (err, data) {
        if (err) {
          callback(err);
        } else {
          if (!data) {
            callback(null, []);
          } else {
            var property_id_arr = [];
            for (var i = 0; i < data.length; i++) {
              var property_id = mongoose.Types.ObjectId(data[i].property_id);
              property_id_arr.push(property_id);
            }
            callback(null, property_id_arr);
          }
        }
      });
    }
    waterfall([
      function (callback) {
        getAssociateProperty(user_id, function (error, PropertyArr) {
          // console.log("PropertyArr",PropertyArr);
          if (error) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
          } else if (!PropertyArr) {
            res.json({ code: Constant.SUCCESS_CODE, data: [] });
          } else {
            propertyModel.find({ _id: { $in: PropertyArr }, save_as_draft: false, is_deleted: false })
              .populate("owned_by", "firstname lastname image")
              .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
              .sort({ created: -1 }).exec(function (err, property) {
                if (err) {
                  callback(err);
                } else {
                  callback(null, property);
                }
              });
          }
        });
      },
      function (arg1, callback) {
        var favArray = [];
        if (arg1.length > 0) {
          var newItem = JSON.stringify(arg1);
          var newItem = JSON.parse(newItem);

          async.each(newItem, function (item, asyncCall) {
            favourites.findOne({
              "is_deleted": false,
              "fav_to_property": mongoose.Types.ObjectId(item._id),
              "fav_by": mongoose.Types.ObjectId(user_id)
            },
              { fav_status: 1 })
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
          }, function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, newItem);
            }
          });
        } else {
          callback(null, arg1);
        }
      },
    ], function (err, result) {

      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      } else {
        result = result.map((r) => {
          var isFeatured = false;
          r.image = r.image.map((i) => {
            if (i.isFeatured) {
              isFeatured = true;
            }
            return i;
          });
          if (!isFeatured && r.image && r.image.length > 0) {
            r.image[0].isFeatured = true;
          }
          return r;
        });


        res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
      }
    });
  } else {
    waterfall([
      function (callback) {
        propertyModel.find(conditions)
          .populate("owned_by", "firstname lastname image")
          .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
          .sort({ created: -1 }).exec(function (err, property) {
            if (err) {
              callback(err);
            } else {
              callback(null, property);
            }
          });
      },
      function (arg1, callback) {
        var favArray = [];
        if (arg1.length > 0) {
          var newItem = JSON.stringify(arg1);
          var newItem = JSON.parse(newItem);

          async.each(newItem, function (item, asyncCall) {
            favourites.findOne({
              "is_deleted": false,
              "fav_to_property": mongoose.Types.ObjectId(item._id),
              "fav_by": mongoose.Types.ObjectId(user_id)
            },
              { fav_status: 1 })
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
          }, function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, newItem);
            }
          });
        } else {
          callback(null, arg1);
        }
      },
    ], function (err, result) {

      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      } else {

        result = result.map((r) => {
          var isFeatured = false;
          r.image = r.image.map((i) => {
            if (i.isFeatured) {
              isFeatured = true;
            }
            return i;
          });
          if (!isFeatured && r.image && r.image.length > 0) {
            r.image[0].isFeatured = true;
          }
          return r;
        });

        res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
      }
    });
  }
}


/**
 * Function is use to all property details
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 */
function getAllPropertyBySearch(req, res) {

  var propertyType = (req.body.property_type) ? req.body.property_type : '';
  var searchType = (req.body.address) ? req.body.address : '';
  var property_id = (req.body.property_id) ? req.body.property_id : '';
  var city = (req.body.city) ? req.body.city : '';
  var state = (req.body.state) ? req.body.state : '';
  var property_name = (req.body.property_name) ? req.body.property_name : '';
  var login_id = req.body.login_id ? req.body.login_id : '';
  var temp_arr = [];


  var conditions = { "$and": [] };
  conditions["$and"].push({ "is_deleted": false });
  conditions["$and"].push({ "save_as_draft": false });

  if (searchType) {
    conditions["$and"].push(
      {
        "$or": [{ "address": new RegExp(searchType, "i") },
        //{"property_id": searchType}, 
        { "property_name": new RegExp(searchType, "i") }]
      }
    )
  }
  if (req.body.created) {
    var start = moment(req.body.created).startOf('day').format(); // set to 12:00 am today
    var end = moment(req.body.created).endOf('day').format(); // set to 23:59 pm today
    conditions["$and"].push({ "created": { '$gte': new Date(start), '$lte': new Date(end) } });
  }

  if (propertyType)
    conditions["$and"].push({ "property_type": propertyType });
  if (city)
    conditions["$and"].push({ "city": new RegExp(city, "i") });
  if (state)
    conditions["$and"].push({ "state": new RegExp(state, "i") });
  if (property_name)
    conditions["$and"].push({ "property_name": new RegExp(property_name, "i") });


  propertyModel.find(conditions).populate('owned_by').exec(function (err, withoutSaveAsDraftProperty) {
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.ERROR_RETRIVING_DATA
      });
    } else {
      conditions.$and[1].save_as_draft = true;
      conditions["$and"].push({ "created_by": login_id });
      propertyModel.find(conditions).populate('owned_by').exec(function (err, saveAsDraftProperty) {
        if (err) {
          res.json({
            code: Constant.ERROR_CODE,
            message: Constant.ERROR_RETRIVING_DATA
          });
        } else {
          let property = withoutSaveAsDraftProperty.concat(saveAsDraftProperty);
          res.json({
            code: 200,
            message: Constant.PROPERTY_SUCCESS_GOT_DATA,
            data: property
          });
        }
      });
    }
  });
}

function getAcencyProperties(req, res) {

  var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
  var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';

  if (agency_id) {

    var request_by_role = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';
    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 100;

    var conditions = { "$and": [] };
    conditions["$and"].push({ "is_deleted": false, "save_as_draft": false });
    conditions["$and"].push({ "created_by_agency_id": agency_id });

    // console.log('conditions',conditions)
    waterfall([
      function (callback) {
        propertyModel.find(conditions)
          .populate("owned_by", "firstname lastname image")
          .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
          .sort({ created: -1 }).exec(function (err, property) {
            if (err) {
              callback(err);
            } else {
              callback(null, property);
            }
          });
      },
      function (arg1, callback) {
        var favArray = [];
        if (arg1.length > 0) {
          async.each(arg1, function (item, asyncCall) {
            var newItem = JSON.stringify(item);
            var newItem = JSON.parse(newItem);
            //console.log("user_id",user_id,"item._id",item._id);
            favourites.findOne({
              "is_deleted": false,
              "fav_to_property": mongoose.Types.ObjectId(item._id),
              "fav_by": mongoose.Types.ObjectId(user_id)
            },
              { fav_status: 1 })
              .sort({ createdAt: -1 }).exec(function (err, fav) {
                if (err) {
                  newItem.is_fav = 2;
                  favArray.push(newItem);
                  asyncCall(null, favArray);
                } else {
                  if (fav) {
                    newItem.is_fav = fav.fav_status;
                    favArray.push(newItem);
                    asyncCall(null, favArray);
                  } else {
                    newItem.is_fav = 2;
                    favArray.push(newItem);
                    asyncCall(null, favArray);
                  }
                }
              });
          }, function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, favArray);
            }
          });
        } else {
          callback(null, arg1);
        }
      },
    ], function (err, result) {
      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      } else {
        res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
      }
    });
  }
}

/*  @api : createProperty
 *  @author  :  
 *  @created  : 
 *  @modified :
 *  @purpose  : To post the Propert.
 */
function createProperty(req, res) {
  var formData = {};
  if (req.body) {
    var query = {
      _id: req.body._id,
      is_deleted: false,
      //save_as_draft: true
    }
    delete req.body._id;
    req.body.save_as_draft = false;
    var chars = "123456789";
    var pid = '';
    for (var x = 0; x < 9; x++) {
      var i = Math.floor(Math.random() * chars.length);
      pid += chars.charAt(i);
    }
    req.body.property_id = pid;
    propertyModel.findOneAndUpdate(query, req.body, { new: true, runValidators: true }, function (err, propertyData) {
      if (err) {
        // console.log("err : ", err);
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.PROPERTY_CREATE_UNSUCCESS
        });
      } else {
        if (propertyData) {
          // console.log(propertyData);
          res.json({
            code: Constant.SUCCESS_CODE,
            data: propertyData,
            message: Constant.PROPERTY_CREATE_SUCCESS,
          });
        } else {
          req.body.save_as_draft = false;
          var property = new propertyModel(req.body);
          property.save(function (err, propertyData) {
            if (err) {
              // console.log("err :::::  ", err);
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.PROPERTY_CREATE_UNSUCCESS
              });
            } else {
              res.json({
                code: Constant.SUCCESS_CODE,
                data: propertyData,
                message: Constant.PROPERTY_CREATE_SUCCESS,
              });
            }
          });
        }
      }
    });
  } else {
    res.json({
      code: Constant.ERROR_CODE,
      message: Constant.NOT_PROPER_DATA
    });
  }
}

/*  @api : createPropertyApplication
 *  @author  :  KEK
 *  @created  : 
 *  @modified :
 *  @purpose  : To post the application for Property
 */
function createPropertyApplication(req, res) {

  if (req.body) {

    req.body.created_by = mongoose.Types.ObjectId(req.body.created_by);
    req.body.property_id = mongoose.Types.ObjectId(req.body.property_id);

    if (!req.body.document_status && req.body.document_id) {
      forEach(req.body.document_id, function (item, key) {
        req.body.document_id[key] = mongoose.Types.ObjectId(item);
      });
    }

    var agent_ids = req.body.agent_ids;
    var first_name = req.body.first_name;
    var last_name = req.body.last_name;
    var property_address = req.body.property_address;

    delete req.body.agent_ids;
    delete req.body.first_name;
    delete req.body.last_name;
    delete req.body.property_address;
    var application = new applicationModel(req.body);

    application.save(function (err, applicationData) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.PROPERTY_CREATE_UNSUCCESS
        });
      } else {

        var obj2 = {};
        obj2.subject = "You have received a new application.";
        obj2.message = "A new application request is added on " + moment().format("MMMM Do YYYY") + " by " + first_name + " " + last_name + " for the Property " + property_address;

        obj2.from_user = mongoose.Types.ObjectId(req.body.created_by);
        var to_users = [];
        if (agent_ids) {
          agent_ids.map(function (agent_loop) {
            // console.log(agent_loop);
            to_users.push({ "users_id": mongoose.Types.ObjectId(agent_loop) });
          });
        }
        obj2.to_users = to_users;
        obj2.type = Constant.NOTIFICATION_TYPE_APPLICATION;
        obj2.application_id = applicationData._id;
        obj2.module = 8;
        var notification = new NotificationInfo(obj2);
        notification.save(function (err, notData) {
          if (err) {
            // console.log("Error to send Notification");
          } else {
            // console.log("Success");
          }
        });

        res.json({
          code: Constant.SUCCESS_CODE,
          data: applicationData,
          message: Constant.PROPERTY_APPLICATION_CREATE_SUCCESS,
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

/*  @api : createProperty
 *  @author  :  
 *  @created  : 
 *  @modified :
 *  @purpose  : To post the Propert.
 */
function createPropertyImage(req, res) {
  var formData = {};
  var outputJSON = {};
  var propertySavedObj = {};
  var validFileExt = ['jpeg', 'jpg', 'png', 'gif'];
  waterfall([
    function (callback) {
      var uploaded_file = req.swagger.params.file.value;
      formData = {};
      var file = uploaded_file;
      // console.log('file.size', file.size);
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
        var dir = './api/uploads/property';
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
    function (filename, callback) {
      thumb({
        source: './api/uploads/property/' + filename, // could be a filename: dest/path/image.jpg
        destination: './api/uploads/property/thumb',
        prefix: '',
        suffix: '',
        digest: false,
        hashingType: 'sha1', // 'sha1', 'md5', 'sha256', 'sha512'
        width: 460,
        overwrite: false,
        ignore: false,
      }, function (files, err, stdout, stderr) {
      });
      callback(null, filename);
    },
    function (formData, callback) {
      var updateImage = [];
      var imageData = {};
      propertySavedObj._id = req.body._id;
      if (propertySavedObj._id) {
        var field = "";
        var query = {
          _id: propertySavedObj._id
        };
        delete formData._id;
        propertyModel.findOne(query, function (err, data) {
          // console.log('data',data); 
          if (err) {
            callback(err, null);
          } else {
            if (!data.image) {
              data.image = [];
            }

            if (req.body.isFeatured && req.body.isFeatured == "true") {
              data.image.push({
                'path': formData,
                'isFeatured': true
              });
            } else {
              data.image.push({
                'path': formData
              });
            }
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
  ], function (err, propertyData) {
    if (err) {
      outputJSON = {
        code: Constant.ERROR_CODE,
        message: err
      };
    } else {
      outputJSON = {
        code: Constant.SUCCESS_CODE,
        data: propertyData,
        message: Constant.PROPERTY_CREATE_SUCCESS,
      };
    }
    res.jsonp(outputJSON);
  });
}

/*  @api : getpropertyByid
 *  @author  :  
 *  @created  : 
 *  @modified :
 *  @purpose  : To get the property by Id.
 */
function getpropertyByid(req, res) {
  var limit = req.body.limit ? parseInt(req.body.limit) : {};
  var sortby = req.body.sortby ? req.body.sortby : {};
  var outputJSON = {};
  var query = {
    '_id': req.body.propertyId,
    is_deleted: false
    // is_approved: true
  };

  propertyModel.findOne(query).limit(parseInt(limit))
    .populate('owner_id').sort({
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
/*  @api : getpropertyByid
 *  @author  :  
 *  @created  : 
 *  @modified :
 *  @purpose  : To get the property by Id.
 */
function getpropertyListByid(req, res) {
  var limit = req.body.length || 50;
  limit = parseInt(limit);
  var skip = [parseInt(req.body.start) * limit] - limit;
  skip = parseInt(skip);
  var sortby = req.body.sortby ? req.body.sortby : {};
  var outputJSON = {};
  var query = {
    'owner_id': req.body.owner_id,
    is_deleted: false
  };
  propertyModel.find(query).limit(parseInt(limit)).skip(skip).populate('owner_id', 'firstname,lastname,_id').sort({
    _id: -1
  }).exec(function (err, propetyList) {
    if (err) {
      outputJSON = {
        'code': Constant.ERROR_CODE,
        'message': Constant.ERROR_RETRIVING_DATA
      };
    } else {
      outputJSON = {
        'code': Constant.SUCCESS_CODE,
        'message': Constant.PROPERTY_RETRIEVE_SUCCESS,
        'data': propetyList
      }
    }
    res.jsonp(outputJSON);
  });
}
/*  @api : getpropertyByid
 *  @author  :  
 *  @created  : 
 *  @modified :
 *  @purpose  : To get the property by Id.
 */
function getpropertyListByCreatedDate(req, res) {
  var limit = req.body.length || 50;
  limit = parseInt(limit);
  var skip = [parseInt(req.body.start) * limit] - limit;
  skip = parseInt(skip);
  var sortby = req.body.sortby ? req.body.sortby : {};
  var outputJSON = {};
  var query = {
    'owner_id': req.body.owner_id,
    is_deleted: false,
    is_approved: true
  };
  propertyModel.find(query).limit(parseInt(limit)).sort('createdDate:' - 1).skip(skip).populate('owner_id', 'firstname,lastname,_id').sort({
    _id: -1
  }).exec(function (err, propetyList) {
    if (err) {
      outputJSON = {
        'code': Constant.ERROR_CODE,
        'message': Constant.messages.errorRetreivingData
      };
    } else {
      outputJSON = {
        'code': Constant.SUCCESS_CODE,
        'message': Constant.PROPERTY_RETRIEVE_SUCCESS,
        'data': propetyList
      }
    }
    res.jsonp(outputJSON);
  });
}

/**
 * Function is use to get landing page properting based on type sale
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 3-Aug-2017
 */

function getPropertyOnTypeSale(req, res) {
  propertyModel.find({
    'type': 'sale',
    "is_deleted": false,
    "is_approved": true
  }).sort({
    '_id': -1
  }).exec(function (err, saleProperty) {
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.ERROR_RETRIVING_DATA
      });
    } else if (saleProperty && saleProperty.length) {
      var propertyLimit = [];
      var address = [];
      var zipcode = [];
      var type = [];
      var property = [];
      var bedRoomCount = [];
      var bathRoomCount = [];
      var floorCount = [];
      var length = saleProperty.length;
      address = _.pluck(saleProperty, 'address');
      zipcode = _.pluck(saleProperty, 'address');
      type = _.pluck(saleProperty, 'type');
      floorCount = _.pluck(saleProperty, 'floor_level');
      bedRoomCount = _.pluck(saleProperty, 'bedroom_count');
      bathRoomCount = _.pluck(saleProperty, 'bathroom_count');
      var addresslength = _.uniq(address).length;
      var zipcodelength = _.uniq(zipcode).length;
      var typelength = _.uniq(type).length;
      var floorlength = _.uniq(address).length;
      var bathlength = _.uniq(zipcode).length;
      var bedlength = _.uniq(type).length;
      var typelength = type.length;
      var bathlength = _.uniq(zipcode).length;
      if ((addresslength === length) && (zipcodelength === length) && (typelength === length) && (floorlength === length) && (bathlength === length) && (bedlength === length)) {
        //console.log("matched");
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.PROPERTY_SUCCESS_RENTAL_DATA,
          data: saleProperty
        });
      } else {
        var i;
        for (i = 0; i < saleProperty.length; i++) {
          if (address[i] === address[i + 1]) {
            if (zipcode[i] === zipcode[i + 1]) {
              if (floorCount[i] === floorCount[i + 1]) {
                if (bedRoomCount[i] === bedRoomCount[i + 1]) {
                  if (bathRoomCount[i] === bathRoomCount[i + 1]) { } else {
                    property.push(saleProperty[i]);
                  }

                } else {
                  property.push(saleProperty[i]);
                }
              } else {
                property.push(saleProperty[i]);
              }
            } else {
              property.push(saleProperty[i]);
            }

          } else {
            property.push(saleProperty[i]);
          }
        }
        propertyLimit = _.first(property, 6)
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.PROPERTY_SUCCESS_RENTAL_DATA,
          data: propertyLimit
        })
      }

    } else {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.ERROR_RETRIVING_DATA
      });
    }

  });
}

/**
 * Function is use to get landing page properting based on type rental with limit 6
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 3-Aug-2017
 */

function getPropertyOnTypeRental(req, res) {
  propertyModel.find({
    'type': 'rental',
    "is_deleted": false,
    "is_approved": true
  }).sort({
    '_id': -1
  }).exec(function (err, propertyList) {
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.ERROR_RETRIVING_DATA
      });
    } else if (propertyList && propertyList.length) {
      var propertyLimit = [];
      var address = [];
      var zipcode = [];
      var type = [];
      var property = [];
      var bedRoomCount = [];
      var bathRoomCount = [];
      var floorCount = [];
      var length = propertyList.length;
      address = _.pluck(propertyList, 'address');
      zipcode = _.pluck(propertyList, 'address');
      type = _.pluck(propertyList, 'type');
      floorCount = _.pluck(propertyList, 'floor_level');
      bedRoomCount = _.pluck(propertyList, 'bedroom_count');
      bathRoomCount = _.pluck(propertyList, 'bathroom_count');
      var addresslength = _.uniq(address).length;
      var zipcodelength = _.uniq(zipcode).length;
      var typelength = _.uniq(type).length;
      var floorlength = _.uniq(address).length;
      var bathlength = _.uniq(zipcode).length;
      var bedlength = _.uniq(type).length;
      var typelength = type.length;
      var bathlength = _.uniq(zipcode).length;
      if ((addresslength === length) && (zipcodelength === length) && (typelength === length) && (floorlength === length) && (bathlength === length) && (bedlength === length)) {
        //console.log("matched");
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.PROPERTY_SUCCESS_RENTAL_DATA,
          data: propertyList
        });
      } else {
        var i;
        for (i = 0; i < propertyList.length; i++) {
          if (address[i] === address[i + 1]) {
            if (zipcode[i] === zipcode[i + 1]) {
              if (floorCount[i] === floorCount[i + 1]) {
                if (bedRoomCount[i] === bedRoomCount[i + 1]) {
                  if (bathRoomCount[i] === bathRoomCount[i + 1]) {

                  } else {
                    property.push(propertyList[i]);
                  }

                } else {
                  property.push(propertyList[i]);
                }
              } else {
                property.push(propertyList[i]);
              }
            } else {
              property.push(propertyList[i]);
            }

          } else {
            property.push(propertyList[i]);
          }
        }
        propertyLimit = _.first(property, 6)
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.PROPERTY_SUCCESS_RENTAL_DATA,
          data: propertyLimit
        })
      }
    } else {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.ERROR_RETRIVING_DATA
      });
    }

  });
}

/**
 * Function is use to get landing page properting based on type rental
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 3-Aug-2017
 */

function getPropertyOnTypeAllRental(req, res) {
  propertyModel.find({
    'type': 'rental',
    "is_deleted": false,
    "is_approved": true
  }).sort({
    '_id': -1
  }).exec(function (err, propertylist) {
    var date = [],
      i;
    var property = [],
      property2 = [];
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.ERROR_RETRIVING_DATA
      });
    } else if (propertylist && propertylist.length) {
      var address = [];
      var zipcode = [];
      var type = [];
      var property = [];
      var bedRoomCount = [];
      var bathRoomCount = [];
      var floorCount = [];
      var length = propertylist.length;
      address = _.pluck(propertylist, 'address');
      zipcode = _.pluck(propertylist, 'address');
      type = _.pluck(propertylist, 'type');
      floorCount = _.pluck(propertylist, 'floor_level');
      bedRoomCount = _.pluck(propertylist, 'bedroom_count');
      bathRoomCount = _.pluck(propertylist, 'bathroom_count');
      var addresslength = _.uniq(address).length;
      var zipcodelength = _.uniq(zipcode).length;
      var typelength = _.uniq(type).length;
      var floorlength = _.uniq(address).length;
      var bathlength = _.uniq(zipcode).length;
      var bedlength = _.uniq(type).length;
      var typelength = type.length;
      var bathlength = _.uniq(zipcode).length;
      if ((addresslength === length) && (zipcodelength === length) && (typelength === length) && (floorlength === length) && (bathlength === length) && (bedlength === length)) {
        //("matched");
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.PROPERTY_SUCCESS_RENTAL_DATA,
          data: propertylist
        });
      } else {
        var i;
        for (i = 0; i < propertylist.length; i++) {
          if (address[i] === address[i + 1]) {
            if (zipcode[i] === zipcode[i + 1]) {
              if (floorCount[i] === floorCount[i + 1]) {
                if (bedRoomCount[i] === bedRoomCount[i + 1]) {
                  if (bathRoomCount[i] === bathRoomCount[i + 1]) {

                  } else {
                    property.push(propertylist[i]);
                  }

                } else {
                  property.push(propertylist[i]);
                }
              } else {
                property.push(propertylist[i]);
              }
            } else {
              property.push(propertylist[i]);
            }

          } else {
            property.push(propertylist[i]);
          }
        }
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.PROPERTY_SUCCESS_RENTAL_DATA,
          data: property
        })
      }
    } else {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.ERROR_RETRIVING_DATA
      });
    }

  });
}


/**
 * Function is use to get single  property
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 3-Aug-2017
 */

function getSingleProperty(req, res) {
  var geocoder = NodeGeocoder(options);

  waterfall([
    function (callback) {
      propertyModel.find({ '_id': req.body.propertyId, "is_deleted": false }).
        populate({ path: 'created_by_agency_id', select: 'name', populate: { path: 'principle_id' } }).
        populate('owner_id', 'firstname lastname image createdAt country state city address mobile_no').
        populate('created_by', 'firstname lastname image createdAt country state city address mobile_no is_online email')
        .exec(function (err, property) {
          if (err) {
            callback(err);
          } else if (property && property.length) {
            callback(null, property);
          } else {
            callback(Constant.ERROR_RETRIVING_DATA);
          }
        });
    },
    function (arg, callback) {
      if (arg.length > 0) {
        var finalResponse1 = [];
        async.each(arg, function (items, asyncCall) {
          if (typeof items.address != 'undefined' && items.address != '') {
            geocoder.geocode(items.address).then(function (res) {
              items.latitude = (res[0].latitude) ? res[0].latitude : '';
              items.longitude = (res[0].longitude) ? res[0].longitude : '';
              finalResponse1.push(items);
              asyncCall(null, finalResponse1);
            })
          } else {
            asyncCall(null, arg);
          }

        }, function (err) {
          if (err) {
            callback(err);
          } else {
            callback(null, arg);
          }
        });
      } else {
        callback(null, []);
      }
    },
    function (arg1, callback) {

      if (arg1.length > 0) {
        var finalResponse = [];
        async.each(arg1, function (item, asyncCall) {
          reviews.find({ 'review_to': item.created_by._id, "is_deleted": false }).exec(function (err, reviews) {
            var totalReviewLength = reviews.length;
            //console.log("reviews",reviews);
            if (reviews.length > 0) {
              var temp = 0;
              async.each(reviews, function (innerItem, asyncCallInner) {
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
          });
        }, function (err) {
          if (err) {
            callback(err);
          } else {
            callback(null, arg1);
          }
        });
      } else {
        callback(null, []);
      }
    }
  ], function (err, result) {
    if (err) {
      res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
    } else {
      res.json({ code: 200, data: result });
    }
  });
}
/**
 * Function is use to delete property
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 18-July-2017
 */
function deletePropertyById(req, res) {
  propertyModel.update({
    '_id': req.body.propertyId
  }, {
    $set: {
      "is_deleted": true
    }
  }, function (err, property) {
    if (err) {
      res.json({
        code: 400,
        message: Constant.PROPERTY_DELETE_UNSUCCESS
      });
    } else {
      return res.json({
        code: 200,
        message: Constant.PROPERTY_DELETE_SUCCESS,
        data: property
      });
    }
  })

};
/**
 * Function is use to fetch Total property
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 15-Sep-2017
 */
function admin_getTotalPropertyCount(req, res) {
  propertyModel.count({
    is_deleted: false,
    $or: [{
      is_approved: true
    }, {
      is_approved: false
    }]
  }, function (err, userCount) {
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.INTERNAL_ERROR
      });
    } else {
      res.json({
        code: Constant.SUCCESS_CODE,
        message: Constant.USERS_LIST_FETCHED,
        data: userCount
      });
    }
  });
}
/**
 * Function is use to fetch property by type sale
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 15-Sep-2017
 */
function admin_getPropertySaleCount(req, res) {
  propertyModel.count({
    is_deleted: false,
    type: 'sale',
    $or: [{
      is_approved: true
    }, {
      is_approved: false
    }]
  }, function (err, userCount) {
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.INTERNAL_ERROR
      });
    } else {
      res.json({
        code: Constant.SUCCESS_CODE,
        message: Constant.USERS_LIST_FETCHED,
        data: userCount
      });
    }
  });
}
/**
 * Function is use to fetch property by type rental
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 15-Sep-2017
 */
function admin_getPropertyRentCount(req, res) {
  propertyModel.count({
    is_deleted: false,
    type: 'rental',
    $or: [{
      is_approved: true
    }, {
      is_approved: false
    }]
  }, function (err, userCount) {
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.INTERNAL_ERROR
      });
    } else {
      res.json({
        code: Constant.SUCCESS_CODE,
        message: Constant.USERS_LIST_FETCHED,
        data: userCount
      });
    }
  });
}
/**
 * Function is use to fetch unapproved  property 
 * @access private
 * @return json
 * Created by       
 * @smartData Enterprises (I) Ltd
 * Created Date 19-Sep-2017
 */
function admin_getUnapprovedProperty(req, res) {
  propertyModel.find({
    "is_approved": false,
    "is_deleted": false
  }).limit(5).sort({
    'dayNumber': 1
  }).populate('owner_id').exec(function (err, property) {
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.INTERNAL_ERROR
      });
    } else if (property && property.length) {
      res.json({
        code: Constant.SUCCESS_CODE,
        message: Constant.PROPERTY_SUCCESS_GOT_DATA,
        data: property
      });
    } else {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.PROPERTY_PROPERTY_ERORR_DATASUCCESS_DATA
      });
    }

  });
}
/**
 * Function is use to fetch recently added property
 * @access private
 * @return json
 * Created by       
 * @smartData Enterprises (I) Ltd
 * Created Date 20-Sep-2017
 */
function admin_getRecentAddedProperty(req, res) {
  var startDate = moment().startOf("week").format('DDD');
  var endDate = moment().endOf("week").format('DDD');
  var yearNumber = moment().startOf("week").format('YYYY');
  propertyModel.find({
    "is_deleted": false,
    'dayNumber': {
      $gte: startDate
    },
    'dayNumber': {
      $lte: endDate
    },
    'yearNumber': {
      $eq: yearNumber
    }
  }).limit(5).sort({
    'dayNumber': 1
  }).populate('owner_id').exec(function (err, property) {
    //console.log("property", property);
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.INTERNAL_ERROR
      });
    } else if (property && property.length) {
      res.json({
        code: Constant.SUCCESS_CODE,
        message: Constant.PROPERTY_SUCCESS_GOT_DATA,
        data: property
      });
    } else {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.PROPERTY_PROPERTY_ERORR_DATASUCCESS_DATA
      });
    }

  });
}
/**
 * Function is use to fetch view all property
 * @access private
 * @return json
 * Created by       
 * @smartData Enterprises (I) Ltd
 * Created Date 20-Sep-2017
 */
function admin_getAllProperty(req, res) {
  // var trueApprove = {
  //     '$or': []
  // };
  // trueApprove['$or'].push({
  //     'is_approved': false
  // });
  // trueApprove['$or'].push({
  //     'is_approved': true
  // });
  propertyModel.find({
    "is_deleted": false,
    "status": true
    //$or: [trueApprove]
  }, { _id: 1, property_id: 1, address: 1, title: 1, description: 1, city: 1, state: 1, image: 1, created_by_agency_id: 1, created_by: 1, property_id: 1, owned_by: 1 }).sort({ 'created': 1 })
    .populate('created_by_agency_id', '_id firstname lastname email address totalPropertyCount about_user image images city state agency_id')
    .populate('created_by', '_id firstname lastname email address totalPropertyCount about_user image images city state agency_id')
    .populate('owned_by', '_id firstname lastname email address totalPropertyCount about_user image images city state agency_id')
    .exec(function (err, property) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR
        });
      } else if (property && property.length) {
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.PROPERTY_SUCCESS_GOT_DATA,
          data: property
        });
      } else {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.PROPERTY_PROPERTY_ERORR_DATASUCCESS_DATA
        });
      }

    });
}
/**
 * Function is use to get single  property
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 20-Sept-2017
 */
function admin_getSingleProperty(req, res) {
  var geocoder = NodeGeocoder(options);
  waterfall([
    function (callback) {
      propertyModel.find({
        '_id': req.body.propertyId,
        "is_deleted": false
      }, { _id: 1, property_id: 1, address: 1, title: 1, state: 1, city: 1, description: 1, image: 1, created_by_agency_id: 1, created_by: 1, property_id: 1, owned_by: 1, number_of_bathroom: 1, number_bedroom: 1, number_of_townhouse: 1, number_of_parking: 1, amenities: 1 })
        .populate('created_by_agency_id', '_id firstname lastname email address totalPropertyCount about_user image images city state agency_id')
        .populate('created_by', '_id firstname lastname email address totalPropertyCount about_user image images city state agency_id mobile_no createdDate')
        .populate('owned_by', '_id firstname lastname email address totalPropertyCount about_user image images city state agency_id')
        .exec(function (err, property) {
          if (err) {
            callback({
              code: Constant.ERROR_CODE,
              message: Constant.ERROR_RETRIVING_DATA
            }, null, null);
          } else if (property && property.length) {
            // console.log("Property",property);
            callback(null, property);
          } else {
            callback({
              code: Constant.ERROR_CODE,
              message: Constant.ERROR_RETRIVING_DATA
            }, null, null);
          }
        });
    }
    /*function (arg1, callback) {
        geocoder.geocode(arg1.data[0].title).then(function (res) {
            arg1.data[0].latitude = (res[0].latitude) ? res[0].latitude : '';
            arg1.data[0].longitude = (res[0].longitude) ? res[0].longitude : '';
            callback(null, arg1);
        })
            .catch(function (err) {
                callback({
                    code: Constant.ERROR_CODE,
                    message: Constant.ERROR_RETRIVING_DATA
                }, null, null);
            });
    }*/
  ], function (err, result) {
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.ERROR_RETRIVING_DATA
      });
    } else {
      res.json({
        code: Constant.SUCCESS_CODE,
        message: Constant.PROPERTY_SUCCESS_RENTAL_DATA,
        data: result
      });
    }
  });
}
/**
 * Function is use to delete property by admin
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 20-Sept-2017
 */
function admin_deletePropertyById(req, res) {
  propertyModel.update({
    '_id': req.body.propertyId
  }, {
    $set: {
      "is_deleted": true
    }
  }, function (err, property) {
    if (err) {
      res.json({
        code: 400,
        message: "Unsuccessful in updating property isdeleted true"
      });

    } else if (property) {
      propertyModel.findById({
        '_id': req.body.propertyId
      }).exec(function (err, property) {
        userModel.find({
          "is_deleted": false,
          "_id": property.owner_id
        }).exec(function (err, user) {
          if (err) {
            return res.json({
              code: Constant.ERROR_CODE,
              message: Constant.ERROR_RETRIVING_DATA
            });
          } else if (user.length) {
            var total = user[0].totalPropertyCount - 1;
            userModel.update({
              '_id': user[0]._id
            }, {
              $set: {
                "totalPropertyCount": total
              }
            }, function (err, info) {
              if (err) {
                res.json({
                  code: 400,
                  message: "Unsuccessful in updating"
                });
              } else {
                recentViewedPropertyModel.updateMany({
                  'propertyId': req.body.propertyId
                }, {
                  $set: {
                    "isDeleted": true
                  }
                }, function (err, info) {
                  if (err) {
                    res.json({
                      code: 400,
                      message: "Unsuccessful in updating"
                    });
                  } else {
                    res.json({
                      code: 200,
                      message: "successfully updated data",
                      data: property
                    });
                  }
                })

              }
            })
          }
        });
      });
    } else {
      return res.json({
        code: 200,
        message: "unsccessfully updated data",
        data: property
      })
    }
  })
};
/**
 * Function is use to update is approve flag of property
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 20-Sept-2017
 */
function admin_updateApproveFlagOfPropertyById(req, res) {
  propertyModel.findOneAndUpdate({
    "_id": req.body.propertyId,
    "is_deleted": false
  }, {
    $set: {
      "is_approved": false
    }
  },
    function (err, property) {

      if (err) {
        res.json({
          code: 400,
          message: "Unsuccessful in updating property isdeleted true"
        });

      } else if (property) {
        return res.json({
          code: 200,
          message: "Successfully updated data",
          data: property
        })
      } else {
        return res.json({
          code: 404,
          message: "unuccessfully updated data",
          data: property
        })
      }
    })
};
/**
 * Function is use to update is approve flag of property
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 20-Sept-2017
 */
function admin_updateApproveFlagTrue(req, res) {
  propertyModel.findOneAndUpdate({
    "_id": req.body.propertyId,
    "is_deleted": false
  }, {
    $set: {
      "is_approved": true
    }
  },
    function (err, property) {
      if (err) {
        res.json({
          code: 400,
          message: "Unsuccessful in updating property isdeleted true"
        });

      } else if (property) {
        return res.json({
          code: 200,
          message: "Successfully updated data",
          data: property
        })
      } else {
        return res.json({
          code: 404,
          message: "unuccessfully updated data",
          data: property
        })
      }
    })
};
/**
 * Function is use tosearch property in admin section
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 20-Sept-2017
 */
function admin_searchProperty(req, res) {
  //console.log("req.body", req.body);
  var trueApprove = {
    '$or': []
  };
  var dateQuery = {
    '$and': []
  };
  if (req.body.yearNumber1) {
    //console.log("req.body", req.body);
    dateQuery['$and'].push({
      'dayNumber': {
        $gte: req.body.dayNumber1
      }
    });
    dateQuery['$and'].push({
      'yearNumber': {
        $gte: req.body.yearNumber1
      }
    });
  }
  if (req.body.yearNumber2) {
    dateQuery['$and'].push({
      'dayNumber': {
        $lte: req.body.dayNumber2
      }
    });
    dateQuery['$and'].push({
      'yearNumber': {
        $lte: req.body.yearNumber2
      }
    });
  }
  if (req.body.status) {
    if (req.body.status == "1") {
      trueApprove['$or'].push({
        'is_approved': true
      });
    }
    if (req.body.status == "2") {
      trueApprove['$or'].push({
        'is_approved': false
      });
    }
    if (req.body.status == "0") {
      trueApprove['$or'].push({
        'is_approved': false
      });
      trueApprove['$or'].push({
        'is_approved': true
      });
    }
    if (dateQuery['$and'].length == 0) {
      //console.log("date query", dateQuery.length);
      propertyModel.find({
        "is_deleted": false,
        $and: [trueApprove]
      }).populate('owner_id').exec(function (err, user) {
        if (err) {
          return res.json({
            code: 400,
            message: "Error"
          });
        } else if (user.length) {
          return res.json({
            code: 200,
            message: "Successfully got data",
            data: user
          });
        } else {
          return res.json({
            code: 400,
            message: "Unsuccessful in getting property data"
          });
        }
      })
    }
    if (dateQuery['$and'].length > 0) {
      propertyModel.find({
        "is_deleted": false,
        $and: [trueApprove, dateQuery]
      }).populate('owner_id').exec(function (err, user) {
        if (err) {
          return res.json({
            code: 400,
            message: "Error"
          });
        } else if (user.length) {
          return res.json({
            code: 200,
            message: "Successfully got data",
            data: user
          });
        } else {
          return res.json({
            code: 400,
            message: "Unsuccessful in getting property data"
          });
        }
      })
    }
  }
}



/**
 * Function is use to  find the top 3 featured property  
 * @access private
 * @return json
 * Created by       
 * @smartData Enterprises (I) Ltd
 * Created Date 12-Oct-2017
 */
function adminFeaturedProperty(req, res) {
  //console.log('dafs');
  propertyModel.find({
    "is_deleted": false,
    "is_approved": true,
    "visitCount": { $gt: 0 }
  }).populate('owner_id').sort({ 'visitCount': 1 }).limit(10).exec(function (err, property) {
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.INTERNAL_ERROR
      });
    } else if (property && property.length > 0) {
      res.json({
        code: Constant.SUCCESS_CODE,
        message: Constant.PROPERTY_SUCCESS_GOT_DATA,
        data: property
      });
    } else {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.PROPERTY_PROPERTY_ERORR_DATASUCCESS_DATA
      });
    }

  });
}
/**
 * Function is use to create amenities for the properties
 * @access private
 * @return json
 * Created by           
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Nov-2017
 */

function addAmenites(req, res) {
  if (req.body.name) {
    var data = {
      name: req.body.name
    }
    var amenity = new amenitiesModel(data);
    amenity.save(function (err, data) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR
        });
      } else {
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.AMENITIES_CREATE_SUCCESSFULLY,
          data: data
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
/**
 * Function is use to get amenities list
 * @access private
 * @return json
 * Created by           
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Nov-2017
 */

function getAmenites(req, res) {
  amenitiesModel.find({ is_deleted: false }, 'name', function (err, data) {
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
 * Function is use to update property by id
 * @access private
 * @return json
 * Created by       
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Nov-2017
 */
function updatePropertyById(req, res) {
  if (req.body) {

    var query = { "_id": req.body._id };
    delete req.body._id;
    propertyModel.findOneAndUpdate(query, req.body, { new: true, runValidators: true }, function (err, propertyData) {
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
/*  @api : createProperty
 *  @author   :  
 *  @created  : 17-Nov-2017
 *  @modified :
 *  @purpose  : To save the Propert as draft.
 */
function savePropertyAsDraft(req, res) {
  var formData = {};
  if (req.body) {
    var query = {
      _id: req.body._id,
      is_deleted: false
    }
    delete req.body._id;
    propertyModel.findOneAndUpdate(query, req.body, { new: true, runValidators: true }, function (err, propertyData) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.SAVE_AS_DRAFT_UNSUCCESS
        });
      } else {
        var chars = "1234567890";
        var maintennceId = '';
        for (var x = 0; x < 11; x++) {
          var i = Math.floor(Math.random() * chars.length);
          maintennceId += chars.charAt(i);
        }
        req.body.property_id = maintennceId;
        if (propertyData) {
          res.json({
            code: Constant.SUCCESS_CODE,
            data: propertyData,
            message: Constant.SAVE_AS_DRAFTE_SUCCESS,
          });
        } else {
          req.body.save_as_draft = true;
          var property = new propertyModel(req.body);
          // console.log("#######property", property);
          property.save(function (err, propertyData) {
            // console.log('save err', err);
            if (err) {
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.SAVE_AS_DRAFT_UNSUCCESS
              });
            } else {
              res.json({
                code: Constant.SUCCESS_CODE,
                data: propertyData,
                message: Constant.SAVE_AS_DRAFTE_SUCCESS,
              });
            }
          });
        }
      }
    });
  } else {
    res.json({
      code: Constant.ERROR_CODE,
      message: Constant.NOT_PROPER_DATA
    });
  }
}

/*  @api : addPropertyOwner
 *  @author   :  
 *  @created  : 23-Nov-2017
 *  @modified :
 *  @purpose  : To save the Propert as draft.
 */
function addPropertyOwner(req, res) {
  userModel.find({ email: req.body.email }, function (err, userRes) {
    if (err) {
      res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
    } else {
      if (userRes.length != 0) {
        propertyOwnerSchema.find({ email: req.body.email, created_by: req.body.created_by, property_id: req.body.property_id }, function (err, userResponse) {
          if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
          } else {
            if (userResponse.length > 0) {
              res.json({ code: Constant.ALLREADY_EXIST, message: Constant.PROPERTY_OWNER_ALREADY_EXIST });
            } else {
              if (typeof req.body.agency_id != 'undefined' && req.body.agency_id != '') {
                var ownerData = {
                  created_by: req.body.created_by,
                  property_owner: userRes[0]._id,
                  agency_id: req.body.agency_id,
                  property_id: req.body.property_id,
                  email: req.body.email
                }
              } else {
                var ownerData = {
                  created_by: req.body.created_by,
                  property_owner: userRes[0]._id,
                  property_id: req.body.property_id,
                  email: req.body.email
                }
              }
              var propertyOwner = new propertyOwnerSchema(ownerData);
              propertyOwner.save(function (err, propertyData) {
                if (err) {
                  res.json({
                    code: Constant.ERROR_CODE,
                    message: Constant.PROPERTY_OWNER_CREATE_UNSUCCESS
                  });
                } else {
                  //for sending mail to owner
                  sendInformationMailToOwner(ownerData);
                  res.json({
                    code: Constant.SUCCESS_CODE,
                    data: propertyData,
                    message: Constant.PROPERTY_OWNER_CREATE_SUCCESS,
                  });
                }
              });
            }
          }
        });
      } else {
        // var chars = "1234567890";
        // var randomPass ='';
        // for (var x = 0; x < 11; x++) {
        //     var i = Math.floor(Math.random() * chars.length);
        //     randomPass += chars.charAt(i);
        // }
        var password;
        password = randomString({ length: 8, numeric: true, letters: true });
        password = password + "@s1";
        // console.log('*****************password***********************', password);
        var userInfo = {};
        // req.body.mobile_no = "+65" + req.body.mobile_no;
        // svar user_image = req.body.user_image ? req.body.user_image : "no_image.png";
        if ((req.body.email) && (password) && (req.body.firstname) && (req.body.lastname)) {
          if (validator.isEmail(req.body.email)) {
            userModel.find({ email: (req.body.email).toLowerCase(), is_deleted: false }, { email: 1 }, function (err, email) {
              if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
              } else {
                if (email.length > 0 && email[0].firstname != req.body.firstname && email[0].lastname != req.body.lastname) {
                  res.json({ code: Constant.ALLREADY_EXIST, message: Constant.EMAIL_ALREADY_EXIST });
                } else {
                  var hash = bcrypt.hashSync(password, salt);
                  if (typeof req.body.agency_id != 'undefined' && req.body.agency_id != '') {
                    var userData = {
                      password: hash,
                      firstname: (req.body.firstname).toLowerCase(),
                      lastname: (req.body.lastname).toLowerCase(),
                      email: (req.body.email).toLowerCase(),
                      mobile_no: req.body.mobile_no,
                      is_active: true,
                      deleted: false,
                      agency_id: req.body.agency_id
                    };
                  } else {
                    var userData = {
                      password: hash,
                      firstname: (req.body.firstname).toLowerCase(),
                      lastname: (req.body.lastname).toLowerCase(),
                      email: (req.body.email).toLowerCase(),
                      mobile_no: req.body.mobile_no,
                      is_active: true,
                      deleted: false
                    };
                  }
                  var UsersRecord = new userModel(userData);
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
                        }

                      }
                      var obj = {};
                      obj.user_id = userInfo.userId;
                      obj.role_id = Constant.OWNER;
                      obj.is_master_role = true;
                      var groupUser = new Groups(obj);
                      groupUser.save(function (err, group) {
                        if (err) {
                          res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                        } else {
                          var mailOptions = {
                            from: Config.EMAIL_FROM, // sender address
                            to: req.body.email, // list of receivers
                            subject: 'Account has been added successfully', // Subject line
                            text: 'Account Invitation', // plaintext body
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
                              '<p><strong> Hi' + ' ' + changeCase.sentenceCase(req.body.firstname) + ',' + '</strong></p>' +
                              ' <p><br /> Welcome! You have a added to Ownly network.' +
                              'Please login by using following credentials.</p>' +
                              '<p>Username:- ' + req.body.email + ' Password:- ' + password + '</p>' +
                              '<p> Go to login screen by clicking on below link:-</p>' +
                              '<p><a target="_blank" href="' + Constant.STAGGING_URL + '#!/login' + '">' + 'click here ' + '</a><br /></p>' +
                              '<p></p>' +
                              '<p></p>' +
                              '<p><br />Thanks for choosing Ownly,</p>' +
                              '<p>Ownly Team.</p>' +
                              '</td>' +
                              '</tr>' +
                              '</table>' +
                              '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
                              '<tr>' +
                              '<td>' +
                              '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© ' +
                              Config.CURRENT_YEAR +
                              ' <a href="#" style="text-decoration:none;color:#fff;">syncitt.com</a>' +
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
                          };
                          // send mail with defined transport object
                          var ownerData = {
                            created_by: req.body.created_by,
                            property_owner: obj.user_id,
                            property_id: req.body.property_id,
                            email: req.body.email
                          }
                          //console.log('ownerData', ownerData);
                          var propertyOwner = new propertyOwnerSchema(ownerData);
                          propertyOwner.save(function (err, propertyData) {
                            if (err) {
                              //console.log('err', err);
                              res.json({
                                code: Constant.ERROR_CODE,
                                message: Constant.PROPERTY_OWNER_CREATE_UNSUCCESS
                              });
                            } else {
                              // transporter.sendMail(mailOptions, function (error, response) {
                              //     if (error) {
                              //         res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                              //     } else {
                              //         res.json({
                              //             code: Constant.SUCCESS_CODE,
                              //             data: propertyData,
                              //             message: Constant.PROPERTY_OWNER_CREATE_SUCCESS,
                              //         });
                              //     }
                              // });
                              transporter.sendMail({
                                from: mailOptions.from,
                                to: mailOptions.to,
                                subject: mailOptions.subject,
                                html: mailOptions.html,
                              }, function (error, response) {
                                if (error) {
                                  res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                                } else {
                                  res.json({
                                    code: Constant.SUCCESS_CODE,
                                    data: propertyData,
                                    message: Constant.PROPERTY_OWNER_CREATE_SUCCESS,
                                  });
                                }
                              });
                            }
                          });
                        };
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
    }
  });
}
/*  @api : addPropertyOwner
 *  @author   :  
 *  @created  : 24-Nov-2017
 *  @modified :
 *  @purpose  : To send confirmation mail to the user who have added as property owner
 */
function sendInformationMailToOwner(propertyOwnerInfo) {
  var ownerData = {
    created_by: propertyOwnerInfo.created_by,
    property_owner: propertyOwnerInfo.property_owner,
    property_id: propertyOwnerInfo.property_id
  }
  propertyOwnerSchema.findOne(ownerData).populate('property_id', 'address property_type image').populate('created_by', 'firstname lastname').populate('property_owner', 'firstname lastname email').exec(function (err, propertyOwnerData) {
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.SAVE_AS_DRAFT_UNSUCCESS
      });
    } else {

      //console.log('propertyOwnerData', propertyOwnerData);
      var mailOptions = {
        from: Config.EMAIL_FROM, // sender address
        to: propertyOwnerData.property_owner.email, // list of receivers
        subject: 'Account has been added successfully', // Subject line
        text: 'Account Invitation', // plaintext body
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
          '<p><strong> Hello' + ' ' + changeCase.sentenceCase(propertyOwnerData.property_owner.firstname) + ' ' + changeCase.sentenceCase(propertyOwnerData.property_owner.lastname) + ',' + '</strong></p>' +
          '<p><strong> Welcome To Ownly</strong></p>' +
          '<p><br /> One of our user ' + changeCase.sentenceCase(propertyOwnerData.created_by.firstname) + ' ' + changeCase.sentenceCase(propertyOwnerData.created_by.lastname) + ' have added You as owner to Ownly network.' +
          '<p> Go to login screen by clicking on below link:-</p>' +
          '<p><a target="_blank" href="' + Constant.STAGGING_URL + '#!/login' + '">' + 'click here ' + '</a><br /></p>' +
          '<p></p>' +
          // 'Please login by using following credentials.</p>' +
          // '<p>For the property :- <a href="' + Constant.LOCAL_URL + '#!/property_details/' + propertyOwnerData.property_id._id + '">' + propertyOwnerData.property_id.address + '</a></p>' +
          '<p></p>' +
          '<p><br />Thanks for choosing Ownly,</p>' +
          '<p>Ownly Team.</p>' +
          '</td>' +
          '</tr>' +
          '</table>' +
          '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
          '<tr>' +
          '<td>' +
          '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© ' +
          Config.CURRENT_YEAR +
          ' <a href="#" style="text-decoration:none;color:#fff;">syncitt.com</a>' +
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
      };
      transporter.sendMail({
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
      }, function (error, response) {
        if (error) {
          // console.log('some error occured while sending mail')
        } else {
          // console.log('email sent successfully.', response);
        }
      });
      // transporter.sendMail(mailOptions, function (error, response) {
      //     if (error) {
      //         console.log('some error occured while sending mail')
      //     } else {
      //         console.log('email sent successfully.', response);
      //     }
      // });
    }
  });
}

/*  @api : uploadMobilePropertyImage
 *  @author  :  
 *  @created  : 
 *  @modified :
 *  @purpose  : To post the Propert.
 */
function uploadMobilePropertyImage(req, res) {
  var formData = {};
  var outputJSON = {};
  var propertySavedObj = {};
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
        var dir = './api/uploads/property';
        var temp_path = dir + '/' + filename;
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
        callback('No files selected', false);
      }
    }
  ], function (err, imageData) {
    if (err) {
      outputJSON = {
        code: Constant.ERROR_CODE,
        message: Constant.PROPERTY_CREATE_UNSUCCESS
      };
    } else {
      outputJSON = {
        code: Constant.SUCCESS_CODE,
        data: imageData,
        message: Constant.PROPERTY_CREATE_SUCCESS,
      };
    }
    res.jsonp(outputJSON);
  });
}
/*  @api : getPropertyOwner
 *  @author   :  
 *  @created  : 30-Nov-2017
 *  @modified :
 *  @purpose  : To get the property owner
 */
function getPropertyOwner(req, res) {

  var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
  var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
  var request_by_role = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';
  var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
  var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;
  var outputJSON = {};
  if ((request_by_role == Constant.AGENT || request_by_role == Constant.OWNER) && user_id) {
    var getAllOwnersForAgents = function (userId, callback) {
      propertyOwnerSchema.find({ created_by: mongoose.Types.ObjectId(userId), is_deleted: false }, { property_owner: 1 }, function (err, data) {
        if (err) {
          callback(err);
        } else {
          if (!data) {
            callback(null, []);
          } else {
            var users_id_arr = [];
            for (var i = 0; i < data.length; i++) {
              var users_id = mongoose.Types.ObjectId(data[i].property_owner);
              users_id_arr.push(users_id);
            }
            callback(null, users_id_arr);
          }
        }
      });
    };

    getAllOwnersForAgents(user_id, function (error, usersArr) {
      if (error) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
      } else if (!usersArr) {
        res.json({ code: Constant.SUCCESS_CODE, data: [] });
      } else {
        userModel.aggregate(
          { $match: { _id: { $in: usersArr }, is_active: true, is_deleted: false } }, // Match me
          { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
          {
            $project: {
              _id: 1,
              firstname: 1, lastname: 1, email: 1, address: 1, totalPropertyCount: 1, about_user: 1,
              image: 1, images: 1, agency_id: 1, city: 1,
              groups: { _id: 1, role_id: 1, status: 1, deleted: 1, is_master_role: 1 }
            }
          },
          { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.OWNER), "groups.is_master_role": true, "groups.status": true, "groups.deleted": false } },
          { $sort: { "createdAt": -1 } },
          { $skip: page_number * number_of_pages },
          { "$limit": number_of_pages }
        ).exec(function (err, userList) {
          if (err) {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
          } else {
            res.json({ code: Constant.SUCCESS_CODE, data: userList });
          }
        });
      }
    });
  } else if ((request_by_role == Constant.OWN_AGENCY || request_by_role == Constant.RUN_STRATA_MANAGEMENT_COMPANY) && agency_id) {
    userModel.aggregate(
      { $match: { "agency_id": mongoose.Types.ObjectId(agency_id), is_active: true, is_deleted: false, _id: { $ne: mongoose.Types.ObjectId(user_id) } } }, // Match me
      { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
      {
        $project: {
          _id: 1,
          firstname: 1, lastname: 1, email: 1, address: 1, totalPropertyCount: 1, about_user: 1,
          image: 1, images: 1, agency_id: 1, city: 1,
          groups: { _id: 1, role_id: 1, status: 1, deleted: 1, is_master_role: 1 }
        }
      },
      { $match: { "groups.role_id": mongoose.Types.ObjectId(Constant.OWNER), "groups.status": true, "groups.is_master_role": true, "groups.deleted": false } },
      { $sort: { "createdAt": -1 } },
      { $skip: page_number * number_of_pages },
      { "$limit": number_of_pages }
    ).exec(function (err, userList) {
      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
      } else {
        res.json({ code: Constant.SUCCESS_CODE, data: userList });
      }
    });
  }
  else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
  }


}
/*  @api : getpropertyByid
 *  @author  :  
 *  @created  : 
 *  @modified :
 *  @purpose  : To get the property by owner id.
 */
function getPropertyByAgentId(req, res) {
  var limit = req.body.limit ? parseInt(req.body.limit) : {};
  var sortby = req.body.sortby ? req.body.sortby : {};
  var outputJSON = {};
  var query = {
    'created_by': req.body.agentId,
    is_deleted: false
  };
  propertyModel.find(query).populate('owned_by').populate('created_by').limit(parseInt(limit)).sort({
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
 * function used to upload CSV file
 * Date :- 05-Dec-2017
 * @author: Smartdata
 * 
 */
function importCSV(req, res) {
  var timestamp = Number(new Date()); // current time as number
  var form = new formidable.IncomingForm();
  var file = req.swagger.params.file.value;
  var outputJSON = {};
  var splitFile = file.originalname.split('.');
  var filename = +timestamp + '_' + 'import_property' + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
  var filePath = "./api/uploads/property_csv/" + filename;
  var errorfilename = Date.now() + ".csv";
  var count = 1;
  var csvArray = [];
  var is_success = true;
  waterfall([
    function (callback) {
      fs.writeFile(path.resolve(filePath), file.buffer, function (err) {
        if (err) {
          callback(err, false);
        } else {
          var csvheaders;
          csvheaders = {
            headers: ["description", "Bedrooms", "image", "suburb", "price", "Bathrooms", "category", "carSpaces", "suburb", "postCode", "formattedAddress", "imageUrl", "unitNumber"],
            discardUnmappedColumns: true,
            headers: true,
            ignoreEmpty: false,
            trim: true,
            rtrim: true,
            ltrim: true
          };
          var dataArray = [];
          var stream = fs.createReadStream(filePath);
          //console.log('stream',stream);
          csv
            .fromStream(stream, csvheaders)
            .validate(function (data) {
              var noOfBathRoom = parseInt(data.Bathrooms);
              var noOfBedRoom = parseInt(data.Bedrooms);
              var noOfParking = parseInt(data.carSpaces);
              // console.log("data@@@@@@@@", data);
              if (data.Bathrooms && data.Bedrooms && data.carSpaces) {
                // if (data.title.length == 0 || data.description.length == 0 || !(noOfBathRoom > 0 && noOfBathRoom <= 99) || data.number_of_bathroom.length == 0 || !(noOfBedRoom > 0 && noOfBedRoom <= 99) || data.number_bedroom.length == 0 || data.number_of_townhouse.length == 0 || !(noOfParking > 0 && noOfParking <= 99) || data.number_of_parking.length == 0 || data.property_type.length == 0 || data.floor_area.length == 0 || data.lot_erea.length == 0 || data.property_name.length == 0 || data.address.length == 0 || data.city.length == 0 || data.state.length == 0) {
                //     return false;
                // } else {
                //     return true;
                // }
                return true;
              } else {
                return true;
              }
            })
            .on("data-invalid", function (data) {
              //do something with invalid row
              if (data) {
                is_success = false;
              }
            })
            .on("data", async function (data) {
              var chars = "1234567890";
              var maintennceId = '';
              var images = [];
              for (var x = 0; x < 9; x++) {
                var i = Math.floor(Math.random() * chars.length);
                maintennceId += chars.charAt(i);
              }
              if (data.imageUrl && data.imageUrl != '') {
                var temp = new Array();
                temp = (data.imageUrl).split(",");
                for (var l = 0; l < temp.length; l++) {
                  var obj = {}
                  obj.path = temp[l];
                  obj.is_from_csv_file = true;
                  images.push(obj);
                }
              }

              if (data && data.price == "") {
                data.price = 0
              }
              else {
                data.price = data.price
              }
              if (req.body.agency_id) {
                var propertyData = {
                  // title: data.title,
                  description: data.description,
                  number_of_bathroom: parseInt(data.Bathrooms),
                  number_bedroom: parseInt(data.Bedrooms),
                  // number_of_townhouse: data.number_of_townhouse,
                  number_of_parking: parseInt(data.carSpaces),
                  property_type: data.category,
                  floor_area: data.floor_area,
                  longitude: data.title,
                  claimed: false,
                  property_name: data.title,
                  address: data.formattedAddress,
                  created_by: req.body._id,
                  owned_by: req.body._id,
                  created_by_agency_id: req.body.agency_id,
                  property_id: maintennceId,
                  // property_category: data.property_category,
                  image: data.image,
                  city: (data.suburb).toLowerCase(),
                  price: parseInt(data.price),

                  postCode: data.postCode,
                }
                let ins = await propertyModel.insertMany(propertyData);

              } else {

                var propertyData = {
                  // title: data.title,
                  description: data && data.description ? data.description : "",
                  claimed: false,
                  number_of_bathroom: parseInt(data.Bathrooms),
                  number_bedroom: parseInt(data.Bedrooms),
                  // number_of_townhouse: data.number_of_townhouse,
                  number_of_parking: parseInt(data.carSpaces),
                  property_type: data.category,
                  // floor_area: data.floor_area,
                  // longitude: data.title,
                  // property_name: data.title,
                  address: data.formattedAddress,
                  // created_by: req.body._id,
                  // owned_by: req.body._id,
                  created_by_agency_id: req.body.agency_id,
                  // lot_erea: data.lot_erea,
                  property_id: maintennceId,
                  // property_category: data.property_category,
                  image: [data.image],
                  city: (data.suburb).toLowerCase(),
                  price: parseInt(data.price),
                  postCode: data.postCode,
                  // state: data.state,
                }
                let ins = await propertyModel.insertMany(propertyData);
                // console.log('ins => ', ins);

              }
              // var property = new propertyModel(propertyData);
              // property.save(function (err, propertyData) {
              //     console.log('propertyData123 => ', propertyData);

              //     if (err) {
              //         console.log('123 => ', 123);

              //         count++;
              //         callback(err, false);
              //     }
              // });
              // callback(null, data);
            })
            .on("end", function () {
              if (is_success) {
                callback(null, true);
              }
              else {
                callback('not_valid', false);
              }
            });
        }
      });
    }
  ], function (err, propertyData) {
    // console.log('err', err);
    if (err == 'not_valid') {
      outputJSON = {
        code: Constant.ERROR_CODE,
        message: Constant.NOT_VALID_CSV,
        error_row: count
      };
    }
    else if (err) {
      count++;
      outputJSON = {
        code: Constant.ERROR_CODE,
        message: Constant.CSV_UPLOAD_UNSUCCESS + ' ' + count,
        error_row: count
      };
    } else {
      outputJSON = {
        code: Constant.SUCCESS_CODE,
        message: Constant.CSV_UPLOAD_SUCCESS,
      };
    }
    res.jsonp(outputJSON);
  });
}
function validateData(data, count, cb) {
  var obj = {};
  if (data.title != '' || data.description != '' || data.number_of_bathroom != '' || data.number_bedroom != '' || data.number_of_townhouse != '' || data.number_of_parking != '' || data.property_type != '' || data.floor_area != '' || data.lot_erea != '' || data.property_name != '' || data.address != '') {
    obj = { status: true, message: "OK" }
    cb(obj);
  } else {
    obj = { status: false, message: "Required field is missing in row " + count }
    cb(obj);
  }

}
/**
 * function used to upload Document
 * Date :- 20-Dec-2017
 * @author: Smartdata
 */
function uploadDocument(req, res) {
  var formData = {};
  var outputJSON = "";
  var folderData = {};
  var childFolderData = {};
  waterfall([
    function (callback) {
      formData = {
        created_by: req.body.created_by,
        document_name: '',
        document_path: '',
        picture_path: '',
        size: '',
        file: req.swagger.params.file.value
      };
      callback(null, formData);
    },
    function (formData, callback) {
      if (formData.file) {
        var dir = './api/uploads/Document/';
        var mediaNameArr = formData.file.originalname.split('.');
        var mediaExt = mediaNameArr[1];
        var fileName = mediaNameArr[0];
        var date = new Date();
        // var newDate = date.getTime();
        var newDate = Date.now();
        formData.document_name = fileName + '.' + mediaExt;
        formData.picture_path = newDate + '.' + mediaExt;
        var temp_path = dir + formData.picture_path;
        formData.document_path = formData.picture_path;
        formData.size = formData.file.size / 1000;
        var data = formData.file.buffer;
        fs.writeFile(temp_path, data, function (err, data) {
          if (err) {
            callback(err, false);
          } else {
            delete formData.file;
            callback(null, formData);
          }
        });
      } else {
        callback(null, formData);
      }
    },
    function (formData, callback) {
      var documents = new documentsModel(formData);
      documents.save(function (err, documentData) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, documentData);
        }
      });
    }
  ],
    function (err, userData) {
      if (err) {
        outputJSON = {
          'code': Constant.ERROR_CODE,
          'message': Constant.ERROR_DOCUMENT_UPLOAD
        };
      } else {
        outputJSON = {
          'code': Constant.SUCCESS_CODE,
          'message': Constant.DOCUMENT_SUCCESS,
          'data': userData
        }
      }
      return res.send(outputJSON);
    });
}

/**
 * function used to upload Identification Document
 * Date :- 4-1-2019
 * @author: KEK
 */
function uploadIdentificationDocument(req, res) {
  var formData = {};
  var outputJSON = "";
  waterfall([
    function (callback) {
      formData = {
        created_by: req.body.created_by,
        document_name: '',
        document_path: '',
        picture_path: '',
        size: '',
        file: req.swagger.params.file.value
      };
      callback(null, formData);
    },
    function (formData, callback) {
      if (formData.file) {
        var dir = './api/uploads/Document/';
        var mediaNameArr = formData.file.originalname.split('.');
        var mediaExt = mediaNameArr[1];
        var fileName = mediaNameArr[0];
        var date = new Date();
        // var newDate = date.getTime();
        var newDate = Date.now();
        formData.document_name = fileName + '.' + mediaExt;
        formData.picture_path = newDate + '.' + mediaExt;
        var temp_path = dir + formData.picture_path;
        formData.document_path = formData.picture_path;
        formData.size = formData.file.size / 1000;
        var data = formData.file.buffer;
        fs.writeFile(temp_path, data, function (err, data) {
          if (err) {
            callback(err, false);
          } else {
            delete formData.file;
            callback(null, formData);
          }
        });
      } else {
        callback(null, formData);
      }
    },
    function (formData, callback) {
      var identification_document = new identification_documentsModel(formData);
      identification_document.save(function (err, documentData) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, documentData);
        }
      });
    }
  ],
    function (err, userData) {
      if (err) {
        outputJSON = {
          'code': Constant.ERROR_CODE,
          'message': Constant.ERROR_DOCUMENT_UPLOAD
        };
      } else {
        outputJSON = {
          'code': Constant.SUCCESS_CODE,
          'message': Constant.DOCUMENT_SUCCESS,
          'data': userData
        }
      }
      return res.send(outputJSON);
    });
}

/**
 * function used to get uploaded document
 * Date :- 20-Dec-2017
 * @author: Smartdata
 */
function getUploadedDocument(req, res) {
  if (req.body.created_by) {
    documentsModel.find({ "is_deleted": false, "created_by": req.body.created_by }).sort([['createdDate', -1]]).populate('created_by', 'firstname lastname email image').populate('is_tagged_by_id', 'firstname lastname email image').populate('is_tagged_to_id', 'firstname lastname email image').exec(function (err, documentData) {
      if (err) {
        res.jsonp({
          code: Constant.ERROR_CODE,
          message: Constant.ERROR_RETRIVING_DATA
        });
      } else {
        res.jsonp({
          code: Constant.SUCCESS_CODE,
          data: documentData,
          message: Constant.DOCUMENT_FETCH_SUCCESS,
        });
      }
    });
  } else {
    res.jsonp({
      code: Constant.ERROR_CODE,
      message: Constant.ERROR_RETRIVING_DATA
    });
  }
}

/**
 * function used to get uploaded identification document
 * Date :- 4-1-2019
 * @author: Smartdata
 */
function getUploadedIdentificationDocument(req, res) {
  if (req.body.created_by) {
    identification_documentsModel.find({ "is_deleted": false, "created_by": req.body.created_by }).sort([['createdDate', -1]]).populate('created_by', 'firstname lastname email image').populate('is_tagged_by_id', 'firstname lastname email image').populate('is_tagged_to_id', 'firstname lastname email image').exec(function (err, documentData) {
      if (err) {
        res.jsonp({
          code: Constant.ERROR_CODE,
          message: Constant.ERROR_RETRIVING_DATA
        });
      } else {
        res.jsonp({
          code: Constant.SUCCESS_CODE,
          data: documentData,
          message: Constant.DOCUMENT_FETCH_SUCCESS,
        });
      }
    });
  } else {
    res.jsonp({
      code: Constant.ERROR_CODE,
      message: Constant.ERROR_RETRIVING_DATA
    });
  }
}

/**
 * function used to get uploaded document
 * Date :- 20-Dec-2017
 * @author: Smartdata
 */
function addDocumentToTags(req, res) {
  if (req.body.document_id) {
    // console.log('req.body    ',req.body);
    documentsModel.findOne({ "_id": req.body.document_id, "is_deleted": false, "created_by": req.body.is_tagged_by_id }).sort([['createdDate', -1]]).populate('created_by', 'firstname lastname email').exec(function (err, documentData) {
      if (err) {
        // console.log('err',err);
        res.jsonp({
          code: Constant.ERROR_CODE,
          message: Constant.ERROR_RETRIVING_DATA
        });
      } else {
        var postData = {
          created_by: req.body.created_by,
          document_name: documentData.document_name,
          document_path: documentData.document_path,
          size: documentData.size,
          is_tagged: true,
          is_tagged_by_id: req.body.is_tagged_by_id,
          is_tagged_to_id: req.body.is_tagged_to_id
        }
        var documents = new documentsModel(postData);
        documents.save(function (err, documentTaggedData) {
          if (err) {
            // console.log('err',err);
            res.jsonp({
              code: Constant.ERROR_CODE,
              message: Constant.ERROR_RETRIVING_DATA
            });
          } else {
            var to_users = [];
            var obj2 = {};
            obj2.subject = documentTaggedData.document_name;
            obj2.message = "You are tagged by " + documentData.created_by.firstname + " " + documentData.created_by.lastname + " for the file " + obj2.subject + " on " + moment().format("MMMM Do YYYY");
            obj2.from_user = mongoose.Types.ObjectId(req.body.is_tagged_by_id);
            to_users.push({ "users_id": mongoose.Types.ObjectId(req.body.created_by) });
            if (to_users.length) {
              obj2.to_users = to_users;
            }
            obj2.document_id = documentData._id;
            obj2.type = Constant.NOTIFICATION_TYPE_DOCUMENT;
            obj2.module = 7;
            var notification = new NotificationInfo(obj2);
            notification.save(function (err, notData) {
              if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
              } else {
                res.jsonp({
                  code: Constant.SUCCESS_CODE,
                  data: documentTaggedData,
                  message: Constant.DOCUMENT_TAGGED_SUCCESS,
                });
              }
            });
          }
        });
      }
    });
  } else {
    // console.log('err',err);
    res.jsonp({
      code: Constant.ERROR_CODE,
      message: Constant.ERROR_RETRIVING_DATA
    });
  }
}
/**
 * function used to get admin uploaded document
 * Date :- 20-Dec-2017
 * @author: Smartdata
 */
function adminGetUserUploadedDocument(req, res) {
  if (req.body.created_by) {
    documentsModel.find({ "is_deleted": false, "created_by": req.body.created_by }).sort([['createdDate', -1]]).populate('created_by', 'firstname lastname email').exec(function (err, documentData) {
      if (err) {
        res.jsonp({
          code: Constant.ERROR_CODE,
          message: Constant.ERROR_RETRIVING_DATA
        });
      } else {
        res.jsonp({
          code: Constant.SUCCESS_CODE,
          data: documentData,
          message: Constant.DOCUMENT_FETCH_SUCCESS,
        });
      }
    });
  } else {
    res.jsonp({
      code: Constant.ERROR_CODE,
      message: Constant.ERROR_RETRIVING_DATA
    });
  }
}
/**
 * function used to get uploaded document
 * Date :- 20-Dec-2017
 * @author: Smartdata
 */
function getFavUploadedDocument(req, res) {
  if (req.body.created_by) {
    documentsModel.find({ "is_deleted": false, "created_by": req.body.created_by, 'is_favorite': true }).sort([['createdDate', -1]]).populate('created_by', 'firstname lastname email').exec(function (err, documentData) {
      if (err) {
        res.jsonp({
          code: Constant.ERROR_CODE,
          message: Constant.ERROR_RETRIVING_DATA
        });
      } else {
        res.jsonp({
          code: Constant.SUCCESS_CODE,
          data: documentData,
          message: Constant.DOCUMENT_FETCH_SUCCESS,
        });
      }
    });
  } else {
    res.jsonp({
      code: Constant.ERROR_CODE,
      message: Constant.ERROR_RETRIVING_DATA
    });
  }
}
/**
 * function used to add document to favorite list
 * Date :- 20-Dec-2017
 * @author: Smartdata
 */
function addDocumentToFav(req, res) {
  if (req.body.created_by && req.body._id) {
    var fav_status = req.body.is_favorite;
    var query = {
      'created_by': req.body.created_by,
      is_deleted: false,
      '_id': req.body._id
    };
    documentsModel.findOneAndUpdate(query, { is_favorite: fav_status }, { new: true, runValidators: true }, function (err, documentData) {
      if (err) {
        res.jsonp({
          code: Constant.ERROR_CODE,
          message: Constant.DOC_ADDED_TO_FAV_UNSUCCESS
        });
      } else {
        res.jsonp({
          code: Constant.SUCCESS_CODE,
          data: documentData,
          message: Constant.DOC_ADDED_TO_FAV_SUCCESS,
        });
      }
    });
  }
}
/**
 * function used to delete document 
 * Date :- 22-Dec-2017
 * @author: Smartdata
 */
function deleteDocument(req, res) {
  var outputJSON = "";
  var query = {
    'created_by': req.body.created_by,
    is_deleted: false,
    '_id': req.body._id
  };
  documentsModel.findOneAndUpdate(query, { is_deleted: true }, { new: true, runValidators: true }, function (err, documentData) {
    if (err) {
      res.jsonp({
        code: Constant.ERROR_CODE,
        message: Constant.DOC_ADDED_TO_FAV_UNSUCCESS
      });
    } else {
      if (documentData) {
        // console.log('document_path', documentData.document_path);
        var path = './api/uploads/Document/' + documentData.document_path;
        fs.stat(path, function (err, stats) {
          if (err) {
            res.jsonp({
              code: Constant.ERROR_CODE,
              message: Constant.DOC_DELETE_UNSUCCESS
            });
          }
          fs.unlink(path, function (err) {
            if (err) {
              res.jsonp({
                code: Constant.ERROR_CODE,
                message: Constant.DOC_DELETE_UNSUCCESS
              });
            }
            else {
              res.jsonp({
                code: Constant.SUCCESS_CODE,
                data: documentData,
                message: Constant.DOC_DELETE_SUCCESS,
              });
            }
          });
        });
      } else {
        res.jsonp({
          code: Constant.ERROR_CODE,
          message: Constant.DOC_ALREADY_DELETED
        });
      }
    }
  });
}

/**
 * function used to delete identification document 
 * Date :- 1-4-2019
 * @author: KEK
 */
function deleteIdentificationDocument(req, res) {
  var outputJSON = "";
  var query = {
    'created_by': req.body.created_by,
    is_deleted: false,
    '_id': req.body._id
  };
  identification_documentsModel.findOneAndUpdate(query, { is_deleted: true }, { new: true, runValidators: true }, function (err, documentData) {
    if (err) {
      res.jsonp({
        code: Constant.ERROR_CODE,
        message: Constant.DOC_DELETE_UNSUCCESS
      });
    } else {
      if (documentData) {
        // console.log('document_path', documentData.document_path);
        var path = './api/uploads/Document/' + documentData.document_path;
        fs.stat(path, function (err, stats) {
          if (err) {
            res.jsonp({
              code: Constant.ERROR_CODE,
              message: Constant.DOC_DELETE_UNSUCCESS
            });
          }
          fs.unlink(path, function (err) {
            if (err) {
              res.jsonp({
                code: Constant.ERROR_CODE,
                message: Constant.DOC_DELETE_UNSUCCESS
              });
            }
            else {
              res.jsonp({
                code: Constant.SUCCESS_CODE,
                data: documentData,
                message: Constant.DOC_DELETE_SUCCESS,
              });
            }
          });
        });
      } else {
        res.jsonp({
          code: Constant.ERROR_CODE,
          message: Constant.DOC_ALREADY_DELETED
        });
      }
    }
  });
}

/**
 * function used to upload Document for chat
 * Date :- 20-Dec-2017
 * @author: Smartdata
 */
function uploadDocumentForChat(req, res) {
  var formData = {};
  var outputJSON = "";
  var folderData = {};
  var childFolderData = {};
  waterfall([
    function (callback) {
      formData = {
        document_name: '',
        document_path: '',
        picture_path: '',
        size: '',
        file: req.swagger.params.file.value,
      };
      callback(null, formData);
    },
    function (formData, callback) {
      console.log('formData', formData);
      if (formData.file) {
        var dir = './api/uploads/chat_document/';
        var mediaNameArr = formData.file.originalname.split('.');
        var mediaExt = mediaNameArr[1];
        var fileName = mediaNameArr[0];
        var date = new Date();
        var newDate = Date.now();
        formData.document_name = fileName + '.' + mediaExt;
        formData.msg = fileName + '.' + mediaExt;
        formData.picture_path = newDate + '.' + mediaExt;
        var temp_path = dir + formData.picture_path;
        formData.document_path = '/chat_document/';
        formData.size = formData.file.size / 1000;
        var data = formData.file.buffer;
        // fs.writeFile(temp_path, data, function (err, data) {
        //     if (err) {
        //         callback(err, false);
        //     } else {
        //         delete formData.file;
        //         callback(null, formData);
        //     }
        // });


        sharp(data)
          .resize(800)
          // .resize(320, 240)
          .toFile(temp_path, (err, info) => {
            if (err) {
              console.log('err => ', err);
              callback(err, false);
            } else {
              console.log('info => ', info);
              delete formData.file;
              callback(null, formData);
            }
          });
      } else {
        callback(null, formData);
      }
    }
  ],
    function (err, userData) {
      if (err) {
        outputJSON = {
          'code': Constant.ERROR_CODE,
          'message': Constant.ERROR_DOCUMENT_UPLOAD
        };
      } else {
        outputJSON = {
          'code': Constant.SUCCESS_CODE,
          'message': Constant.DOCUMENT_SUCCESS,
          'data': userData
        }
      }
      return res.send(outputJSON);
    });
}

/**
 * Function is use to all property details
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 */
function getFileBySearch(req, res) {

  var document_name = (req.body.document_name) ? req.body.document_name : '';
  // var cdate = (req.body.createdDate) ? new Date(req.body.createdDate) : '';

  var created_by = (req.body.created_by) ? req.body.created_by : '';
  var is_favorite = (req.body.is_favorite) ? req.body.is_favorite : '';

  var conditions = { "$and": [] };
  conditions["$and"].push({ "is_deleted": false });

  if (document_name)
    conditions["$and"].push({ "document_name": new RegExp(document_name, "i") });

  if (created_by)
    conditions["$and"].push({ "created_by": created_by });

  if (is_favorite)
    conditions["$and"].push({ "is_favorite": is_favorite });

  if (req.body.createdDate) {
    // var searchDate ;
    // searchDate = (cdate).setDate(cdate.getDate() + 1);
    // conditions["$and"].push({"createdDate":{'$lte': new Date(searchDate)}});

    var start = moment(req.body.createdDate).startOf('day').format(); // set to 12:00 am today
    var end = moment(req.body.createdDate).endOf('day').format(); // set to 23:59 pm today
    conditions["$and"].push({ "createdDate": { '$gte': new Date(start), '$lte': new Date(end) } });

  }

  documentsModel.find(conditions).exec(function (err, fileData) {
    if (err) {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.ERROR_RETRIVING_DATA
      });
    } else {
      res.json({
        code: 200,
        message: Constant.PROPERTY_SUCCESS_GOT_DATA,
        data: fileData
      });
    }
  });
}
/**
 * Function is use to all property details
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 */
function getPropertyForAgentRemoval(req, res) {

  // var agency_id = (typeof req.body.agency_id != 'undefined') ? req.body.agency_id : '';
  var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
  var request_by_role = (typeof req.body.request_by_role != 'undefined') ? req.body.request_by_role : '';
  var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
  var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 100;

  var conditions = { "$and": [] };
  conditions["$and"].push({ "is_deleted": false });

  if (request_by_role == Constant.OWNER && user_id) {
    conditions["$and"].push({ "owned_by": user_id });
    conditions["$and"].push({ "created_by": { $ne: user_id } });
  }

  if (request_by_role == Constant.OWNER && user_id) {
    waterfall([
      function (callback) {
        propertyModel.find(conditions, '_id address created_by')
          .populate("created_by", "firstname lastname image")
          .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
          .sort({ created: -1 }).exec(function (err, property) {
            if (err) {
              callback(err);
            } else {
              callback(null, property);
            }
          });
      },
      function (arg1, callback) {
        var favArray = [];
        if (arg1.length > 0) {
          var newItem = JSON.stringify(arg1);
          var newItem = JSON.parse(newItem);

          async.each(newItem, function (item, asyncCall) {
            favourites.findOne({
              "is_deleted": false,
              "fav_to_property": mongoose.Types.ObjectId(item._id),
              "fav_by": mongoose.Types.ObjectId(user_id)
            },
              { fav_status: 1 })
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
          }, function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, newItem);
            }
          });
        } else {
          callback(null, arg1);
        }
      },
    ], function (err, result) {
      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      } else {
        res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
      }
    });
  } else {
    res.json({ code: Constant.SUCCESS_CODE, message: Constant.ONLY_OWNER_ALLOWED });
  }
}
/**
* Function is use to get the user related to the property
* @access private
* @return json
* Created by 
* @smartData Enterprises (I) Ltd
*/
function getPropertyRelatedUser(req, res) {
  var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
  var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 100;
  if (req.body.property_ids) {
    var propertyIds = req.body.property_ids;
    // console.log('propertyIds', propertyIds);
    waterfall([
      function (callback) {
        // if(is_agent&&is_tenant&&is_owner){
        propertyModel.find({ _id: { $in: propertyIds }, save_as_draft: false, is_deleted: false }, '_id address tittle city state')
          .populate("owned_by", "firstname lastname image")
          .populate("created_by", "firstname lastname image")
          .populate({ path: 'created_by_agency_id', select: 'name', populate: { path: 'principle_id' } })
          .limit(parseInt(number_of_pages)).skip(page_number * number_of_pages)
          .sort({ created: -1 }).exec(function (err, property) {
            if (err) {
              callback(err);
              // console.log('err', err);
            } else {
              callback(null, property);
              //console.log('property',property);
            }
          });
        // }
      },
      function (arg1, callback) {
        // console.log('arg1', arg1);

        // var favArray = [];
        // if(arg1.length > 0){
        //     var newItem  = JSON.stringify(arg1);
        //     var newItem  = JSON.parse(newItem);
        //     async.each(newItem, function(item, asyncCall) {

        //         favourites.findOne({"is_deleted": false,
        //         "fav_to_property": mongoose.Types.ObjectId(item._id),
        //         "fav_by": mongoose.Types.ObjectId(user_id)},
        //         {fav_status: 1 })
        //         .sort({createdAt: -1 }).exec(function(err, fav) {
        //             if (err) {
        //                 item.is_fav = 2;
        //                 favArray.push(item);
        //                 asyncCall(null, favArray);
        //             } else {
        //                 if (fav) {
        //                    item.is_fav = fav.fav_status;
        //                    favArray.push(item);
        //                    asyncCall(null, favArray);
        //                 } else {
        //                    item.is_fav = 2;
        //                    favArray.push(item);
        //                    asyncCall(null, favArray);
        //                 }
        //             }
        //         });
        //     }, function (err) {
        //         if (err) {
        //             callback(err);
        //         } else {
        //             callback(null, newItem);
        //         }
        //     });
        // }else{
        //     callback(null,arg1);
        // }
      },
    ], function (err, result) {
      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      } else {
        res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
      }
    });
  }
}


/**
 * Function is use to get single  property for uploading document
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 * Created Date 3-Aug-2017
 */

function getPropertyDataForUploadingDoc(req, res) {
  propertyModel.find({ '_id': req.body.propertyId, "is_deleted": false }, '_id address owned_by property_id').
    populate('owned_by', 'firstname lastname image')
    .exec(function (err, property) {
      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      } else if (property && property.length) {
        res.json({ code: Constant.SUCCESS_CODE, data: property, message: Constant.PROPERTY_SUCCESS_GOT_DATA });
      } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      }
    });
}


/**
 * Function is use to permission to view property confidential data
 * @access private
 * @return json
 * Created by 
 * @smartData Enterprises (I) Ltd
 */
function checkUserAssociationWithProperty(req, res) {

  var agency_id = (typeof req.body.agency_id != 'undefined') ? mongoose.Types.ObjectId(req.body.agency_id) : '';
  var user_id = (typeof req.body.user_id != 'undefined') ? mongoose.Types.ObjectId(req.body.user_id) : '';
  var request_by_role = (typeof req.body.request_by_role != 'undefined') ? mongoose.Types.ObjectId(req.body.request_by_role) : '';
  var property_id = (typeof req.body.property_id != 'undefined') ? mongoose.Types.ObjectId(req.body.property_id) : '';
  var associated = {};

  var conditions = { "$and": [] };
  conditions["$and"].push({ "is_deleted": false });

  if (request_by_role == Constant.OWN_AGENCY && agency_id)
    conditions["$and"].push({ "created_by_agency_id": agency_id, "_id": property_id });

  if (request_by_role == Constant.AGENT && user_id)
    conditions["$and"].push({ "created_by": user_id, "_id": property_id });

  if (request_by_role == Constant.OWNER && user_id)
    conditions["$and"].push({ "owned_by": user_id, "_id": property_id });

  if (request_by_role == Constant.TENANT && user_id) {

    InvitationInfo.findOne({ invited_to: user_id, deleted: false, status: true, property_id: property_id }).exec(function (err, property) {
      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      } else if (property) {
        associated.status = true;
        res.json({ code: Constant.SUCCESS_CODE, data: associated, message: Constant.USER_PROPERTY_RELATION_SUCCESS });
      } else {
        associated.status = false;
        res.json({ code: Constant.SUCCESS_CODE, data: associated, message: Constant.USER_PROPERTY_RELATION_UNSUCCESS });
      }

    });

  }

  else if (request_by_role == Constant.TRADER && user_id) {
    associated.status = false;
    res.json({ code: Constant.SUCCESS_CODE, data: associated, message: Constant.USER_PROPERTY_RELATION_UNSUCCESS });
  }
  else if ((request_by_role == Constant.RUN_STRATA_MANAGEMENT_COMPANY || request_by_role == Constant.WORK_FOR_STRATA_MANAGEMENT_COMPANY) && user_id) {
    associated.status = false;
    res.json({ code: Constant.SUCCESS_CODE, data: associated, message: Constant.USER_PROPERTY_RELATION_UNSUCCESS });
  }
  else {
    waterfall([
      function (callback) {
        propertyModel.findOne(conditions)
          .populate("owned_by", "firstname lastname image")
          .exec(function (err, property) {
            if (err) {
              callback(err);
            } else if (property) {
              associated.status = true;
              callback(null, associated);
            } else {
              associated.status = false;
              callback(null, associated);
            }
          });
      },
    ], function (err, result) {
      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      } else {
        res.json({ code: Constant.SUCCESS_CODE, data: result, message: Constant.USER_PROPERTY_RELATION_STATUS });
      }
    });
  }
}

/**
 * Function is use to get Application List based on property id
 * @access private
 * @return json
 * Created by KEK
 * @Narola
 */

function getpropertyApplicationByPropertyid(req, res) {
  // console.log("This is called");
  if (req.body.propertyId) {
    var outputJSON = {};
    waterfall([
      function (callback) {
        // console.log("function callback");
        application.find({ "property_id": mongoose.Types.ObjectId(req.body.propertyId), "is_deleted": false })
          .populate('created_by', 'firstname lastname image')
          .lean()
          .exec(function (err, data) {
            if (err) {
              callback(err);
            } else {
              callback(null, data);
            }
          });
      },
      function (arg1, callback) {
        if (typeof arg1 != 'undefined') {
          if (arg1.length > 0) {
            var data = [];
            async.each(arg1, function (values, asyncCall2) {
              reviews.find({ review_to: values.created_by._id, is_deleted: false }).lean().exec(function (err, review_data) {

                if (err) {
                  asyncCall2(err);
                } else {
                  // console.log(":1:");
                  var newItem = JSON.stringify(review_data);
                  var newItem = JSON.parse(newItem);
                  if (review_data.length > 0) {
                    // console.log(":2:");
                    var finalResponseNew = [];
                    var finalResponse = [];
                    async.each(review_data, function (item, asyncCall) {
                      var totalReviewLength = review_data.length;
                      var temp = 0;
                      // console.log(":3:");
                      async.each(review_data, function (innerItem, asyncCallInner) {
                        temp = temp + innerItem.avg_total;
                        finalResponse.push(temp);
                        asyncCallInner();
                      }, function (err) {
                        if (err) {
                          asyncCall(err);
                        } else {
                          // console.log(":4:");
                          var tot = finalResponse.length;
                          var finalTotalCnt = (finalResponse.length > 0) ? finalResponse[tot - 1] : 0;
                          var averageRate = finalTotalCnt / totalReviewLength;

                          item.averageRate = Math.round(averageRate);
                          item.totalReviewLength = totalReviewLength;
                          finalResponseNew.push(item);
                          asyncCall(null);
                        }
                      });
                    }, function (err) {
                      if (err) {
                        asyncCall2(err);
                      } else {
                        values.averageRate = finalResponseNew[0].averageRate;
                        values.totalReviewLength = finalResponseNew[0].totalReviewLength;
                        data.push(values);
                        // callback(null);
                        asyncCall2(null);
                      }
                    });
                  } else {
                    // callback(null, arg1);
                    data.push(values);
                    asyncCall2(null);
                  }
                }
              });
            }, function (err) {
              if (err) {
                callback(err);
              } else {
                callback(null, data);
              }
            });
          } else {
            res.json({ code: Constant.ERROR_CODE, message: "No data found" });
          }
        } else {
          callback(null, arg1);
        }
      },
    ], function (err, result) {
      // console.log("appl err : ", err);
      if (err) {
        res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
      } else {
        res.json({ code: Constant.SUCCESS_CODE, data: result });
      }
    });
  } else {
    // console.log("I m in else part");
    res.json({ code: Constant.NOT_FOUND, message: Constant.ERROR_RETRIVING_DATA });
  }
}

/**
 * Function is use to get Application details
 * @access private
 * @return json
 * Created by KEK
 * @Narola
 */

function getpropertyApplicationByid(req, res) {

  var outputJSON = {};
  var query = {
    '_id': req.body.applicationId,
    is_deleted: false
  };

  async.waterfall([
    function (callback) {
      application.findOne(query)
        .populate('created_by')
        .populate('property_id')
        .populate('document_id')
        .lean()
        .exec(function (err, propetyApplicationData) {
          if (err) {
            // console.log("errr : ", err);
            outputJSON = {
              'code': Constant.ERROR_CODE,
              'message': Constant.ERROR_RETRIVING_DATA
            };
            callback(outputJSON);
          } else {
            // console.log("propetyApplicationData    ", propetyApplicationData);
            outputJSON = {
              'code': Constant.SUCCESS_CODE,
              'message': Constant.PROPERTY_APPLICATION_RETRIEVE_SUCCESS,
              'data': propetyApplicationData
            }
            callback(null, outputJSON)
          }
        });
    }, function (applicationData, callback) {
      reviews.find({ review_to: applicationData.data.created_by._id, is_deleted: false }).exec(function (err, review_data) {
        if (err) {
          callback(err);
        } else {
          if (review_data.length > 0) {
            let temp = 0;
            let total = 0;
            async.each(review_data, function (innerItem, asyncCallInner) {
              temp = temp + innerItem.avg_total;
              total += 1;
              asyncCallInner(null);
            }, function (err) {
              if (err) {
                callback(err);
              } else {
                let review = 0;
                if (total > 0) {
                  review = Math.round(temp / total);
                }
                applicationData.data.created_by.averageRate = review;
                applicationData.data.created_by.total_review = total;
                callback(null, applicationData);
              }
            });

          } else {
            applicationData.data.created_by.averageRate = 0;
            callback(null, applicationData);
          }
        }
      });
    }
  ], function (err, resp) {
    if (err) {
      // send error resp
      res.jsonp(err);
    } else {
      res.jsonp(resp);
    }
  });
}


function updateapplicationStatus(req, res) {
  if (req.body && req.body.status && (req.body.status == "1" || req.body.status == "2") && req.body.applicationId && req.body.applicant_email_id) {
    var application_status = "";
    if (req.body.status == "1")
      application_status = "approved";
    else if (req.body.status == "2")
      application_status = "declined";

    var firstname = req.body.firstname;

    applicationModel.findOneAndUpdate(
      {
        "_id": mongoose.Types.ObjectId(req.body.applicationId),
        "is_deleted": false
      },
      {
        $set: {
          "status": req.body.status
        }
      },
      { new: true, runValidators: true }, function (err, applicationData) {
        if (err) {
          res.json({
            code: Constant.ERROR_CODE,
            message: Constant.UPDATE_UNSUCCESSFULL
          });
        } else {

          var mailOptions = {
            from: Config.EMAIL_FROM, // sender address
            to: req.body.applicant_email_id, // list of receivers
            subject: 'Application has been ' + application_status,  // Subject line
            text: 'Application Status', // plaintext body
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
              '<p><strong> Hi' + ' ' + changeCase.titleCase(req.body.firstname) + ',' + '</strong></p>' +
              ' <p><br /> Your application has been ' + application_status +
              '.</p>' +
              '<p><a target="_blank" href="' + Constant.STAGGING_URL + '#!/view_application/' + req.body.applicationId + '">' + 'Application Details' + '</a><br /></p>' +
              '<p><a target="_blank" href="' + Constant.STAGGING_URL + '#!/login' + '">' + 'Click here to login' + '</a><br /></p>' +
              '<p></p>' +
              '<p></p>' +
              '<p><br />Thanks for choosing Ownly,</p>' +
              '<p>Ownly Team.</p>' +
              '</td>' +
              '</tr>' +
              '</table>' +
              '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
              '<tr>' +
              '<td>' +
              '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© ' +
              Config.CURRENT_YEAR +
              ' <a href="#" style="text-decoration:none;color:#fff;">syncitt.com</a>' +
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
          };
          transporter.sendMail({
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject,
            html: mailOptions.html,
          }, function (error, response) {
            if (error) {
              // console.log("mail not sent");
            } else {
              // console.log("mail sent");
            }
          });

          application.find({ _id: mongoose.Types.ObjectId(req.body.applicationId) })
            .exec(function (err, data) {
              if (err) {

              } else {
                if (!data) {

                } else {
                  // console.log("data================");
                  // console.log(data);
                  res.json({
                    code: Constant.SUCCESS_CODE,
                    data: data,
                    message: Constant.UPDATE_SUCCESSFULL,
                  });
                }
              }
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
