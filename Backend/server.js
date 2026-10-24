require("dotenv").config();

/**
 * Handle uncaught exceptions
 * This event is emitted when an uncaught JavaScript exception bubbles all the way back to the event loop.
 * It logs the error and shuts down the server gracefully.
 */
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);

  process.exit(1);
});

const app = require("./src/app");
const connectToDB = require("./src/config/database");

connectToDB();

const server = app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

/**
 * Handle unhandled promise rejections
 * This event is emitted when a Promise is rejected and no error handler is attached.
 * It logs the error and shuts down the server gracefully.
 */
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);

  process.exit(1);
});
