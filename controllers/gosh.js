// userOrderRoute.post('/placeOrder', orderController.placeOrder);
// userOrderRoute.get('/pagination', orderController.orderListPagination);
// //userOrderRoute.get('/getOrderIds', orderController.getOrderIds);
// userOrderRoute.post('/paymentVerify', orderController.razorpayPaymentVerify);
// userOrderRoute.post('/orderList', orderController.loadMyOrders);
// userOrderRoute.post('/orderCancel', orderController.cancelMyOrder);
// userOrderRoute.post('/orderReturn', orderController.returnMyOrder);





// <div class="card-header">
//                       <!-- Radio button for "Cash on delivery" -->
//                       <input type="checkbox" id="paymentChecking" name="paymentMethod" onchange="toggleCheckboxes(this)" value="COD"> &nbsp;
//                       <label for="cashOnDelivery" style="text-transform:uppercase; font-size:16px; font-weight:500;">Cash on delivery</label><br>

//                       <input type="checkbox" id="onlinePayment" name="paymentMethod" onchange="toggleCheckboxes(this)" value="banking"> &nbsp;
//                       <label for="onlinePayment" style="text-transform:uppercase; font-size:16px; font-weight:500;">Razorpay</label>
//                     </div>








//                     const razorpayPaymentVerify = asyncHandler(async (req, res) => {
//   try {
//     const { orderId, paymentId, signature, newOrderId } = req.body;

//     const secret = process.env.RAZORPAY_KEY_SECRET;

//     const generatedSignature = crypto
//       .createHmac("sha256", secret)
//       .update(orderId + "|" + paymentId)
//       .digest("hex");
//     //console.log("generatedSignature", generatedSignature);

//     if (generatedSignature === signature) {
//       await orderDB.updateOne(
//         { orderId: newOrderId },
//         { $set: { paymentStatus: "completed" } }
//       );
//       res.json({
//         success: true,
//         orderId: newOrderId,
//         message: "Payment verified successfully",
//       });
//     } else {
//       res
//         .status(400)
//         .json({ success: false, message: "Payment verification failed" });
//     }
//   } catch (error) {
//     console.log("PaymentVerifying Error", error);
//   }
// });











// const placeOrder = asyncHandler(async (req, res) => {
//   try {
//     const { addressId, selectedPayment, subtotal } = req.body;
//     console.log("bodyData", req.body);
//     const totalAmount = parseInt(subtotal);
//     console.log("bodyDatawdefwef", typeof totalAmount, totalAmount);
//     const findCart = await CartDB.findOne({ orderBy: req.session.userId });
//     //console.log("FindCArt", findCart);
//     const cartItems = findCart.products;
//     //console.log("sfdsdfvdsv", cartItems);
//     const date = new Date();

//     const orderDate = date.toLocaleDateString("en-GB");
//     const delivery = new Date(date.getTime() + 10 * 24 * 60 * 60 * 1000);
//     const deliveryDate = delivery
//       .toLocaleString("en-GB", {
//         year: "numeric",
//         month: "short",
//         day: "2-digit",
//       })
//       .replace(/\//g, "-");

//     if (selectedPayment === "COD") {
//       const productsInDb = await ProductDB.find({
//         _id: { $in: cartItems.map((item) => item.product) },
//       });
//       // console.log("productsInDatabase", productsInDb);

//       for (const item of cartItems) {
//         const product = productsInDb.find(
//           (p) => p._id.toString() === item.product.toString()
//         );
//         console.log("productsdvbisudgfvbedjhgvsuyb", product);
//         if (product) {
//           product.quantity -= item.quantity;
//           product.sold += item.quantity;
//           product.lastSold = new Date();
//           await product.save();
//           await ProductDB.updateOne(
//             { _id: product._id },
//             { $set: { quantity: product.quantity, sold: product.sold } }
//           );
//         }
//       }
//       const newOrder = new orderDB({
//         products: cartItems,
//         payment: selectedPayment,
//         orderId: orderId.generate(),
//         address: addressId,
//         orderBy: req.session.userId,
//         expectedDelivery: deliveryDate,
//         orderedDate: orderDate,
//         orderTotal: findCart.cartTotal,
//       });
//       await newOrder.save();
//       //console.log("orderSaved", newOrder);
//       await CartDB.updateOne(
//         { orderBy: req.session.userId },
//         { products: [], cartTotal: 0 }
//       );
//       console.log("orderIdOfNewOrder", newOrder.orderId);
//       res.json({ CodSuccess: true, orderId: newOrder.orderId });
//     } else if (selectedPayment === "banking") {
//       const newOrderId = orderId.generate();
//       const order = await razorpayInstance.orders.create({
//         amount: totalAmount,
//         currency: "INR",
//         receipt: newOrderId,
//       });

