'use strict';

var jwt = require('jsonwebtoken');
var  User = require('../models/Users'),
Admin = require('../models/Admin');
var config = require('../../config/config.js');
module.exports = {
    ensureAuthorized: ensureAuthorized
}

function ensureAuthorized(req, res ,next) {
    var bearerToken;
    var bearerHeader = req.headers["authorization"] || req.query["api_key"];
    //console.log("bearerHeader",bearerHeader);
    if (typeof bearerHeader !== 'undefined') {
        var bearer = bearerHeader.split(" ");
        bearerToken = bearer[1];
        req.token = bearerToken;
        //console.log("bearerToken",bearerToken);
        jwt.verify(bearerToken, config.SECRET, function(err, decoded) {
            req.user = decoded;
            if (err) {
                return res.send({ code: 401, message: 'Invalid Token!' });
            }
            next();
        });
    } else {
        return res.send({ code: 401, message: 'Token not found!' });
    }
}




// function ensureAuthorized(req, res, next) {
//     var unauthorizedJson = { code: 401, 'message': 'Unauthorized', data: {} };
//     var token = req.headers["authorization"] || req.query["api_key"];
//     // if (req.headers.authorization) {
//     if (typeof token !== 'undefined') {
//         // var token = req.headers.authorization;
//         var splitToken = token.split(' ');
//         try {
//             token = splitToken[1];
//             var decoded = jwt.verify(token, constant.config.secret);
//             if (splitToken[0] == 'admin_bearer') {
//                 req.user = decoded;
//                 Admin.findOne({ deleted: false }, 'email').exec(function(err, user) {
//                     if (err || !user) { res.json(unauthorizedJson); } else {
//                         req.user = user;
//                         next();
//                     }
//                 });
//             } else if (splitToken[0] == 'Bearer') {
//                 User.findOne({ token: token, deleted: false }, 'email').exec(function(err, user) {
//                     if (err || !user) { res.json(unauthorizedJson); } else {
//                         req.user = user;
//                         next();
//                     }
//                 });
//             } else { res.json(unauthorizedJson); }
//         } catch (err) { res.json(unauthorizedJson); }
//     } else { res.json(unauthorizedJson); }
// }
