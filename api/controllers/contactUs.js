'use strict';
var Config = require('../../config/config.js');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var transporter = nodemailer.createTransport(smtpTransport({
    service: Config.SMTP.service,
    auth: {
        user: Config.SMTP.authUser,
        pass: Config.SMTP.authpass
    }
}));
var sendmail = require('sendmail')();
var Constant = require('../../config/constant.js');
var validator = require('../../config/validator.js');
var d = new Date();
var currentYear = d.getFullYear();

module.exports = {
    contactUs: contactUs,
}

function contactUs(req, res) {
    console.log('req.body => ', req.body);
    // && (req.body.role)
    if ((req.body.email) && (req.body.firstname) && (req.body.lastname) && (req.body.mobile_no)) {
        if (validator.isEmail(req.body.email)) {
            console.log('req.body.email => ', req.body.email);
            let html_content;
            if (req.body.role) {
                html_content = '<!DOCTYPE html>' +
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
                    '<p>Hello Admin,</p>' +
                    '<p>You have just received an enquiry.</p>' +
                    '<ul> ' +
                    '<li> <b>Name:</b> ' + req.body.firstname + ' ' + req.body.lastname + ' </li> ' +
                    '<li> <b>Email:</b> ' + req.body.email + ' </li> ' +
                    '<li> <b>Mobile Number:</b> ' + req.body.mobile_no + ' </li> ' +
                    '<li> <b>Role:</b> ' + req.body.role + ' </li> ' +
                    '<li> <b>Comment:</b> ' + req.body.comment + ' </li> ' +
                    ' </ul > ' +
                    '</td>' +
                    '</tr>' +
                    '</table>' +
                    '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
                    '<tr>' +
                    '<td>' +
                    '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© ' +
                    Config.CURRENT_YEAR +
                    ' <a href="#" style="text-decoration:none;color:#fff;">| Ownly</a>' +
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
            } else {
                console.log('else :: agent => ');
                html_content = '<!DOCTYPE html>' +
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
                    '<p>Hello Admin,</p>' +
                    '<p>You have just received an enquiry.</p>' +
                    '<ul> ' +
                    '<li> <b>Name:</b> ' + req.body.firstname + ' ' + req.body.lastname + ' </li> ' +
                    '<li> <b>Email:</b> ' + req.body.email + ' </li> ' +
                    '<li> <b>Mobile Number:</b> ' + req.body.mobile_no + ' </li> ' +
                    '<li> <b>Agency Name:</b> ' + req.body.agency_name + ' </li> ' +
                    '<li> <b>Comment:</b> ' + req.body.comment + ' </li> ' +
                    ' </ul > ' +
                    '</td>' +
                    '</tr>' +
                    '</table>' +
                    '<table style="width: 100%;background: #b3b3c3; color: #fff;">' +
                    '<tr>' +
                    '<td>' +
                    '<div align="center" style="font-size:12px;margin: 10px 0px; padding:5px; width:100%;">© ' +
                    Config.CURRENT_YEAR +
                    ' <a href="#" style="text-decoration:none;color:#fff;">| Ownly</a>' +
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
            }
            var mailOptions = {
                from: req.body.email, // sender address
                to: Config.CONTACT_US_TO_EMAIL, // receiver address
                subject: 'Enquiry', // Subject line
                text: 'Enquiry', // plaintext body
                html: html_content
            }

            let info = transporter.sendMail({
                from: mailOptions.from,
                to: mailOptions.to,
                subject: mailOptions.subject,
                html: mailOptions.html
            }, function (error, response) {
                console.log('response => ', response);
                if (error) {
                    console.log("Email not sent : ", err);
                    res.json({ code: Constant.ERROR_CODE, message: Constant.CONTACT_US_ERROR });
                } else {
                    console.log("Message sent: Successfully   ", mailOptions.to);
                    res.json({ code: Constant.SUCCESS_CODE, message: 'Message sent successfully.' });
                }
            });

        } else {
            res.json({ code: Constant.ERROR_CODE, message: Constant.INVALID_EMAIL });
        }
    } else {
        res.json({ code: Constant.ERROR_CODE, message: Constant.REQUIRED_CONTACT_US_FIELDS });
    }


}