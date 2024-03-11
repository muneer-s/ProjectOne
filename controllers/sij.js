{/* <div class="border p-3 mb-5">
								<h4 class="h mb-3 text-black">Select A Payment Method</h4>

								<div class="expandable">
									<button class="expand-btn">Online Payment</button>
									<div class="content">
										<span>Secure, seamless, and just a click away!</span>
										<button id="onlinePayment" class="btn btn-primary"> Pay Online</button>

									</div>
								</div>
								<div class="expandable">
									<button class="expand-btn">Cash On Delivery</button>
									<div class="content">
										<span>
											Enjoy the ease of Cash on Delivery for stress-free shopping.</span>
										<button
											class="flex-c-m stext-101 cl0 size-116 bg3 bor14 hov-btn3 p-lr-15 trans-04 pointer"
											id="placeOrder">
											<a href="">Place Order</a>
										</button>
									</div>
								</div>
							</div>








<script>
		document.addEventListener('DOMContentLoaded', function () {
			const expandButtons = document.querySelectorAll('.expand-btn');

			expandButtons.forEach(function (button) {
				button.addEventListener('click', function (event) {
					event.preventDefault(); // Prevent page refresh

					const content = this.nextElementSibling;
					const otherContents = document.querySelectorAll('.content');

					// Collapse all other expandable sections
					otherContents.forEach(function (otherContent) {
						if (otherContent !== content) {
							otherContent.style.display = 'none';
						}
					});

					// Toggle display of the clicked content
					content.style.display = content.style.display === 'block' ? 'none' : 'block';
				});
			});
		});

	</script>







<script>
		document.getElementById('razorpayButton').addEventListener('click', function () {
			// Show the Razorpay payment popup
			document.getElementById('razorpayPopup').style.display = 'block';
		});
		document.getElementsByClassName('close')[0].addEventListener('click', function () {
			// Show the Razorpay payment popup
			document.getElementById('razorpayPopup').style.display = 'none';
		});
	</script>










<script>
		document.addEventListener('DOMContentLoaded', function () {
			document.getElementById('placeOrder').addEventListener('click', function (event) {
				event.preventDefault();
				placeOrder('Cash on Delivery');
			});
		});
		document.addEventListener('DOMContentLoaded', function () {
			document.getElementById('onlinePayment').addEventListener('click', function (event) {
				event.preventDefault();
				placeOrder('Online');
			});
		});

		function placeOrder(payment) {
			const selectedAddressInput = document.querySelector('input[name="selectedAddress"]:checked');
			if (!selectedAddressInput) {
				// Display an error message if no address is selected
				swal("Alert", "Please select an address", "info");
				return; // Exit the function to prevent further execution
			}
			// Extract the selected address ID
			const selectedAddressId = selectedAddressInput.value;
			$.ajax({
				type: 'POST',
				url: '/order/create',
				data: { selectedAddressId: selectedAddressId, paymentMethod: payment },
				success: function (response) {
					if(response.codSuccess){
						swal("Success", "Order placed successfully", "success").then(() => {
						window.location.href = '/order/thankyou';
					});
					}else if(response.online){
						razorpayPayment(response.orderData)
					}
					
				},
				error: function (xhr, status, error) {
					swal("Alert", "Please add a valid product", 'warning')
						.then(() => {
							window.location.href = '/cart';
						});
				}
			});
		}
		function razorpayPayment(order){
			var options = {
		"key": "rzp_test_m7scdXTvPyrkkTl", // Enter the Key ID generated from the Dashboard
		"amount": order.amount,
		"currency": "INR",
		"description": "COZA STORE",
		"image": "https://s3.amazonaws.com/rzp-mobile/images/rzp.jpg",
		"order_id": order.id,
		"prefill":
		{
			"name": "<%= cartData.user_name %>",
			"email": "<%= cartData.userId.email %>",
			"contact": "<%= cartData.userId.mobile %>",
		},
		config: {
			display: {
				blocks: {
					utib: { //name for Axis block
						name: "Pay using Axis Bank",
						instruments: [
							{
								method: "card",
								issuers: ["UTIB"]
							},
							{
								method: "netbanking",
								banks: ["UTIB"]
							},
						]
					},
					other: { //  name for other block
						name: "Other Payment modes",
						instruments: [
							{
								method: "card",
								issuers: ["ICIC"]
							},
							{
								method: 'netbanking',
							}
						]
					}
				},
				hide: [
					{
						method: "upi"
					}
				],
				sequence: ["block.utib", "block.other"],
				preferences: {
					show_default_blocks: false // Should Checkout show its default blocks?
				}
			}
		},
		"handler": function (response) {
			verifyPayment(response,order)

		},
		"modal": {
			"ondismiss": function () {
				Swal.fire({
					title: 'Are you sure?',
					text: "You want to close the form?",
					icon: 'question',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#d33',
					confirmButtonText: 'Yes, close it!',
					cancelButtonText: 'No, cancel!'
				}).then((result) => {
					if (result.isConfirmed) {
						console.log("Checkout form closed by the user");
					} else {
						rzp1.open();
					}
				});
			}
		}
	};
var rzp1 = new Razorpay(options);
rzp1.open();
		}

		function verifyPayment(payment,order){
			$.ajax({
				url:'/order/verifyPayment',
				data:{
					payment,
					order
				},
				method:'POST',
				success:function(response){
					if(response.success){
						localStorage.reload()
					}
				}
			})
		}

	</script>







const createOrder = asyncHandler(async (req, res) => {
    try {
      const accessToken = req.accessToken;
      if (!accessToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
      const userId = decodedToken.id;
      const userData = await User.findById(userId);
  
      const { selectedAddressId, paymentMethod } = req.body;
  
      if (!selectedAddressId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const delivery_address = await Address.findById(selectedAddressId);
  
      if (!delivery_address) {
        return res.status(400).json({ error: "Invalid address" });
      }
      const cartData = await cart.viewCart(accessToken);
      const isValidCart = cartData.products.every((productItem) => {
        return (
          productItem.quantity > 0 &&
          productItem.quantity <= productItem.product.quantity &&
          productItem.product.is_listed === true
        );
      });
  
      if (!isValidCart || cartData.cartTotal <= 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }
      const unlistedProducts = cartData.products.filter(
        (item) => !item.product.is_listed
      );
      if (unlistedProducts.length > 0) {
        return res
          .status(400)
          .json({ error: "One or more products are unlisted" });
      }
      const orderItems = cartData.products.map((item) => {
        let orderIdForItem = orderid.generate();
        return {
          product_id: item.product._id,
          orderId: orderIdForItem,
          quantity: item.quantity,
          price: item.product.price,
          total_price: item.quantity * item.product.price,
        };
      });
      const order = new Order({
        user_id: userId,
        orderId: orderid.generate(),
        delivery_address: delivery_address,
        user_name: userData.name,
        total_amount: cartData.cartTotal,
        date: new Date().toISOString(),
        expected_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        items: orderItems,
      });
      const placedOrder = await order.save();
      const placedOrderId = placedOrder.orderId;
      for (const item of cartData.products) {
        await Product.updateOne(
          { _id: item.product._id },
          { $inc: { quantity: -item.quantity, sold: item.quantity } }
        );
      }
      cartData.products = [];
      cartData.cartTotal = 0;
      await cartData.save();
      if (paymentMethod === "Cash on Delivery") {
        await Order.findOneAndUpdate(
          { orderId: placedOrderId },
          {
            $set: {
              payment: paymentMethod,
            },
          }
        );
        res.json({ codSuccess: true });
      } else {
        generateRazorpay(placedOrder.orderId, placedOrder.total_amount).then(
          (orderData) => {
            res.json({ online: true, orderData });
          }
        );
      }
    } catch (error) {
      console.error("Error creating order:", error);
      res.send(error);
    }
  });
  // Verify Payment
  const verifyPayment = asyncHandler(async (req, res) => {
    try {
      const paymentData = req.body;
      const razorpay_payment_id = paymentData["payment[razorpay_payment_id]"];
      const razorpay_order_id = paymentData["payment[razorpay_order_id]"];
      const razorpay_signature = paymentData["payment[razorpay_signature]"];
      const secret = process.env.RAZORPAY_KEY_SECRET;
      const orderId = paymentData["order[receipt]"];
  
      const generated_signature = crypto
        .createHmac("sha256", secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
      if (generated_signature == razorpay_signature) {
        await Order.findOneAndUpdate(
          { orderId: orderId },
          {
            $set: {
              payment: "Online",
              paymentStatus: "Completed",
              paymentId: razorpay_payment_id,
            },
          }
        );
        return res.json({ success: true });
      }
    } catch (error) {
      throw new Error(error);
    }
  });






















  router.post("/create", isBlocked, userMiddleware, createOrder);
router.post("/verifyPayment", isBlocked, userMiddleware, verifyPayment);





//config nte ullil 

// Function to create a new instance of Razorpay
const razorpayInstance = () => {
    return new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  };
  
  const generateRazorpay = asyncHandler(async (orderId, amount) => {
    // Create Razorpay instance
    const instance = razorpayInstance();
  
    // Create order options
    const options = {
      amount: amount * 100,  // amount in the smallest currency unit
      currency: "INR",
      receipt: orderId,
    };
  
    // Use async/await to create order
    try {
      const order = await instance.orders.create(options);
      console.log(order);
      return order; // Return the created order if needed
    } catch (err) {
      console.error(err);
      throw err; // Re-throw the error to be caught elsewhere if needed
    }
  });
  
  module.exports = generateRazorpay;









  const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Make sure this matches the name of your User model
      // required: true,
    },
    orderId: {
      type: String
    },
    delivery_address: {},
    user_name: {
      type: String,
      // required: true,
    },
    total_amount: {
      type: Number,
      // required: true,
    },
    date: {
      type: String,
      // required: true,
    },
    expected_delivery: {
      type: String,
      // required: true,
    },
    status: {
      type: String,
      default: "Not Processed",
      enum: [
        "Not Processed",
        "Processing",
        "Dispatched",
        "Cancelled",
        "Delivered",
        "Returned",
      ],
    },
    payment: {
      type: String,
      // required: true,
      default:'Pending',
    },
    paymentId: {
      type: String,
    },
    paymentStatus: {
      type: String,
      default:'Pending',
    },
    totalDiscountAmount: {
      type: Number,
    },
    couponApplied: {
      type: Boolean,
    },
    coupon_name: {
      type: String,
    },
    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
          // required: true,
        },
        orderId: {
          type: String
        },
        quantity: {
          type: Number,
          // required: true,
        },
        price: {
          type: Number,
          // required: true,
        },
        total_price: {
          type: Number,
          // required: true,
        },
        offerPercentage: {
          type: Number,
        },
        couponDiscountTotal: {
          type: Number,
        },
        ordered_status: {
          type: String,
          default: "placed",
        },
        cancellationReason: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema); */}