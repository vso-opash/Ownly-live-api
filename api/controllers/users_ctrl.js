'use strict'

var mongoose = require('mongoose'),
  User = mongoose.model('User'),
  SubscriptionPlan = require('../models/SubscriptionPlan'),
  SubscriptionLog = require('../models/SubscriptionLog'),
  Agencies = require('../models/Agencies'),
  Chats = mongoose.model('Chats'),
  Group = mongoose.model('Group'),
  Category = mongoose.model('services_cats'),
  Subcategories = require('../models/SubCategories'),
  Admin = require('../models/Admin'),
  Constant = require('../../config/constant.js'),
  propertyModel = require('../models/Properties'),
  Notification = mongoose.model('Notification'),
  InvitationInfo = mongoose.model('invitations'),
  formidable = require('formidable'),
  util = require('util'),
  fs = require('fs-extra'),
  SentEmail = require('../models/sentEmail'),
  path = require('path'),
  Config = require('../../config/config.js'),
  async = require('async'),
  forEach = require('async-foreach').forEach,
  slug = require('slug'),
  csv = require('fast-csv'),
  randomString = require('random-string'),
  fs = require('fs-extra'),
  // stripe = require('stripe')('sk_test_GoLFgKL6HJhNsCQ2lFLxcTbO00tdgykfrB'),
  // stripe = require('stripe')('sk_live_fyC4be1evYk9IVZBUxyMsj4o00mpjHPG5Q'),

  stripe = require('stripe')(global.gConfig.stripeSecretKey),
  request = require('request')
// console.log('global.gConfig.stripeSecretKey => ', global.gConfig.stripeSecretKey);
var d = new Date()
var _ = require('underscore')
var lodash = require('lodash')
var sendmail = require('sendmail')()
var currentYear = d.getFullYear()
var moment = require('moment')
var waterfall = require('run-waterfall')
var nodemailer = require('nodemailer')
var smtpTransport = require('nodemailer-smtp-transport')

var validator = require('../../config/validator.js')
var bcrypt = require('bcrypt')

var transporter = nodemailer.createTransport(
  smtpTransport('smtp://' + Config.SMTP.authUser + ':' + Config.SMTP.authpass + '@smtp.gmail.com')
)

module.exports = {
  addUser: addUser,
  getUnreadChat: getUnreadChat,
  getChatUsers: getChatUsers,
  getMessageChatUsers: getMessageChatUsers,
  updateProfile: updateProfile,
  updateUserPropertyByAdmin: updateUserPropertyByAdmin,
  updateUserLocation: updateUserLocation,
  getUserDetails: getUserDetails,
  updateUserPic: updateUserPic,
  updateAvatarPic: updateAvatarPic,
  changePassword: changePassword,
  adminGetUserList: adminGetUserList,
  getUserImage: getUserImage,
  adminDeleteUser: adminDeleteUser,
  admin_getRegisteredUsersCount: admin_getRegisteredUsersCount,
  adminUpdateProfile: adminUpdateProfile,
  updateAdminPic: updateAdminPic,
  admin_getUserDetail: admin_getUserDetail,
  admin_searchUser: admin_searchUser,
  admin_getAdminDetail: admin_getAdminDetail,
  adminOwnProfileUpdation: adminOwnProfileUpdation,
  updateUserProfile: updateUserProfile,
  admin_addUserProfilePic: admin_addUserProfilePic,
  changePasswordAdmin: changePasswordAdmin,
  uploadUserPropertyImage: uploadUserPropertyImage,
  userDataOnRegistrationPage: userDataOnRegistrationPage,
  saveInvitedUserPassword: saveInvitedUserPassword,
  uploadMobileUserPropertyImage: uploadMobileUserPropertyImage,
  softDeleteUser: softDeleteUser,
  updateUserBannerImage: updateUserBannerImage,
  SendEmailToSeller: SendEmailToSeller,
  updateAgentExistingPropertyImage: updateAgentExistingPropertyImage,
  updateAvailability: updateAvailability,
  updateDocumentationStatus: updateDocumentationStatus,
  updateOccupacy: updateOccupacy,
  updateMessageAsRead: updateMessageAsRead,
  updateRevealContactNumber: updateRevealContactNumber,
  importCategoriesCSV: importCategoriesCSV,
  subscription_plan_list: subscription_plan_list,
  stripe_subscription: stripe_subscription,
  update_stripe_card_details: update_stripe_card_details,
  cancelSubscription: cancelSubscription,
  addUserDefaultRole: addUserDefaultRole,
  removeDuplicateGroups: removeDuplicateGroups,
}

/* Function to getall unread chat
   Required param - user id
   Response - Send users list as response
   Created date - 19-Jan-2017
   Created By - Rahul Lahariya
   @access Private
*/
function getUnreadChat(req, res) {
  if (mongoose.Types.ObjectId.isValid(req.swagger.params.id.value)) {
    var user_id = mongoose.Types.ObjectId(req.swagger.params.id.value)
    Chats.aggregate(
      { $match: { to: user_id, isRead: false } },
      {
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'users',
        },
      },
      {
        $project: {
          _id: 1,
          from: 1,
          to: 1,
          msg: 1,
          time: 1,
          users: { _id: 1, firstname: 1, lastname: 1, image: 1, is_online: 1 },
        },
      },
      {
        $group: {
          _id: '$from',
          from: { $last: '$from' },
          msg: { $last: '$msg' },
          time: { $last: '$time' },
        },
      },
      { $sort: { time: -1 } },
      { $limit: 5 }
    ).exec(function (err, usersList) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        Chats.populate(
          usersList,
          { path: 'from ', select: '_id firstname lastname image is_online' },
          function (err, results) {
            if (err) {
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR,
              })
            } else {
              res.json({ code: Constant.SUCCESS_CODE, data: results })
            }
          }
        )
      }
    })
  } else {
    res.json({
      code: Constant.NOT_FOUND,
      message: Constant.ERROR_RETRIVING_DATA,
    })
  }
}

/* Function to get all  chat users according to repective Roles
   Required param - User Id, User Roles and agency id(not mendatory)
   Response - Send users list as response
   Created date - 18-Jan-2017
   Created By - Rahul Lahariya
   @access Private
*/
function getChatUsers(req, res) {
  var user_id = typeof req.body.user_id != 'undefined' ? req.body.user_id : ''
  var firstname = typeof req.body.firstname != 'undefined' ? req.body.firstname : ''
  var lastname = typeof req.body.lastname != 'undefined' ? req.body.lastname : ''
    ; (async () => {
      let aggregate = [
        {
          $match: {
            $or: [
              {
                from: mongoose.Types.ObjectId(user_id),
              },
              {
                to: mongoose.Types.ObjectId(user_id),
              },
            ],
          },
        },
        // { $lookup: { from: 'groups', localField: 'group_id', foreignField: 'user_id', as: 'groups' } },
        {
          $lookup: {
            from: 'users',
            localField: 'from',
            foreignField: '_id',
            as: 'user1',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'to',
            foreignField: '_id',
            as: 'user2',
          },
        },
        {
          $project: {
            items: {
              $concatArrays: ['$user1', '$user2'],
            },
            chat_id: '$_id',
            chat_message: '$msg',
            chat_time: '$time',
            isRead: '$isRead',
            is_message: {
              $cond: { if: '$is_message', then: true, else: false },
            },
            created: '$created',
          },
        },
        {
          $unwind: '$items',
        },
        // { $lookup: { from: 'groups', localField: 'items._id', foreignField: 'user_id', as: 'groups' } },
        {
          $project: {
            firstname: '$items.firstname',
            lastname: '$items.lastname',
            full_name: { $concat: ['$items.firstname', ' ', '$items.lastname'] },
            about_user: '$items.about_user',
            // groups: "$groups",
            created: '$created',
            image: '$items.image',
            is_online: '$items.is_online',
            _id: '$items._id',

            chat_id: '$_id',
            chat_message: '$chat_message',
            chat_time: '$chat_time',
            isRead: '$isRead',
            is_message: '$is_message',
          },
        },
        {
          $match: {
            _id: { $ne: mongoose.Types.ObjectId(user_id) },
          },
        },
        {
          $sort: { created: -1 },
        },
      ]

      var propertyData = await Chats.aggregate(aggregate)
      if (propertyData && propertyData.length > 0) {
        return res.json({
          code: Constant.SUCCESS_CODE,
          data: lodash.uniqBy(propertyData, (obj) => [lodash.get(obj, '_id', '')].join()),
          message: 'success',
        })
      } else {
        res.json({ code: Constant.ERROR_CODE, message: 'No result found' })
      }
    })()
}
// function getChatUsers(req, res) {

//     var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
//     var firstname = (typeof req.body.firstname != 'undefined') ? req.body.firstname : '';
//     var lastname = (typeof req.body.lastname != 'undefined') ? req.body.lastname : '';

//     var conditions = { "$and": [] };
//     conditions["$and"].push({ "is_deleted": false, "is_active": true, "_id": { $ne: mongoose.Types.ObjectId(user_id) } });

//     if (firstname)
//         conditions["$and"].push({ "firstname": { $regex: new RegExp(firstname, "i") } });
//     if (lastname)
//         conditions["$and"].push({ "lastname": { $regex: new RegExp(lastname, "i") } });

//     waterfall([
//         function (callback) {

//             User.aggregate(
//                 { $match: conditions }, // Match me
//                 { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
//                 { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
//                 {
//                     $project: {
//                         _id: 1,
//                         firstname: 1, lastname: 1, about_user: 1, image: 1, is_online: 1,
//                         groups: { _id: 1, role_id: 1, status: 1, deleted: 1 }
//                     }
//                 },
//                 // { $sort: { "createdAt": 1 } }
//             ).exec(function (err, userList) {
//                 if (err) {
//                     callback(err);
//                 } else {
//                     callback(null, userList);
//                 }
//             });
//         }, function (arg1, callback) {
//             if (arg1.length > 0) {
//                 var finalResponse = [];
//                 async.each(arg1, function (item, asyncCall) {
//                     item.full_name = item.firstname + " " + item.lastname;
//                     Chats.findOne({
//                         $or: [{
//                             from: mongoose.Types.ObjectId(user_id), to: mongoose.Types.ObjectId(item._id)
//                         }, {
//                             to: mongoose.Types.ObjectId(user_id), from: mongoose.Types.ObjectId(item._id)
//                         }],
//                         // isRead: false
//                     })
//                         .limit(parseInt(1)).sort({ _id: -1, created: -1 })
//                         .exec(function (err, data) {
//                             // console.log("Data",data);
//                             if (err) {
//                                 item.chat_message = '';
//                                 item.chat_time = '';
//                                 // item._id = null;
//                                 item.created = '';
//                                 item.isRead = '';
//                                 finalResponse.push(item);
//                                 asyncCall(null, finalResponse);
//                             } else {
//                                 if (data) {
//                                     item.chat_message = (typeof data.msg != 'undefined') ? data.msg : '';
//                                     item.chat_time = (typeof data.time != 'undefined') ? data.time : '';
//                                     item.is_message = (data.is_message) ? data.is_message : false;
//                                     item.chat_id = data._id;
//                                     item.created = (typeof data.created != 'undefined') ? data.created : '';
//                                     item.isRead = (typeof data.isRead != 'undefined') ? data.isRead : '';
//                                     finalResponse.push(item);
//                                     asyncCall(null, finalResponse);
//                                 } else {
//                                     item.chat_message = '';
//                                     item.chat_time = '';
//                                     item.isRead = '';
//                                     // item._id = null;
//                                     item.created = '';
//                                     item.chat_id = '';
//                                     finalResponse.push(item);
//                                     asyncCall(null, finalResponse);
//                                 }
//                             }
//                         });
//                 }, function (err) {
//                     if (err) {
//                         callback(err);
//                     } else {

//                         var finalResponse_ = lodash.sortBy(finalResponse, 'chat_id', 'desc');
//                         finalResponse_ = finalResponse_.reverse();
//                         callback(null, finalResponse_);
//                         // callback(null, finalResponse_);
//                     }
//                 });
//             } else {
//                 callback(null, []);
//             }
//         }
//     ], function (err, result) {
//         if (err) {
//             res.json({ code: Constant.ERROR_CODE, message: Constant.ERROR_RETRIVING_DATA });
//         } else {
//             res.json({ code: Constant.SUCCESS_CODE, data: result });
//         }
//     });

// }

