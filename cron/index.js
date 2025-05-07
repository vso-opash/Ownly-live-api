var cron = require('node-cron');

cron.schedule('0 1 * * *', function () {
    // cron.schedule('* * * * *', function () {
    console.log('running a task every day');
    var User = require('../api/models/Users'),
        mongoose = require('../node_modules/mongoose/'),
        _ = require('underscore'),
        async = require('async'),
        Config = require('../config/config.js'),
        Constant = require('../config/constant.js'),
        maintenances = mongoose.model('maintenances'),
        maintenance_proposals = mongoose.model('maintenance_proposals'),
        maintentenance_traders_log = require('../api/models/MaintentenanceTradersLog'),
        changeCase = require('change-case'),
        nodemailer = require("nodemailer"),
        smtpTransport = require('nodemailer-smtp-transport'),
        d = new Date();
    var sendmail = require('sendmail')();
    var lodash = require('lodash');

    var transporter = nodemailer.createTransport(smtpTransport({
        service: Config.SMTP.service,
        auth: {
            user: Config.SMTP.authUser,
            pass: Config.SMTP.authpass
        }
    }));

    (async () => {
        await maintenances.find({
            'deleted': false,
            'req_status': 1,
            'request_type': 1,
            'sent_to_more_traders': false
        }).exec(async function (err, maintenancesData) {

            if (err) {
                return resp.json({
                    code: 400,
                    message: "Error"
                });
            } else {

                await maintenancesData.map(async function (value, key) {

                    await maintenances.update({ '_id': mongoose.Types.ObjectId(value._id) },
                        {
                            $set: {
                                'sent_to_more_traders': true
                            }
                        }, async function (err1) { }
                    );

                    await maintenance_proposals.find({
                        'deleted': false,
                        'proposal_type': 'apply',
                        'maintenance_id': mongoose.Types.ObjectId(value._id)
                    }).exec(async function (err, maintenancesProposalsData) {

                        if (maintenancesProposalsData.length < 3) {
                            // console.log("maintenancesProposalsData    ", maintenancesProposalsData);
                            var proposal_created_by_list = await _.pluck(maintenancesProposalsData, 'proposal_created_by');
                            // console.log("proposal_created_by_list    ", proposal_created_by_list);

                            var maintenance_id = mongoose.Types.ObjectId(value._id);
                            var latitude = value.latitude;
                            var longitude = value.longitude;
                            var categories_id = value.categories_id;
                            var mail_title = request_overview = value.request_overview + ' - Quote Request'
                            var request_detail = value.request_detail;
                            var budget = value.budget;
                            var due_date = value.due_date;
                            // console.log("length    ", value._id, " === ", maintenancesProposalsData.length);

                            var quote_link = Constant.STAGGING_URL + '#!/maintance_detail/' + maintenance_id;
                            // Send Mail to within specified km Traders
                            var conditions = { 'is_deleted': false };

                            if (longitude && longitude != '' && latitude && latitude != '') {

                                conditions.location = {
                                    $geoWithin: {
                                        $centerSphere: [
                                            [longitude, latitude], Constant.HUNDRED_KM_INTO_MILE / Constant.RADIUS
                                        ]
                                    }
                                };
                            }

                            if (proposal_created_by_list && proposal_created_by_list.length > 0) {
                                conditions._id = { $nin: proposal_created_by_list };
                                // console.log(maintenance_id, "  =>  conditions._id     ", conditions._id);
                            } else {
                                // console.log(maintenance_id, "  =>  else part conditions._id");
                            }

                            if (categories_id != '') {
                                conditions.categories_id = mongoose.Types.ObjectId(categories_id[0]);
                            }
                            // console.log("Data      ", JSON.stringify(conditions));
                            var key1 = 1;
                            setTimeout(async function timer() {
                                await User.find(conditions)
                                    .exec(async function (err, userData) {
                                        if (!err) {
                                            var Traderdata_ = await _.pluck(userData, '_id');
                                            var traderLog = { more_mail_send_trader_id: Traderdata_ };
                                            // console.log(maintenance_id, "  =>  traderLog    =>   ", traderLog);

                                            var conditions1 = { "$and": [] };
                                            conditions1["$and"].push({ maintenance_id: mongoose.Types.ObjectId(maintenance_id) });
                                            conditions1 = { "$or": [] };
                                            conditions1["$or"].push({ "more_mail_send_trader_id": { $exists: false } });
                                            conditions1["$or"].push({ "more_mail_send_trader_id": [] });

                                            await maintentenance_traders_log.update(
                                                conditions1,
                                                { $push: traderLog },
                                                async function (err__, log_data) {
                                                });

                                            var key = 1;

                                            // await userData.map(async function (value, key) {
                                            for (const value of userData) {

                                                setTimeout(async function timer() {
                                                    var business_name = value.business_name;
                                                    if (value.is_active == true) {
                                                        //console.log("Active USer   ", value._id);
                                                        var click_here = Constant.STAGGING_URL;
                                                        var mailOptions = {
                                                            from: Config.EMAIL_FROM, // sender address
                                                            to: value.email, // list of receivers
                                                            // to: 'jerriranhard@yahoo.com',
                                                            subject: mail_title, // Subject line
                                                            text: mail_title, // plaintext body
                                                            html: '<!doctype html>' +
                                                                '<html lang="en">' +
                                                                '<head>' +
                                                                '<meta charset="utf-8">' +
                                                                '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">' +
                                                                '<link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">' +
                                                                '<title>Email </title>' +
                                                                '</head>' +
                                                                '<body>' +
                                                                '<table style="font-family: ;max-width:800px;width:81%;border-radius:4px;margin:0 auto;border-spacing:0;background: #3b4856;display: block;">' +
                                                                '<tr>' +
                                                                '<td style="border:0;padding: 130px 0 180px 0px;background:#3b4856;border-spacing:0;text-align:center;background: url(' + Constant.STAGGING_URL + 'assets/images/img-001.jpg) no-repeat center 0;background-size:contain">' +
                                                                '<table style="width:80%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">' +
                                                                '<tr>' +
                                                                '<td style="padding:40px; text-align:left;">' +
                                                                '<table style="width:100%; margin:0; border-spacing:0; border-spacing: 0;">' +
                                                                '<tr>' +
                                                                '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:20px;">Dear ' + changeCase.sentenceCase(business_name) + ',</td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;">One of our users on the Ownly Trade platform has posted a job in your area. </td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td style="color:#2E4255; font-size:18px; font-weight:700; line-height:normal; padding:0; margin:0;">Job details<br><br></td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td>' +
                                                                '<p style="display:flex; padding-bottom:25px; margin:0;">' +
                                                                '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Title: ' + '<strong>' + request_overview + '</strong>' + '</em>' +
                                                                '</p>' +
                                                                '<p style="display:flex; padding-bottom:25px; margin:0;">' +
                                                                '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Description: ' + '<strong>' + request_detail + '</strong>' + '</em>' +
                                                                '</p>' +
                                                                '<p style="display:flex; padding-bottom:25px; margin:0;">' +
                                                                '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Budget: ' + '<strong>' + budget + '</strong>' + '</em>' +
                                                                '</p>' +
                                                                '<p style="display:flex; padding-bottom:25px; margin:0;">' +
                                                                '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Due Date: ' + '<strong>' + due_date + '</strong>' + '</em>' +
                                                                '</p>' +
                                                                '</td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td style="color:#2E4255; font-size:18px; font-weight:500; line-height:normal; padding:0; margin:0;">If you would like to quote on this job please <a target="_blank" href="' + quote_link + '">click here</a> to view the job details and submit a quote! </td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td style="color:#2E4255; font-size:18px; font-weight:700; line-height:normal; padding:0; margin:0;"><br><a target="_blank" href="' + quote_link + '" style="display:block;background:#2AA8D7; width:100px; line-height:28px; color:#fff; font-size:13px; border-radius:4px; text-decoration:none; text-align:center; margin-bottom:15px;">Quote Now</a><br /><br /><br /></td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td style="color:#7C888D; font-size:15px; line-height:normal;"><br>Thank you,</td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td style="color:#7C888D; font-size:15px; line-height:normal;">The Ownly Trade team!</td>' +
                                                                '</tr>' +
                                                                '</table>' +
                                                                '</td>' +
                                                                '</tr>' +
                                                                '</table>' +
                                                                '</td>' +
                                                                '</tr>' +
                                                                '</table>' +
                                                                '</body>' +
                                                                '</html>'
                                                        };

                                                        let info = transporter.sendMail({
                                                            from: mailOptions.from,
                                                            to: mailOptions.to,
                                                            subject: mailOptions.subject,
                                                            text: mailOptions.subject,
                                                            html: mailOptions.html
                                                        }, function (error, response) {
                                                            // console.log("===============================");
                                                            if (error) {
                                                                // console.log("eeeeee", error);
                                                            } else {
                                                                // console.log("Message sent: Successfully   ", mailOptions.to);
                                                            }
                                                        });
                                                    } else {
                                                        //console.log("InActive USer   ", value._id);
                                                        var activation_code = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
                                                        var click_here = Constant.PUBLIC_STAGGING_URL + 'trader_account_activation/' + activation_code + "/" + maintenance_id;
                                                        var updateUserRecord = {
                                                            activation_code: activation_code
                                                        }
                                                        await User.update({ _id: value._id }, { $set: updateUserRecord }, async function (err) {
                                                        });

                                                        var mailOptions = {
                                                            from: Config.EMAIL_FROM, // sender address
                                                            to: value.email, // list of receivers
                                                            // to: 'jerriranhard@yahoo.com',
                                                            subject: mail_title, // Subject line
                                                            text: mail_title, // plaintext body
                                                            html: '<!doctype html>' +
                                                                '<html lang="en">' +
                                                                '<head>' +
                                                                '<meta charset="utf-8">' +
                                                                '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">' +
                                                                '<link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">' +
                                                                '<title>Email </title>' +
                                                                '</head>' +
                                                                '<body>' +
                                                                '<table style="font-family:Roboto;max-width:800px;width:81%;border-radius:4px;margin:0 auto;border-spacing:0;background: #3b4856;display: block;">' +
                                                                '<tr>' +
                                                                '<td style="border:0;padding: 130px 0 180px 0px;background:#3b4856;border-spacing:0;text-align:center;background: url(' + Constant.STAGGING_URL + 'assets/images/img-001.jpg) no-repeat center 0; background-size:contain">' +
                                                                '<table style="width:80%;margin-left:auto;margin-right:auto;border-spacing:0;border-radius:4px;background:#fff;border-radius:10px;border-spacing:0">' +
                                                                '<tr>' +
                                                                '<td style="padding:40px; text-align:left;">' +
                                                                '<table style="width:100%; margin:0; border-spacing:0; border-spacing: 0;">' +
                                                                '<tr>' +
                                                                '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:20px;">Dear ' + changeCase.sentenceCase(business_name) + ',</td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td style="color:#7C888D; font-size:15px; line-height:normal; padding-bottom:40px;">One of our users on the Ownly Trade platform has posted a job in your area. </td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td style="color:#2E4255; font-size:18px; font-weight:700; line-height:normal; padding:0; margin:0;">Job details<br><br></td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td>' +
                                                                '<p style="display:flex; padding-bottom:25px; margin:0;">' +
                                                                '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Title: ' + '<strong>' + request_overview + '</strong>' + '</em>' +
                                                                '</p>' +
                                                                '<p style="display:flex; padding-bottom:25px; margin:0;">' +
                                                                '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Description: ' + '<strong>' + request_detail + '</strong>' + '</em>' +
                                                                '</p>' +
                                                                '<p style="display:flex; padding-bottom:25px; margin:0;">' +
                                                                '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Budget: ' + '<strong>' + budget + '</strong>' + '</em>' +
                                                                '</p>' +
                                                                '<p style="display:flex; padding-bottom:25px; margin:0;">' +
                                                                '<em style="color:#7C888D; font-size:15px; font-style:italic; line-height:normal; font-weight:300; margin-right:25px;">Due Date: ' + '<strong>' + due_date + '</strong>' + '</em>' +
                                                                '</p>' +
                                                                '</td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td style="color:#2E4255; font-size:18px; font-weight:500; line-height:normal; padding:0; margin:0;">If you would like to quote on this job please <a target="_blank" href="' + click_here + '">click here</a> to activate your profile and talk with your potential customer!<br> <br></td>' +
                                                                '</tr>' + '<tr>' +
                                                                '<td style="color:#2E4255; font-size:18px; font-weight:500; line-height:normal; padding:0; margin:0;">It’s Free to join.<br><br></td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td style="color:#2E4255; font-size:18px; font-weight:700; line-height:normal; padding:0; margin:0;"><a target="_blank" href="' + quote_link + '" style="display:block;background:#2AA8D7; width:100px; line-height:28px; color:#fff; font-size:13px; border-radius:4px; text-decoration:none; text-align:center; margin-bottom:15px;">Quote Now</a><br /><br /><br /></td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td style="color:#7C888D; font-size:15px; line-height:normal;">Thank you,</td>' +
                                                                '</tr>' +
                                                                '<tr>' +
                                                                '<td style="color:#7C888D; font-size:15px; line-height:normal;">The Ownly Trade team!</td>' +
                                                                '</tr>' +
                                                                '</table>' +
                                                                '</td>' +
                                                                '</tr>' +
                                                                '</table>' +
                                                                '</td>' +
                                                                '</tr>' +
                                                                '</table>' +
                                                                '</body>' +
                                                                '</html>'
                                                        };

                                                        let info = transporter.sendMail({
                                                            from: mailOptions.from,
                                                            to: mailOptions.to,
                                                            subject: mailOptions.subject,
                                                            text: mailOptions.subject,
                                                            html: mailOptions.html
                                                        }, function (error, response) {
                                                            // console.log("===============================");
                                                            if (error) {
                                                                // console.log("eeeeee", error);
                                                            } else {
                                                                // console.log("Message sent: Successfully   ", mailOptions.to);
                                                            }
                                                        });
                                                    }
                                                    key++;
                                                }, key * 2000);
                                            }
                                        }
                                    });
                            }, key1 * 3000);
                        }
                    })
                });
            }
        })
    })();
});

