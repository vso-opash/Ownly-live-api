'use strict';

var mongoose = require('mongoose');

var SubscriptionLogSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    action: { type: String },
    first_time_subscription: { type: Boolean, default: false },
    subscription_id: { type: String },
    subscription_plan_id: { type: String },
    trial_period_days: { type: Number },
    subscription_price: { type: Number },
    subscription_start_date: { type: Date },
    subscription_end_date: { type: Date },
    subscription_interval: { type: String },
    is_subscription_cancelled: { type: Boolean, default: false },
    subscription_cancelled_date: { type: Date }
}, {
        timestamps: true
    });

var User = mongoose.model('subscription_log', SubscriptionLogSchema);
module.exports = User;