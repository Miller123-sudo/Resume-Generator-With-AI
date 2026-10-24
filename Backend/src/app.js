const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./middlewares/errorhamdling.middleware");

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
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
