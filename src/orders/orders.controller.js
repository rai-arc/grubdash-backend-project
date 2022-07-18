const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass

function list(req, res) {
  res.json({ data: orders });
}

function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    next({
      status: 400,
      message: `Order must include a ${propertyName}`,
    });
  };
}

function dishesCheck(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return next({
      status: 400,
      message: `Order must include at least one dish`,
    });
  }
  next();
}

function dishQuantityCheck(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  dishes.forEach((dish, index) => {
    if (
      dish.quantity <= 0 ||
      !Number.isInteger(dish.quantity)
    ) {
      return next({
        status: 400,
        message: `Dish ${index} must have a quantity that is an interger greater than 0`,
      });
    } else {
      return;
    }
  })
  next();
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id == orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order does not exist: ${orderId}`,
  });
}

function orderIdMatch(req, res, next) {
  const { orderId } = req.params;
  const { data: { id } = {} } = req.body;
  if (id == orderId || !id) {
    return next();
  }
  next({
    status: 400,
    message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
  });
}

function statusCheck(req, res, next) {
  const { data: { status } = {} } = req.body;
  if (
    status === "pending" ||
    status === "preparing" ||
    status === "out-for-delivery"
  ) {
    return next();
  } else if (status === "delivered") {
    return next({
      status: 400,
      message: `A delivered order cannot be changed`,
    });
  } else {
    next({
      status: 400,
      message: `Order must have a status of pending, preparing, out-for-delivery, delivered`,
    });
  }
}

function pendingCheck(req, res, next) {
  if (res.locals.order.status !== "pending") {
    return next({
      status: 400,
      message: `An order cannot be deleted unless it is pending`,
    });
  }
  next();
}

function read(req, res, next) {
  res.json({ data: res.locals.order });
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(), // Use nextId function to produce newest id
    deliverTo: deliverTo,
    mobileNumber: mobileNumber,
    dishes: dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function update(req, res) {
  const order = res.locals.order;
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  // update the order
  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.dishes = dishes;
  res.json({ data: order });
}

function destroy(req, res) {
  const orderId = res.locals.order;
  const index = orders.findIndex((order) => order.id === Number(orderId));
  const deletedOrders = orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    dishesCheck,
    dishQuantityCheck,
    create,
  ],
  list,
  read: [orderExists, read],
  update: [
    orderExists,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    dishesCheck,
    dishQuantityCheck,
    orderIdMatch,
    statusCheck,
    update,
  ],
  delete: [orderExists, pendingCheck, destroy],
};