/* Function to get all  chat users according to repective Roles
   Required param - User Id, User Roles and agency id(not mendatory)
   Response - Send users list as response
   Created date - 18-Jan-2017
   Created By - Rahul Lahariya
   @access Private
*/
function getMessageChatUsers(req, res) {
  var user_id = typeof req.body.user_id != 'undefined' ? req.body.user_id : ''
  var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0
  var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 10
  var outputJSON = {}
  var query = {
    $or: [
      {
        'to_users.users_id': mongoose.Types.ObjectId(user_id),
        from_user: mongoose.Types.ObjectId(user_id),
      },
      {
        from_user: mongoose.Types.ObjectId(user_id),
        'to_users.users_id': mongoose.Types.ObjectId(user_id),
      },
    ],
    type: Constant.NOTIFICATION_TYPE_CONTACT_MESSAGE,
    deleted: false,
  }
  Notification.find(query)
    .populate('from_user')
    .populate('to_users.users_id')
    .limit(parseInt(number_of_pages))
    .sort({ createdAt: 1 })
    .exec(function (err, notificationData) {
      if (err) {
        outputJSON = {
          code: Constant.ERROR_CODE,
          message: Constant.ERROR_RETRIVING_DATA,
        }
      } else {
        outputJSON = {
          code: Constant.SUCCESS_CODE,
          data: notificationData,
        }
      }
      res.jsonp(outputJSON)
    })
}

/**
 * Function is use to add new user
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Jan-2017
 */
function addUser(req, res) {
  if (req.body.email && req.body.password && req.body.firstname && req.body.lastname) {
    if (validator.isEmail(req.body.email)) {
      User.findOne({ email: req.body.email }, { email: 1 }, function (err, email) {
        if (err) {
          res.json({
            code: Constant.ERROR_CODE,
            message: Constant.INTERNAL_ERROR,
          })
        } else {
          if (email) {
            res.json({
              code: Constant.ERROR_CODE,
              message: Constant.EMAIL_ALREADY_EXIST,
            })
          } else {
            var userData = {
              password: req.body.password,
              firstname: req.body.firstname,
              lastname: req.body.lastname,
              email: req.body.email,
              status: false,
              is_deleted: false,
            }
            var UsersRecord = new User(userData)
            // call the built-in save method to save to the database
            UsersRecord.save(function (err, userRecord) {
              if (err) {
                res.json({
                  code: Constant.ERROR_CODE,
                  message: Constant.INTERNAL_ERROR,
                })
              } else {
                if (userRecord) {
                  var userInfo = {
                    userId: userRecord._id,
                    firstname: userRecord.firstname,
                    lastname: userRecord.lastname,
                    email: userRecord.email,
                  }
                }
                var mailOptions = {
                  from: Config.EMAIL_FROM, // sender address
                  to: req.body.email, // list of receivers
                  subject: 'Account has been added successfully', // Subject line
                  text: 'Account registered', // plaintext body
                  html:
                    '<table border="0" cellpadding="0" cellspacing="0" width="100%">\n\
                                            <tbody><tr><td>\n\
                                        <table align="center" border="0" cellpadding="5" cellspacing="0" style="width:640px;background-color:rgb(57,65,81);">\n\
                                        <tbody><tr>\n\
                                        <td></td>\n\
                                        </tr></tbody></table>\n\
                                        <table align="center" border="0" cellpadding="10" cellspacing="0" style="width:640px;background-color:#fff">\n\
                                        <tbody><tr><td>\n\
                                        <p>Hello ' +
                    req.body.firstname +
                    ',</p>\n\
                                        <p><br />Congratulations! Your account successfully registered with {{XYZ}}. Please activate your account by clicking the link below to start using registered account:</p>\n\
                                        <p><a target="_blank" href="' +
                    Constant.STAGGING_URL +
                    '/userActivation/' +
                    userRecord._id +
                    '">' +
                    Constant.STAGGING_URL +
                    '/userActivation/' +
                    userRecord._id +
                    '</a><br /><br /></p>\n\
                                        <p>Sincerely,<br />{{XYZ}}</p>\n\
                                        <div style="border-bottom: 2px solid rgb(57,65,81); height: 0px;">&nbsp;</div>\n\
                                        <p>Copyright &copy; ' +
                    currentYear +
                    ' {{XYZ}}.</p>\n\
                                        </td></tr></tbody></table></td></tr>\n\
                                        </tbody></table>', // html body
                }

                // send mail with defined transport object
                // transporter.sendMail(mailOptions, function (error, response) {
                //     if (error) {
                //         //console.log(error);
                //         res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                //     } else {
                //         //console.log("Message sent: Successfully");
                //         res.json({ code: Constant.SUCCESS_CODE, message: Constant.ACCOUNT_REGISTERED, data: userInfo });
                //     }
                // });
                sendmail(
                  {
                    from: mailOptions.from,
                    to: mailOptions.to,
                    subject: mailOptions.subject,
                    html: mailOptions.html,
                  },
                  function (error, response) {
                    if (error) {
                      //console.log(error);
                      res.json({
                        code: Constant.SUCCESS_CODE,
                        message: Constant.ACCOUNT_REGISTERED,
                        data: userInfo,
                      })
                    } else {
                      //console.log("Message sent: Successfully");
                      res.json({
                        code: Constant.SUCCESS_CODE,
                        message: Constant.ACCOUNT_REGISTERED,
                        data: userInfo,
                      })
                    }
                  }
                )
              }
            })
          }
        }
      })
    } else {
      res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL })
    }
  } else {
    res.json({
      code: Constant.ERROR_CODE,
      message: Constant.REQUIRED_REGISTER_FIELDS,
    })
  }
}

/**
 * Function is use to update user info by id
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Jan-2017
 */
function updateProfile(req, res) {
  if (req.body.firstname && req.body.lastname && req.body.userId) {
    var updateUserRecord = {
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      dob: req.body.dob,
      gender: req.body.gender,
      name: req.body.firstname + ' ' + req.body.lastname,
      marital_status: req.body.marital_status,
      email: req.body.email.toLowerCase(),
      mobile_no: req.body.mobile_no,
    }
    // console.log('updateUserRecord', updateUserRecord);
    User.update({ _id: req.body.userId }, { $set: updateUserRecord }, function (err) {
      if (err) {
        // console.log('err', err);
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.UPDATE_USER_PROFILE_SUCCESS,
        })
      }
    })
  } else {
    res.json({
      code: Constant.ERROR_CODE,
      message: Constant.REQUIRED_PROFILE_INFO,
    })
  }
}

/**
 * Function is use to update user info by id
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Jan-2017
 */
function updateUserLocation(req, res) {
  if (req.body.userId) {
    var updateUserRecord = {
      phone_number: req.body.phone_number,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country,
      zip: req.body.zip,
    }
    User.update({ _id: req.body.userId }, { $set: updateUserRecord }, function (err) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.UPDATE_USER_LOCATION_SUCCESS,
        })
      }
    })
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.USER_ID_REQUIRED })
  }
}

/**
 * Function is use to update user profile pic
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Jan-2017
 */
// function updateUserPic(req, res) {
//     var timestamp = Number(new Date()); // current time as number
//     //console.log(req.swagger.params.file.value);
//     var file = req.swagger.params.file.value;
//     var userId = req.swagger.params.id.value;
//     var filename = +timestamp + '_' + file.originalname;
//     var imagePath = "./images/user/" + timestamp + '_' + file.originalname;
//     fs.writeFile(path.resolve(imagePath), file.buffer, function(err) {
//         if (err) {
//             res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
//         } else {
//             var UserImage = {
//                 image: Config.WEB_URL + "/images/user/" + filename
//             };
//             User.update({ _id: userId }, { $set: UserImage }, function(err) {
//                 if (err) {
//                     res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
//                 } else {
//                     res.json({ code: Constant.SUCCESS_CODE, message: Constant.UPDATE_PROFILE_PIC_SUCCESS });
//                 }
//             });
//         }
//     });
// }

function updateUserPic(req, res) {
  // console.log('called : ', req.body);
  // console.log('files : ', req.files);
  // console.log("Swagger : ", req.swagger.params.file.value);
  var formData = {}
  var outputJSON = {}
  var userSavedObj = {}
  var validFileExt = ['jpeg', 'jpg', 'png', 'gif']
  waterfall(
    [
      function (callback) {
        var uploaded_file = req.swagger.params.file.value
        formData = {}
        var file = uploaded_file
        if (file.size < 10574919) {
          var mimeExtension = file.mimetype.split('/')
          if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
            callback(null, file)
          } else {
            callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false)
          }
        } else {
          callback('Upload file must be less than 10 MB', false)
        }
      },
      function (file, callback) {
        if (file) {
          var timestamp = Number(new Date()) // current time as number
          var splitFile = file.originalname.split('.')
          var filename =
            +timestamp + '.' + (splitFile.length > 0 ? splitFile[splitFile.length - 1] : file.originalname)
          var dir = './api/uploads/users'
          var temp_path = dir + '/' + filename
          var data = file.buffer
          fs.writeFile(path.resolve(temp_path), data, function (err, data) {
            if (err) {
              callback(err, false)
            } else {
              callback(null, filename)
            }
          })
        } else {
          callback('No files selected', false)
        }
      },
      function (formData, callback) {
        var updateImage = []
        var imageData = {}
        userSavedObj._id = req.body._id
        if (userSavedObj._id) {
          var field = ''
          var query = {
            _id: userSavedObj._id,
          }
          delete formData._id
          User.findOne(query, function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              if (!data.image) {
                data.image = []
              }
              data.image = formData
              data.save(function (err, data) {
                if (err) {
                  callback(err, null)
                } else {
                  callback(null, data)
                }
              })
            }
          })
        }
      },
    ],
    function (err, userData) {
      if (err) {
        outputJSON = {
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        }
      } else {
        outputJSON = {
          code: Constant.SUCCESS_CODE,
          data: userData,
          message: Constant.UPLOAD_SUCCESSFULL,
        }
      }
      res.jsonp(outputJSON)
    }
  )
}

function updateAvatarPic(req, res) {
  // console.log("Swagger : ", req.swagger.params.file.value);

  let base64Image = req.swagger.params.file.value.split(';base64,').pop()

  var timestamp = Number(new Date()) // current time as number
  var dir = './api/uploads/users'
  var temp_path = dir + '/' + timestamp + '.jpeg'

  // console.log("Filename : ", temp_path);

  fs.writeFile(temp_path, base64Image, { encoding: 'base64' }, function (err) {
    var userSavedObj = {
      _id: req.body._id,
      image: timestamp + '.jpeg',
    }

    var outputJSON = {
      code: Constant.SUCCESS_CODE,
      message: Constant.UPLOAD_SUCCESSFULL,
    }
    if (userSavedObj._id) {
      var query = {
        _id: userSavedObj._id,
      }
      User.findOne(query, function (err, data) {
        if (err) {
          outputJSON = {
            code: Constant.ERROR_CODE,
            message: Constant.INTERNAL_ERROR,
          }
        } else {
          if (!data.image) {
            data.image = []
          }
          data.image = userSavedObj.image
          data.save(function (err, data) {
            if (err) {
              outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR,
              }
            } else {
              outputJSON.code = Constant.SUCCESS_CODE
              outputJSON.message = Constant.UPLOAD_SUCCESSFULL
              outputJSON.data = data
            }
          })
        }
      })
    } else {
      outputJSON = {
        code: Constant.ERROR_CODE,
        message: Constant.INTERNAL_ERROR,
      }
    }
    res.jsonp(outputJSON)
  })

  // var formData = {};
  // var outputJSON = {};
  // var userSavedObj = {};
  // var validFileExt = ['jpeg', 'jpg', 'png', 'gif'];
  // waterfall([
  //     function (callback) {
  //         var uploaded_file = req.swagger.params.file.value;
  //         formData = {};
  //         var file = uploaded_file;
  //         if (file.size < 10574919) {
  //             var mimeExtension = file.mimetype.split('/');
  //             if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
  //                 callback(null, file);
  //             } else {
  //                 callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false);
  //             }
  //         } else {
  //             callback('Upload file must be less than 10 MB', false);
  //         }
  //     },
  //     function (file, callback) {
  //         if (file) {
  //             var timestamp = Number(new Date()); // current time as number
  //             var splitFile = file.originalname.split('.');
  //             var filename = +timestamp + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
  //             var dir = './api/uploads/users';
  //             var temp_path = dir + '/' + filename;
  //             var data = file.buffer;
  //             fs.writeFile(path.resolve(temp_path), data, function (err, data) {
  //                 if (err) {
  //                     callback(err, false);
  //                 } else {
  //                     callback(null, filename);
  //                 }
  //             });
  //         } else {
  //             callback('No files selected', false);
  //         }
  //     },
  //     function (formData, callback) {
  //         var updateImage = [];
  //         var imageData = {};
  //         userSavedObj._id = req.body._id;
  //         if (userSavedObj._id) {
  //             var field = "";
  //             var query = {
  //                 _id: userSavedObj._id
  //             };
  //             delete formData._id;
  //             User.findOne(query, function (err, data) {
  //                 if (err) {
  //                     callback(err, null);
  //                 } else {
  //                     if (!data.image) {
  //                         data.image = [];
  //                     }
  //                     data.image = formData;
  //                     data.save(function (err, data) {
  //                         if (err) {
  //                             callback(err, null);
  //                         } else {
  //                             callback(null, data);
  //                         }
  //                     });
  //                 }
  //             });
  //         }
  //     }
  // ], function (err, userData) {
  //     if (err) {
  //         outputJSON = {
  //             code: Constant.ERROR_CODE,
  //             message: Constant.INTERNAL_ERROR
  //         };
  //     } else {
  //         outputJSON = {
  //             code: Constant.SUCCESS_CODE,
  //             data: userData,
  //             message: Constant.UPLOAD_SUCCESSFULL,
  //         };

  //     }
  //     res.jsonp(outputJSON);
  // });
}

