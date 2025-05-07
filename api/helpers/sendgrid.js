const request = require('request');
const http = require("https");

module.exports = {
    createSingleContact: createSingleContact
}

function createSingleContact(data) {
    const options = {
        "method": "PUT",
        "hostname": "api.sendgrid.com",
        "port": null,
        "path": "/v3/marketing/contacts",
        "headers": {
            "authorization": "Bearer " + global.gConfig.authpass,
            "content-type": "application/json"
        }
    };

    let req = http.request(options, function (res) {
        let chunks = [];

        res.on("data", function (chunk) {
            chunks.push(chunk);
        });

        res.on("end", function () {
            var body = Buffer.concat(chunks);
            console.log(body.toString());
        });
    });

    req.write(JSON.stringify(
        data
    ));
    req.end();

}


