const Constant = require('./../../config/constant.js')
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
// from: Constant.SMS_FROM_NUMBER,

// var client = require('twilio')(accountSid, authToken);

function validateNumber(mobileNo) {
  // Remove all non-digit characters except the leading +
  let cleaned = mobileNo.replace(/[^\d+]/g, '')
  // If mobileNo starts with +, keep it, otherwise assume + is needed
  let countryCode = cleaned.startsWith('+') ? '+' : '+'
  // Extract digits after the country code (if any)
  let digits = cleaned.replace(/^\+/, '')
  // If no country code is provided (e.g., just digits), prepend +65
  if (!cleaned.startsWith('+') && digits.length >= 8) {
    digits = '61' + digits // Prepend +61 for numbers without country code
  }
  // Ensure the number has a valid length (8-15 digits after country code)
  if (digits.length < 8 || digits.length > 15) {
    return 'Enter valid mobile number' // Invalid number length
  }
  // Extract country code (assuming 1-3 digits)
  let countryCodeMatch = digits.match(/^(\d{1,3})(\d+)/)
  if (!countryCodeMatch) {
    return 'Enter valid mobile number' // Invalid format
  }
  let [, cc, rest] = countryCodeMatch
  return `+${cc}${rest}`
}

function sendmessage(options) {
  client.messages.create(
    {
      to: validateNumber(options.to),
      from: options.from,
      body: options.body,
      mediaUrl: 'http://farm2.static.flickr.com/1075/1404618563_3ed9a44a3a.jpg',
    },
    function (err, message) {
      console.log('message', message)
      console.log('err', err)
    }
  )
}

module.exports = {
  // function for sending sms verifications
  verification: verification,
  cronNotification: cronNotification,
  JobRequestMsg: JobRequestMsg,
}

//client trial credential
//+12019052180
// account sid = ACbc845974516c288934600a9073e0ca16
// Auth token = 0bb8699484c388876590bd6dd16d45e7Task list

/* @function : sendmessage
 * @purpose  : Sending Sms for Job Request
 */
// syncitt
const accountSid = Constant.TWILLIO_ACCOUNT_ID || 'AC4e2e98d6688d2c50c6a2d63212a1ac83'
const authToken = Constant.TWILLIO_AUTH_TOKEN || '2b4a45127c429c7da8cd5b38c2bda907'
// const accountSid = 'AC4e2e98d6688d2c50c6a2d63212a1ac83';
// const authToken = '2b4a45127c429c7da8cd5b38c2bda907';
const client = require('twilio')(accountSid, authToken)
function JobRequestMsg(options) {
  console.log('Send Text Msg function options => ', options)
  try {
    let phone_number
    phone_number = validateNumber(options.mobile_no)
    console.log('phone_number :: before sending SMS => ', phone_number)
    client.messages
      .create({
        body:
          'Dear' +
          ' ' +
          options.business_name +
          ',' +
          '\n' +
          'One of our users on the Ownly Trade platform has sent a job request.' +
          '\n' +
          '\n' +
          'Title:' +
          ' ' +
          options.title +
          '\n' +
          'Budget:' +
          ' ' +
          options.budget +
          '\n' +
          '\n' +
          'click below to submit your quote!' +
          '\n' +
          options.quote_link,
        from: '+12134234423',
        to: phone_number,
      })
      .then(
        (msg) => {
          console.log('message sent', msg.body)
        },
        (err) => {
          console.log('err occured => ', err)
        }
      )
  } catch (error) {
    console.log('error occured while sending Text message=> ', error)
  }
}

function verification(to, code) {
  var msg =
    code + ' is the OTP. Please enter this to verify your identity.' + 'it will be valid for next 1 hour.'
  var options = {
    to: validateNumber(to),
    from: Constant.SMS_FROM_NUMBER,
    body: msg,
  }
  return sendmessage(options)
}

function cronNotification(to, message) {
  console.log('in sending msg')
  var msg = message;
  var options = {
    to: validateNumber(to),
    from: Constant.SMS_FROM_NUMBER,
    body: msg,
  }
  return sendmessage(options)
}