/**
 * Function is use to fetch user details by ids
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Jan-2017
 */
function getUserDetails(req, res) {
  ; (async () => {
    let is_service_cat = lodash.get(req, "body.service_cat", true)
    // if (req.body.userId) {
    // User.findOne({ _id: req.body.userId, is_deleted: false })
    //     .populate('categories_id')
    //     .populate({ path: 'agency_id', populate: { path: 'principle_id', select: '_id email' } })
    //     .exec(function (err, userInfo) {
    //         if (err) {
    //             res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
    //         } else {
    //             res.json({ code: Constant.SUCCESS_CODE, message: Constant.USER_RECORD_FETCHED, data: userInfo });
    //         }
    //     });

    // } else {
    //     res.json({ code: Constant.ERROR_CODE, message: Constant.USER_ID_REQUIRED });
    // }
    console.log('req.body.userId  == get user Detail :: getUserDetails API ==>  ', req.body.userId)
    // console.log('req :: header 1=> ', req.connection.remteAddress);
    // console.log('req :: header 2=> ', req.headers['x-forwarded-for']);
    if (req.body.userId) {
      // Old code
      // const checkData = await User.findById(req.body.userId).exec();
      // console.log('checkData => ', checkData);
      // var conditions = { "$and": [] };
      // conditions["$and"].push({ "groups.user_id": mongoose.Types.ObjectId(req.body.userId) });
      // if (req.body.roleId) {
      //     conditions["$and"].push({ "groups.role_id": mongoose.Types.ObjectId(req.body.roleId) });
      //     conditions["$and"].push({ "groups.status": true });
      //     conditions["$and"].push({ "groups.deleted": false });
      // }

      // console.log('conditions => ', conditions);

      // var aggregate = [{
      //     $lookup: {
      //         from: 'groups',
      //         localField: '_id',
      //         foreignField: 'user_id',
      //         as: 'groups'
      //     }
      // },
      // {
      //     "$unwind": "$groups"
      // },
      // { $match: conditions },
      // {
      //     $lookup: {
      //         from: 'agencies',
      //         localField: 'agency_id',
      //         foreignField: '_id',
      //         as: 'agency_id'
      //     }
      // },
      // {
      //     "$unwind": {
      //         "path": "$agency_id",
      //         "preserveNullAndEmptyArrays": true
      //     }
      // },
      // {
      //     $lookup: {
      //         from: 'users',
      //         localField: 'agency_id.principle_id',
      //         foreignField: '_id',
      //         as: 'agency_id.principle_id'
      //     }
      // }];

      // if (checkData.categories_id && checkData.categories_id.length > 0) {
      //     aggregate = aggregate.concat([
      //         {
      //             $unwind: "$categories_id"
      //         },
      //         {
      //             $lookup: {
      //                 "from": "services_cats",
      //                 "localField": "categories_id",
      //                 "foreignField": "_id",
      //                 "as": "categories"
      //             }
      //         },
      //         {
      //             $group: {
      //                 "_id": "$_id",
      //                 "data": { "$first": "$$ROOT" },
      //                 "category_ids": { "$push": "$categories_id" },
      //                 "category": { "$addToSet": { "name": { "$arrayElemAt": ["$categories.name", 0] }, "status": { "$arrayElemAt": ["$categories.status", 0] }, "_id": { "$arrayElemAt": ["$categories._id", 0] } } },
      //             }
      //         }
      //     ]);
      // }
      let aggregate = []

      if (is_service_cat == false) {
        aggregate = [
          {
            $match: {
              _id: mongoose.Types.ObjectId(req.body.userId),
            },
          },
          // {
          //   $unwind: {
          //     path: '$categories_id',
          //     preserveNullAndEmptyArrays: true,
          //   },
          // },
          {
            $lookup: {
              from: 'groups',
              localField: '_id',
              foreignField: 'user_id',
              as: 'groups',
            },
          },
          {
            $unwind: '$groups',
          },
          {
            $lookup: {
              from: 'agencies',
              localField: 'agency_id',
              foreignField: '_id',
              as: 'agency_id',
            },
          },
          {
            $unwind: {
              path: '$agency_id',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'agency_id.principle_id',
              foreignField: '_id',
              as: 'agency_id.principle_id',
            },
          },
          {
            $group: {
              _id: '$_id',
              data: { $first: '$$ROOT' },
              // category_ids: { $push: '$categories_id' },
            },
          },

        ]
      } else {
        aggregate = [
          {
            $match: {
              _id: mongoose.Types.ObjectId(req.body.userId),
            },
          },
          {
            $unwind: {
              path: '$categories_id',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'services_cats',
              localField: 'categories_id',
              foreignField: '_id',
              as: 'categories',
            },
          },
          {
            $lookup: {
              from: 'groups',
              localField: '_id',
              foreignField: 'user_id',
              as: 'groups',
            },
          },
          {
            $unwind: '$groups',
          },
          {
            $lookup: {
              from: 'agencies',
              localField: 'agency_id',
              foreignField: '_id',
              as: 'agency_id',
            },
          },
          {
            $unwind: {
              path: '$agency_id',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'agency_id.principle_id',
              foreignField: '_id',
              as: 'agency_id.principle_id',
            },
          },
          {
            $group: {
              _id: '$_id',
              data: { $first: '$$ROOT' },
              category_ids: { $push: '$categories_id' },
              category: {
                $addToSet: {
                  name: { $arrayElemAt: ['$categories.name', 0] },
                  status: { $arrayElemAt: ['$categories.status', 0] },
                  _id: { $arrayElemAt: ['$categories._id', 0] },
                },
              },
            },
          },

        ]
      }

      User.aggregate(aggregate)
        // User.find({ "id": req.body.user_id })
        .exec(function (err, userData) {
          console.log('userData :: db data=> ', userData)
          console.log('err 1 => ', err)
          if (userData && userData.length > 0) {
            let uData = userData[0]
            // if (checkData.categories_id && checkData.categories_id.length > 0) {
            uData = userData[0].data
            uData.categoriesDetails = userData[0].category
            uData.categories_id = userData[0].category_ids
            delete uData['categories']
            // }
            if (err) {
              console.log('err ===>   ', err)
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR,
              })
            } else {
              console.log('uData     ', uData)
              if (
                uData &&
                uData.agency_id &&
                uData.agency_id.principle_id &&
                uData.agency_id.principle_id.length === 0
              ) {
                delete uData.agency_id
              }
              res.json({
                code: Constant.SUCCESS_CODE,
                message: Constant.USER_RECORD_FETCHED,
                data: uData,
              })
            }
          } else {
            console.log('err    ', err)
            res.json({
              code: Constant.ERROR_CODE,
              message: Constant.INTERNAL_ERROR,
            })
          }
        })
    } else {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.REQ_DATA_MISSING,
      })
    }
  })()
}

/**
 * Function is use to change user password by user id
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Jan-2017
 */
function changePassword(req, res) {
  if (req.body.userId && req.body.oldPassword && req.body.newPassword) {
    var salt = bcrypt.genSaltSync(10)
    var hash = bcrypt.hashSync(req.body.newPassword, salt)
    User.findOne({ _id: req.body.userId }, function (err, users) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        if (users) {
          if (bcrypt.compareSync(req.body.oldPassword, users.password)) {
            var updateUserRecord = {
              password: hash,
            }
            User.update({ _id: req.body.userId }, { $set: updateUserRecord }, function (err) {
              if (err) {
                res.json({
                  code: Constant.ERROR_CODE,
                  message: Constant.INTERNAL_ERROR,
                })
              } else {
                res.json({
                  code: Constant.SUCCESS_CODE,
                  message: Constant.PASSWORD_CHANGED_SUCCESS,
                })
              }
            })
          } else {
            res.json({
              code: Constant.ERROR_CODE,
              message: Constant.WRONG_CURRENT_PASSWORD,
            })
          }
        }
      }
    })
  } else {
    res.json({
      code: Constant.ERROR_CODE,
      message: Constant.REQUIRED_PASSWORD_VALUE,
    })
  }
}

/**
 * Function is use to fetch users list
 * @access private
 * @return json
 * @smartData Enterprises (I) Ltd
 * Created Date 01-Feb-2018
 */
function adminGetUserList(req, res) {
  var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0
  var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 100

  var firstname = typeof req.body.firstname != 'undefined' ? req.body.firstname : ''
  var lastname = typeof req.body.lastname != 'undefined' ? req.body.lastname : ''
  var state = typeof req.body.state != 'undefined' ? req.body.state : ''
  var city = typeof req.body.city != 'undefined' ? req.body.city : ''
  var zip_code = typeof req.body.zip_code != 'undefined' ? req.body.zip_code : ''
  var searchTextArr = []
  var totalCount = 0
  var searchTextCondition
  switch (req.body.searchtext) {
    case 'Tenant':
      searchTextArr.push(mongoose.Types.ObjectId(Constant.TENANT))
      break
    case 'Agent':
      searchTextArr.push(mongoose.Types.ObjectId(Constant.AGENT))
      break
    case 'Owner':
      searchTextArr.push(mongoose.Types.ObjectId(Constant.OWNER))
      break
    default:
      searchTextArr.push(
        mongoose.Types.ObjectId(Constant.TENANT),
        mongoose.Types.ObjectId(Constant.AGENT),
        mongoose.Types.ObjectId(Constant.OWNER)
      )
  }
  var conditions = { $and: [] }
  conditions['$and'].push({ is_active: true, is_deleted: false })

  if (firstname)
    conditions['$and'].push({
      firstname: { $regex: new RegExp(firstname, 'i') },
    })
  if (lastname)
    conditions['$and'].push({
      lastname: { $regex: new RegExp(lastname, 'i') },
    })
  if (state) conditions['$and'].push({ state: { $regex: new RegExp(state, 'i') } })
  if (city) conditions['$and'].push({ city: { $regex: new RegExp(city, 'i') } })
  if (zip_code) conditions['$and'].push({ zipCode: { $regex: new RegExp(zip_code, 'i') } })

  // console.log("conditions :: Admin user list api", conditions);
  if (req.body.searchKey) {
    var pattern = req.body.searchKey.toLowerCase()
    conditions = { $or: [] }
    if (firstname) conditions['$or'].push({ firstname: { $regex: pattern } })
    if (lastname) conditions['$or'].push({ lastname: { $regex: pattern } })
    if (state) conditions['$or'].push({ state: { $regex: pattern } })
    if (city) conditions['$or'].push({ city: { $regex: pattern } })
    if (zip_code) conditions['$or'].push({ zipCode: { $regex: pattern } })
  }
  // console.log('searchTextArr => ', searchTextArr);
  User.aggregate([
    { $match: conditions }, // Match me
    {
      $lookup: {
        from: 'groups',
        localField: '_id',
        foreignField: 'user_id',
        as: 'groups',
      },
    },
    {
      $unwind: '$groups',
    },
    {
      $match: {
        'groups.deleted': false,
        'groups.is_master_role': true,
        'groups.role_id': { $in: searchTextArr },
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
    .exec(async function (err, results) {
      //console.log("results", results);
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        if (results.length > 0) {
          totalCount = results[0].count
          console.log('totalCount', totalCount)
          User.aggregate(
            { $match: conditions }, // Match me
            { $lookup: { from: 'groups', localField: '_id', foreignField: 'user_id', as: 'groups' } },
            {
              $unwind: '$groups',
            },
            {
              $match: {
                'groups.deleted': false,
                'groups.is_master_role': true,
                'groups.role_id': { $in: searchTextArr },
              },
            },
            {
              $project: {
                _id: 1,
                firstname: 1,
                lastname: 1,
                email: 1,
                address: 1,
                totalPropertyCount: 1,
                about_user: 1,
                image: 1,
                images: 1,
                agency_id: 1,
                city: 1,
                groups: { _id: 1, role_id: 1, status: 1, deleted: 1, is_master_role: 1 },
              },
            },
            { $sort: { createdAt: -1 } },
            { $skip: page_number * number_of_pages },
            { $limit: number_of_pages }
          )
            .allowDiskUse(true)
            .exec(function (err, usersList) {
              //console.log("here is your list", usersList);
              if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR })
              } else {
                User.populate(usersList, { path: 'agency_id' }, function (err, finalData) {
                  if (err) {
                    res.json({ code: Constant.SUCCESS_CODE, data: finalData, total_count: totalCount })
                  } else {
                    res.json({ code: Constant.SUCCESS_CODE, data: finalData, total_count: totalCount })
                  }
                })
              }
            })
        } else {
          res.json({
            code: Constant.SUCCESS_CODE,
            data: [],
            total_count: totalCount,
          })
        }
      }
    })
}
/**
 * Function is use to fetch Registered users count
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 15-Sep-2017
 */
