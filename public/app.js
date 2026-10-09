async function updateBattery() {
    const response = await fetch("/api/battery");
    const data = await response.json();

    document.querySelector("#battery").textContent =
        `${data.percentage}%`;

    document.querySelector("#status").textContent =
        data.status;
} 


async function updateHealth() {
    try {
        const response = await fetch("/api/health");
        const data = await response.json();

        updateService("pihole-status", data.pihole);
        updateService("samba-status", data.samba);
        updateService("tailscale-status", data.tailscale);
    } catch (error) {
        console.error("Health check failed:", error);
    }
}

function updateService(elementId, online) {
    const element = document.querySelector(`#${elementId}`);

    element.textContent = online ? "ONLINE" : "OFFLINE";

    element.classList.remove("online", "offline");
    element.classList.add(online ? "online" : "offline");
}

updateHealth();

setInterval(updateHealth, 5000);

updateBattery();

setInterval(updateBattery, 5000);
