const User = require("../models/userModel");
const Category = require("../models/categories");
const product = require("../models/addproductModel");
const sharp = require("sharp");
const path = require("path");
const categories = require("../models/categories");
const session = require("express-session");
const flash = require("connect-flash");
// const { default: products } = require("razorpay/dist/types/products");
const Offer = require("../models/offerModel")



//load productList
const loadProductList = async (req, res) => {
  try {
    const proDetails = await product.find().populate("category").populate("offer")
    console.log(proDetails);
    res.render("./adminSide/productList", { proDetails });
  } catch (error) {
    console.log(error.message);
  }
};

//load category
const loadCategory = async (req, res) => {
  try {
    const catDetails = await Category.find().populate("offer")
    res.render("./adminSide/addCategory", { catDetails });
  } catch (error) {
    console.log(error.message);
  }
};

// add catogory to db
const addCategory = async (req, res) => {
  try {
    const { Name, Description } = req.body;
    const regex = new RegExp(`^${Name}$`, 'i');

    const existingCategory = await Category.findOne({ Name: { $regex: regex } });
    if (existingCategory) {
      req.flash("error", "Category with the same name already exists.");
      return res.redirect("/addCategory");
    }
    // Create new category
    const catogory = new Category({
      Name: req.body.Name,
      Description: req.body.Description,
    });

    const categoryData = await catogory.save();
    res.redirect("/addCategory");
  } catch (error) {
    console.error(error.message);
    req.flash("error", "Internal Server Error");
    return res.redirect("/addCategory");

    // res.status(500).json({ error: "Internal Server Error" });
  }
};

//admin home page loading
const adminLoadHome = async (req, res) => {
  try {
    res.render("./adminSide/AdminHome");
  } catch (error) {
    console.log(error.message);
  }
};

//admin login page load
const adminloadlogin = async (req, res) => {
  try {
    res.render("./adminSide/AdminLogin");
  } catch (error) {
    console.log(error.message);
  }
};

//user logout
const Adminlogout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Error destroying session: ", err);
    } else {
      console.log("Session destroyed");
      res.redirect("/AdminHome");
    }
  });
};

//verify admin login
const adminverify = (req, res) => {
  try {
    const { email, password } = req.body;

    // console.log(process.env.email);

    // Check if the provided email and password match the admin credentials stored in environment variables
    if (email === process.env.email && password === process.env.password) {
      // console.log(process.env.email);
      // console.log(process.env.password);
      req.session.email = email;
      res.redirect("/adminHome");
    } else {
      // res.status(401).send("Invalid credentials");
      console.log("Invalid credentials");
      req.flash("error", "Invalid credentials");
      return res.redirect("/adminLogin");
    }
  } catch (error) {
    console.log(error);
  }
};

//  user details
const userDetails = async (req, res) => {
  try {
    const adminSideUserData = await User.find();

    res.render("./adminSide/userdetails", { adminSideUserData });
  } catch (error) {
    console.log(error.message);
  }
};

const blockuser = async (req, res) => {
  try {
    const id = req.body.userId;

    // Update the User document to set the 'is_blocked' field to true
    await User.updateOne({ _id: id }, { $set: { is_blocked: true } });

    res.redirect("/userDetails");
  } catch (error) {
    console.log(error);
  }
};

//  unblocking a user
const unBlockuser = async (req, res) => {
  try {
    const id = req.body.userId;

    // Update the User document with the given ID, setting 'is_blocked' field to false
    await User.updateOne({ _id: id }, { $set: { is_blocked: false } });

    res.redirect("/userDetails");
  } catch (error) {
    console.log(error);
  }
};

//edit category
const editCategory = async (req, res) => {
  try {
    // extract category ID from request parameters
    const { id } = req.params;

    // Fetching the category with the specified ID from the database
    const category = await Category.findById(id);

    res.render("./adminSide/editCategory", { category });
  } catch (error) {
    console.error("Error fetching category:   ", error);
    res.status(500).send("Internal Server Error");
  }
};