function admin_getRegisteredUsersCount(req, res) {
  User.count({ is_deleted: false }, function (err, userCount) {
    if (err) {
      res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR })
    } else {
      res.json({
        code: Constant.SUCCESS_CODE,
        message: Constant.USERS_LIST_FETCHED,
        data: userCount,
      })
    }
  })
}

/**
 * Function is use to soft delet users
 * @access private
 * @return json
 * Created by Ankur Arora
 * @smartData Enterprises (I) Ltd
 * Created Date 12-June-2017
 */
function adminDeleteUser(req, res) {
  // console.log('req.body', req.body);
  var UserUpdateField = {
    is_deleted: true,
  }
  if (req.body.userId) {
    var updateUserRecord = {
      is_deleted: true,
    }
    User.update({ _id: req.body.userId }, { $set: updateUserRecord }, function (err) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        propertyModel.updateMany(
          { owner_id: req.body.userId },
          {
            $set: {
              is_deleted: true,
            },
          },
          function (err, property) {
            if (err) {
              res.json({
                code: 400,
                message: 'Unsuccessful in updating property isdeleted true',
              })
            } else if (property) {
              res.json({
                code: Constant.SUCCESS_CODE,
                message: Constant.USER_RECORD_is_deleted,
              })
            } else {
              res.json({
                code: Constant.SUCCESS_CODE,
                message: Constant.USER_RECORD_is_deleted,
              })
            }
          }
        )
      }
    })
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.USER_ID_REQUIRED })
  }
}

/**
 * Function is use to fetch user details by ids
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Jan-2017
 */
function getUserImage(req, res) {
  if (req.body.userId) {
    User.findOne({ _id: req.body.userId }, { image: 1 }, function (err, userInfo) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.USER_IMAGE_FETCHED,
          data: userInfo,
        })
      }
    })
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.USER_ID_REQUIRED })
  }
}

/**
 * Function is use to update user info by id
 * @access private
 * @return json
 * Created by Minakshi k
 * @smartData Enterprises (I) Ltd
 * Created Date 20-Sep-2017
 */
function adminUpdateProfile(req, res) {
  if (req.body.firstname && req.body.lastname && req.body.userId) {
    var updateUserRecord = {
      firstname: req.body.firstname.toLowerCase(),
      lastname: req.body.lastname.toLowerCase(),
      // dob: req.body.dob,
      gender: req.body.gender,
      // marital_status: req.body.marital_status,
      email: req.body.email.toLowerCase(),
      mobile_no: req.body.mobile_no,
    }
    Admin.findOne({ email: req.body.email }, function (err, email) {
      //  console.log("email[0]",email);
      //  console.log("email[0]",email[0]);
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else if (email && email.firstname != req.body.firstname && email.lastname != req.body.lastname) {
        res.json({ code: Constant.ERROR_CODE, message: 'already exist user' })
      } else {
        Admin.update({ _id: req.body.userId }, { $set: updateUserRecord }, function (err) {
          if (err) {
            //console.log('err', err);
            res.json({
              code: Constant.ERROR_CODE,
              message: Constant.INTERNAL_ERROR,
            })
          } else {
            res.json({
              code: Constant.SUCCESS_CODE,
              message: Constant.UPDATE_USER_PROFILE_SUCCESS,
            })
          }
        })
      }
    })
  } else {
    res.json({
      code: Constant.ERROR_CODE,
      message: Constant.REQUIRED_PROFILE_INFO,
    })
  }
}
/**
 * Function is use to update admin profile image
 * @access private
 * @return json
 * Created by Minakshi k
 * @smartData Enterprises (I) Ltd
 * Created Date 20-Sep-2017
 */
function updateAdminPic(req, res) {
  var formData = {}
  var outputJSON = {}
  var userSavedObj = {}
  // console.log("!!!!!!!!!!!! req.body of admin profile", req.body);
  var validFileExt = ['jpeg', 'jpg', 'png', 'gif']
  waterfall(
    [
      function (callback) {
        var uploaded_file = req.swagger.params.file.value
        formData = {}
        var file = uploaded_file
        if (file.size < 10574919) {
          var mimeExtension = file.mimetype.split('/')
          if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
            callback(null, file)
          } else {
            callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false)
          }
        } else {
          callback('Upload file must be less than 10 MB', false)
        }
      },
      function (file, callback) {
        if (file) {
          var timestamp = Number(new Date()) // current time as number
          var splitFile = file.originalname.split('.')
          var filename =
            +timestamp + '.' + (splitFile.length > 0 ? splitFile[splitFile.length - 1] : file.originalname)
          var dir = './api/uploads/users'
          var temp_path = dir + '/' + filename
          var data = file.buffer
          fs.writeFile(path.resolve(temp_path), data, function (err, data) {
            if (err) {
              callback(err, false)
            } else {
              callback(null, filename)
            }
          })
        } else {
          callback('No files selected', false)
        }
      },
      function (formData, callback) {
        var updateImage = []
        var imageData = {}
        userSavedObj._id = req.body._id
        if (userSavedObj._id) {
          var field = ''
          var query = {
            _id: userSavedObj._id,
          }
          delete formData._id
          Admin.findOne(query, function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              if (!data.image) {
                data.image = []
              }
              data.image = formData
              // console.log("!!!!!!!!!!!!!!!! admindata", data);
              data.save(function (err, data) {
                if (err) {
                  callback(err, null)
                } else {
                  callback(null, data)
                }
              })
            }
          })
        }
      },
    ],
    function (err, userData) {
      if (err) {
        // console.log('err', err);
        outputJSON = {
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        }
      } else {
        outputJSON = {
          code: Constant.SUCCESS_CODE,
          data: userData,
          message: Constant.UPLOAD_SUCCESSFULL,
        }
      }
      res.jsonp(outputJSON)
    }
  )
}
/**
 * Function is use to user detail
 * @access private
 * @return json
 * Created by Minakshi K
 * @smartData Enterprises (I) Ltd
 * Created Date 21-Sep-2017
 */
// function admin_getUserDetail(req, resp) {
//     User.find({
//         '_id': req.body.userId,
//         'is_deleted': false
//     }).exec(function (err, user) {
//         if (err) {
//             return resp.json({
//                 code: 400,
//                 message: "Error"
//             });
//         } else if (user.length) {
//             return resp.json({
//                 code: 200,
//                 message: "Successfully got data",
//                 data: user
//             });
//         } else {
//             return resp.json({
//                 code: 400,
//                 message: "Unsuccessful in geeting user data"
//             });
//         }
//     })
// };
function admin_getUserDetail(req, resp) {
  // var conditions = { "$and": [] };
  // conditions["$and"].push({ "groups.user_id": mongoose.Types.ObjectId(req.body.userId) });
  // if (req.body.roleId) {
  //     // conditions["$and"].push({ "groups.role_id": mongoose.Types.ObjectId(req.body.roleId) });
  //     conditions["$and"].push({ "groups.is_master_role": true });
  //     conditions["$and"].push({ "groups.status": true });
  //     conditions["$and"].push({ "groups.deleted": false });
  // }

  // var aggregate = [
  //     {
  //         $lookup: {
  //             from: 'groups',
  //             localField: '_id',
  //             foreignField: 'user_id',
  //             as: 'groups'
  //         }
  //     },
  //     {
  //         "$unwind": "$groups"
  //     },
  //     { $match: conditions }
  // ];

  // User.find({
  //     '_id': req.body.userId,
  //     'is_deleted': false
  // })

  const aggregate = [
    {
      $match: {
        _id: mongoose.Types.ObjectId(req.body.userId),
        is_deleted: false,
      },
    },
    {
      $lookup: {
        from: 'groups',
        localField: '_id',
        foreignField: 'user_id',
        as: 'groups',
      },
    },
    {
      $unwind: '$groups',
    },
    {
      $match: {
        'groups.is_master_role': true,
        'groups.status': true,
        'groups.deleted': false,
      },
    },
  ]
  User.aggregate(aggregate)
    .allowDiskUse(true)
    .exec(function (err, user) {
      if (err) {
        return resp.json({
          code: 400,
          message: 'Error',
        })
      } else if (user.length) {
        // console.log('user :: check here for user detail => ', user);
        return resp.json({
          code: 200,
          message: 'Successfully got data',
          data: user,
        })
      } else {
        return resp.json({
          code: 400,
          message: 'Unsuccessful in geeting user data',
        })
      }
    })
}
/**
 * Function is use to search user data
 * @access private
 * @return json
 * Created by Minakshi K
 * @smartData Enterprises (I) Ltd
 * Created Date 23-Sep-2017
 */
function admin_searchUser(req, resp) {
  if (typeof req.body.searchKey == 'undefined') {
    User.find({
      is_deleted: false,
    }).exec(function (err, user) {
      if (err) {
        return resp.json({
          code: 400,
          message: 'Error',
        })
      } else if (user.length) {
        return resp.json({
          code: 200,
          message: 'Successfully got data',
          data: user,
        })
      } else {
        return resp.json({
          code: 400,
          message: 'Unsuccessful in geeting user data',
        })
      }
    })
  }
  if (typeof req.body.searchKey == 'string') {
    var pattern = req.body.searchKey.toLowerCase()
    User.find({
      $or: [
        { firstname: { $regex: pattern } },
        { lastname: { $regex: pattern } },
        { email: { $regex: pattern } },
        { mobile_no: { $regex: pattern } },
      ],
      is_deleted: false,
    }).exec(function (err, user) {
      if (err) {
        // console.log('Error');
        return resp.json({
          code: 400,
          message: 'Error',
        })
      } else if (user.length) {
        return resp.json({
          code: 200,
          message: 'Successfully got data',
          data: user,
        })
      } else {
        return resp.json({
          code: 400,
          message: 'Unsuccessful in geeting user data',
        })
      }
    })
  }
}
/**
 * Function is use to admin detail
 * @access private
 * @return json
 * Created by Minakshi K
 * @smartData Enterprises (I) Ltd
 * Created Date 21-Sep-2017
 */
function admin_getAdminDetail(req, resp) {
  Admin.find({
    _id: req.body.userId,
    is_deleted: false,
  }).exec(function (err, user) {
    if (err) {
      // console.log('Error');
      return resp.json({
        code: 400,
        message: 'Error',
      })
    } else if (user.length) {
      return resp.json({
        code: 200,
        message: 'Successfully got data',
        data: user,
      })
    } else {
      return resp.json({
        code: 400,
        message: 'Unsuccessful in geeting user data',
      })
    }
  })
}
/**
 * Function is use to update user info by id
 * @access private
 * @return json
 * Created by Minakshi k
 * @smartData Enterprises (I) Ltd
 * Created Date 20-Sep-2017
 */
function adminOwnProfileUpdation(req, res) {
  if (req.body.firstname && req.body.lastname && req.body.userId) {
    var updateUserRecord = {
      firstname: req.body.firstname.toLowerCase(),
      lastname: req.body.lastname.toLowerCase(),
      // dob: req.body.dob,
      gender: req.body.gender,
      // marital_status: req.body.marital_status,
      email: req.body.email.toLowerCase(),
      mobile_no: req.body.mobile_no,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      zipcode: req.body.zipcode,
      country: req.body.country,
    }
    Admin.findOne({ email: req.body.email }, function (err, email) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else if (email) {
        // console.log("hdsksrkfjg", updateUserRecord);
        Admin.update({ _id: req.body.userId }, { $set: updateUserRecord }, function (err) {
          if (err) {
            // console.log('err', err);
            res.json({
              code: Constant.ERROR_CODE,
              message: Constant.INTERNAL_ERROR,
            })
          } else {
            res.json({
              code: Constant.SUCCESS_CODE,
              message: Constant.UPDATE_USER_PROFILE_SUCCESS,
            })
          }
        })
      }
      //else{
      //       return res.json({
      //         code: 404,
      //         message: "No records found"
      //     });
      //  }
    })
  } else {
    res.json({
      code: Constant.ERROR_CODE,
      message: Constant.REQUIRED_PROFILE_INFO,
    })
  }
}

