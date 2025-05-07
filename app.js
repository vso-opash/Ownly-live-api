'use strict';

var SwaggerExpress = require('swagger-express-mw');
var bodyParser = require('body-parser');
var express = require('express');
var path = require('path');
var app = express();
var http = require('http');
var https = require('https');
const fs = require('fs');
var userctrl = require('../Services/cron/');
//var Constant = require('../config/constant.js'),
var compression = require('compression');
var qt = require('quickthumb');
const dbBackup = require('./api/helpers/dbBackup');
const dotenv = require('dotenv');
const _ = require('lodash');
// config variables
const configJson = require('./config/config.json');
/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config();
const defaultConfig = configJson.development;
const environment = process.env.NODE_ENV || 'development';
console.log('environment => ', environment);
const environmentConfig = configJson[environment];
const finalConfig = _.merge(defaultConfig, environmentConfig);

// global config 
global.gConfig = finalConfig;
// console.log('global.gconfig :: app.js=> ', global.gConfig);

var Config = require('./config/config.js');


// ejs template
// view engine setup
app.set('templates', path.join(__dirname, 'api/emails'));
app.set('view engine', 'ejs');

module.exports = app; // for testing
//custom files
require('./config/db');
var utils = require('./api/lib/util');



app.use('/images', express.static(path.join(__dirname, './images')));
app.use('/chat', express.static(path.join(__dirname, './api/controllers/chat_ctrl.js')));
app.use('/uploads', qt.static(path.join(__dirname, './api/uploads/property')));
app.use('/user_image', qt.static(path.join(__dirname, './api/uploads/users')));
app.use('/property_image', qt.static(path.join(__dirname, './api/uploads/property')));
app.use('/maintenance', qt.static(path.join(__dirname, './api/uploads/maintenance')));
app.use('/proposals', qt.static(path.join(__dirname, './api/uploads/proposals')));
app.use('/agreement', qt.static(path.join(__dirname, './api/uploads/agreements')));
app.use('/document', qt.static(path.join(__dirname, './api/uploads/Document')));
app.use('/chat_document', qt.static(path.join(__dirname, './api/uploads/chat_document')));
app.use('/samples', qt.static(path.join(__dirname, './api/uploads/sample_docs')));
app.use('/advertise_image', qt.static(path.join(__dirname, './api/uploads/advertise_image')));
//app.use('/document', qt.static(path.join(__dirname, './api/uploads/complete_job')));
//app.use('/document', qt.static(path.join(__dirname, './api/uploads/complete_job')));
var config = {
    appRoot: __dirname // required config
};

app.use(bodyParser.json({ limit: '5000mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5000mb' }));

// Database backup
if (process.env.NODE_ENV == "production") {
    console.log('database backup :: production=> ');
    dbBackup.autoBackup();
} else {
    console.log('database backup :: else => ');
}

