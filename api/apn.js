var apn = require('apn');
var path = require('path');

var apnError = function (err) {
    console.log("APN Error:", err);
}

var options = {
    "production": true,
    "cert": path.resolve(__dirname + "/XYZCert.pem"), //Certification pem file
    "key": path.resolve(__dirname + "/XYZKey.pem"), // Key pem file
    "passphrase": "123456",
    "gateway": "gateway.push.apple.com", //gateway.sandbox.push.apple.com for sandbox
    "port": 2195,
    "enhanced": true,
    "cacheLength": 5
};
options.errorCallback = apnError;

module.exports.sendNotification = function (message, tokens) {

    console.log(tokens);
    apnConnection = new apn.Connection(options);
    var notify = new apn.Notification();

    notify.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    //notify.badge = 1;
    notify.sound = "ping.aiff";
    notify.alert = message;
    notify.payload = { 'messageFrom': message };
    notify.contentAvailable = true;
    try {
        myDevice = new apn.Device(tokens);

        if (apnConnection) {
            apnConnection.pushNotification(notify, myDevice);
            apnConnection.on('connected', function () {
                console.log("Connected");
            });

            apnConnection.on('transmitted', function (notify, myDevice) {
                console.log("Notification transmitted to:" + myDevice);
            });

            apnConnection.on('transmissionError', function (errCode, notify, myDevice) {
                console.error("Notification caused error: " + errCode + " for device ", myDevice, notify);
            });

            apnConnection.on('timeout', function () {
                console.log("Connection Timeout");
            });

            apnConnection.on('disconnected', function () {
                console.log("Disconnected from APNS");
            });
        }
    } catch (e) {
        console.log("error iphone  ", e);

    }


};
