'use strict';
/*
 * Utility - utility.js
 * Author: smartData Enterprises
 * Date: 3rd Jan 2017
 */
var mongoose = require('mongoose');
var nodemailer = require('nodemailer');
var fs = require("fs");
var path = require('path');
var config = require('../../config/config.js')
var nodemailer = require('nodemailer');
var config = require('../../config/config.js');
var co = require("co");
var jwt = require('jsonwebtoken');
var nodemailer = require('nodemailer');
var mg = require('nodemailer-mailgun-transport');
var utility = {};

utility.readTemplateSendMail = function(to, subject, userData, templateFile, callback) {
    console.log('inside read template',userData);
    var filePath = path.join(__dirname, '/email_template/' + templateFile + '.html');
    fs.readFile(filePath, {
        encoding: 'utf-8'
    }, function(err, data) {
        //console.log("inside function",data);
        // console.log("Error",err);
        if (!err) {
            var template = data
                .replace(/{firstname}/g, utility.capitalize(userData.firstname))
                .replace(/{lastname}/g, utility.capitalize(userData.lastname));
            // console.log("before send email");
            transporter.sendmail(userData.email, subject, template, function(mailErr, resp) {
                console.log("utility.sendmail");
                if (err)
                    callback(mailErr);
                else
                    callback(null, true);
            });
        } else {
            callback(err);
        }
    });
}

utility.sendmail = function(to, subject, message, callback) {
    console.log("inside send mail");
    var smtpTransport = nodemailer.createTransport("SMTP", {
        service: config.SMTP.service,
        host: config.SMTP.host,
        port: config.SMTP.port,
        secure: config.SMTP.secure,
        auth: {
            user: 'wineNrare2017@gmail.com',
            pass: 'Password@mk01'
        }
    });

    var mailOptions = {
        to: to,
        from: 'minakshiakumar23@gmail.com',
        subject: subject,
        html: message
    };
    console.log("mailOptions",mailOptions);
    smtpTransport.sendMail(mailOptions, function(err) {
        if (err) {
            console.log(err, 'mail send Error');
            callback(err);
        } else {
            console.log('info', 'An e-mail has been sent to  with further instructions.');
            callback(null, true);
        }
    });
}

utility.uploadImage = function(imageBase64, imageName, callback) {
    if (imageBase64 && imageName) {
        var timestamp = Number(new Date()); // current time as number
        var filename = +timestamp + '_' + imageName;
        var imagePath = "./public/assets/uploads/" + filename;
        fs.writeFile(path.resolve(imagePath), imageBase64, 'base64', function(err) {
            if (!err) {
                callback(config.webUrl + "/assets/uploads/" + filename);
            } else {
                callback(config.webUrl + "/assets/images/default-image.png");
            }
        });
    } else {
        callback(false);
    }
}
utility.fileExistCheck = function(path, callback) {
    fs.exists(path, function(err) {
        if (err) {
            callback(true);
        } else {
            callback(false);
        }
    });
}

utility.validationErrorHandler = function(err) {
    var errMessage = constantsObj.validationMessages.internalError;
    if (err.errors) {
        for (var i in err.errors) {
            errMessage = err.errors[i].message;
        }
    }
    return errMessage;
}

utility.filterProductData = function(listArr, status, callback) {
    var mainArr = [];
    async.eachSeries(listArr,
        function(result, callback) {
            if (result.product_id) {
                var prodStatus = status || 1;
                // if (status == 'sold/listing') {
                //     var condition = (result.product_id.status == 3 || result.product_id.status == 1) && (result.product_id.deleted == false);
                // } else {
                    var condition = (result.product_id.status == prodStatus) && (result.product_id.deleted == false);
                // }
                if (condition) {
                    delete result.product_id.deleted;
                    result.product_image = [];
                    ProductImage.find({ product_id: result.product_id._id, deleted: false }, 'product_image').exec(function(err, prodImage) {
                        if (err)
                            callback(err);
                        else {
                            if (prodImage.length > 0) {
                                /*async.eachSeries(prodImage,
                                    function(result1, callback) {
                                        // var split = result1.product_image.split('assets/uploads/products/');
                                        // utility.fileExistCheck('./public/assets/uploads/products/' + split[1], function(exist) {
                                        //     if (exist) {
                                                result.product_image.push(result1.product_image);
                                            // }
                                            callback(null);
                                        // });
                                    },
                                    function(err) {
                                        mainArr.push(result);
                                        callback(null);
                                    });*/
                                    for(var i in prodImage) {
                                        result.product_image.push(prodImage[i].product_image);
                                    }
                                    mainArr.push(result);
                                    callback(null);
                            } else {
                                // setTimeout(function() {
                                    // result.product_image.push('assets/images/no-image-available.jpg');
                                    mainArr.push(result);
                                    callback(null);
                                // }, 0);
                            }
                        }
                    });
                } else {
                    callback(null);
                }
            } else {
                callback(null);
            }
        },
        function(err) {
            if (err)
                callback(err);
            else
                callback(null, mainArr);
        });
}


   
utility.fileUpload = function(imagePath, buffer) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(path.resolve(imagePath), buffer, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}


utility.validateArray = function(array) {
    if (!array) {
        return false;
    } else {
        if (Array.isArray(array)) {
            return ((array.length) ? true : false);            
        } else {
            return false;
        }
    }
}
utility.capitalize = function(input){
    return input.charAt(0).toUpperCase() + input.substr(1).toLowerCase();
}
module.exports = utility;
