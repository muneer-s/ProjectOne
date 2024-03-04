
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
        required:false
    }

});

module.exports = mongoose.model('Category',categorySchema)