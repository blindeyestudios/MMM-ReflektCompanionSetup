const NodeHelper = require("node_helper");
const { exec } = require("child_process");
const path = require("path");
const bodyParser = require("body-parser");

module.exports = NodeHelper.create({
  start: function () {
    console.log("[MMM-ReflektCompanionSetup] Node helper started.");

    // Setup Express app
    this.app = express();
    this.app.use(bodyParser.json());

    // Dummy config for now
    this.configData = {
      brightness: 75,
      theme: "dark",
      modules: ["clock", "weather"]
    };

    // GET endpoint to fetch config
    this.app.get("/api/config", (req, res) => {
      console.log("GET /api/config hit");
      res.json(this.configData);
    });
    // POST endpoint to update config
    this.app.post("/api/config", (req, res) => {
      console.log("POST /api/config hit");
      console.log("Received config:", req.body);
      this.configData = req.body; // For now, just overwrite
      res.status(200).json({ message: "Config updated!" });
    });

    // Start server on port 3000
    this.server = this.app.listen(3000, () => {
      console.log("MMM-ReflektCompanionSetup API listening on port 3000");
    });


    // Turn on the Access Point
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

  stop: function () {
    if (this.server) {
      this.server.close();
    }
  }
});