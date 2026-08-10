# ETA Validation for Bus Tracking

ETA services should reject impossible coordinates, stale telemetry, negative durations, and route mismatches before broadcasting updates. A validation layer protects both rider-facing estimates and downstream analytics from noisy GPS payloads or malformed ingestion events.