// update category
const updateCategory = async (req, res) => {
  try {
    // extract category ID from request parameters
    const categoryId = req.params.id;

    let existData = await Category.findOne({ Name: req.body.Name });

    if (!existData) {
      // Prepare updated category data from the request body
      const updatedCategoryData = {
        Name: req.body.Name,
        Description: req.body.Description,
        is_list: req.body.is_list === "on", // Assuming is_list is a checkbox
      };

      // Update the category in the database using the findByIdAndUpdate method
      // categoryId: ID of the category to be updated
      // updatedCategoryData: New data to update in the category
      // { new: true }: Return the modified category after the update
      const updatedCategory = await Category.findByIdAndUpdate(
        categoryId,
        updatedCategoryData,
        { new: true }
      );

      res.redirect("/addCategory");
    } else {
      req.flash("error", "already existing category");
      res.redirect(`/editCategory/${categoryId}`);
    }
  } catch (error) {
    console.error("updateil aanu error", error);
    //res.status(500).send("Internal Server Error");
  }
};

// deletion of a category
const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    await Category.findByIdAndDelete(categoryId);

    res.redirect("/addCategory");
  } catch (error) {
    console.error(error);
    req.flash("error", "Internal Server Error");
    res.redirect("/addCategory");

    // Send a 500 Internal Server Error response if an error occurs
    // res.status(500).send("Internal Server Error");
  }
};

//add a new product
const adminAddProduct = async (req, res) => {
  try {
    // Fetch all available categories
    const categories = await Category.find();

    res.render("./adminSide/addProduct", { categories });
  } catch (error) {
    console.log(error.message);
  }
};