/**
 * Function is use to update user info by id
 * @access private
 * @return json
 * Created by Minakshi k
 * @smartData Enterprises (I) Ltd
 * Created Date 20-Sep-2017
 */
function updateUserProfile(req, res) {
  ; (async () => {
    if (req.body.firstname && req.body.lastname && req.body.userId) {
      var address
      if (req.body.state && req.body.zipCode && req.body.city) {
        address = req.body.city + ',' + req.body.zipCode + ',' + req.body.state + ',' + req.body.country
      }
      var updateUserRecord = {
        firstname: req.body.firstname ? req.body.firstname : '',
        lastname: req.body.lastname ? req.body.lastname : '',
        email: req.body.email ? req.body.email : '',
        mobile_no: req.body.mobile_no ? req.body.mobile_no : '',
        // about_user: (req.body.about_user) ? req.body.about_user : '',
        country: req.body.country ? req.body.country : '',
        state: req.body.state ? req.body.state : '',
        zipCode: req.body.zipCode ? req.body.zipCode : '',
        city: req.body.city ? req.body.city : '',
        categories_id: req.body.categories_id ? req.body.categories_id : '',
        suburb_postcode: req.body.suburb_postcode ? req.body.suburb_postcode : '',
        business_name: req.body.business_name ? req.body.business_name : '',
        abn_number: req.body.abn_number ? req.body.abn_number : '',
        rate: req.body.rate ? req.body.rate : '',
        address: address ? address : '',
      }
      updateUserRecord.name = updateUserRecord.firstname + ' ' + updateUserRecord.lastname

      if (req.body.suburb_postcode && req.body.suburb_postcode != '') {
        console.log('if part....')
        updateUserRecord.suburb_postcode = req.body.suburb_postcode ? req.body.suburb_postcode : ''
        updateUserRecord.location_latitude = req.body.location_latitude ? req.body.location_latitude : 0
        updateUserRecord.location_longitude = req.body.location_longitude ? req.body.location_longitude : 0
        updateUserRecord.location_administrative_area_level_1 = req.body.location_administrative_area_level_1
          ? req.body.location_administrative_area_level_1
          : ''
        updateUserRecord.location_country = req.body.location_country ? req.body.location_country : ''
        updateUserRecord.location_postal_code = req.body.location_postal_code
          ? req.body.location_postal_code
          : ''
        updateUserRecord.location_locality = req.body.location_locality ? req.body.location_locality : ''
        updateUserRecord.location_street_number = req.body.location_street_number
          ? req.body.location_street_number
          : ''

        updateUserRecord.location = {
          coordinates: [updateUserRecord.location_longitude, updateUserRecord.location_latitude],
          type: 'Point',
        }
      } else {
        console.log('else part....')
        updateUserRecord.suburb_postcode = ''
        updateUserRecord.location_latitude = 0
        updateUserRecord.location_longitude = 0
        updateUserRecord.location_administrative_area_level_1 = ''
        updateUserRecord.location_country = ''
        updateUserRecord.location_postal_code = ''
        updateUserRecord.location_locality = ''
        updateUserRecord.location_street_number = ''

        updateUserRecord.location = {
          coordinates: [updateUserRecord.location_longitude, updateUserRecord.location_latitude],
          type: 'Point',
        }
      }

      await User.findOneAndUpdate(
        { _id: req.body.userId },
        { $set: updateUserRecord },
        { new: true, runValidators: true },
        async function (err, userData) {
          if (err) {
            console.log('Err    ', err)
            res.json({
              code: Constant.ERROR_CODE,
              message: Constant.INTERNAL_ERROR,
            })
          } else {
            if (req.body.roleId) {
              var updateGroupRecord = {
                about_user: req.body.about_user ? req.body.about_user : '',
              }
              await Group.findOneAndUpdate(
                {
                  user_id: req.body.userId,
                  role_id: req.body.roleId,
                  deleted: false,
                  status: true,
                },
                { $set: updateGroupRecord },
                { new: true, runValidators: true },
                function (err, data) { }
              )
            }
            if (req.body.agency_id) {
              var updateAgencyData = {
                name: req.body.agency_id.name ? req.body.agency_id.name : '',
                abn_number: req.body.agency_id.abn_number ? req.body.agency_id.abn_number : '',
                licence_number: req.body.agency_id.licence_number ? req.body.agency_id.licence_number : '',
                email: req.body.agency_id.email ? req.body.agency_id.email : '',
                phone_number: req.body.agency_id.phone_number ? req.body.agency_id.phone_number : '',
              }
              await Agencies.findOneAndUpdate(
                { _id: mongoose.Types.ObjectId(req.body.agency_id._id) },
                { $set: updateAgencyData },
                { new: true, runValidators: true },
                function (err, data) { }
              )
            }
            res.json({
              code: Constant.SUCCESS_CODE,
              message: Constant.UPDATE_USER_PROFILE_SUCCESS,
              data: userData,
            })
          }
        }
      )
    } else {
      res.json({
        code: Constant.ERROR_CODE,
        message: Constant.REQUIRED_PROFILE_INFO,
      })
    }
  })()
}

/**
 * Update User's Property by Admin users only
 */
function updateUserPropertyByAdmin(req, res) {
  console.log('req.body :: updateUserPropertyByAdmin API => ', req.body)
    ; (async () => {
      try {
        if (req.body.updated_by_role) {
          if (req.body.updated_by_role == Constant.ADMIN) {
            if (req.body.user_id && req.body.profileTiers) {
              await User.findByIdAndUpdate(
                req.body.user_id,
                { profileTiers: req.body.profileTiers },
                async function (err, updatedUser) {
                  if (err) {
                    console.log('err => ', err)
                    res.json({ code: Constant.ERROR_CODE, message: err })
                  } else {
                    console.log('updatedUser => ', updatedUser)
                    res.json({
                      code: Constant.SUCCESS_CODE,
                      message: `User's Profile level is updated.`,
                    })
                  }
                }
              )
            } else {
              res.json({
                code: Constant.ERROR_CODE,
                message: 'Required fields are missing.',
              })
            }
          } else {
            res.json({
              code: Constant.ERROR_CODE,
              message: 'You are not authorized to perform this operation.',
            })
          }
        } else {
          res.json({
            code: Constant.ERROR_CODE,
            message: 'Admin id is required.',
          })
        }
      } catch (error) {
        res.json({ code: Constant.ERROR_CODE, message: error })
      }
    })()
}

/**
 * Function is use to update user info by id
 * @access private
 * @return json
 * Created by Minakshi K
 * @smartData Enterprises (I) Ltd
 * Created Date 28-Sep-2017
 */
function admin_addUserProfilePic(req, res) {
  if (req.body.firstname && req.body.lastname && req.body.userId) {
    var updateUserRecord = {
      firstname: req.body.firstname.toLowerCase(),
      lastname: req.body.lastname.toLowerCase(),
      gender: req.body.gender,
      email: req.body.email.toLowerCase(),
      mobile_no: req.body.mobile_no,
    }
    // console.log('updateUserRecord', updateUserRecord);
    User.update({ _id: req.body.userId }, { $set: updateUserRecord }, function (err) {
      if (err) {
        // console.log('err', err);
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.UPDATE_USER_PROFILE_SUCCESS,
        })
      }
    })
  } else {
    res.json({
      code: Constant.ERROR_CODE,
      message: Constant.REQUIRED_PROFILE_INFO,
    })
  }
}

/**
 * Function is use to change user password by user id
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Jan-2017
 */
function changePasswordAdmin(req, res) {
  if (req.body.userId && req.body.oldPassword && req.body.newPassword) {
    var salt = bcrypt.genSaltSync(10)
    var hash = bcrypt.hashSync(req.body.newPassword, salt)
    Admin.findOne({ _id: req.body.userId }, function (err, users) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        if (users) {
          if (bcrypt.compareSync(req.body.oldPassword, users.password)) {
            var updateUserRecord = {
              password: hash,
            }
            Admin.update({ _id: req.body.userId }, { $set: updateUserRecord }, function (err) {
              if (err) {
                res.json({
                  code: Constant.ERROR_CODE,
                  message: Constant.INTERNAL_ERROR,
                })
              } else {
                res.json({
                  code: Constant.SUCCESS_CODE,
                  message: Constant.PASSWORD_CHANGED_SUCCESS,
                })
              }
            })
          } else {
            res.json({
              code: Constant.ERROR_CODE,
              message: Constant.WRONG_CURRENT_PASSWORD,
            })
          }
        }
      }
    })
  } else {
    res.json({
      code: Constant.ERROR_CODE,
      message: Constant.REQUIRED_PASSWORD_VALUE,
    })
  }
}
/*  @api : uploadUserPropertyImages
 *  @author  :
 *  @created  :
 *  @modified :
 *  @purpose  : To post the Propert.
 */
function uploadUserPropertyImage(req, res) {
  // console.log("req.body", req.body);
  var formData = {}
  var outputJSON = {}
  var propertySavedObj = {}
  var validFileExt = ['jpeg', 'jpg', 'png', 'gif']
  waterfall(
    [
      function (callback) {
        var uploaded_file = req.swagger.params.file.value
        formData = {}
        var file = uploaded_file
        if (file.size < 10574919) {
          var mimeExtension = file.mimetype.split('/')
          if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
            callback(null, file)
          } else {
            callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false)
          }
        } else {
          callback('Upload file must be less than 10 MB', false)
        }
      },
      function (file, callback) {
        if (file) {
          var timestamp = Number(new Date()) // current time as number
          var splitFile = file.originalname.split('.')
          var filename =
            +timestamp + '.' + (splitFile.length > 0 ? splitFile[splitFile.length - 1] : file.originalname)
          var dir = './api/uploads/users'
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, function (err, data) {
              if (err) {
              }
            })
            fs.mkdirSync(dir + '/' + req.body._id, function (err, data) {
              if (err) {
              }
            })
          } else if (!fs.existsSync(dir + '/' + req.body._id)) {
            fs.mkdirSync(dir + '/' + req.body._id, function (err, data) {
              if (err) {
              }
            })
          }
          dir = dir + '/' + req.body._id
          var temp_path = dir + '/' + filename
          var data = file.buffer
          var pathUrl = '/' + req.body._id + '/' + filename
          //var uploadedImage = '/uploads/property/'+filename;
          fs.writeFile(path.resolve(temp_path), data, function (err, data) {
            if (err) {
              callback(err, false)
            } else {
              callback(null, pathUrl)
            }
          })
        } else {
          callback('No files selected', false)
        }
      },
      function (formData, callback) {
        var updateImage = []
        var imageData = {}
        var userObj = {}
        userObj._id = req.body._id
        if (userObj._id) {
          var field = ''
          var query = {
            _id: userObj._id,
          }
          delete formData._id
          User.findOne(query, function (err, data) {
            // console.log("@@@@@@@@@@data@@@@@@", data);
            if (err) {
              callback(err, null)
            } else {
              if (!data.image) {
                data.image = []
              }
              data.images.push({
                url: formData,
              })
              data.save(function (err, data) {
                if (err) {
                  callback(err, null)
                } else {
                  callback(null, data)
                }
              })
            }
          })
        }
      },
    ],
    function (err, imageData) {
      if (err) {
        outputJSON = {
          code: Constant.ERROR_CODE,
          message: Constant.IMAGE_UPLOAD_UNSUCCESS,
        }
      } else {
        outputJSON = {
          code: Constant.SUCCESS_CODE,
          data: imageData,
          message: Constant.IMAGE_UPLOAD_SUCCESS,
        }
      }
      res.jsonp(outputJSON)
    }
  )
}
/**
 * Function is use to fetch user details on registration page
 * @access private
 * @return json
 * Created by
 * @smartData Enterprises (I) Ltd
 * Created
 */
function userDataOnRegistrationPage(req, res) {
  if (req.body.userId) {
    User.findOne(
      { _id: req.body.userId, is_deleted: false },
      'firstname lastname email mobile_no password'
    ).exec(function (err, userInfo) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        res.json({
          code: Constant.SUCCESS_CODE,
          message: Constant.USER_RECORD_FETCHED,
          data: userInfo,
        })
      }
    })
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.USER_ID_REQUIRED })
  }
}

/**
 * Function is use to update user info by id
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 16-Jan-2017
 */
