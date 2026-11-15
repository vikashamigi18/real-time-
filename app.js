const API = "/api";

let protocolChart;
let activityChart;

const activityLabels = [];
const activityValues = [];

let lastPacketCount = 0;

const colors = [
    "#38bdf8",
    "#a78bfa",
    "#34d399",
    "#fbbf24",
    "#fb7185"
];


// Format bytes
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024)
        return (bytes / 1024).toFixed(2) + " KB";

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


// Initialize protocol chart
function createProtocolChart() {
    const ctx = document.getElementById("protocolChart");

    protocolChart = new Chart(ctx, {
        type: "doughnut",

        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 8
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#b6c6da",
                        padding: 18
                    }
                }
            }
        }
    });
}


// Initialize activity chart
function createActivityChart() {
    const ctx = document.getElementById("activityChart");

    activityChart = new Chart(ctx, {
        type: "line",

        data: {
            labels: [],
            datasets: [{
                label: "Packets",
                data: [],
                borderColor: "#38bdf8",
                backgroundColor: "rgba(56,189,248,0.12)",
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            scales: {
                x: {
                    ticks: { color: "#8195ae" },
                    grid: { color: "#1c3047" }
                },

                y: {
                    beginAtZero: true,
                    ticks: { color: "#8195ae" },
                    grid: { color: "#1c3047" }
                }
            },

            plugins: {
                legend: {
                    labels: { color: "#b6c6da" }
                }
            }
        }
    });
}


// Update protocol chart
function updateProtocolChart(protocols) {
    const labels = Object.keys(protocols);
    const values = Object.values(protocols);

    protocolChart.data.labels = labels;
    protocolChart.data.datasets[0].data = values;

    protocolChart.update();
}


// Update activity graph
function updateActivityChart(totalPackets) {
    const currentTime = new Date().toLocaleTimeString();

    const newPackets = Math.max(
        0,
        totalPackets - lastPacketCount
    );

    lastPacketCount = totalPackets;

    activityLabels.push(currentTime);
    activityValues.push(newPackets);

    if (activityLabels.length > 20) {
        activityLabels.shift();
        activityValues.shift();
    }

    activityChart.data.labels = activityLabels;
    activityChart.data.datasets[0].data = activityValues;

    activityChart.update("none");
}


// Update packet table
function updatePacketTable(packets) {
    const table = document.getElementById("packetTable");

    if (!packets.length) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    Waiting for network packets...
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = packets.map(packet => `
        <tr>
            <td>${packet.time}</td>
            <td>${packet.source}</td>
            <td>${packet.destination}</td>
            <td>
                <span class="protocol">
                    ${packet.protocol}
                </span>
            </td>
            <td>${packet.size} bytes</td>
        </tr>
    `).join("");
}


// Update complete dashboard
async function updateDashboard() {
    try {
        const response = await fetch(`${API}/data`);

        if (!response.ok) {
            throw new Error("Unable to fetch dashboard data");
        }

        const data = await response.json();

        document.getElementById("totalPackets").textContent =
            data.total_packets.toLocaleString();

        document.getElementById("totalTraffic").textContent =
            formatBytes(data.total_bytes);

        document.getElementById("protocolCount").textContent =
            Object.keys(data.protocols).length;

        document.getElementById("monitorStatus").textContent =
            data.monitoring ? "Active" : "Offline";

        document.getElementById("monitorStatus").style.color =
            data.monitoring ? "#35d399" : "#ff7185";

        updateProtocolChart(data.protocols);
        updateActivityChart(data.total_packets);
        updatePacketTable(data.packets);

    } catch (error) {
        console.error("Dashboard error:", error);
    }
}


// Start monitoring
document.getElementById("startBtn").addEventListener(
    "click",
    async () => {
        try {
            const response = await fetch(`${API}/start`, {
                method: "POST"
            });

            const data = await response.json();

            if (!data.success) {
                alert("Could not start packet capture. Check permissions.");
            }

            updateDashboard();

        } catch (error) {
            alert("Server connection failed.");
        }
    }
);


// Stop monitoring
document.getElementById("stopBtn").addEventListener(
    "click",
    async () => {
        try {
            await fetch(`${API}/stop`, {
                method: "POST"
            });

            updateDashboard();

        } catch (error) {
            alert("Unable to stop monitoring.");
        }
    }
);


// Initialize
createProtocolChart();
createActivityChart();

updateDashboard();

// Refresh every second
setInterval(updateDashboard, 1000);
