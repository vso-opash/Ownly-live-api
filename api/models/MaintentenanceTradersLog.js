'use strict';
var mongoose = require('mongoose');
var maintentenanceTradersLogSchema = mongoose.Schema({
    maintenance_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    mail_send_trader_id: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    more_mail_send_trader_id: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    apply_trader_id: [{
        type: mongoose.Schema.Types.ObjectId
    }]
}, {
        timestamps: true
    });

var maintentenance_traders_log = mongoose.model('maintentenance_traders_log', maintentenanceTradersLogSchema);
module.exports = maintentenance_traders_log;