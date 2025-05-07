const Config = require('../../config/config.js');
const ejs = require("ejs");
const nodemailer = require("nodemailer");
const smtpTransport = require('nodemailer-smtp-transport');
var path = require('path');

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport(smtpTransport({
    service: Config.SMTP.service,
    auth: {
        user: Config.SMTP.authUser,
        pass: Config.SMTP.authpass
    }
}));

module.exports = {
    sendEmail: sendEmail
}

function sendEmail(options, template_name, userData) {
    console.log('userData => ', userData);
    // send mail with defined transport object
    const templatePath = path.join(
        __dirname,
        '../emails/' + template_name + '.ejs'
    );
    ejs.renderFile(templatePath, userData, options, async (err, data) => {
        if (err) {
            console.log(err);
            return err;
        } else {
            const mainOptions = {
                from: options.from, // sender address
                to: options.to, // list of receivers
                subject: options.subject, // Subject line 
                text: options.text, // plain text body
                html: data, // html body,'
            };
            // console.log('mainOptions :: helper => ', mainOptions);
            await transporter.sendMail(mainOptions, function (error, response) {
                if (error) {
                    console.log("Email not sent : ", error);
                    return { message: error };
                } else {
                    console.log("Message sent: Successfully   ", mainOptions.to);
                    return { message: 'Email sent successfully.' };
                }
            });
        }
    });
};