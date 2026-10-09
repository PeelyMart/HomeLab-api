const express = require("express");
const fs = require("fs");

const app = express();
const PORT = 3000;


app.use(express.json({limit: "32kb"}));


async function sendTelegram(message) {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message
                })
            }
        );

        const data = await response.json();

        if (!data.ok) {
            console.error("Telegram error:", data);
            return false;
        }

        return true;

    } catch (error) {
        console.error("Failed to send Telegram notification:", error);
        return false;
    }
}





app.use(express.static("public"));

const { execFile } = require("child_process");

function serviceStatus(service) {
    return new Promise((resolve) => {
        execFile(
            "systemctl",
            ["is-active", service],
            (error, stdout) => {
                resolve(stdout.trim() === "active");
            }
        );
    });
}




const services = {
    "Pi-hole": "pihole-FTL",
    "Samba": "smbd",
    "Tailscale": "tailscaled"
};

const previousStatus = {};

async function monitorServices() {
    for (const [name, service] of Object.entries(services)) {
        const online = await serviceStatus(service);

        // First check: just record the state
        if (previousStatus[name] === undefined) {
            previousStatus[name] = online;
            continue;
        }

        // State changed
        if (previousStatus[name] !== online) {
            previousStatus[name] = online;

            if (online) {
                await sendTelegram(`🟢 ${name} is back ONLINE`);
            } else {
                await sendTelegram(`🔴 ${name} is OFFLINE`);
            }
        }
    }
} 

setInterval(monitorServices, 30_000);
monitorServices();

app.get("/api/health", async (req, res) => {
    const [pihole, samba, tailscale] = await Promise.all([
        serviceStatus("pihole-FTL"),
        serviceStatus("smbd"),
        serviceStatus("tailscaled")
    ]);

    res.json({
        pihole,
        samba,
        tailscale
    });
});

app.get("/api/battery", (req, res) => {
    try {
        const percentage = Number(
            fs.readFileSync(
                "/sys/class/power_supply/BAT0/capacity",
                "utf8"
            ).trim()
        );

        const status = fs
            .readFileSync(
                "/sys/class/power_supply/BAT0/status",
                "utf8"
            )
            .trim();

        res.json({
            percentage,
            status
        });
    } catch {
        res.status(500).json({
            error: "Unable to read battery"
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
}); 


let collectorProgress = {
  status: "idle",
  collected: 0,
  updatedAt: null
};

app.post("/api/collector/progress", (req, res) => {
  const { status, collected, total } = req.body;

  if (
    !allowedStatuses.includes(status) ||
    !Number.isFinite(collected) ||
    !Number.isFinite(pages)
  ) {
    return res.status(400).json({ error: "Invalid progress payload" });
  } 

  collectorProgress = {
      status,
      collected,
      total: Number.isFinite(total) ? total : null,
      pages,
      run_id: run_id ?? null,
      updated_at: new Date().toISOString(),
    };

    res.json({ success: true });
  });

  app.get("/api/collector/progress", (req, res) => {
    res.json(collectorProgress);

});




