/**
 * A higher-order function that wraps async route handlers to catch errors.
 * @param {*} fn - The async function to wrap
 * @returns {Function} - The wrapped function
 */
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
