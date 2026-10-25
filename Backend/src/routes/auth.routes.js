const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const authRouter = Router();

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
authRouter.post("/register", authController.registerUserController);

/**
 * @route POST /api/auth/login
 * @description login user with email and password
 * @access Public
 */
authRouter.post("/login", authController.loginUserController);

/**
 * @route POST /api/auth/2fa-setup
 * @description Setup two-factor authentication for the user
 * @access Private
 */
authRouter.post(
  "/2fa-setup",
  authMiddleware.authUser,
  authController.twoFASetupController,
);

/**
 * @route POST /api/auth/2fa-verify
 * @description verify two-factor authentication for the user
 * @access Private
 */
authRouter.post(
  "/2fa-verify",
  authMiddleware.authUser,
  authController.twoFAVerifyController,
);

/**
 * @route GET /api/auth/logout
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
authRouter.get("/logout", authController.logoutUserController);

/**
 * @route GET /api/auth/logout-all
 * @description clear token from user cookie and add the token in blacklist and also revoke all the sessions of the user
 * @access public
 */
authRouter.get("/logout-all", authController.logoutAllUserController);

/**
 * @route GET /api/auth/get-me
 * @description get the current logged in user details
 * @access private
 */
authRouter.get(
  "/get-me",
  authMiddleware.authUser,
  authController.getMeController,
);

/**
 * @rouete GET /api/auth/refresh-token
 * @description refresh the access token using refresh token
 * @access public
 */
authRouter.get("/refresh-token", authController.refreshTokenController);

module.exports = authRouter;