function saveInvitedUserPassword(req, res) {
  if (req.body.userId) {
    var salt = bcrypt.genSaltSync(10)
    var hash = bcrypt.hashSync(req.body.password, salt)
    var updateUserRecord = {
      password: hash,
      accept_invitation: true,
    }
    // console.log('updateUserRecord', updateUserRecord);
    User.update({ _id: req.body.userId }, { $set: updateUserRecord }, function (err) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        InvitationInfo.findOneAndUpdate(
          { invited_to: req.body.userId },
          { $set: { invitation_status: 2 } },
          function (err, data) {
            if (err) {
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR,
              })
            } else {
              res.json({
                code: Constant.SUCCESS_CODE,
                message: Constant.UPDATE_USER_PROFILE_SUCCESS,
              })
            }
          }
        )
      }
    })
  } else {
    res.json({
      code: Constant.ERROR_CODE,
      message: Constant.REQUIRED_PROFILE_INFO,
    })
  }
}
/*  @api : uploadMobileUserPropertyImage
 *  @author  :
 *  @created  :
 *  @modified :
 *  @purpose  : To post mobile Property images.
 */
function uploadMobileUserPropertyImage(req, res) {
  var formData = {}
  var outputJSON = {}
  var propertySavedObj = {}
  var validFileExt = ['jpeg', 'jpg', 'png', 'gif']
  waterfall(
    [
      function (callback) {
        var uploaded_file = req.swagger.params.file.value
        formData = {}
        var file = uploaded_file
        if (file.size < 10574919) {
          var mimeExtension = file.mimetype.split('/')
          if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
            callback(null, file)
          } else {
            callback('File format you have entered is not supported (jpg,png,gif,pdf,txt)', false)
          }
        } else {
          callback('Upload file must be less than 10 MB', false)
        }
      },
      function (file, callback) {
        if (file) {
          var timestamp = Number(new Date()) // current time as number
          var splitFile = file.originalname.split('.')
          var filename =
            +timestamp + '.' + (splitFile.length > 0 ? splitFile[splitFile.length - 1] : file.originalname)
          var dir = './api/uploads/users'
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, function (err, data) {
              if (err) {
              }
            })
            fs.mkdirSync(dir + '/' + req.body._id, function (err, data) {
              if (err) {
              }
            })
          } else if (!fs.existsSync(dir + '/' + req.body._id)) {
            fs.mkdirSync(dir + '/' + req.body._id, function (err, data) {
              if (err) {
              }
            })
          }
          dir = dir + '/' + req.body._id
          var temp_path = dir + '/' + filename
          var pathUrl = '/' + req.body._id + '/' + filename
          var data = file.buffer
          //var uploadedImage = '/uploads/property/'+filename;
          fs.writeFile(path.resolve(temp_path), data, function (err, data) {
            if (err) {
              callback(err, false)
            } else {
              callback(null, pathUrl)
            }
          })
        } else {
          callback('No files selected', false)
        }
      },
      function (formData, callback) {
        var updateImage = []
        var imageData = {}
        var userObj = {}
        userObj._id = req.body._id
        if (userObj._id) {
          var field = ''
          var query = {
            _id: userObj._id,
          }
          //delete formData._id;
          User.findOne(query, function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              if (!data.image) {
                data.image = []
              }
              data.images.push({
                url: formData,
              })
              data.save(function (err, data) {
                if (err) {
                  callback(err, null)
                } else {
                  callback(null, data)
                }
              })
            }
          })
        }
      },
    ],
    function (err, imageData) {
      if (err) {
        outputJSON = {
          code: Constant.ERROR_CODE,
          message: Constant.IMAGE_UPLOAD_UNSUCCESS,
        }
      } else {
        outputJSON = {
          code: Constant.SUCCESS_CODE,
          data: imageData,
          message: Constant.IMAGE_UPLOAD_SUCCESS,
        }
      }
      res.jsonp(outputJSON)
    }
  )
}

/**
 * Function to remove tenant
 * @access private and request param is sender and reciever ids
 * @return json
 * Created by
 * @smartData Enterprises (I) Ltd
 * Created Date 7-Dec-2017
 */
function softDeleteUser(req, res) {
  if (typeof req.body.userId != 'undefined' && typeof req.body.roleId != 'undefined') {
    // User.findOneAndUpdate({ '_id': req.body.userId }, { $set: { "is_deleted": true } }, function (err, data) {
    //     if (err) {
    //         return res.json({
    //             code: Constant.INVALID_CODE,
    //             message: Constant.INTERNAL_ERROR
    //         });
    //     } else  {
    Group.findOneAndUpdate(
      { user_id: req.body.userId, role_id: req.body.uId },
      { $set: { is_deleted: true } },
      function (err, data) {
        if (err) {
          return res.json({
            code: Constant.INVALID_CODE,
            message: Constant.INTERNAL_ERROR,
          })
        } else {
          return res.json({
            code: Constant.SUCCESS_CODE,
            message: Constant.USER_DELETE_SUCCESS,
          })
        }
      }
    )
    //     }
    // });
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING })
  }
}

/**
 * Function to upload banner image
 * @access private and request param is sender and reciever ids
 * @return json
 * Created by
 * @smartData Enterprises (I) Ltd
 * Created Date 8-Dec-2017
 */
function updateUserBannerImage(req, res) {
  let base64Image = req.swagger.params.file.value.split(';base64,').pop()

  var timestamp = Number(new Date()) // current time as number
  var dir = './api/uploads/users'
  var temp_path = dir + '/' + timestamp + '.jpeg'

  // console.log("Filename : ", temp_path);

  fs.writeFile(temp_path, base64Image, { encoding: 'base64' }, function (err) {
    var userSavedObj = {
      _id: req.body._id,
      bannerImage: timestamp + '.jpeg',
    }

    var outputJSON = {
      code: Constant.SUCCESS_CODE,
      message: Constant.UPLOAD_SUCCESSFULL,
    }
    if (userSavedObj._id) {
      var query = {
        _id: userSavedObj._id,
      }
      User.findOne(query, function (err, data) {
        if (err) {
          outputJSON = {
            code: Constant.ERROR_CODE,
            message: Constant.INTERNAL_ERROR,
          }
        } else {
          if (!data.bannerImage) {
            data.bannerImage = []
          }
          data.bannerImage = userSavedObj.bannerImage
          data.save(function (err, data) {
            if (err) {
              outputJSON = {
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR,
              }
            } else {
              outputJSON.code = Constant.SUCCESS_CODE
              outputJSON.message = Constant.UPLOAD_SUCCESSFULL
              outputJSON.data = data
            }
          })
        }
      })
    } else {
      outputJSON = {
        code: Constant.ERROR_CODE,
        message: Constant.INTERNAL_ERROR,
      }
    }
    res.jsonp(outputJSON)
  })

  // console.log('called',req.body);
  // var formData = {};
  // var outputJSON = {};
  // var userSavedObj = {};
  // var validFileExt = ['jpeg', 'jpg', 'png', 'gif'];
  // waterfall([
  //     function (callback) {
  //         var uploaded_file = req.swagger.params.file.value;
  //         formData = {};
  //         var file = uploaded_file;
  //         if (file.size < 10574919) {
  //             var mimeExtension = file.mimetype.split('/');
  //             if (validFileExt.indexOf(mimeExtension[1]) !== -1) {
  //                 callback(null, file);
  //             } else {
  //                 callback('File format you have entered is not supported (jpg,png)', false);
  //             }
  //         } else {
  //             callback('Upload file must be less than 10 MB', false);
  //         }
  //     },
  //     function (file, callback) {
  //         if (file) {
  //             var timestamp = Number(new Date()); // current time as number
  //             var splitFile = file.originalname.split('.');
  //             var filename = +timestamp + '.' + ((splitFile.length > 0) ? splitFile[splitFile.length - 1] : file.originalname);
  //             var dir = './api/uploads/users';
  //             var temp_path = dir + '/' + filename;
  //             var data = file.buffer;
  //             fs.writeFile(path.resolve(temp_path), data, function (err, data) {
  //                 if (err) {
  //                     callback(err, false);
  //                 } else {
  //                     callback(null, filename);
  //                 }
  //             });
  //         } else {
  //             callback('No files selected', false);
  //         }
  //     },
  //     function (formData, callback) {
  //         var updateImage = [];
  //         var imageData = {};
  //         userSavedObj._id = req.body._id;
  //         if (userSavedObj._id) {
  //             var field = "";
  //             var query = {
  //                 _id: userSavedObj._id
  //             };
  //             delete formData._id;
  //             User.findOne(query, function (err, data) {
  //                 if (err) {
  //                     callback(err, null);
  //                 } else {
  //                     if (!data.bannerImage) {
  //                         data.bannerImage = [];
  //                     }
  //                     data.bannerImage = formData;
  //                     data.save(function (err, data) {
  //                         if (err) {
  //                             callback(err, null);
  //                         } else {
  //                             callback(null, data);
  //                         }
  //                     });
  //                 }
  //             });
  //         }
  //     }
  // ], function (err, userData) {
  //     if (err) {
  //         outputJSON = {
  //             code: Constant.ERROR_CODE,
  //             message: Constant.INTERNAL_ERROR
  //         };
  //     } else {
  //         outputJSON = {
  //             code: Constant.SUCCESS_CODE,
  //             data: userData,
  //             message: Constant.UPLOAD_SUCCESSFULL,
  //         };
  //     }
  //     res.jsonp(outputJSON);
  // });
}
/**
 * Function is use to send email by ewan to seller
 * @access private
 * @return json
 * Created by Ankur A
 * @smartData Enterprises (I) Ltd
 * Created Date 14-Oct-2017
 */
function SendEmailToSeller(req, res) {
  var email = new SentEmail(req.body)
  email.msg = req.body.emailTemplate
  email.dayNumber = parseInt(moment().format('DDD'))
  email.yearNumber = parseInt(moment().format('YYYY'))
  email.save(function (err, data) {
    if (err) {
      callback(err, null)
    } else {
      var mailOptions = {
        from: Config.ADMIN_EMAIL, // sender address
        to: req.body.email,
        // to: arg2.email,
        subject: 'Owner Feedback', // Subject line
        text: 'Feedback', // plaintext body
        html: req.body.emailTemplate,
      }
      // transporter.sendMail(mailOptions, function (error, response) {
      //     if (error) {
      //         res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
      //     } else {
      //         res.json({ code: Constant.SUCCESS_CODE, message: 'Successfully sent email' });
      //     }
      // });
      sendmail(
        {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html,
        },
        function (error, response) {
          if (error) {
            res.json({
              code: Constant.ERROR_CODE,
              message: Constant.INTERNAL_ERROR,
            })
          } else {
            res.json({
              code: Constant.SUCCESS_CODE,
              message: 'Successfully sent email',
            })
          }
        }
      )
    }
  })
}

/**
 * Function to update agent property images
 * @return json
 * Created by Rahul Lahariya
 * @smartData Enterprises (I) Ltd
 * Created Date 7-Dec-2017
 */
function updateAgentExistingPropertyImage(req, res) {
  var user_id = mongoose.Types.ObjectId(req.body.user_id)

  if (user_id) {
    User.findOneAndUpdate({ _id: user_id }, { $set: { images: req.body.images } }, function (err, data) {
      if (err) {
        res.json({
          code: Constant.INVALID_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        res.json({
          code: Constant.SUCCESS_CODE,
          message: 'Added images successfully',
        })
      }
    })
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING })
  }
}

function updateMessageAsRead(req, res) {
  var from = typeof req.body.from != 'undefined' ? mongoose.Types.ObjectId(req.body.from) : ''
  var to = typeof req.body.from != 'undefined' ? mongoose.Types.ObjectId(req.body.to) : ''
  // console.log("From : ", from, " To:", to);

  if (from && to) {
    Chats.update(
      {
        from: from,
        to: to,
      },
      {
        $set: {
          isRead: true,
        },
      },
      { multi: true },
      function (err, data) {
        if (err) {
          res.json({
            code: 400,
            message: 'Message Not Read',
          })
        } else {
          // console.log("Data : ", data);
          res.json({
            code: 200,
            message: 'Message read successfully',
          })
        }
      }
    )
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING })
  }
}

function updateAvailability(req, res) {
  var user_id = mongoose.Types.ObjectId(req.body.user_id)

  User.findOne({ _id: user_id }, function (err, users) {
    if (err) {
      res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR })
    } else {
      if (users) {
        var updateUserRecord = {
          status: req.body.status,
          option: req.body.option,
        }
        if (req.body.days) updateUserRecord.days = req.body.days
        User.update({ _id: user_id }, { $set: { availability: updateUserRecord } }, function (err) {
          if (err) {
            res.json({
              code: Constant.ERROR_CODE,
              message: Constant.INTERNAL_ERROR,
            })
          } else {
            res.json({
              code: Constant.SUCCESS_CODE,
              message: Constant.UPDATE_USER_PROFILE_SUCCESS,
            })
          }
        })
      }
    }
  })
}

