'use strict';
var mongoose = require('mongoose'),
    advertiseModel = require('../models/Advertising'),
    path = require('path');
const Constant = require('../../config/constant.js');
var waterfall = require('run-waterfall');
var fs = require('fs-extra');
const thumb = require('node-thumbnail').thumb;

module.exports = {
    addAdvertise: addAdvertise,
    createAdvertiseImage: createAdvertiseImage,
    getAdminAdvertiseList: getAdminAdvertiseList,
    getAdvertiseList: getAdvertiseList,
    advertiseDetail: advertiseDetail,
    clickedAdvertise: clickedAdvertise,
    viewedAdvertise: viewedAdvertise,
    updateAdvertiseStatus: updateAdvertiseStatus
}

// Add Advertise
function addAdvertise(req, res) {
    console.log('req.body => ', req.body);
    var outputJSON = {};
    try {
        const advertise = new advertiseModel({
            name: req.body.name,
            postcode: req.body.postcode,
            state: req.body.state,
            url: req.body.url,
            status: req.body.status,
            adLocation: req.body.adLocation,
            comments: req.body.comments,
        });
        if (advertise) {
            advertise.save(function (err, advertiseData) {
                console.log('advertiseData => ', advertiseData);
                if (err) {
                    outputJSON = {
                        code: Constant.ERROR_CODE,
                        message: err
                    };
                } else {
                    outputJSON = {
                        code: Constant.SUCCESS_CODE,
                        data: advertiseData,
                        message: "Advertise added successfully",
                    };
                }
                res.jsonp(outputJSON);
            });
        }
    } catch (error) {
        console.log('error => ', error);
    }
}

// Add advertise image
function createAdvertiseImage(req, res) {
    console.log('create advertise image api ===========================> ');
    console.log('req.swagger.params.file.value => ', req.swagger.params.file.value);
    var formData = {};
    var outputJSON = {};
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
                var dir = './api/uploads/advertise_image';
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
                source: './api/uploads/advertise_image/' + filename, // could be a filename: dest/path/image.jpg
                destination: './api/uploads/advertise_image/thumb',
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
            console.log('formData => ', formData);
            if (req.body._id) {
                advertiseModel.findOneAndUpdate({ _id: req.body._id },
                    { file: formData }, function (err, data) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, data);
                            console.log('data ::2=> ', data);
                        }
                    });
            }
        }
    ], function (err, advertiseData) {
        if (err) {
            outputJSON = {
                code: Constant.ERROR_CODE,
                message: err
            };
        } else {
            outputJSON = {
                code: Constant.SUCCESS_CODE,
                data: advertiseData,
                message: "ad Image added successfully.",
            };
        }
        res.jsonp(outputJSON);
    });
}

// Get advertise list for admin
function getAdminAdvertiseList(req, res) {
    // console.log('request.connection.remoteAddress => ', req);
    console.log('req.headers[`x-forwarded-for`] => ', req.headers['x-forwarded-for']);
    console.log('req.connection.remoteAddress => ', req.connection.remoteAddress);
    console.log('req.Header => ', req.Header);
    console.log('req.body => ', req.body);
    // var user_id = (typeof req.body.user_id != 'undefined') ? req.body.user_id : '';
    var searchtext = (typeof req.body.searchtext != 'undefined') ? req.body.searchtext : '';
    var conditions = { "$and": [] };
    // if (user_id)
    //     conditions["$and"].push({ "_id": { $ne: mongoose.Types.ObjectId(user_id) } });
    conditions["$and"].push({
        $or: [
            { "name": { $regex: new RegExp(searchtext, "i") } },
            { "state": { $regex: new RegExp(searchtext, "i") } },
            { "postcode": { $regex: new RegExp(searchtext, "i") } }]
    });
    advertiseModel.aggregate([
        { $match: conditions }])
        .sort(
            { 'createdAt': -1 }
        )
        .exec(function (err, advertise) {
            if (err) {
                res.json({
                    code: Constant.ERROR_CODE,
                    message: Constant.INTERNAL_ERROR
                });
            } else if (advertise && advertise.length) {
                res.json({
                    code: Constant.SUCCESS_CODE,
                    message: "Advertise Listed successfully.",
                    data: advertise
                });
            } else {
                res.json({
                    code: Constant.ERROR_CODE,
                    message: "Error occured while retreiving the data from collection"
                });
            }

        });

}

