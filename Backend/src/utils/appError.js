/**
 * AppError class is a custom error class that extends the built-in Error class.
 * It is used to create operational errors with a specific status code and message.
 * This class is useful for handling errors in a consistent manner throughout the application.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // Call the parent class constructor with the error message

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor); // Capture the stack trace for debugging
  }
}

module.exports = AppError;
