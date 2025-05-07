'use strict';
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    NotificationInfo = mongoose.model('Notification'),
    Constant = require('../../config/constant.js'),
    validator = require('../../config/validator.js'),
    maintenances = mongoose.model('maintenances'),
    async = require('async'),
    forEach = require('async-foreach').forEach,
    reviews = mongoose.model('reviews');

module.exports = {
    addReview: addReview,
    getUserReview: getUserReview,
    getTraderAllReviews: getTraderAllReviews,
    GetUserRolesReview: GetUserRolesReview,
    addResponse, addResponse,
    tradersJobHistory: tradersJobHistory,
    deleteReview: deleteReview
};


/*Function to add reponse on traders profile 
  Request logged in user profile 
*/
function addResponse(req, res) {
    var review_id = (typeof req.body.review_id != 'undefined') ? mongoose.Types.ObjectId(req.body.review_id) : '';
    var response = (typeof req.body.response != 'undefined') ? req.body.response : '';
    var response_by = (typeof req.body.response_by != 'undefined') ? mongoose.Types.ObjectId(req.body.response_by) : '';

    if (review_id && response_by) {
        reviews.findOne({ _id: review_id }).exec(function (err, data) {
            //console.log(data);
            if (typeof data.response != 'undefined' && data.response.length > 0) {
                var responds_arr = data.response;
                responds_arr.push({ "response_by": response_by, "response": response });
                var updateData = { response: responds_arr };
            } else {
                var responds_arr = [];
                responds_arr.push({ "response_by": response_by, "response": response });
                var updateData = { response: responds_arr };
            }
            //console.log("updateData",updateData);

            reviews.update({ _id: review_id }, { $set: updateData }, function (err) {
                if (err) {
                    res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
                } else {
                    res.json({ code: Constant.SUCCESS_CODE, message: "successfully added response" });
                }
            });
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

/* Function to get traders user specific reviews
   created & modfied on 18 Jan
   Reviews and rating  including in response
   Required param is traders logged in id 
   Added By Rahul Lahariya
*/

function GetUserRolesReview(req, res) {

    var cnt = 0;
    var user_id = (typeof req.body.user_id != 'undefined') ? mongoose.Types.ObjectId(req.body.user_id) : '';
    var user_role = (typeof req.body.user_role != 'undefined') ? mongoose.Types.ObjectId(req.body.user_role) : '';
    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;

    if (user_id && user_role) {
        reviews.count({ review_to: user_id, review_by_role: user_role }).exec(function (err, cnt) {
            if (err) {
                res.json({ 'code': Constant.ERROR_CODE, 'message': Constant.ERROR_RETRIVING_DATA });
            } else {
                if (cnt > 0) {
                    reviews.find({ review_to: user_id, review_by_role: user_role, is_deleted: false })
                        .populate('review_by', 'firstname lastname image')
                        .populate('response.response_by', 'firstname lastname image')
                        .sort({ createdAt: -1 })
                        .exec(function (err, data) {
                            if (err) {
                                res.json({ 'code': Constant.ERROR_CODE, 'message': Constant.ERROR_RETRIVING_DATA });
                            } else {
                                res.json({ 'code': Constant.SUCCESS_CODE, 'data': data });
                            }
                        });
                } else {
                    res.json({ 'code': Constant.SUCCESS_CODE, 'data': [] });
                }
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}


/* Function to get traders all reviews
   created & modfied on 18 Jan
   Reviews and rating  including in response
   Required param is traders logged in id 
   Added By Rahul Lahariya
*/

function getTraderAllReviews(req, res) {
    var user_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    var cnt = 0;
    //var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    //var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;

    if (user_id) {
        reviews.count({ review_to: user_id }).exec(function (err, cnt) {
            if (err) {
                res.json({ 'code': Constant.ERROR_CODE, 'message': Constant.ERROR_RETRIVING_DATA });
            } else {
                if (cnt > 0) {
                    reviews.find({ review_to: user_id, is_deleted: false })
                        .populate('review_by', 'firstname lastname image')
                        .populate('response.response_by', 'firstname lastname image')
                        .sort({ createdAt: -1 })
                        .exec(function (err, data) {
                            if (err) {
                                res.json({ 'code': Constant.ERROR_CODE, 'message': Constant.ERROR_RETRIVING_DATA });
                            } else {
                                res.json({ 'code': Constant.SUCCESS_CODE, 'data': data });
                            }
                        });
                } else {
                    res.json({ 'code': Constant.SUCCESS_CODE, 'data': [] });
                }
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

/* Function to get traders job history detail
   created & modfied on 18 Jan
   Reviews and rating  including in response
   Required param is traders logged in id 
   Added By Rahul Lahariya
*/

function tradersJobHistory(req, res) {
    var trader_id = (typeof req.body.trader_id != 'undefined') ? mongoose.Types.ObjectId(req.body.trader_id) : '';
    var page_number = req.body.current_page ? parseInt(req.body.current_page) - 1 : 0;
    var number_of_pages = req.body.number_of_pages ? parseInt(req.body.number_of_pages) : 20;

    if (trader_id) {

        var condition = {
            trader_id: trader_id,
            $or: [{
                req_status: 3
            }, {
                req_status: 4
            }, {
                req_status: 5
            }, {
                req_status: 6
            }]
        };

        maintenances.aggregate([
            { $match: condition }, // Match me
            { $sort: { createdAt: -1, _id: -1 } },
            { $lookup: { from: 'reviews', localField: '_id', foreignField: 'job_id', as: 'reviews' } },
            {
                $group:
                {
                    _id: null,
                    "count": { $sum: 1 }
                }
            },
        ])
            .allowDiskUse(true)
            .exec(function (err, result) {
                if (err) {
                    res.json({ 'code': Constant.ERROR_CODE, 'message': Constant.ERROR_RETRIVING_DATA });
                } else {
                    var totalCount = 0;
                    if (result.length > 0) {
                        totalCount = result[0].count;
                        maintenances.aggregate([
                            { $match: condition }, // Match me
                            { $lookup: { from: 'reviews', localField: '_id', foreignField: 'job_id', as: 'reviews' } },
                            {
                                $project: {
                                    _id: 1, request_id: 1, request_overview: 1,
                                    request_detail: 1, budget: 1, due_date: 1, completed_date: 1, createdAt: 1,
                                    reviews: { _id: 1, comments: 1, avg_total: 1, review_to: 1 }
                                }
                            }
                        ]).allowDiskUse(true).exec(function (err, data) {
                            if (err) {
                                res.json({ 'code': Constant.ERROR_CODE, 'message': Constant.ERROR_RETRIVING_DATA });
                            } else {
                                res.json({ 'code': Constant.SUCCESS_CODE, 'data': data, 'total_cnt': totalCount });
                            }
                        });
                    } else {
                        res.json({ 'code': Constant.SUCCESS_CODE, 'data': result, 'total_cnt': 0 });
                    }
                }
            });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

function getUserReview(req, res) {
    var user_id = mongoose.Types.ObjectId(req.swagger.params.id.value);
    var cnt = 0;
    if (user_id) {
        reviews.count({ review_to: user_id, is_deleted: false }).exec(function (err, cnt) {
            if (err) {
                res.json({ 'code': Constant.ERROR_CODE, 'message': Constant.ERROR_RETRIVING_DATA });
            } else {
                if (cnt > 0) {
                    reviews.find({ review_to: user_id, is_deleted: false }).exec(function (err, data) {
                        if (err) {
                            res.json({ 'code': Constant.ERROR_CODE, 'message': Constant.ERROR_RETRIVING_DATA });
                        } else {
                            var totalArr = [];
                            var temp = 0;
                            async.each(data, function (val, asyncCall) {
                                temp = temp + val.avg_total;
                                totalArr.push(temp);
                                asyncCall(null, totalArr);
                            }, function (err) {
                                if (err) {
                                    res.json({ 'code': Constant.ERROR_CODE, 'message': Constant.ERROR_RETRIVING_DATA });
                                } else {
                                    var tot = totalArr.length;
                                    var finalTotalCnt = (totalArr.length > 0) ? totalArr[tot - 1] : 0;
                                    var averageRate = Math.round(finalTotalCnt / cnt);
                                    res.json({ 'code': Constant.SUCCESS_CODE, 'data': averageRate, 'total_review': cnt });
                                }
                            });
                        }
                    });
                } else {
                    res.json({ 'code': Constant.SUCCESS_CODE, 'data': 0, 'total_review': 0 });
                }
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

function addReview(req, res) {

    var review_by = (typeof req.body.review_by != 'undefined') ? mongoose.Types.ObjectId(req.body.review_by) : '';
    var review_to = (typeof req.body.review_to != 'undefined') ? mongoose.Types.ObjectId(req.body.review_to) : '';
    var review_by_role = (typeof req.body.review_by_role != 'undefined') ? mongoose.Types.ObjectId(req.body.review_by_role) : '';
    var job_id = (typeof req.body.job_id != 'undefined') ? mongoose.Types.ObjectId(req.body.job_id) : '';
    var comments = (typeof req.body.comments != 'undefined') ? req.body.comments : '';
    var quality_of_work = (typeof req.body.quality_of_work != 'undefined') ? req.body.quality_of_work : 0;
    var punctaulity = (typeof req.body.punctaulity != 'undefined') ? req.body.punctaulity : 0;
    var communication = (typeof req.body.communication != 'undefined') ? req.body.communication : 0;
    var avg = (parseInt(quality_of_work) + parseInt(punctaulity) + parseInt(communication)) / 3;

    if (review_by && review_to) {

        var obj = {};
        obj.review_by = review_by;
        obj.review_to = review_to;
        obj.comments = comments;
        obj.quality_work = quality_of_work;
        obj.puntuality = punctaulity;
        obj.communication = communication;
        obj.avg_total = avg;
        if (job_id)
            obj.job_id = job_id;
        if (review_by_role)
            obj.review_by_role = review_by_role;
        //console.log("obj",obj);     
        var review = new reviews(obj);
        review.save(function (err, reviewdata) {
            if (err) {
                res.json({ code: Constant.ERROR_CODE, message: Constant.INTERNAL_ERROR });
            } else {
                // commented for now - add total avg rate
                reviews.find({ review_to: review_to }, async function (reviewErr, reviewData) {
                    console.log('reviewData => ', reviewData);
                    // calculate avg rate , avg_total
                    // count total review length
                    if (reviewErr) {
                        console.log('err occured while getting reviewData :: reviewErr => ', reviewErr);
                    } else {

                        let totalRate = 0;
                        let reviewCount = 0;
                        if (reviewData && reviewData.length > 0) {
                            console.log('reviewData.length => ', reviewData.length);
                            await reviewData.map(async ele => {
                                console.log('ele.avg_total, totalRate => ', ele.avg_total, totalRate);
                                totalRate = (totalRate + ele.avg_total);
                                console.log('totalRate :: sum => ', totalRate);
                            })
                            reviewCount = reviewData.length;
                        }
                        // update user and store avg rate & total review length
                        console.log('avgRate, reviewCount => ', await Math.round(totalRate / reviewCount), await reviewCount);
                        const obj = {
                            averageRate: await Math.round(totalRate / reviewCount),
                            totalReviewLength: await reviewCount
                        }
                        console.log('obj => ', obj);
                        await User.findByIdAndUpdate(review_to, obj, function (userErr, updatedUser) {
                            if (userErr) {
                                console.log('Error occured while finding user :: userErr => ', userErr);
                            } else {
                                console.log('updatedUser => ', updatedUser);
                            }
                        })
                    }

                });
                res.json({ code: Constant.SUCCESS_CODE, data: reviewdata });
            }
        });
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQ_DATA_MISSING });
    }
}

function deleteReview(req, res) {

    var reviewId = mongoose.Types.ObjectId(req.swagger.params.id.value);
    // console.log("reviewId  ", reviewId);
    reviews.findOneAndUpdate(
        {
            "_id": reviewId,
            "is_deleted": false
        }, {
        $set: {
            "is_deleted": true
        }
    },
        { new: true, runValidators: true },
        function (err, reviewData) {
            if (err) {
                res.json({
                    code: Constant.ERROR_CODE,
                    message: 'Review Not Deleted',
                });
            } else {
                res.json({
                    code: Constant.SUCCESS_CODE,
                    data: reviewData,
                    message: 'Review Deleted Successfully',
                });
            }
        });
}