function updateOccupacy(req, res) {
  // console.log('members===============================');
  // console.log(req.body.members);

  var user_id = mongoose.Types.ObjectId(req.body.user_id)
  var members = req.body.members
  var vehicles = req.body.vehicles
  var pets = req.body.pets

  if (user_id && (members || vehicles || pets)) {
    User.findOne({ _id: user_id }, function (err, users) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        if (users) {
          var updateData = {}
          if (members) updateData.members = members
          if (vehicles) updateData.vehicles = vehicles
          if (pets) updateData.pets = pets
          User.update({ _id: user_id }, { $set: updateData }, function (err) {
            // User.update({ _id: user_id }, { $set: { "members": members } }, function (err) {
            if (err) {
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR,
              })
            } else {
              res.json({
                code: Constant.SUCCESS_CODE,
                message: Constant.UPDATE_USER_PROFILE_SUCCESS,
              })
            }
          })
        }
      }
    })
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING })
  }
}

function updateDocumentationStatus(req, res) {
  var user_id = mongoose.Types.ObjectId(req.body.user_id)

  User.findOne({ _id: user_id }, function (err, users) {
    if (err) {
      res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR })
    } else {
      if (users) {
        User.update(
          { _id: user_id },
          { $set: { documentation_status: req.body.documentation_status } },
          function (err) {
            if (err) {
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR,
              })
            } else {
              res.json({
                code: Constant.SUCCESS_CODE,
                message: Constant.UPDATE_USER_PROFILE_SUCCESS,
              })
            }
          }
        )
      }
    }
  })
}

function updateRevealContactNumber(req, res) {
  var user_id = mongoose.Types.ObjectId(req.body.user_id)
  var reveal_contact_number = req.body.reveal_contact_number

  if (user_id && reveal_contact_number) {
    User.findOne({ _id: user_id }, function (err, users) {
      if (err) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        if (users) {
          var updateData = {}
          if (users.reveal_contact_number && parseInt(users.reveal_contact_number) > 0)
            updateData.reveal_contact_number = parseInt(users.reveal_contact_number) + 1
          else updateData.reveal_contact_number = 1

          User.update({ _id: user_id }, { $set: updateData }, function (err) {
            if (err) {
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.INTERNAL_ERROR,
              })
            } else {
              res.json({
                code: Constant.SUCCESS_CODE,
                message: Constant.UPDATE_USER_PROFILE_SUCCESS,
              })
            }
          })
        }
      }
    })
  } else {
    res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING })
  }
}

function importCategoriesCSV(req, res) {
  console.log('i m inside......')

  var timestamp = Number(new Date()) // current time as number
  var form = new formidable.IncomingForm()
  var file = req.swagger.params.file.value

  var outputJSON = {}
  var splitFile = file.originalname.split('.')
  var filename =
    +timestamp +
    '_' +
    'category' +
    '.' +
    (splitFile.length > 0 ? splitFile[splitFile.length - 1] : file.originalname)
  var filePath = './api/uploads/category_csv/' + filename
  var errorfilename = Date.now() + '.csv'
  var errorMessage = ''
  var count = 1
  var errorCount = 0
  var csvArray = []
  waterfall(
    [
      function (callback) {
        fs.writeFile(path.resolve(filePath), file.buffer, async function (err) {
          if (err) {
            callback(err, false)
          } else {
            var csvheaders
            csvheaders = {
              headers: [
                'main_category',
                'sub_category1',
                'sub_category2',
                'sub_category3',
                'sub_category4',
                'sub_category5',
                'sub_category6',
                'sub_category7',
                'sub_category8',
                'sub_category9',
                'sub_category10',
                'sub_category11',
                'sub_category12',
                'sub_category13',
                'sub_category14',
                'sub_category15',
                'sub_category16',
                'sub_category17',
                'sub_category18',
                'sub_category19',
              ],
              discardUnmappedColumns: true,
              headers: true,
              ignoreEmpty: false,
              trim: true,
              rtrim: true,
              ltrim: true,
            }
            var dataArray = []
            var is_success = true
            var stream = fs.createReadStream(filePath)
            csv
              .fromStream(stream, csvheaders)
              .validate(function (data) {
                console.log('data  --- ', data)
                return true
              })
              .on('data-invalid', function (data) { })
              .on('data', async function (data) {
                console.log('data : ', data)
                var catData = {
                  name: data.main_category,
                  status: true,
                }
                var category_ = new Category(catData)
                category_.save(function (err, catData) {
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category1 && data.sub_category1 != '') {
                    subcatData.name = data.sub_category1
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }

                  var subcatData = { category_id: catData._id }
                  if (data.sub_category2 && data.sub_category2 != '') {
                    subcatData.name = data.sub_category2
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category3 && data.sub_category3 != '') {
                    subcatData.name = data.sub_category3
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category4 && data.sub_category4 != '') {
                    subcatData.name = data.sub_category4
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category5 && data.sub_category5 != '') {
                    subcatData.name = data.sub_category5
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category6 && data.sub_category6 != '') {
                    subcatData.name = data.sub_category6
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category7 && data.sub_category7 != '') {
                    subcatData.name = data.sub_category7
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category8 && data.sub_category8 != '') {
                    subcatData.name = data.sub_category8
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category9 && data.sub_category9 != '') {
                    subcatData.name = data.sub_category9
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category10 && data.sub_category10 != '') {
                    subcatData.name = data.sub_category10
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category11 && data.sub_category11 != '') {
                    subcatData.name = data.sub_category11
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category12 && data.sub_category12 != '') {
                    subcatData.name = data.sub_category12
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category13 && data.sub_category13 != '') {
                    subcatData.name = data.sub_category13
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category14 && data.sub_category14 != '') {
                    subcatData.name = data.sub_category14
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category15 && data.sub_category15 != '') {
                    subcatData.name = data.sub_category15
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category16 && data.sub_category16 != '') {
                    subcatData.name = data.sub_category1
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category17 && data.sub_category17 != '') {
                    subcatData.name = data.sub_category17
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category18 && data.sub_category18 != '') {
                    subcatData.name = data.sub_category18
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                  var subcatData = { category_id: catData._id }
                  if (data.sub_category19 && data.sub_category19 != '') {
                    subcatData.name = data.sub_category19
                    var sub_category_ = new Subcategories(subcatData)
                    sub_category_.save(function (err, subcatData) { })
                  }
                })
              })
              .on('end', function () {
                if (is_success) {
                  res.json({
                    code: Constant.SUCCESS_CODE,
                    message: 'Category(s) created successfully',
                  })
                } else {
                  res.json({
                    code: Constant.ERROR_CODE,
                    message: errorMessage,
                  })
                }
              })
          }
        })
      },
    ],
    function (err, TraderData) {
      console.log('err', err)
      if (err == 'not_valid') {
        outputJSON = {
          code: Constant.ERROR_CODE,
          message: Constant.NOT_VALID_CSV,
          error_row: count,
        }
      } else if (err) {
        count++
        outputJSON = {
          code: Constant.ERROR_CODE,
          message: Constant.CSV_UPLOAD_UNSUCCESS + ' ' + count,
          error_row: count,
        }
      } else {
        outputJSON = {
          code: Constant.SUCCESS_CODE,
          message: Constant.CSV_UPLOAD_SUCCESS,
        }
      }
      res.jsonp(outputJSON)
    }
  )
}

function subscription_plan_list(req, res) {
  // const data = {
  //     "description_points" : [
  //         {
  //             "point" : "Quote On Jobs In Your Chosen Postcode",
  //             "sub_point" : "Whenever a job is posted in your chosen postcode, you receive a notification there is a job to quote on. Just open the app and start chatting to the service seeker."
  //         },
  //         {
  //             "point" : "Completed Jobs Saved To Property Indefinitely",
  //             "sub_point" : "When you complete a job, your work is saved to the property forever. If the property is bought and sold, you will still be attached and will pop up first for any new service request on that address."
  //         },
  //         {
  //             "point" : "Allow The Community To See Work You’ve Done Locally",
  //             "sub_point" : "When you complete a job, other job searchers in the area can see you’ve been doing a great job and can hire you. The neighbour, the house across the road. They can all reach out and request your services."
  //         },
  //         {
  //             "point" : "Unlimited Quotes",
  //             "sub_point" : "Don’t worry about not winning that job. Quote as many times as you like."
  //         },
  //         {
  //             "point" : "Allow The Community To See Work You’ve Done Locally",
  //             "sub_point" : "When you complete a job, other job searchers in the area can see you’ve been doing a great job and can hire you. The neighbour, the house across the road. They can all reach out and request your services."
  //         },
  //         {
  //             "point" : "Chat Direct To Your Customer",
  //             "sub_point" : "We encourage service providers to stay on the platform to communicate on the first and subsequent jobs. Our subscription model means we are aligned with you."
  //         },
  //         {
  //             "point" : "Promote Your Business With Premium Listing",
  //             "sub_point" : "Show the world your work and your reviews. The premium listing lets anyone search you, see your portfolio and contact you."
  //         }
  //     ],
  //     "amount_per_month" : 9.95,
  //     "label" : "FREE for the first 3 months",
  //     "stripe_product_id" : "prod_FWqzJG0YtmV8F7",
  //     "sort_order" : 1,
  //     "is_active" : true,
  //     "is_deleted" : false
  // }
  // let subModel = new SubscriptionPlan(data);
  // subModel.save(function(err, subdata){
  //     console.log("err  : ", err);
  //         if (err) {
  //             res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
  //         } else {
  //             res.json({ code: Constant.SUCCESS_CODE, message: "data created successfully", data: subdata });
  //         }
  // });

  SubscriptionPlan.find(
    {
      is_active: true,
      is_deleted: false,
    },
    function (err, response) {
      if (err || response.length === 0) {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.INTERNAL_ERROR,
        })
      } else {
        res.json({
          code: Constant.SUCCESS_CODE,
          data: response,
          message: Constant.SUCCESS_CAT_DATA,
        })
      }
    }
  )
}

