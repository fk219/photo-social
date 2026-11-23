const express = require("express");
const identifyUser = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimit.middleware");
const {
  registerController,
  loginController,
  getMeController,
  logoutController,
} = require("../controllers/auth.controller");

const authRouter = express.Router();

authRouter.use(authLimiter);

authRouter.post("/register", registerController);
authRouter.post("/login", loginController);
authRouter.get("/get-me", identifyUser, getMeController);
authRouter.post("/logout", logoutController);

module.exports = authRouter;
