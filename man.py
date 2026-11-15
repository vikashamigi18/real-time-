from flask import Flask, render_template, jsonify
from scapy.all import sniff, IP, IPv6, TCP, UDP, ICMP, AsyncSniffer
from collections import deque, Counter
from datetime import datetime
from threading import Lock

app = Flask(__name__)

# Store recent packet metadata
packets = deque(maxlen=500)

# Statistics
stats = {
    "total_packets": 0,
    "total_bytes": 0,
    "protocols": Counter()
}

lock = Lock()
sniffer = None
monitoring = False


def analyze_packet(packet):
    global stats

    source = "Unknown"
    destination = "Unknown"
    protocol = "OTHER"

    if IP in packet:
        source = packet[IP].src
        destination = packet[IP].dst

    elif IPv6 in packet:
        source = packet[IPv6].src
        destination = packet[IPv6].dst

    if TCP in packet:
        protocol = "TCP"
    elif UDP in packet:
        protocol = "UDP"
    elif ICMP in packet:
        protocol = "ICMP"

    packet_size = len(packet)

    packet_data = {
        "time": datetime.now().strftime("%H:%M:%S"),
        "source": source,
        "destination": destination,
        "protocol": protocol,
        "size": packet_size
    }

    with lock:
        packets.appendleft(packet_data)

        stats["total_packets"] += 1
        stats["total_bytes"] += packet_size
        stats["protocols"][protocol] += 1


def start_monitoring():
    global sniffer, monitoring

    with lock:
        if monitoring:
            return False

        monitoring = True

    try:
        sniffer = AsyncSniffer(
            prn=analyze_packet,
            store=False
        )
        sniffer.start()
        return True

    except Exception as error:
        with lock:
            monitoring = False
        print("Capture error:", error)
        return False


def stop_monitoring():
    global sniffer, monitoring

    with lock:
        if not monitoring:
            return False

        monitoring = False

    try:
        if sniffer and sniffer.running:
            sniffer.stop()
        return True

    except Exception as error:
        print("Stop error:", error)
        return False


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/start", methods=["POST"])
def start():
    success = start_monitoring()

    return jsonify({
        "success": success,
        "monitoring": monitoring
    })


@app.route("/api/stop", methods=["POST"])
def stop():
    stop_monitoring()

    return jsonify({
        "success": True,
        "monitoring": monitoring
    })


@app.route("/api/data")
def get_data():
    with lock:
        packet_list = list(packets)

        protocol_data = dict(stats["protocols"])

        response = {
            "total_packets": stats["total_packets"],
            "total_bytes": stats["total_bytes"],
            "protocols": protocol_data,
            "packets": packet_list,
            "monitoring": monitoring
        }

    return jsonify(response)


if __name__ == "__main__":
    print("Starting Network Traffic Monitoring System...")
    print("Open http://127.0.0.1:5000")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        threaded=True
    )