cron.schedule('0 * * * *', function () {
    console.log('running a task every hour');

    var User = require('../api/models/Users'),
        mongoose = require('../node_modules/mongoose/'),
        d = new Date();
    // console.log("Date.now()   ", new Date());
    User.find({
        'is_deleted': false,
        'is_active': true,
        'is_subscription_cancelled': true,
        'subscription_end_date': { $lte: new Date() }
    }).exec(function (err, userdata) {
        if (err) {
            return resp.json({
                code: 400,
                message: "Error"
            });
        } else {
            // console.log("user   ", userdata);
            userdata.map(function (value, key) {
                console.log("val ", value._id, "   key :", key);
                User.findOneAndUpdate({ '_id': mongoose.Types.ObjectId(value._id) },
                    {
                        $unset: {
                            first_time_subscription: 1, subscription_id: 1, subscription_plan_id: 1,
                            trial_period_days: 1, subscription_price: 1, subscription_start_date: 1,
                            subscription_end_date: 1, subscription_interval: 1, is_subscription_cancelled: 1,
                            subscription_cancelled_date: 1
                        }
                    }, function (err, updatedUserData) {
                        console.log("updatedUserData   ", updatedUserData);
                    });
            });
        }
    })
});

// For testing purpose
// cron.schedule('* * * * *', function () {
cron.schedule('0 1 * * *', function () {
    const resendEmail = require('../api/controllers/traders')
    const sendExpiryEmail = require('../api/controllers/agreements');
    var today = new Date();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    console.log('cron :: running Every day :: time => ', today, '::', time);
    // Resend initial trader email to not activated traders
    resendEmail.resendEmailToTrader();
    sendExpiryEmail.agreementExpiryEmail();
})
