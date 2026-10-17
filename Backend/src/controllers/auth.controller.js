const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const TokenBlacklistModel = require("../models/blacklist.model");
const UserModel = require("../models/user.model");
const { default: SessionModel } = require("../models/session.model");

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

    const accessToken = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
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
async function loginUserController(req, res) {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });

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
      { id: user._id, username: user.username },
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
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      accessToken,
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ error: error });
  }
}

/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
async function logoutUserController(req, res) {
  try {
    const token = req.cookies.token;

    if (token) {
      await TokenBlacklistModel.create({ token });
    }

    res.clearCookie("token");

    res.status(200).json({
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error("Error logging out user:", error);
    res.status(500).json({ error: error });
  }
}

/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access private
 */
async function getMeController(req, res) {
  const user = await UserModel.findById(req.user.id);

  res.status(200).json({
    message: "User details fetched successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
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

    const accessToken = jwt.sign(
      { id: decoded.id, username: decoded.username },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const newRefreshToken = jwt.sign(
      { id: decoded.id, username: decoded.username },
      process.env.JWT_REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
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

module.exports = {
  registerUserController,
  loginUserController,
  getMeController,
  logoutUserController,
  refreshTokenController,
};