//       const productsInDb = await ProductDB.find({
//         _id: { $in: cartItems.map((item) => item.product) },
//       });
//       // console.log("productsInDatabase", productsInDb);

//       for (const item of cartItems) {
//         const product = productsInDb.find(
//           (p) => p._id.toString() === item.product.toString()
//         );
//         console.log("productsdvbisudgfvbedjhgvsuyb", product);
//         if (product) {
//           product.quantity -= item.quantity;
//           product.sold += item.quantity;
//           product.lastSold = new Date();
//           await product.save();
//           await ProductDB.updateOne(
//             { _id: product._id },
//             { $set: { quantity: product.quantity, sold: product.sold } }
//           );
//         }
//       }

//       const newOrder = new orderDB({
//         products: cartItems,
//         payment: selectedPayment,
//         orderId: newOrderId,
//         address: addressId,
//         orderBy: req.session.userId,
//         expectedDelivery: deliveryDate,
//         orderedDate: orderDate,
//         orderTotal: findCart.cartTotal,
//         paymentStatus: "pending",
//       });
//       await newOrder.save();
//       console.log("newOrder", newOrder);
//       await CartDB.updateOne(
//         { orderBy: req.session.userId },
//         { products: [], cartTotal: 0 }
//       );
//       console.log("order: ", order);
//       res.json({ successBanking: true, order, orderId: newOrder.orderId });
//     } else {
//       console.error("Razorpay order creation error:", error);
//       res
//         .status(400)
//         .json({ successBanking: false, error: "Invalid payment method" });
//     }
//   } catch (error) {
//     console.error("orderError", error);
//     res
//       .status(500)
//       .json({ successBanking: false, error: "Order creation failed" });
//   }
// });








// function verifyPayment(response, order, newOrderId) {
//     var settings = {
//       "url": "/orderPlaced/paymentVerify",
//       "method": "POST",
//       "timeout": 0,
//       "headers": {
//         "Content-Type": "application/json"
//       },
//       "data": JSON.stringify({
//         orderId: order.id,
//         paymentId: response.razorpay_payment_id,
//         signature: response.razorpay_signature,
//         newOrderId: newOrderId
//       }),
//     };
//     $.ajax(settings).done(function(data) {
//       console.log('bifhiejv',data);
//       if (data.success) {
//         window.location.href = /orderPlaced?orderId=${encodeURIComponent(data.orderId)};
//       } else {
//         alert("Payment verification failed. please try again.")
//       }
//     }).fail(function(jqXHR, textStatus,errorThrown) {
//       console.error(("Error verifying Payment", textStatus, errorThrown));
//       alert("An error occurred while verifying your payment. Please try again.")
//     })
//   }
// </script>







// function razorpayPaymentBtn() {
//     const addressRadios = document.getElementsByName('addressRadio');
//     const paymentCheckboxes = document.getElementsByName('paymentMethod');
//     const checkedAddressRadio = document.querySelector('input[name="addressRadio"]:checked');
//     const addressID = checkedAddressRadio ? checkedAddressRadio.value : null;
//     const checkedPaymentCheckbox = document.querySelector('input[name="paymentMethod"]:checked');
//     const payment = checkedPaymentCheckbox ? checkedPaymentCheckbox.value : null;
//     const totalText = $('#sub_total').text().trim();

//     totalAmountwithoutSymbol = totalText.replace('₹', '');

//     const totalAmount = parseInt(totalAmountwithoutSymbol) * 100;

