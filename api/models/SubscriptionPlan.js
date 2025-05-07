'use strict';

var mongoose = require('mongoose');

var description_pointschema = new mongoose.Schema({
    point: { type: String },
    sub_point: { type: String }
});

var subscriptionSchema = new mongoose.Schema({
    description_points: [description_pointschema],
    amount_per_month: { type: String },
    label: { type: String },
    stripe_product_id: { type: String },
    stripe_plan_id: { type: String },
    sort_order: { type: Number },
    trial_period_days: { type: Number },
    is_active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false }
});

var SubscriptionPlan = mongoose.model('subscription_plan', subscriptionSchema);
module.exports = SubscriptionPlan;