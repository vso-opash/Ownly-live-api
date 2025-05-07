
//Define PushNotification Service
var pushNotification = function (send_data, next) {
    var PushNotifications = new require('node-pushnotifications');
    var settings = {
        //Google Push Notification Settings
        gcm: {
            id: send_data.gcm_push_notification_id, // PUT YOUR GCM SERVER API KEY, "AIzaSyDXCndlavIAyU6qfb9kdbTFMrJ7rwN1YkY"
            // msgcnt: 12,
            badge: send_data.totalbadgecount, //Set badge count here (future)
            dataDefaults: {
                delayWhileIdle: false,
                timeToLive: 4 * 7 * 24 * 3600, // 4 weeks
                retries: 4
            },
            // Custom GCM request options https://github.com/ToothlessGear/node-gcm#custom-gcm-request-options
            options: {}
        },
        //Apple Push Notification Settings
        apn: {
            //gateway: 'gateway.push.apple.com',
            gateway: 'gateway.sandbox.push.apple.com',
            maxConnections: 10, //Max number of simulataneous connections
            badge: send_data.totalbadgecount, //Set badge count here (future)
            defaultData: {
                expiry: 4 * 7 * 24 * 3600 // 4 weeks
                //sound: 'ping.aiff'
            },
            // See all available options at https://github.com/argon/node-apn/blob/master/doc/connection.markdown
            options: {
                //Set Certificate locations
                cert: send_data.apple_push_notification_cert_path,   //"/home/ubuntu/Rise_Ionic/certs/devcerts/cert.pem",
                key: send_data.apple_push_notification_key_path //"/home/ubuntu/Rise_Ionic/certs/devcerts/key.pem"

            }
        },
        //Amazon Device Messaging Settings - Not Using
        adm: {
            client_id: null, // PUT YOUR ADM CLIENT ID,
            client_secret: null, // PUT YOUR ADM CLIENT SECRET,
            expiresAfter: 4 * 7 * 24 * 3600, // 4 weeks
            // Custom ADM request options, same as https://github.com/ToothlessGear/node-gcm#custom-gcm-request-options
            options: {}
        }
    };

   //  console.log("Settings Object: ", settings);
    var push = new PushNotifications(settings);

    // Seperate device tokens array
    var deviceIdsAll = send_data.tokens;
    var regIdsAPN = []; //All iOS IDs
    var regIdsGCM = []; //All Android IDs
    var regIdsMPNS = []; //All Microsoft IDs
    var regIdsOther = []; //All Other IDs

    for (var i = 0; i < deviceIdsAll.length; i++) {
        if (deviceIdsAll[i] === null || deviceIdsAll[i] === undefined) {
            console.log('Encountered a null/undefined  device id, ignoring');
        } else if (deviceIdsAll[i].substring(0, 4) === 'http') {
            regIdsMPNS.push(deviceIdsAll[i]);
        } else if (deviceIdsAll[i].length > 64) {
            regIdsGCM.push(deviceIdsAll[i]);
        } else if (deviceIdsAll[i].length === 64) {
            regIdsAPN.push(deviceIdsAll[i]);
        } else { // All Others
            regIdsOther.push(deviceIdsAll[i]);
        }
    }

    try {

        //Set Data and Send Apple notification
        if (regIdsAPN.length > 0) {

            if (typeof (send_data.isAddedByKios) != 'undefined'){
                var data = {
                    title: send_data.message,
                    "$state": send_data.target,
                    state_id: send_data.target_id,
                    category: send_data.service_category_name,
                    totalbadgecount: send_data.totalbadgecount,
                    message: send_data.message,
                    isAddedByKios: send_data.isAddedByKios,
                    kiosId: send_data.kiosId,
                    guestId: send_data.guestId,
                    confirm_status:send_data.confirm_status,
                    is_replied_resident:send_data.is_replied_resident
                };
            }else{
                var data = {
                    title: send_data.message,
                    "$state": send_data.target,
                    state_id: send_data.target_id,
                    category: send_data.service_category_name,
                    totalbadgecount: send_data.totalbadgecount,
                    message: send_data.message
                };
            }
            

            push.send(regIdsAPN, data, function (result) {
                // console.log(result);
                console.log(regIdsAPN);
                console.log('Apple Notifications Sent');

            });
        }

        //Set Data and Send Google notification
        if (regIdsGCM.length > 0) {
            if (typeof (send_data.isAddedByKios) != 'undefined'){
                var data = {
                    "$state": send_data.target, 
                    state_id: send_data.target_id,
                    category: send_data.service_category_name,
                    totalbadgecount: send_data.totalbadgecount,
                    message: send_data.message,
                    isAddedByKios: send_data.isAddedByKios,
                    kiosId: send_data.kiosId,
                    guestId: send_data.guestId,
                    confirm_status:send_data.confirm_status,
                    is_replied_resident:send_data.is_replied_resident,
                    title: "Rise" 
                };
            }else{
                var data = {
                    "$state": send_data.target,
                    state_id: send_data.target_id,
                    category: send_data.service_category_name,
                    totalbadgecount: send_data.totalbadgecount,
                    message: send_data.message,
                    title: "Rise"
                };
            }
            push.send(regIdsGCM, data, function (result) {
                console.log(regIdsGCM);
                console.log('Google Notifications Sent');
            });
        }

        //Set Data and Send Microsoft notification (Future)
        if (regIdsMPNS.length > 0) {
            var data = {
                "$state": send_data.target,
                state_id: send_data.target_id,
                category: send_data.service_category_name,
                message: send_data.message
            };

            push.send(regIdsMPNS, data, function (result) {
                // console.log(result);
                //console.log(regIdsMPNS);
                console.log('Microsoft Notifications Sent');

            });
        }

        //Set Data and Send All Other notification
        if (regIdsOther.length > 0) {
            var data = {
                "$state": send_data.target,
                state_id: send_data.target_id,
                category: send_data.service_category_name,
                message: send_data.message

            };
            push.send(regIdsOther, data, function (result) {
                // console.log(result);
                //console.log(regIdsOther);
                console.log('All Others Notifications Sent');
            });
        }
        next(null, data);
    }
    catch (err) {
        console.log('Error, No Notification Sent');
        next(1, null);
    }
};
module.exports.pushNotification = pushNotification;