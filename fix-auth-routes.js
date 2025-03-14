const fs = require('fs');
const path = require('path');

console.log('Fixing auth.routes.js...');

// Path to auth.routes.js
const authRoutesPath = path.join(__dirname, 'services', 'user-service', 'src', 'routes', 'auth.routes.js');

// Read the file
let content = fs.readFileSync(authRoutesPath, 'utf8');

// Replace the verifyMFA route
const oldRoute = `router.post(
  '/verify-mfa',
  authenticate,
  [
    body('token').notEmpty().withMessage('MFA token is required'),
  ],
  validate,
  authController.verifyMFA
);`;

const newRoute = `router.post(
  '/verify-mfa',
  authenticate,
  authController.verifyMFA
);`;

content = content.replace(oldRoute, newRoute);

// Write the file
fs.writeFileSync(authRoutesPath, content, 'utf8');

console.log('auth.routes.js fixed successfully!');

// Now let's fix the setupMFA route
console.log('Fixing setupMFA route...');

// Replace the setupMFA route
const oldSetupRoute = `router.post(
  '/setup-mfa',
  authenticate,
  authController.setupMFA
);`;

const newSetupRoute = `router.post(
  '/setup-mfa',
  authenticate,
  authController.setupMFA
);`;

content = content.replace(oldSetupRoute, newSetupRoute);

// Write the file
fs.writeFileSync(authRoutesPath, content, 'utf8');

console.log('setupMFA route fixed successfully!');

// Now let's check if the auth.controller.js file has the correct exports
console.log('Checking auth.controller.js...');

// Path to auth.controller.js
const authControllerPath = path.join(__dirname, 'services', 'user-service', 'src', 'controllers', 'auth.controller.js');

// Read the file
let controllerContent = fs.readFileSync(authControllerPath, 'utf8');

// Check if the exports include setupMFA and verifyMFA
if (!controllerContent.includes('setupMFA,') || !controllerContent.includes('verifyMFA,')) {
  console.log('Fixing auth.controller.js exports...');
  
  // Replace the exports
  const oldExports = `module.exports = {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  verifyResetToken,
  setupMFA,
  verifyMFA,
  loginWithMFA
};`;

  const newExports = `module.exports = {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  verifyResetToken,
  setupMFA,
  verifyMFA,
  loginWithMFA
};`;

  controllerContent = controllerContent.replace(oldExports, newExports);
  
  // Write the file
  fs.writeFileSync(authControllerPath, controllerContent, 'utf8');
  
  console.log('auth.controller.js exports fixed successfully!');
} else {
  console.log('auth.controller.js exports are correct.');
}

console.log('All fixes applied successfully!'); 