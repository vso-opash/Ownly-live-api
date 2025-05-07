'use strict';

module.exports = {
    randomToken: randomToken,
    decodeBase64Image: decodeBase64Image
}

/*
 * return random number between max min
 */
function randomToken(length) {
    var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP1234567890";
    var pass = "";
    for (var x = 0; x < length; x++) {
        var i = Math.floor(Math.random() * chars.length);
        pass += chars.charAt(i);
    }
    return pass;
}

function decodeBase64Image(dataString) {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    console.log("dataString", dataString)
    var response = {};
    if (matches) {
        if (matches.length !== 3) {
            res.json({ "code": 401, "message": "Invalid input string" });
            //return new Error('Invalid input string');
        }
        response.type = matches[1];
        response.data = new Buffer(matches[2], 'base64');
        return response;
    } else {
        return "err";
        //return new Error('Invalid base64 input string');
    }

}