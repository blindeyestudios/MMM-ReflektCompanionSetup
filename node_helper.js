const NodeHelper = require("node_helper");
const { exec } = require("child_process");
const path = require("path");

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-ReflektCompanionSetup] Node helper started.");

    const setupScript = path.join(__dirname, "scripts", "setup_ap.sh");
    exec(`bash ${setupScript}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`[MMM-ReflektCompanionSetup] Setup error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`[MMM-ReflektCompanionSetup] Setup stderr: ${stderr}`);
      }
      console.log(`[MMM-ReflektCompanionSetup] Setup stdout: ${stdout}`);
    });
  },
});