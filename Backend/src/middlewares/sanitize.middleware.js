/**
 * Sanitize an object by removing keys that start with '$' or contain '.' to prevent NoSQL injection attacks.
 * This function recursively sanitizes nested objects as well.
 * @param {object} obj
 * @returns {object}
 */
const sanitize = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  for (const key of Object.keys(obj)) {
    // Remove keys starting with $ or containing .
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }
    if (typeof obj[key] === "object") {
      sanitize(obj[key]);
    }
  }
  return obj;
};

/**
 * Middleware to sanitize MongoDB query parameters and request bodies.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 */
module.exports = (req, res, next) => {
  //   console.log("data: ", req.body, req.params, req.query);
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  if (req.query) sanitize(req.query); // mutates in place, no reassignment

  next();
};