function stripe_subscription(req, res) {
  var stripe_token = req.query.stripe_token
  var card_id = req.query.card_id
  var email = req.query.email
  var selected_plan_id = req.query.selected_plan_id
  var exp_month = req.query.exp_month
  var exp_year = req.query.exp_year
  var last4 = req.query.last4
  var brand = req.query.brand
  var customer_stripe_id = ''
  var first_time_doing_subscription = false
  var updateUserRecord = {}

    ; (async () => {
      await User.findOne(
        { email: req.query.email, is_active: true, is_deleted: false },
        { email: 1, _id: 1, stripe_customer_id: 1 },
        async function (err, userData) {
          if (!err) {
            // console.log("userData   ", userData);
            if (userData && userData.stripe_customer_id && userData.stripe_customer_id != '') {
              customer_stripe_id = userData.stripe_customer_id
              updateUserRecord.first_time_subscription = false
              console.log('i m in if part')
              var exist_record = false
              await stripe.customers.listSources(
                userData.stripe_customer_id,
                { object: 'card' },
                async function (err, cards) {
                  // console.log("cards     =>  ", cards.data);
                  await cards.data.map(function (value, key) {
                    // console.log("key   ", key);
                    // console.log("element   ", value);
                    if (
                      value.exp_month == exp_month &&
                      value.exp_year == exp_year &&
                      value.last4 == last4 &&
                      value.brand == brand
                    ) {
                      card_id = value.id
                      exist_record = true
                    }
                  })
                  console.log('exist_record    ', exist_record)
                  if (exist_record == true) {
                    //update as default to exist card
                    await stripe.customers.update(
                      userData.stripe_customer_id,
                      { default_source: card_id },
                      function (err, customer) {
                        // console.log("err   ", err);
                        // console.log("customer   ", customer);
                      }
                    )
                  } else {
                    //add new card and update this card as default
                    var card = await stripe.customers.createSource(
                      userData.stripe_customer_id,
                      { source: stripe_token },
                      async function (err, card) {
                        console.log('err   ', err)
                        console.log('card   ', card)
                        await stripe.customers.update(
                          userData.stripe_customer_id,
                          { default_source: card_id },
                          function (err, customer) {
                            // console.log("err   ", err);
                            // console.log("customer   ", customer);
                          }
                        )
                      }
                    )
                  }
                }
              )
            } else {
              console.log('i m in else part')
              var customer = await stripe.customers.create({
                email: email,
                source: stripe_token,
              })
              // console.log("customer    ", customer);
              customer_stripe_id = customer.id
              updateUserRecord.stripe_customer_id = customer_stripe_id
              var card = await stripe.customers.createSource(
                customer_stripe_id,
                { source: stripe_token },
                async function (err, card) {
                  if (card && card.id) {
                    await stripe.customers.update(
                      customer_stripe_id,
                      { default_source: card.id },
                      function (err, customer) {
                        console.log('customer   ', customer)
                      }
                    )
                  }
                }
              )
              updateUserRecord.first_time_subscription = true
              first_time_doing_subscription = true
            }

            await SubscriptionPlan.findOne(
              {
                stripe_plan_id: selected_plan_id,
                is_active: true,
                is_deleted: false,
              },
              { trial_period_days: 1, stripe_plan_id: 1, _id: 1 },
              async function (err, subscriptionData) {
                if (err) {
                  return res.json({
                    code: Constant.ERROR_CODE,
                    message: Constant.INTERNAL_ERROR,
                  })
                } else {
                  var plan_trial_days = 0

                  if (subscriptionData && subscriptionData._id && first_time_doing_subscription == true) {
                    console.log('subscriptionData   ', subscriptionData)
                    // console.log("stripe_plan_id:   ", subscriptionData.stripe_plan_id);
                    // console.log("trial_period_days   ", subscriptionData.trial_period_days);
                    plan_trial_days = subscriptionData.trial_period_days
                  }

                  // console.log("plan_trial_days   ", plan_trial_days);
                  var subscription = await stripe.subscriptions.create({
                    customer: customer_stripe_id,
                    items: [{ plan: selected_plan_id }],
                    trial_period_days: first_time_doing_subscription == true ? plan_trial_days : 0,
                  })
                  if (subscription && subscription.id) {
                    // console.log("subscription    ", subscription);
                    updateUserRecord.is_subscription_cancelled = false
                    updateUserRecord.stripe_email_id = email
                    updateUserRecord.subscription_id = subscription.id
                    updateUserRecord.subscription_start_date = moment
                      .unix(subscription.current_period_start)
                      .format('YYYY-MM-DD hh:mm:ss')
                    updateUserRecord.subscription_end_date = moment
                      .unix(subscription.current_period_end)
                      .format('YYYY-MM-DD hh:mm:ss')
                    updateUserRecord.subscription_plan_id = subscription.plan.id
                    updateUserRecord.trial_period_days = subscription.plan.trial_period_days
                    updateUserRecord.subscription_price = parseFloat(subscription.plan.amount) / 100
                    updateUserRecord.subscription_interval = subscription.plan.interval

                    await User.update(
                      { _id: userData._id },
                      { $set: updateUserRecord },
                      async function (err, userRecord) {
                        if (!err) {
                          //add log
                          var addLog = {}
                          addLog.user_id = userData._id
                          addLog.action = 'create'
                          addLog.first_time_subscription = updateUserRecord.first_time_subscription
                          addLog.subscription_id = subscription.id
                          addLog.subscription_plan_id = selected_plan_id
                          addLog.trial_period_days = subscription.plan.trial_period_days
                          addLog.subscription_price = parseFloat(subscription.plan.amount) / 100
                          addLog.subscription_start_date = moment
                            .unix(subscription.current_period_start)
                            .format('YYYY-MM-DD hh:mm:ss')
                          addLog.subscription_end_date = moment
                            .unix(subscription.current_period_end)
                            .format('YYYY-MM-DD hh:mm:ss')
                          addLog.subscription_interval = subscription.plan.interval

                          var SubscriotionLogRecord = new SubscriptionLog(addLog)
                          // call the built-in save method to save to the database
                          SubscriotionLogRecord.save(function (err, LogRecord) {
                            console.log('Err  ', err)
                            console.log('LogRecord  ', LogRecord)
                          })

                          // console.log("userRecord"   , subscription);
                          return res.json({
                            code: Constant.SUCCESS_CODE,
                            data: subscription,
                            message: 'success',
                          })
                        }
                      }
                    )
                  }
                }
              }
            )
          } else {
            return res.json({
              code: Constant.ERROR_CODE,
              message: Constant.INTERNAL_ERROR,
            })
          }
        }
      )
    })()
}

function update_stripe_card_details(req, res) {
  var card_id = req.query.card_id
  var stripe_token = req.query.stripe_token
  var stripe_customer_id = req.query.stripe_customer_id
  var exp_month = req.query.exp_month
  var exp_year = req.query.exp_year
  var last4 = req.query.last4
  var brand = req.query.brand

  console.log(card_id + '    ' + stripe_token + '   ' + stripe_customer_id)
    ; (async () => {
      var exist_record = false
      await stripe.customers.listSources(stripe_customer_id, { object: 'card' }, async function (err, cards) {
        if (!err) {
          // console.log("cards     =>  ", cards.data);
          await cards.data.map(function (value, key) {
            // console.log("key   ", key);
            // console.log("element   ", value);
            if (
              value.exp_month == exp_month &&
              value.exp_year == exp_year &&
              value.last4 == last4 &&
              value.brand == brand
            ) {
              card_id = value.id
              exist_record = true
            }
          })
          // console.log("exist_record    ", exist_record);
          if (exist_record == true) {
            //update as default to exist card
            await stripe.customers.update(
              stripe_customer_id,
              { default_source: card_id },
              function (err, customer) {
                // console.log("err   ", err);
                // console.log("customer   ", customer);
                return res.json({
                  code: Constant.SUCCESS_CODE,
                  data: customer,
                  message: 'success',
                })
              }
            )

            await User.findOne(
              {
                stripe_customer_id: stripe_customer_id,
                is_active: true,
                is_deleted: false,
              },
              { email: 1, _id: 1, stripe_customer_id: 1 },
              async function (err, userData) {
                //add log
                var addLog = {}
                addLog.user_id = userData._id
                addLog.action = 'update'

                var SubscriotionLogRecord = new SubscriptionLog(addLog)
                // call the built-in save method to save to the database
                await SubscriotionLogRecord.save(function (err, LogRecord) {
                  console.log('Err  ', err)
                  console.log('LogRecord  ', LogRecord)
                })
              }
            )
          } else {
            //add new card and update this card as default
            var card = await stripe.customers.createSource(
              stripe_customer_id,
              { source: stripe_token },
              async function (err, card) {
                console.log('err   ', err)
                console.log('card   ', card)
                await stripe.customers.update(
                  stripe_customer_id,
                  { default_source: card_id },
                  function (err, customer) {
                    return res.json({
                      code: Constant.SUCCESS_CODE,
                      data: customer,
                      message: 'success',
                    })
                    // console.log("err   ", err);
                    // console.log("customer   ", customer);
                  }
                )
              }
            )
          }
        } else {
          return res.json({
            code: Constant.ERROR_CODE,
            message: Constant.INTERNAL_ERROR,
          })
        }
      })
    })()
}

function cancelSubscription(req, res) {
  var subscription_id = req.body.subscription_id
  var customer_id = req.body.customer_id
    ; (async () => {
      if (subscription_id != '' && customer_id != '') {
        await stripe.subscriptions.del(subscription_id, function (err, confirmation) {
          // asynchronously called
        })

        await User.findOneAndUpdate(
          { subscription_id: subscription_id, _id: customer_id },
          {
            $set: {
              is_subscription_cancelled: true,
              subscription_cancelled_date: Date.now(),
            },
          },
          async function (err, data) {
            if (err) {
              return res.json({
                code: Constant.INVALID_CODE,
                message: Constant.INTERNAL_ERROR,
              })
            } else {
              //add log
              var addLog = {}
              addLog.user_id = customer_id
              addLog.action = 'cancel'
              addLog.subscription_id = subscription_id
              addLog.is_subscription_cancelled = true
              addLog.subscription_cancelled_date = Date.now()

              var SubscriotionLogRecord = new SubscriptionLog(addLog)
              // call the built-in save method to save to the database
              await SubscriotionLogRecord.save(function (err, LogRecord) {
                console.log('Err  ', err)
                console.log('LogRecord  ', LogRecord)
              })

              return res.json({
                code: Constant.SUCCESS_CODE,
                message: Constant.USER_DELETE_SUBSCRIPTION,
              })
            }
          }
        )
      } else {
        res.json({
          code: Constant.ERROR_CODE,
          message: Constant.REQ_DATA_MISSING,
        })
      }
    })()
}

function addUserDefaultRole(req, res) {
  console.log('api called => ')
    ; (async () => {
      console.log('api => ')
      if (req.body.role_id) {
        await User.aggregate([
          { $sort: { createdAt: -1 } },
          // { $skip: 0 },
          // { $limit: 5000 },
          {
            $lookup: {
              from: 'groups',
              localField: '_id',
              foreignField: 'user_id',
              as: 'groups',
            },
          },
          {
            $match: {
              'groups.role_id': mongoose.Types.ObjectId(Constant.TRADER),
              'groups.is_master_role': true,
            },
          },
        ])
          .allowDiskUse(true)
          .exec(async function (err, result) {
            console.log('err :: 1st ====> ', err)
            if (err) {
              // callback(Constant.INTERNAL_ERROR, null);
              res.json({
                code: Constant.ERROR_CODE,
                message: Constant.ERROR_RETRIVING_DATA,
              })
            } else {
              let totalCount = result.length

              let successCount = 0
              let uniqueTraders
              uniqueTraders = await getUnique(result, 'email')
              console.log('uniqueTraders => ', uniqueTraders)
              console.log('uniqueTraders.length => ', uniqueTraders.length)

              uniqueTraders.forEach((ele) => {
                console.log('ele.defaultUserRole => ', ele.defaultUserRole)
                if (!ele.defaultUserRole) {
                  console.log('in function => ')
                  User.update(
                    { email: ele.email },
                    { $set: { defaultUserRole: 'trader' } },
                    function (err, updatedUser) {
                      if (err) {
                        console.log('err occured while updating user => ', err + '::' + ele.email)
                      } else {
                        if (updatedUser) {
                          successCount++
                          console.log(
                            'updatedUser::user updated successfully => ',
                            updatedUser + '::' + ele.email,
                            successCount
                          )
                        }
                      }
                    }
                  )
                  // if (ele.defaultUserRole !== "trader") {
                  //     console.log('ele.email => ', ele.email);
                  // }

                  console.log('successCount => ', successCount)
                } else {
                  console.log('else => ')
                }
              })
              res.json({
                code: Constant.SUCCESS_CODE,
                data: result,
                totalCount: totalCount,
              })
            }
          })
      }
    })()
}

function getUnique(arr, comp) {
  // store the comparison  values in array
  const unique = arr
    .map((e) => e[comp])
    // store the indexes of the unique objects
    .map((e, i, final) => final.indexOf(e) === i && i)
    // eliminate the false indexes & return unique objects
    .filter((e) => arr[e])
    .map((e) => arr[e])
  console.log('unique => ', unique)
  return unique
}

function removeDuplicateGroups(req, res) {
  console.log('api called => ')
    ; (async () => {
      console.log('api => ')
      if (req.body.admin_id) {
        console.log('here => ')
        Group.aggregate([
          // { $sort: { "createdAt": -1 } },
          // { $skip: 0 },
          // { $limit: 50 },
          {
            $match: {
              role_id: mongoose.Types.ObjectId(Constant.TRADER),
              deleted: false,
              is_master_role: true,
              status: true,
            },
          }, // Match me
          // { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'groupsData' } },
          // { $match: { "groupsData.is_active": true, "groupsData.is_deleted": false } },
          // {
          //     $group:
          //     {
          //         _id: null,
          //         "count": { $sum: 1 }
          //     }
          // }
        ]).exec(async function (err, result) {
          if (err) {
            console.log('err => ', err)
          } else {
            let ifCount = 0
            let elseCount = 0
            // console.log('result.length => ', result.length);
            // console.log('result.groupsData => ', result.groupsData);
            await result.map(async (ele) => {
              // console.log('ele.groupsData => ', ele.groupsData);
              // if (ele.groupsData) {
              //     console.log('if => ');
              //     await ifCount++;
              // } else {
              //     console.log('else => ');
              //     await elseCount++;
              // }
              User.findById(ele.user_id, function (userErr, foundUser) {
                console.log('userErr => ', userErr)
                console.log('foundUser.is_active => ', foundUser.is_active)
                if (foundUser) {
                  console.log('foundUser => ', foundUser)
                  console.log('foundUser.is_active => ', foundUser['is_active'])
                  console.log('foundUser.email => ', foundUser.email)
                  // if (foundUser.is_active != null && foundUser.is_active) {
                  //     console.log('found => ', ifCount++);
                  // } else {
                  //     console.log('not active => ', elseCount++);
                  // }
                } else {
                  console.log('else => ', elseCount++)
                }
              })
              // console.log('ele.user_id => ', ele.user_id);
            })
            console.log('ifCount => ', await ifCount)
            console.log('elseCount => ', await elseCount)
            // console.log('result => ', result);
            // if (result.length == 0) {
            //     console.log('result => ', result);
            // } else {
            // }
          }
        })
      }
    })()
}
