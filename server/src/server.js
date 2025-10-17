// server.js
const { PORT } = require("./config/env");
const app = require("./app");
const os = require("os");

// Temukan IP LAN server otomatis
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
        iface.family === "IPv4" &&
        !iface.internal &&
        iface.address.startsWith("192.168.")
      ) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

const host = getLocalIP();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] running at:`);
  console.log(`- Local:     http://localhost:${PORT}`);
  console.log(`- Network:   http://${host}:${PORT}`);
});
