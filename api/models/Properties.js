var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var userModel = require('../models/Users');
var Schema = mongoose.Schema;

var propertiesSchema = new mongoose.Schema({
    created_by_agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', trim: true }, //Store unique id of user who are creating property
    property_id: { type: Number }, //10 digits unique id
    owned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', trim: true, }, //Store unique id of user who are creating property
    address: { type: String, required: 'Please enter the address' }, //Property's address with zip code
    amenities: [{
        amenity_id: { type: mongoose.Schema.Types.ObjectId, ref: 'amenities' },
        amenity_name: { type: String },
        is_checked: { type: Boolean }
    }], //Stored the unique id of amenities
    title: { type: String }, // Name of property title
    postCode: { type: String }, // Name of property title
    description: { type: String }, // Property description
    image: [{
        path: { type: String },
        is_from_my_file: { type: Boolean, default: false }, //true-image in document folder,false-property_image folder
        is_from_csv_file: { type: Boolean, default: false }, //true-image is uploaded using Csv,false-image is not uploaded using Csv
        isFeatured: { type: Boolean, default: false } // true if image is featured
    }], //Store multiple images of property
    // image: [String],
    other_amenity: { type: String }, //data type(String) Store other amenity if available
    save_as_draft: { type: Boolean, default: false }, //Stored to save status of property means either property is in True=>draft or False=>live
    number_of_bathroom: { type: Number }, //Stored the number of bathroom
    number_bedroom: { type: Number, default: 1 }, //Store the number of bedroom
    number_of_townhouse: { type: Number }, //Store the number of townhouse
    number_of_parking: { type: Number }, //Store the number of parking
    status: { type: Boolean, default: true }, //true-Active, false- Deactive
    property_type: { type: String, },
    property_category: { type: String, }, //sale-Sale ,rental-Rental property
    floor_area: { type: Number },
    lot_erea: { type: Number },
    city: { type: String },
    state: { type: String },
    isTownHouse: { type: Boolean, default: false },  //depreciated
    latitude: { type: String },
    longitude: { type: String },
    country: { type: String },
    price: Number,
    property_name: { type: String },
    is_deleted: { type: Boolean, default: false },
    claimed: { type: Boolean, default: false },
    created: { type: Date, default: Date.now },
    modified: { type: Date, default: Date.now }
});
//console.log('inside property schema');
var Property = mongoose.model('properties', propertiesSchema);
// make this available to our users in our Node applications
module.exports = Property;
