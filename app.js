const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");

const errorController = require("./controllers/error");
const sequelize = require("./util/database");
const Product = require("./models/product");
const User = require("./models/user");
const Cart = require("./models/cart");
const CartItem = require("./models/cart-item");
const Order = require("./models/order");
const OrderItem = require("./models/order-item");

const app = express();
const csrfProtection = csrf();

app.set("view engine", "ejs");
app.set("views", "views");

// Import Routing
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const { get } = require("http");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ dest: "images" }).single("image"));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "my scret",
    store: new SequelizeStore({
      db: sequelize,
    }),
    resave: false,
    saveUninitialized: false,
  })
);
app.use(csrfProtection);
app.use(flash());

// CSRF Middleware
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Check SESSION Middleware
app.use((req, res, next) => {
  // throw new Error('Sync error');
  // const sessionUser = User.build({...req.session.user});
  if (req.session.user?.id) {
    User.findByPk(req.session.user.id)
      .then((user) => {
        // throw new Error('Dummy error');
        if (!user) {
          return next();
        }
        req.sessionUser = user;
        next();
      })
      .catch((err) => {
        // console.log('Error Occurred!');
        // throw new Error(err);
        next(new Error(err));
      });
  } else {
    next();
  }
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  // res.redirect('/500');
  res.status(500).render("500", {
    pageTitle: "Error!",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn,
  });
});

Product.belongsTo(User, { constraints: true, onDelete: "CASCADE" });
User.hasMany(Product);
User.hasOne(Cart);
Cart.belongsTo(User);
Cart.belongsToMany(Product, { through: CartItem });
Product.belongsToMany(Cart, { through: CartItem });
Order.belongsTo(User);
User.hasMany(Order);
Order.belongsToMany(Product, { through: OrderItem });

sequelize
  // .sync({force: true})
  .sync()
  .then((result) => {
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
