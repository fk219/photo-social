const express = require("express");
const identifyUser = require("../middleware/auth.middleware");
const {
  authLimiter,
  accountLimiter,
} = require("../middleware/rateLimit.middleware");
const {
  registerController,
  loginController,
  getMeController,
  logoutController,
  changePasswordController,
  exportAccountController,
  deleteAccountController,
} = require("../controllers/auth.controller");

const authRouter = express.Router();

authRouter.use(authLimiter);

authRouter.post("/register", registerController);
authRouter.post("/login", loginController);
authRouter.get("/get-me", identifyUser, getMeController);
authRouter.post("/logout", logoutController);
authRouter.patch(
  "/password",
  accountLimiter,
  identifyUser,
  changePasswordController
);
authRouter.get(
  "/export",
  accountLimiter,
  identifyUser,
  exportAccountController
);
authRouter.delete(
  "/account",
  accountLimiter,
  identifyUser,
  deleteAccountController
);

module.exports = authRouter;
