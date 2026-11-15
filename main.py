import time
from scapy.all import sniff, IP, TCP, UDP

packet_count = 0

def analyze_packet(packet):
    global packet_count

    if IP in packet:
        packet_count += 1

        source_ip = packet[IP].src
        destination_ip = packet[IP].dst

        if TCP in packet:
            protocol = "TCP"
        elif UDP in packet:
            protocol = "UDP"
        else:
            protocol = "Other"

        print("\n--- Network Packet Detected ---")
        print("Source IP:", source_ip)
        print("Destination IP:", destination_ip)
        print("Protocol:", protocol)
        print("Packet Count:", packet_count)

def start_monitoring():
    print("Real-Time Network Traffic Monitoring Started...")
    print("Monitoring network packets...\n")

    sniff(prn=analyze_packet, store=False)

if __name__ == "__main__":
    start_monitoring()
