const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const xss = require("xss-clean");
const hpp = require("hpp");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./middlewares/errorhamdling.middleware");

const app = express();

/**
 * Security Middlewares
 * These middlewares help to secure the application by setting various HTTP headers, preventing XSS attacks, and protecting against HTTP parameter pollution.
 */
// Helmet helps to secure Express apps by setting various HTTP headers.
app.use(helmet()); // Set security HTTP headers

// XSS-clean is a middleware that sanitizes user input to prevent cross-site scripting (XSS) attacks.
app.use(xss()); // Data sanitization against XSS

// HPP (HTTP Parameter Pollution) middleware protects against HTTP parameter pollution attacks by removing duplicate query parameters.
app.use(hpp()); // Prevent HTTP Parameter Pollution

/**
 * Other Middlewares
 * These middlewares handle JSON parsing, logging, cookie parsing, and CORS configuration.
 * They are essential for processing incoming requests and managing cross-origin resource sharing.
 */
app.use(express.json({ limit: "10kb" })); // Body parser, reading data from body into req.body
if (process.env.NODE_ENV === "development") {
  app.use(morgan("combined")); // HTTP request logger middleware for node.js
} else {
  app.use(morgan("combined")); // HTTP request logger middleware for node.js
}
app.use(cookieParser()); // Parse Cookie header and populate req.cookies with an object keyed by the cookie names.
app.use(
  // CORS (Cross-Origin Resource Sharing) middleware allows the server to specify who can access its resources and how they can be accessed.
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // To handle data from cookie we have to give this property
  }),
);

/* require all the routes here */
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

// /* using all the routes here */
app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

/**
 * Handle all unhandled routes
 * This middleware will catch any requests to routes that are not defined in the application.
 * It creates a new AppError with a 404 status code and passes it to the next middleware for handling.
 */
app.all("/*splat", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

/**
 * Global error handling middleware
 * This middleware will catch any errors that occur in the application and send a structured response to the client.
 * It sets the status code and status message based on the error, defaulting to 500 for server errors.
 */
app.use(globalErrorHandler);

module.exports = app;
