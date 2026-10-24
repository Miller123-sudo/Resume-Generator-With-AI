const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const sendErrorForDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorForProd = (err, res) => {
  // Todo - In production, you might want to log the error to a file or an error tracking service

  if (err.isOperational) {
    // Operational, trusted error: send message to client

    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // For programming or other unknown errors, don't leak error details to client

    console.error("ERROR 💥", err);
    return res.status(500).json({
      status: "error",
      message: "Something went very wrong(non operational error)!",
      error: err,
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorForDev(err, res);
  } else {
    let error = { ...err };

    if (err.name === "CastError") error = handleCastErrorDB(error);

    sendErrorForProd(error, res);
  }
};