// Get advertise list for all users
function getAdvertiseList(req, res) {
    console.log('req.body => ', req.body);
    var searchState = (typeof req.body.searchState != 'undefined') ? req.body.searchState : '';
    var searchtext = (typeof req.body.searchtext != 'undefined') ? req.body.searchtext : '';
    var conditions = { "$and": [] };
    conditions["$and"].push({ "status": "active" });

    if (req.body.searchState && req.body.searchtext) {
        console.log('state & postcode => ');
        conditions["$and"].push({
            $or: [
                { "state": { $regex: new RegExp(searchState, "i") } },
                { "postcode": { $regex: new RegExp(searchtext, "i") } }
            ]
        });
    } else {
        if (req.body.searchtext && !(req.body.searchState)) {
            console.log('only postcode => ');
            conditions["$and"].push({
                $or: [
                    { "postcode": { $regex: new RegExp(searchtext, "i") } }]
            });
        }
        if (!(req.body.searchtext) && (req.body.searchState)) {
            console.log('only state => ');
            conditions["$and"].push({
                $or: [
                    { "state": { $regex: new RegExp(searchState, "i") } }
                ]
            });
        }
    }

    advertiseModel.aggregate([
        { $match: conditions }])
        .exec(function (err, advertise) {
            console.log('advertise data  => ', advertise);
            if (err) {
                res.json({
                    code: Constant.ERROR_CODE,
                    message: Constant.INTERNAL_ERROR
                });
            } else if (advertise && advertise.length) {
                res.json({
                    code: Constant.SUCCESS_CODE,
                    message: "Advertise Listed successfully.",
                    data: advertise
                });
            } else {
                res.json({
                    code: Constant.ERROR_CODE,
                    message: "Error occured while retreiving the data from collection"
                });
            }

        });

}

// Advertise detail for admin panel
function advertiseDetail(req, res) {
    console.log('req.body.id => ', req.body.id);
    advertiseModel.find({
        '_id': req.body.id
    }).exec(function (err, advertise) {
        if (err) {
            return res.json({
                code: 400,
                message: "Error"
            });
        } else if (advertise.length) {
            return res.json({
                code: 200,
                message: "Successfully got data",
                data: advertise
            });
        } else {
            return res.json({
                code: 400,
                message: "Error occured while retreiving the data from collection"
            });
        }
    })
}

// Track clicked advertise
function clickedAdvertise(req, res) {
    console.log('req.body => ', req.body);
    try {
        advertiseModel.find({
            '_id': req.body.adId
        }).exec(function (err, adData) {
            console.log('err while searching for addata :: clicked ad api=> ', err);
            console.log('adData :: clicked api=> ', adData);
            if (err) {
                return res.json({
                    code: 400,
                    message: "Error"
                });
            } else if (adData) {
                console.log('adData found :: clicked api :: if condition=> ', adData[0]);
                console.log('adData[0].clicked => ', adData[0].clicked);
                let count;
                count = adData[0].clicked;
                console.log('count :: 1 => ', count);
                count++;
                console.log('count 2 => ', count);

                advertiseModel.findOneAndUpdate(
                    { _id: req.body.adId },
                    { clicked: count }, function (err, updateData) {
                        console.log('updateData :: updated ad :: clicked ad=> ', updateData);
                        if (err) {
                            console.log('err :: occured while updating clicked data for ad=> ', err);
                            return res.json({
                                code: 400,
                                message: err
                            });
                        } else {
                            return res.json({
                                code: 200,
                                message: "Successfully upadted clicked record for advertise",
                                data: []
                            });
                        }
                    }
                );

            } else {
                return res.json({
                    code: 400,
                    message: "Error occured while retreiving the data from collection"
                });
            }
        });
    } catch (error) {
        return res.json({
            code: 400,
            message: error
        });
    }

}

