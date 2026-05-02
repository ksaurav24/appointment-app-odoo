export const APP_NAME = "BookEase";
export const DEMO_OTP = "123456";

// Central route constants prevent hardcoded path typos in components.
export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  otpVerification: "/otp-verification",
  signupRole: "/signup-role",
} as const;
