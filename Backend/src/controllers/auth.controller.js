const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateSecret, verify, generateURI } = require("otplib");

const TokenBlacklistModel = require("../models/blacklist.model");
const UserModel = require("../models/user.model");
const { default: SessionModel } = require("../models/session.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

/**
 * @route POST /api/auth/register
 * @description Register a new user. it expects username, email and password in the request body. it will create a new user in
 * the database and return the user details in the response.
 * @access Public
 */
const registerUserController = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const isAlreadyExists = await UserModel.findOne({
      $or: [{ username }, { email }],
    });
    if (isAlreadyExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      username,
      email,
      password: hashPassword,
    });

    // const token = jwt.sign(
    //   { id: user._id, username: user.username },
    //   process.env.JWT_SECRET,
    //   { expiresIn: "1d" },
    // );

    // res.cookie("token", token);

    const refreshToken = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const session = await SessionModel.create({
      user: user._id,
      refreshTokenHash,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const accessToken = jwt.sign(
      { id: user._id, username: user.username, sessionId: session._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // To prevent client-side JavaScript from accessing the cookie
      secure: true, // Set to true if using HTTPS
      sameSite: "strict", // To prevent CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      // token,
      accessToken,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: error });
  }
};

/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
 */
const loginUserController = catchAsync(async (req, res) => {
  // try {
  const { email, password, twoFactorCode } = req.body;

  const user = await UserModel.findOne({ email }).select("-__v");

  if (!user) {
    return res.status(400).json({
      message: "Invalid email or password",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({
      message: "Invalid email or password",
    });
  }

  if (user.twoFactorEnabled) {
    if (!twoFactorCode || typeof twoFactorCode !== "string")
      return next(
        new AppError("Two-factor authentication code is required", 400),
      );

    if (!user.twoFactorSecret)
      return next(
        new AppError(
          "Two-factor authentication is not set up or misconfigured for this user!",
          400,
        ),
      );

    // Todo: Verify the provided two-factor authentication code using otplib
  }

  const refreshToken = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" },
  );

  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  const session = await SessionModel.create({
    user: user._id,
    refreshTokenHash,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  const accessToken = jwt.sign(
    { id: user._id, username: user.username, sessionId: session._id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

  // res.cookie("token", token);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, // To prevent client-side JavaScript from accessing the cookie
    secure: true, // Set to true if using HTTPS
    sameSite: "strict", // To prevent CSRF attacks
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json({
    message: "User loggedIn successfully.",
    // user: {
    //   id: user._id,
    //   username: user.username,
    //   email: user.email,
    // },
    user,
    accessToken,
  });
  // } catch (error) {
  //   console.error("Error logging in user:", error);
  //   res.status(500).json({ error: error });
  // }
});

/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist and also revoke the session of the user
 * @access public
 */
async function logoutUserController(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token not provided" });
    }

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const session = await SessionModel.findOne({
      refreshTokenHash,
      revoked: false,
    });

    if (!session) {
      return res.status(400).json({ message: "Invalid refresh token" });
    }

    session.revoked = true;
    await session.save();

    await TokenBlacklistModel.create({ refreshToken });

    res.clearCookie("refreshToken ");

    res.status(200).json({
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error("Error logging out user:", error);
    res.status(500).json({ message: "Error logging out user" });
  }
}

/**
 * @name logoutAllUserController
 * @description clear token from user cookie and add the token in blacklist and also revoke all the sessions of the user
 * @access public
 */
async function logoutAllUserController(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token not provided" });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET,
    );

    const session = await SessionModel.updateMany(
      {
        user: decoded.id,
        revoked: false,
      },
      { revoked: true },
    );

    res.clearCookie("refreshToken ");

    res.status(200).json({
      message: "User logged out from all devices successfully",
    });
  } catch (error) {
    console.error("Error logging out user from all devices:", error);

    res
      .status(500)
      .json({ message: "Error logging out user from all devices" });
  }
}

/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access private
 */
async function getMeController(req, res) {
  try {
    const user = await UserModel.findById(req.user.id);

    res.status(200).json({
      message: "User details fetched successfully",
      // user: {
      //   id: user._id,
      //   username: user.username,
      //   email: user.email,
      // },
      user,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Error fetching user details" });
  }
}

/**
 * @name refreshTokenController
 * @description refresh the access token using refresh token
 * @access public
 */
const refreshTokenController = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not provided" });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET,
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const session = await SessionModel.findOne({
      refreshTokenHash,
      revoked: false,
    });

    if (!session) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newRefreshToken = jwt.sign(
      { id: decoded.id, username: decoded.username },
      process.env.JWT_REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );

    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    session.refreshTokenHash = newRefreshTokenHash;
    await session.save();

    const accessToken = jwt.sign(
      { id: decoded.id, username: decoded.username, sessionId: session._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: "Access token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(401).json({ error: "Invalid refresh token" });
  }
};

/**
 * @name twoFASetupController
 * @description Setup two-factor authentication for the user. it will generate a secret and otpauth url for the user to scan and setup 2FA.
 * @access private
 */
const twoFASetupController = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("User not authenticated", 401));
  }

  const user = await UserModel.findById(req.user.id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const secret = generateSecret(); // Generate a unique secret for the user. This secret will be used to generate time-based one-time passwords (TOTPs) for two-factor authentication.
  const issuer = "interview-ai"; // Replace with your application name.
  const otpauthUrl = generateURI({
    issuer,
    label: user.email,
    secret,
  }); // Generate the otpauth URL for QR code generation

  user.twoFactorSecret = secret; // Store the secret in the user's record in the database
  user.twoFactorEnabled = false; // Set to true after user verifies the 2FA code
  await user.save();

  return res.status(200).json({
    message: "Two-factor authentication setup initiated",
    otpauthUrl, // Send the otpauth URL to the client for QR code generation
    secret, // Optionally send the secret to the client for manual entry
  });
});

/**
 * @name twoFAVerifyController
 * @description Verify two-factor authentication for the user. it will verify the code with a secret.
 * @access private
 */
const twoFAVerifyController = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("User not authenticated", 401));
  }

  const user = await UserModel.findById(req.user.id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const { toFACode } = req.body;
  if (!toFACode) {
    return next(new AppError("TwoFACode not found!", 404));
  }
  console.log("user: ", user.twoFactorSecret);
  console.log("toFACode: ", toFACode);

  if (!user.twoFactorSecret)
    return next(
      new AppError(
        "You don't have 2FA setup done yet! please do it first.",
        400,
      ),
    );

  const isValidTwoFACode = await verify({
    secret: user.twoFactorSecret,
    token: toFACode,
  });
  if (!isValidTwoFACode) return next(new AppError("Invalid 2FA code!", 400));

  user.twoFactorEnabled = true;
  await user.save();

  res.status(200).json({
    message: "2FA successfull.",
    toFactorEnabled: user.toFactorEnabled,
  });
});

module.exports = {
  registerUserController,
  loginUserController,
  getMeController,
  logoutUserController,
  logoutAllUserController,
  refreshTokenController,
  twoFASetupController,
  twoFAVerifyController,
};