// addition of a new product
const addProduct = async (req, res) => {
  try {
    // Destructuring the required information from the request body
    const { product_name, description, price, quantity, category } = req.body;

    let productImages = [];

    // Iterate through each uploaded image
    for (let i = 0; i < req.files.length; i++) {
      // Define paths for the original and resized images
      const uploadedImagePath = req.files[i].path;
      const resizedImagePath = path.join(
        __dirname,
        "..",
        "public",
        "assets",
        "products",
        "resized",
        req.files[i].filename
      );

      // Resize the image using the sharp library
      await sharp(uploadedImagePath)
        .resize(840, 840, { fit: "fill" })
        .toFile(resizedImagePath);

      // Save the filename of the resized image
      productImages[i] = req.files[i].filename;
    }

    // Create a new product object with the obtained information and resized image filenames
    const newProduct = new product({
      name: product_name,
      description,
      price,
      quantity,
      category: category,
      productImages: productImages,
    });

    // Save new product
    await newProduct.save();

    res.redirect("/loadProductList");
  } catch (error) {
    console.log(error);
    res.redirect("/addProduct");
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// update the product status
const updateProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    //console.log(productId);

    // Find the product
    const foundProduct = await product.findById(productId);

    // Check if the product with the given ID exists
    if (!foundProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Toggle the status of the product (change from true to false or vice versa)
    const newstatus = foundProduct.status === true ? false : true;

    // Save the updated product back to the database
    await product.updateOne(
      { _id: productId },
      { $set: { status: newstatus } }
    );

    // Respond with a success message and the updated status
    res.json({
      message: "Product status updated successfully",
      status: newstatus, // use the updated status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// loadEditProduct
const loadEditProduct = async (req, res) => {
  try {
    // Extract product ID from request query parameters
    const productId = req.query.id;

    const categories = await Category.find();

    // Find the specific product by its ID using the product model
    const productItem = await product.findById(productId);

    res.render("adminSide/editProduct", { product: productItem, categories });
  } catch (error) {
    console.log(error);
  }
};

// edit product
const postEditProduct = async (req, res) => {
  try {
    const { product_name, description, price, quantity, category, productId } =
      req.body;

    let productImages = [];

    for (let i = 0; i < req.files.length; i++) {
      const uploadedImagePath = req.files[i].path;

      const resizedImagePath = path.join(
        __dirname,
        "..",
        "public",
        "assets",
        "products",
        "resized",
        req.files[i].filename
      );

      // Use sharp library to resize the image to 840x840 pixels
      await sharp(uploadedImagePath)
        .resize(840, 840, { fit: "fill" })
        .toFile(resizedImagePath);

      productImages[i] = req.files[i].filename;
    }
    if (req.body.imagesToDelete) {
      const imagesToDelete = JSON.parse(req.body.imagesToDelete);
      // Remove the images from the server
      imagesToDelete.forEach(async (imagePath) => {
          await fs.promises.unlink(path.join(__dirname, '..', 'public', 'assets', 'products', 'resized', imagePath));
      });

      // Update the product in the database to remove the deleted images
      await product.updateOne(
          { _id: productId },
          { $pull: { productImages: { $in: imagesToDelete } } }
      );
  }




    // Update the product in the database using the 'updateOne' method
    const proData = await product.updateOne(
      { _id: productId },
      {
        $set: {
          name: product_name,
          description: description,
          price: price,
          quantity: quantity,
          category: category,
        },
        $push: { productImages: productImages },
      }
    );

    //if product update successful
    if (proData) {
      res.redirect("/loadProductList");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const deleteProductImage = async (req, res) => {
  try {
    const {imageUrl,productId} = req.body
    const removeImage = await product.findOneAndUpdate({_id:productId},{$pull:{productImages:imageUrl}})
    console.log("imagum kitti - ",removeImage);
    if(removeImage){
      res.json({success:true})
    }else{
      res.json({success:false})
    }
  }catch(error){
    console.log(error.message);
  }
}


//apply offer for product

const loadOfferForProducts  = async (req,res)=>{
  try {
    const productId = req.query.id
    const offer = await Offer.find({})
    res.render("./adminSide/addOfferforProduct", { productId,offer });    
  } catch (error) {
    console.log(error.message);
  }
}


//apply offer for product
const applyOffer = async(req,res)=>{
  try {
    console.log("8768587568756876587568765786786768767");
    const offerId = req.query.offerId;
    const productId = req.query.productId;
    const Product = await product.findById(productId);
    if (!Product) {
      return res.status(404).send('Product not found');
    }
    Product.offer = offerId;
    await Product.save();
    res.redirect('/loadOfferForProducts');
 } catch (error) {
    console.error('Error applying offer:', error.message);
    res.status(500).send('An error occurred while applying the offer');
 }


}


//for category
const loadOfferForCategory  = async (req,res)=>{
  try {
    const categoryId = req.query.id
    const offer = await Offer.find({})
    res.render("./adminSide/addOfferforCategory", { categoryId,offer });
  } catch (error) {
    console.log(error.message);
  }
}



const applyOfferForCategory = async(req,res)=>{
  try {
    console.log("apply offer for category controll ethi");
    const offerId = req.query.offerId;
    const categoryId = req.query.categoryId;
    console.log("i am offer id - ",offerId);
    console.log("i am category id :",categoryId);


    const Category = await categories.findById(categoryId);
    console.log("apo njn catum : ",Category);

    if (!Category) {
      return res.status(404).send('Category not found');
    }
    Category.offer = offerId;
    await Category.save();
    res.redirect('/loadOfferForCategory');
 } catch (error) {
    console.error('Error applying offer:', error.message);
    res.status(500).send('An error occurred while applying the offer');
 }


}


//delete ofer from product
const  deleteOfferFromProduct = async (req, res) => {
  try {
      const productId = req.body.productId;
      const Product = await product.findById(productId);
      if (!Product) {
          return res.status(404).send({ message: 'Product not found' });
      }
      Product.offer = null; // Remove the offer
      await Product.save();
      res.send({ message: 'Offer deleted successfully' });
      

  } catch (error) {
      res.status(500).send({ message: 'Error deleting offer', error: error });
  }
}





module.exports = {
  adminLoadHome,
  adminloadlogin,
  adminverify,
  adminAddProduct,
  userDetails,
  addCategory,
  loadCategory,
  blockuser,
  unBlockuser,
  editCategory,
  updateCategory,
  deleteCategory,
  addProduct,
  loadProductList,
  loadEditProduct,
  postEditProduct,
  deleteProductImage,
  updateProductStatus,
  Adminlogout,
  applyOffer,
  loadOfferForProducts,
  loadOfferForCategory,
  applyOfferForCategory,
  deleteOfferFromProduct
};
