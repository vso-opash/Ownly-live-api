/* @function : sendmessage
 *  @author  : Abhishek 
 *  @created  : 
 *  @modified :
 *  @purpose  :Sending Sms after registration.
 */


//local sms.js
/*** SMS Sending Code  ***/

// Twilio Trial Credentials 

// commented for now - file not available 
// var constantObj = require('./../../constants.js');
// var accountSid = (constantObj.twilioCredentials.acc_id) ? constantObj.twilioCredentials.acc_id : 'ACbc845974516c288934600a9073e0ca16';
// var authToken = (constantObj.twilioCredentials.auth_token) ? constantObj.twilioCredentials.auth_token : '0bb8699484c388876590bd6dd16d45e7';
// commented for now - file not available 

// to: '+919890277003',
// from: "+18643748817",


//client trial credential
// var accountSid = 'ACbc845974516c288934600a9073e0ca16';
// var authToken = '[0bb8699484c388876590bd6dd16d45e7]';

// to: '+65 97801671',
// from: "+12019052180",

// var client = require('twilio')(accountSid, authToken);

function sendmessage(options) {
    client.messages.create({
        to: options.to,
        from: options.from,
        body: options.body,
        mediaUrl: "http://farm2.static.flickr.com/1075/1404618563_3ed9a44a3a.jpg",
    }, function (err, message) {
        console.log("message", message);
        console.log("err", err);
    });
}

module.exports = {
    // function for sending sms verifications
    verification: function (to, code) {
        var msg = code + " is the OTP. Please enter this to verify your identity." +
            "it will be valid for next 1 hour.";
        var options = {
            //client trial credential
            to: '+65' + to,
            from: "+12019052180",
            body: msg
        };
        return sendmessage(options);
    },
    cronNotification: function (to, message) {
        console.log("in sending msg")
        var msg = message;//"After 2 days Your job will get started";
        var options = {
            //client trial credential
            to: '+65' + to,
            from: "+12019052180",
            body: msg
        };
        return sendmessage(options);
    },

    JobRequestMsg: JobRequestMsg,
};


//client trial credential
//+12019052180
// account sid = ACbc845974516c288934600a9073e0ca16
// Auth token = 0bb8699484c388876590bd6dd16d45e7Task list



/* @function : sendmessage
 * @purpose  : Sending Sms for Job Request
 */
// syncitt
const accountSid = global.gConfig.accountSid;
const authToken = global.gConfig.authToken;
// const accountSid = 'AC4e2e98d6688d2c50c6a2d63212a1ac83';
// const authToken = '2b4a45127c429c7da8cd5b38c2bda907';
const client = require('twilio')(accountSid, authToken);
function JobRequestMsg(options) {
    console.log('Send Text Msg function options => ', options);
    try {
        let phone_number;
        phone_number = '+61' + options.mobile_no;
        console.log('phone_number :: before sending SMS => ', phone_number);
        client.messages.create({
            body: 'Dear' + ' ' + options.business_name + ',' + '\n' + 'One of our users on the Ownly Trade platform has sent a job request.' + '\n' + '\n' + 'Title:' + ' ' + options.title + '\n' + 'Budget:' + ' ' + options.budget + '\n' + '\n' + 'click below to submit your quote!' + '\n' + options.quote_link,
            from: '+12134234423',
            to: phone_number
        }).then((msg) => { console.log('message sent', msg.body) }, (err) => {
            console.log('err occured => ', err);
        });
    } catch (error) {
        console.log('error occured while sending Text message=> ', error);
    }
}