// Track viewed advertise
function viewedAdvertise(req, res) {
    console.log('req.body => ', req.body);
    if (req.body.adId && req.body.userIP) {
        const userIP = req.body.userIP;
        try {
            advertiseModel.find({
                '_id': req.body.adId
            }).exec(function (err, adData) {
                console.log('adData :: viewed api=> ', adData);
                if (err) {
                    console.log('err while searching for addata :: viewed ad api=> ', err);
                    return res.json({
                        code: 400,
                        message: "Error"
                    });
                } else if (adData) {
                    console.log('adData found :: viewed api : if condition=> ', adData);
                    console.log('adData.viewed => ', adData[0].viewed);
                    let ipArray = [];
                    ipArray = adData[0].viewed;
                    console.log('ipArray :: check for value => ', ipArray);
                    let isIpAdded;
                    if (ipArray && ipArray.length > 0) {
                        // ipArray.forEach(element => {
                        //     console.log('element => ', element);
                        //     console.log('userIP => ', userIP);
                        //     console.log('element !== userIP => ', element !== userIP);
                        //     if (element !== userIP) {
                        //         ipArray.push(userIP);
                        //     }
                        // });
                        isIpAdded = ipArray.find(function (el) {
                            return el == userIP
                        });
                        console.log('isIpAdded => ', isIpAdded);
                        if (!isIpAdded) {
                            console.log('!isIpAdded => ', isIpAdded);
                            ipArray.push(userIP);
                        }
                    } else {
                        // ipArray = [];
                        ipArray.push(userIP);
                    }
                    console.log('ipArray :: before update  => ', ipArray);
                    advertiseModel.findOneAndUpdate(
                        { _id: req.body.adId },
                        { viewed: ipArray }, function (err, updateData) {
                            console.log('updateData :: updated ad :: viewed ad=> ', updateData);
                            if (err) {
                                console.log('err :: occured while updating viewed data for ad=> ', err);
                                return res.json({
                                    code: 400,
                                    message: err
                                });
                            } else {
                                return res.json({
                                    code: 200,
                                    message: "Successfully upadted viewed record for advertise",
                                    data: []
                                });
                            }
                        }
                    );
                } else {
                    return res.json({
                        code: 400,
                        message: "Error occured while retreiving the data from collection"
                    });
                }
            });
        } catch (error) {
            return res.json({
                code: 400,
                message: error
            });
        }
    }

}

// Update advertise status
function updateAdvertiseStatus(req, res) {
    console.log('req.body :: update status api=> ', req.body);
    if (req.body.adId && req.body.status) {
        try {
            advertiseModel.find({
                '_id': req.body.adId
            }).exec(function (err, adData) {
                console.log('adData :: viewed api=> ', adData);
                if (err) {
                    console.log('err while searching for addata :: update status for ad api=> ', err);
                    return res.json({
                        code: 400,
                        message: "Error"
                    });
                } else if (adData) {
                    advertiseModel.findOneAndUpdate(
                        { _id: req.body.adId },
                        { status: req.body.status }, function (err, updateData) {
                            console.log('updateData :: updated ad => ', updateData);
                            if (err) {
                                console.log('err :: occured while updating status for ad=> ', err);
                                return res.json({
                                    code: 400,
                                    message: err
                                });
                            } else {
                                return res.json({
                                    code: 200,
                                    message: "Successfully upadted status for advertise",
                                    data: []
                                });
                            }
                        }
                    );
                } else {
                    return res.json({
                        code: 400,
                        message: "Error occured while retreiving the data from collection"
                    });
                }
            });
        } catch (error) {
            return res.json({
                code: 400,
                message: error
            });
        }
    }
}