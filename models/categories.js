
const mongoose = require("mongoose");
const categorySchema= new mongoose.Schema({
    Name:{
        type:String,
        required:true,
        unique: true
    },
    Description:{
        type:String,
        required:true 
    },
    is_list:{
        type:Boolean,
        required:true
    },
    offer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',
      },
      offerApplied:{
        type:Boolean,
        default:false
      }

});

module.exports = mongoose.model('Category',categorySchema)