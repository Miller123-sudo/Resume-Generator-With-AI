const QrCode = require("qrcode");

const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const otpAuthUrl = process.argv[2];

if (!otpAuthUrl) return next(new AppError("Pass otpurl as argument!"));

const main = async () => {
  // await QrCode.toDataURL(otpAuthUrl); // Generate QR code as data URL so that send to frontend for display.
  await QrCode.toFile("totp.png", otpAuthUrl);
  console.log("Saved QR code.");
};

main().catch((err) => {
  console.log("err in totp-qr: ", err);
  process.exit(1);
});
