const User = require("../models/userModel");
const Category = require("../models/categories");
const product = require("../models/addproductModel");
const sharp = require("sharp");
const path = require("path");
const categories = require("../models/categories");
const session = require("express-session");
const flash = require("connect-flash");
const Offer = require("../models/offerModel");
const Order = require("../models/orderModel");

//load productList
const loadProductList = async (req, res) => {
  try {
    const proDetails = await product
      .find()
      .populate("category")
      .populate("offer")
      .populate("categoryOffer");
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
    console.log(1, Name);
    console.log(1, Description);
    const is_list = req.body.is_list === "true" ? true : false;
    console.log(is_list);

    const regex = new RegExp(`^${Name}$`, "i");

    const existingCategory = await Category.findOne({
      Name: { $regex: regex },
    });
    console.log(3, existingCategory);

    if (existingCategory) {
      req.flash("error", "Category with the same name already exists.");
      return res.redirect("/addCategory");
    }
    const category = new Category({
      Name,
      Description,
      is_list,
    });
    console.log(4, category);

    const categoryData = await category.save();
    console.log(5, categoryData);

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
    const orderCount = await Order.countDocuments();
    const userCount = await User.countDocuments();
    const revenue = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: {
            $sum: "$totalPrice",
          },
        },
      },
    ]);

    const topProduct = await Order.aggregate([
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $group: {
          _id: "$products.productId",
          productName: { $first: "$productDetails.name" },
          totalQuantitySold: { $sum: "$products.quantity" },
        },
      },
      { $project: { _id: 0, productName: 1, totalQuantitySold: 1 } },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 10 },
    ]);

    const topCategory = await Order.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $group: {
          _id: "$categoryDetails.Name",
          totalQuantitySold: { $sum: "$productDetails.quantity" },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 10 },
    ]);
    res.render("./adminSide/adminHome", {
      topProduct,
      topCategory,
      orderCount,
      userCount,
      revenue: revenue[0],
    });
  } catch (error) {
    console.log(error.message);
  }
};

// chart loading
const getDetailsChart = async (req, res) => {
  try {
    let labelObj = {};
    let salesCount;
    let findQuerry;
    let currentYear;
    let currentMonth;
    let index;

    switch (req.body.filter.toLowerCase()) {
      case "weekly":
        currentYear = new Date().getFullYear();
        currentMonth = new Date().getMonth() + 1;

        labelObj = {
          Sun: 0,
          Mon: 1,
          Tue: 2,
          Wed: 3,
          Thu: 4,
          Fri: 5,
          Sat: 6,
        };

        salesCount = new Array(7).fill(0);

        findQuerry = {
          createdAt: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59),
          },
        };
        index = 0;
        break;
      case "monthly":
        currentYear = new Date().getFullYear();
        labelObj = {
          Jan: 0,
          Feb: 1,
          Mar: 2,
          Apr: 3,
          May: 4,
          Jun: 5,
          Jul: 6,
          Aug: 7,
          Sep: 8,
          Oct: 9,
          Nov: 10,
          Dec: 11,
        };

        salesCount = new Array(12).fill(0);

        findQuerry = {
          createdAt: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31, 23, 59, 59),
          },
        };
        index = 1;
        break;
      case "daily":
        currentYear = new Date().getFullYear();
        currentMonth = new Date().getMonth() + 1;
        let end = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        end = String(end).split(" ")[2];
        end = Number(end);

        for (let i = 0; i < end; i++) {
          labelObj[`${i + 1}`] = i;
        }

        salesCount = new Array(end).fill(0);

        findQuerry = {
          createdAt: {
            $gt: new Date(currentYear, currentMonth - 1, 1),
            $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59),
          },
        };

        index = 2;
        break;
      case "yearly":
        findQuerry = {};

        const ord = await Order.find().sort({ createdAt: 1 });
        const stDate = ord[0].createdAt.getFullYear();
        const endDate = ord[ord.length - 1].createdAt.getFullYear();

        for (let i = 0; i <= Number(endDate) - Number(stDate); i++) {
          labelObj[`${stDate + i}`] = i;
        }

        salesCount = new Array(Object.keys(labelObj).length).fill(0);

        index = 3;
        break;
      default:
        return res.json({
          label: [],
          salesCount: [],
        });
    }
    const orders = await Order.aggregate([
      {
        $match: findQuerry,
      },
      {
        $unwind: {
          path: "$products",
        },
      },
    ]);

    orders.forEach((order) => {
      if (index === 2) {
        salesCount[
          labelObj[Number(String(order.createdAt).split(" ")[index])]
        ] += 1;
      } else {
        salesCount[labelObj[String(order.createdAt).split(" ")[index]]] += 1;
      }
    });

    res.json({
      label: Object.keys(labelObj),
      salesCount,
    });
  } catch (err) {
    console.log(err);
  }
};

//admin login page load
const adminloadlogin = async (req, res) => {
  try {
    res.render("./adminSide/adminLogin");
  } catch (error) {
    console.log(error.message);
  }
};

// admin logout
const Adminlogout = async (req, res) => {
  try {
    delete req.session.adminEmail;
    res.redirect("/adminLogin");
  } catch (err) {
    console.log("Admin Logout error:", err);
    res.redirect("/adminHome");
  }
};

//verify admin login
const adminverify = (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === process.env.email && password === process.env.password) {
      req.session.adminEmail = email;
      res.redirect("/adminHome");
    } else {
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
    const userId = req.body.userId;
    console.log("Blocking user:", userId); // ✅ Correct

    // let a = await User.updateOne({ _id: id }, { $set: { is_blocked: true } });
    const result = await User.findByIdAndUpdate(userId, { is_blocked: true });

    console.log("Updated user:", result);

    res.json({ success: true });
    // res.redirect("/userDetails");
  } catch (error) {
    console.error("Error in blockuser:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

//  unblocking a user
const unBlockuser = async (req, res) => {
  try {
    const userId = req.body.userId;
    console.log("Unblocking user:", userId); // ✅ Correct
    // await User.updateOne({ _id: id }, { $set: { is_blocked: false } });
    const result = await User.findByIdAndUpdate(userId, { is_blocked: false });
    console.log("Updated user:", result);

    res.json({ success: true });

    // res.redirect("/userDetails");
  } catch (error) {
    console.error("Error in unBlockuser:", error.message);
    res.status(500).json({ success: false, error: error.message });
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
    console.error("error in update", error);
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

// update the product status
const updateProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;

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
  getDetailsChart,
};
