# Realtime Replay Safety

Realtime bus tracking should defend against replayed or delayed telemetry. Each update should carry a timestamp, vehicle ID, route ID, sequence marker, and freshness window so clients do not display old positions as live movement.