//     console.log("total Amount", totalAmount);
//     $.ajax({
//       url: '/orderPlaced/placeOrder',
//       method: 'POST',
//       data: {
//         addressId: addressID,
//         selectedPayment: payment,
//         subtotal: parseInt(totalAmount),
//       },
//       success: (response) => {
//         if (response.successBanking === true) {
//           const newOrderId = response.orderId
//           razorpayPayment(response.order, newOrderId);
//         }
//       }
//     })
//   }

//   function razorpayPayment(order, newOrderId) {
//     var options = {
//       "key": "rzp_test_PIjycoYDuhOYTG",
//       "amount": order.amount,
//       "currency": "INR",
//       "name": "Belle",
//       "description": "Test Transaction",
//       "image": "http://127.0.0.1:3000/public/images/favicon.png",
//       "order_id": order.id,
//       // "callback_url": "https://eneqd3r9zrjok.x.pipedream.net/",
//       "handler": function(response) {
//         verifyPayment(response, order, newOrderId)
//       },
//       "prefill": {
//         "name": "Gaurav Kumar",
//         "email": "gaurav.kumar@example.com",
//         "contact": "9000090000"
//       },
//       "notes": {
//         "address": "Razorpay Corporate Office"
//       },
//       "theme": {
//         "color": "#99cc33"
//       }
//     };
//     var rzp1 = new Razorpay(options);
//     rzp1.on('payment.failed', function(response) {
//       window.location.href = '/Cart?paymentFailed=true';
//     });

//     rzp1.open();

//   }
















//   function placeOrderBtn() {
//     const addressRadios = document.getElementsByName('addressRadio');
//     const paymentCheckboxes = document.getElementsByName('paymentMethod');
//     const checkedAddressRadio = document.querySelector('input[name="addressRadio"]:checked');
//     const addressID = checkedAddressRadio ? checkedAddressRadio.value : null;
//     const checkedPaymentCheckbox = document.querySelector('input[name="paymentMethod"]:checked');
//     const payment = checkedPaymentCheckbox ? checkedPaymentCheckbox.value : null;

//     let selectedAddress = false;
//     let paymentMethod = false;


//     for (const radio of addressRadios) {
//       if (radio.checked) {
//         selectedAddress = true;
//         console.log("address selected");
//         break;
//       }
//     }
//     for (const checkbox of paymentCheckboxes) {
//       if (checkbox.checked) {
//         paymentMethod = true;
//         console.log("payment  selected");
//         break;
//       }
//     }

//     if (!selectedAddress) {
//       toastr["info"](Please select an address., "Info!");
//       return;
//     }
//     if (!paymentMethod) {
//       toastr["info"](Please select a payment Method., "Info!");

//       return;
//     }

//     if (selectedAddress && paymentMethod && payment === 'COD') {
//       $.ajax({
//         url: '/orderPlaced/placeOrder',
//         method: 'POST',
//         data: {
//           addressId: addressID,
//           selectedPayment: payment,
//         },
//         success: (response) => {
//           if (response.CodSuccess === true) {
//             window.location.href = /orderPlaced?orderId=${encodeURIComponent(response.orderId)};
//           }
//         }
//       })
//     }
//   }


















//   function toggleCheckboxes(checkbox) {
//     const checkboxes = document.querySelectorAll('input[type="checkbox"]');
//     const placeOrderBtn = document.getElementById('placeOrder');
//     const razorpayPaymentBtn = document.getElementById('razorpayPayment');

//     checkboxes.forEach(box => {
//       if (box !== checkbox && checkbox.checked) {
//         box.checked = false;
//       }
//     })

//     if (checkbox.id === 'onlinePayment' && checkbox.checked) {
//       placeOrderBtn.style.display = 'none';
//       razorpayPaymentBtn.style.display = 'block';
//     } else {
//       placeOrderBtn.style.display = 'block';
//       razorpayPaymentBtn.style.display = 'none';

//     }
//   }
























//   <div class="order-button-payment" id="placeBtn">

//               <button class="btn" id="placeOrder" onclick="placeOrderBtn()" value="Place order" type="submit">Place order</button>
//               <button class="btn" id="razorpayPayment" onclick="razorpayPaymentBtn()" value="Pay with Razorpay" type="button" style="display: none;">Pay with Razorpay</button>
//             </div>