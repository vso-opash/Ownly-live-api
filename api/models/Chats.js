/* @function : Chats (database)
 *  @created  : 03112016
 *  @Creator  : smartData
 *  @purpose  : create the model to keep record of chats among job seekers and employees
 */

var mongoose = require('mongoose');

var chatSchema = new mongoose.Schema({
    property_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'properties'
    },
    from: { type: mongoose.Schema.Types.ObjectId, required: true, trim: true, ref: 'User' }, // refers _id in user schema
    to: { type: mongoose.Schema.Types.ObjectId, required: true, trim: true, ref: 'User' },// refers _id in user schema
    msg: { type: String },
    isRead: { type: Boolean, default: false },
    time: { type: String },
    document_name: { type: String },
    document_path: { type: String },
    size: { type: String },
    is_message: { type: Boolean, default: false },
    is_status: { type: Boolean, default: false },
    created: { type: Date, default: Date.now() },
    // created: {type: Date,  function(){return new Date().getTime()}},
    isPropertyDeleted: { type: Boolean, default: false },
    agencyPrincipleId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User' },
    sender_role_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Role' }
}, {
    timestamps: true
});

// create the model for chat within friends
//module.exports = mongoose.model('Chats', chatSchema);
var Chats = mongoose.model('Chats', chatSchema);