SwaggerExpress.create(config, function (err, swaggerExpress) {
    if (err) { throw err; }
    // All api requests
    app.use(function (req, res, next) {
        // CORS headers
        res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        // Set custom headers for CORS
        res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,If-Modified-Since,Authorization');

        if (req.method == 'OPTIONS') {
            res.status(200).end();
        } else {
            next();
        }
    });

    //compression
    app.use(compression({ filter: shouldCompress }))

    function shouldCompress(req, res) {
        if (req.headers['x-no-compression']) {
            // don't compress responses with this request header
            return false
        }
        // fallback to standard filter function
        return compression.filter(req, res)
    }

    //Check to call web services where token is not required//
    app.use('/api/*', function (req, res, next) {
        var freeAuthPath = [
            '/api/userRegister',
            '/api/socialLogin',
            '/api/userLogin',
            '/api/userActivation/*',
            '/api/images',
            '/api/resetUserPassword',
            '/api/resetPassword',
            '/api/userSignIn',
            '/api/userSignUp',
            '/api/singleProperty',
            "/api/userLogout",
            "/api/activateUserAccount",
            "/api/resend_account_activation_mail",
            "/api/forgotPassword",
            "/api/auth/facebooklogin",
            "/api/auth/googlelogin",
            "/api/auth/facebookloginNew",
            "/api/activateUserAccount",
            "/api/importPropertyByCSV",
            "/api/mainBrowseSearch",
            "/api/mainBrowseSearchPriceSort",
            "/api/mainBrowsePageSearchpropertySortByPsf",
            "/api/mainBrowsePageSearchpropertySortByDate",
            "/api/getPropertySearchedLanding",
            "/api/adminLogin",
            "/api/is_admin_loggedin",
            "/api/adminforgotPassword",
            "/api/contactUsFormSubmission",
            "/api/resetAdminPassword",
            "/api/directLogin",
            "/api/directLoginActivatedAccount",
            "/api/saveInvitedUserPassword",
            "/api/userDataOnRegistration",
            "/api/check_user_valid",
            "/api/update_tanent_request_status",
            "/api/roles",
            "/api/resetUserPasswordLinkExist",
            "/api/getUserActiveRoles",
            "/api/getUserDetails",
            "/api/addFooterData",
            "/api/getFooterData",
            "/api/tradersList",
            "/api/tradersListForMR",
            "/api/tradersListPublic",
            "/api/premiumTradersList",
            "/api/agentsList",
            "/api/agentsListWithSearch",
            "/api/getAgentProfile",
            "/api/send_customer_enquiry",
            "/api/getCategoriesBusinessnamesList",
            "/api/getOffMarketList",
            "/api/activate_account",
            "/api/validate_account_activation_code",
            "/api/GetUserRolesReview",
            "/api/getUserDetails",
            "/api/getTraderAllReviews/*",
            "/api/tradersJobHistory",
            "/api/getServiceCategory",
            "/api/getUserReview/*",
            "/api/updateRevealContactNumber",
            "/api/addMR",
            "/api/uploadMaintenanceImages",
            '/api/contact_us',
            '/api/initialTrader/trackEmail',
            '/api/advertiseList',
            '/api/viewedAdvertise',
            '/api/clickedAdvertise',
            '/api/confirmUserRole',
            '/api/account_activation_registration',
            '/api/sendMailForChat',
            // '/api/addDefaultUserRole',
            // '/api/removeDuplicateTraders',
            // '/api/removeDuplicateGroups'
        ];
        var available = false;
        var get_second_param = req.baseUrl;

        const request_api = get_second_param.split("/");
        // console.log("test   ", test[2]);

        for (var i = 0; i < freeAuthPath.length; i++) {
            // console.log(freeAuthPath[i] + " ==  "+ req.baseUrl);
            // if (freeAuthPath[i] == req.baseUrl) {
            var free_auth_path = freeAuthPath[i];
            var free_auth_path_ = free_auth_path.split("/");

            if (request_api && request_api.length > 0 && request_api[2] && free_auth_path_ && free_auth_path_.length > 0 && free_auth_path_[2] && request_api[2] == free_auth_path_[2]) {
                // console.log("if part");
                available = true;
                break;
            } else {
                // console.log("else part");
            }
        }
        if (!available) {
            utils.ensureAuthorized(req, res, next);
        } else {
            next();
        }
    });

    // enable SwaggerUI
    app.use(swaggerExpress.runner.swaggerTools.swaggerUi());

    // install middleware
    swaggerExpress.register(app);

    var port = process.env.PORT || 5095;

    // app.listen(options, port);
    if (Config.IS_HTTPS) {
        console.log('is_https true => ');
        const options = {
            key: fs.readFileSync(Config.SSL_KEY, 'utf8'),
            cert: fs.readFileSync(Config.SSL_CERT, 'utf8')
        };
        https.createServer(options, app).listen(port)
    } else {
        http.createServer(app).listen(port)
        console.log('is_https false => ');
    }

    var usernames = {};
    if (swaggerExpress.runner.swagger.paths['/hello']) {
        //console.log('try this:\ncurl http://localhost:' + port ); 
        console.log('try this:\ncurl http://52.39.212.226:' + port);
    }
});
