const mongoose = require("mongoose");

 const productSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
        
    },
    price:{
        type:Number,
        required:true
    },
    quantity:{
        type:Number,
        required:true
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Category',
        required:true
    },
    categoryName:{
        type:String
    },
    productImages:[
        {
            type:String,
            required:true
        }
    ],
    status:{
        type:Boolean,
        default:true
    },
    offer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',
      },

});

module.exports = mongoose.model('product',productSchema)