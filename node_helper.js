const NodeHelper = require("node_helper");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");

module.exports = NodeHelper.create({
  start: function () {
    console.log("[MMM-ReflektCompanionSetup] Node helper started.");

    // Setup Express app
    const PORT = 3000;
    this.app = express();
    this.app.use(bodyParser.json());
    

    /****************************
    * SERVER ENDPOINTS
    ******************************/
    // GET endpoint to fetch config
    this.app.get("/api/config", (req, res) => {
      console.log("GET /api/config hit");
      getMagicMirrorConfig(res);
    });
    // POST endpoint to update config
    this.app.post("/api/config", (req, res) => {
      console.log("POST /api/config hit");
      console.log("Received config:", req.body);
      updateMagicMirrorConfig(req, res);
    });
    // GET endpoint for the wifi settings
    this.app.get("/api/wifi", (req, res) => {
      console.log("GET /api/wifi hit");
      getWifiSettings(res);
    });
    // POST endpoint for setting wifi network and password
    this.app.post("/api/wifi", (req, res) => {
      console.log("POST /api/wifi hit");
      updateWifiSettings(req, res);
    });

    // Start server on port 3000
    this.server = this.app.listen(PORT, () => {
      console.log("MMM-ReflektCompanionSetup API listening on port 3000");
    });


    /******************************
    * Turn on the WiFi Access Point
    ******************************/
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

  /**
   * Closes the express server
   */
  stop: function () {
    if (this.server) {
      this.server.close();
    }
  },

  /**
   * Returns the config file for the Magic Mirror as a JSON
   * @param {*} res 
   */
  getMagicMirrorConfig: function (res) {
    const configPath = path.resolve(__dirname, "../../config/config.js");

    fs.readFile(configPath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading config:", err);
        return res.status(500).json({ error: "Unable to read config file" });
      }

      try {
        const sandbox = {};
        const vm = require("vm");
        const script = new vm.Script(data);
        const context = new vm.createContext(sandbox);
        script.runInContext(context);

        const exported = sandbox.module?.exports;
        if (exported) {
          res.json(exported);
        } else {
          throw new Error("Could not extract config");
        }
      } catch (parseErr) {
        console.error("Error parsing config: ", parseErr);
        res.status(500).json({ error: "Failed to parse config file" });
      }
    });
  },

  /**
   * Replaces the existing Magic Mirror config file with the new one
   * @param {*} req 
   * @param {*} res 
   */
  updateMagicMirrorConfig: function (req, res) {
    const newConfig = req.body;
    const configPath = path.join(__dirname, "..", "..", "config", "config.js");

    // Make a backup of the config file
    fs.copyFile(configPath, configPath + ".bak", (err) => {
      if (err) console.warn("Could not back up config.js:", err);
    });

    // Convert the config object into a valid JS file (it must export the config)
    const configJs = `/* MagicMirror Config Auto-Generated */
    let config = ${JSON.stringify(newConfig, null, 2)};
    
    if (typeof module !== "undefined") module.exports = config;
    `;

    fs.writeFile(configPath, configJs, { encoding: "utf8", mode: 0o600 }, (err) => {
      if (err) {
        console.error("Failed to write config.js:", err);
        return res.status(500).json({ message: "Failed to write config.js" });
      }

      console.log("config.js successfully updated.");
      // Restart MagicMirror via pm2
      exec("pm2 restart mm", (error, stdout, stderr) => {
        if (error) {
          console.error("Failed to restart MagicMirror:", stderr);
          return res.status(500).json({ message: "Config updated, but restart failed." });
        }

        console.log("MagicMirror restarted.");
        res.status(200).json({ message: "Config updated and MagicMirror restarted!" });
      });
    });
  },

  /**
   * Retreives the wifi settings
   * @param {*} res 
   */
  getWifiSettings: function (res) {
    exec("iwgetid -r", (err, stdout, stderr) => {
      const isConnected = stdout.trim().length > 0;
      const currentSSID = stdout.trim();

      exec("nmcli connection show", (err2, savedOutput) => {
        const savedConnections = savedOutput.split("\n").slice(1).map((line) => line.split(/\s{2,}/)[0]).filter(Boolean);
        res.json({
          connected: isConnected,
          currentSSID: currentSSID || null,
          savedNetworks: savedConnections || [],
        });
      });
    });
  },

  /**
   * Updates the wifi settings with the supplied ones
   * @param {*} req 
   * @param {*} res 
   * @returns 
   */
  updateWifiSettings: function (req, res) {
    const { ssid, password } = req.body;

    if (!ssid || !password) {
      return res.status(400).json({ error: "Missing SSID or password" });
    }

    const wpaConfPath = '/etc/wpa_supplicant/wpa_supplicant.conf';
    const newNetworkBlock = `
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=US

network={
  ssid="${ssid}"
  psk="${password}"
}
`;

    // Overwrite the config file with the new one
    fs.writeFile(wpaConfPath, newNetworkBlock, { mode: 0o600 }, (err) => {
      if (err) {
        console.error('Error writing to wpa_supplicant.conf:', err);
        return res.status(500).json({ message: 'Failed to update WiFi configuration.' });
      }

      // Reload the network config
      exec('wpa_cli -i wlan0 reconfigure', (error, stdout, stderr) => {
        if (error) {
          console.error('Error reconfiguring WiFi:', stderr);
          return res.status(500).json({ message: 'Failed to apply WiFi configuration.' });
        }

        console.log('WiFi reconfiguration triggered.');
        res.json({ message: 'WiFi config updated successfully. Attempting to connect...' });
      });
    });
  }
});