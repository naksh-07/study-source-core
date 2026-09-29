// vitest.setup.js
// Allows legacy standalone scripts that call process.exit(0) upon success to complete cleanly in Vitest

const originalExit = process.exit;
process.exit = (code) => {
  if (code === 0 || code === undefined) {
    // Graceful exit for standalone test scripts
    return;
  }
  originalExit(code);
};
