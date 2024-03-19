const User = require("../models/userModel");
const Category = require("../models/categories");
const product = require("../models/addproductModel");
const sharp = require("sharp");
const path = require("path");
const categories = require("../models/categories");
const session = require("express-session");
const flash = require("connect-flash");
// const { default: products } = require("razorpay/dist/types/products");
const Offer = require("../models/offerModel");

//load productList
const loadProductList = async (req, res) => {
  try {
    const proDetails = await product
      .find()
      .populate("category")
      .populate("offer")
      .populate("categoryOffer");
    //console.log(proDetails);
    res.render("./adminSide/productList", { proDetails });
  } catch (error) {
    console.log(error.message);
  }
};

//load category
const loadCategory = async (req, res) => {
  try {
    const catDetails = await Category.find().populate("offer");
    res.render("./adminSide/addCategory", { catDetails });
  } catch (error) {
    console.log(error.message);
  }
};

// add catogory to db
const addCategory = async (req, res) => {
  try {
    const { Name, Description } = req.body;
    const regex = new RegExp(`^${Name}$`, "i");

    const existingCategory = await Category.findOne({
      Name: { $regex: regex },
    });
    if (existingCategory) {
      req.flash("error", "Category with the same name already exists.");
      return res.redirect("/addCategory");
    }
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
    if (email === process.env.email && password === process.env.password) {
      req.session.email = email;
      res.redirect("/adminHome");
    } else {
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

    await User.updateOne({ _id: id }, { $set: { is_blocked: false } });

    res.redirect("/userDetails");
  } catch (error) {
    console.log(error);
  }
};

//edit category
const editCategory = async (req, res) => {
  try {
    const { id } = req.params;

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
    const categoryId = req.params.id;

    let existData = await Category.findOne({ Name: req.body.Name });

    if (!existData) {
      const updatedCategoryData = {
        Name: req.body.Name,
        Description: req.body.Description,
        is_list: req.body.is_list === "on",
      };

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
  }
};

//add a new product
const adminAddProduct = async (req, res) => {
  try {
    const categories = await Category.find();

    res.render("./adminSide/addProduct", { categories });
  } catch (error) {
    console.log(error.message);
  }
};

// addition of a new product
const addProduct = async (req, res) => {
  try {
    const { product_name, description, price, quantity, category } = req.body;

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

      await sharp(uploadedImagePath)
        .resize(840, 840, { fit: "fill" })
        .toFile(resizedImagePath);

      productImages[i] = req.files[i].filename;
    }

    const newProduct = new product({
      name: product_name,
      description,
      price,
      quantity,
      category: category,
      productImages: productImages,
    });

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

    const foundProduct = await product.findById(productId);

    if (!foundProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const newstatus = foundProduct.status === true ? false : true;

    await product.updateOne(
      { _id: productId },
      { $set: { status: newstatus } }
    );

    res.json({
      message: "Product status updated successfully",
      status: newstatus,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// loadEditProduct
const loadEditProduct = async (req, res) => {
  try {
    const productId = req.query.id;

    const categories = await Category.find();

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

      await sharp(uploadedImagePath)
        .resize(840, 840, { fit: "fill" })
        .toFile(resizedImagePath);

      productImages[i] = req.files[i].filename;
    }
    if (req.body.imagesToDelete) {
      const imagesToDelete = JSON.parse(req.body.imagesToDelete);
      imagesToDelete.forEach(async (imagePath) => {
        await fs.promises.unlink(
          path.join(
            __dirname,
            "..",
            "public",
            "assets",
            "products",
            "resized",
            imagePath
          )
        );
      });

      await product.updateOne(
        { _id: productId },
        { $pull: { productImages: { $in: imagesToDelete } } }
      );
    }

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

    if (proData) {
      res.redirect("/loadProductList");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const deleteProductImage = async (req, res) => {
  try {
    const { imageUrl, productId } = req.body;
    const removeImage = await product.findOneAndUpdate(
      { _id: productId },
      { $pull: { productImages: imageUrl } }
    );
    console.log("imagum kitti - ", removeImage);
    if (removeImage) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.log(error.message);
  }
};

//apply offer for product

const loadOfferForProducts = async (req, res) => {
  try {
    const productId = req.query.id;
    const offer = await Offer.find({});
    res.render("./adminSide/addOfferforProduct", { productId, offer });
  } catch (error) {
    console.log(error.message);
  }
};

//apply offer for product
const applyOffer = async (req, res) => {
  try {
    const offerId = req.query.offerId;
    const productId = req.query.productId;

    const Product = await product.findById(productId);
    if (!Product) {
      return res.status(404).send("Product not found");
    }
    const productPrice = Product.price;

    const offer = await Offer.findById(offerId);
    const offerDiscount = offer.percentage;
    const discountAmount = (productPrice * offerDiscount) / 100;

    Product.offerPrice = productPrice - discountAmount;
    Product.offer = offerId;
    Product.offerApplied = true;
    await Product.save();
    res.redirect("/loadOfferForProducts");
  } catch (error) {
    console.error("Error applying offer:", error.message);
    res.status(500).send("An error occurred while applying the offer");
  }
};

//for category
const loadOfferForCategory = async (req, res) => {
  try {
    const categoryId = req.query.id;
    const offer = await Offer.find({});
    res.render("./adminSide/addOfferforCategory", { categoryId, offer });
  } catch (error) {
    console.log(error.message);
  }
};

const applyOfferForCategory = async (req, res) => {
  try {
    const offerId = req.body.offerId;
    const categoryId = req.body.categoryId;

    const Category = await categories.findById(categoryId);
    const Products = await product.find({ category: categoryId });

    if (!Category) {
      return res.status(404).send("Category not found");
    }
    //console.log("offer add cheyyunna products:: ", Products);

    for (let product of Products) {
      if (product.offerApplied == true && product.offerPrice > 0) {
        console.log("this product already have an offer");
        continue;
      }

      const productPrice = product.price;
      const offer = await Offer.findById(offerId);
      const offerDiscount = offer.percentage;
      const discountAmount = (productPrice * offerDiscount) / 100;

      product.categoryOfferPrice = productPrice - discountAmount;
      product.categoryOffer = offerId;
      product.categoryOfferApplied = true;
      await product.save();
    }

    Category.offer = offerId;
    Category.offerApplied = true;
    await Category.save();
    res.send("Offer applied successfully");
  } catch (error) {
    console.error("Error applying offer:", error.message);
    res.status(500).send("An error occurred while applying the offer");
  }
};

//delete ofer from product
const deleteOfferFromProduct = async (req, res) => {
  try {
    const productId = req.body.productId;
    const Product = await product.findById(productId);
    if (!Product) {
      return res.status(404).send({ message: "Product not found" });
    }
    Product.offer = null;
    Product.offerApplied = false;
    Product.offerPrice = 0;
    await Product.save();
    res.send({ message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: "Error deleting offer", error: error });
  }
};

const deleteOfferFromCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    //console.log("Delete category this");

    //console.log(categoryId);
    const category = await categories.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).send({ message: "Category not found" });
    }

    const products = await product.find({ category: categoryId });
    if (!products || products.length === 0) {
      return res.status(404).send({ message: "Products not found" });
    }

    for (let product of products) {
      product.categoryOfferPrice = 0;
      product.categoryOffer = null;
      product.categoryOfferApplied = false;
      await product.save();
    }

    category.offer = null;
    category.offerApplied = false;
    await category.save();
    res.send({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting offer:", error.message);
    res
      .status(500)
      .send({ message: "Error deleting offer", error: error.message });
  }
};

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
  deleteOfferFromProduct,
  deleteOfferFromCategory,
};
