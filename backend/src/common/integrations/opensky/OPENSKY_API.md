# OpenSky Network API Reference

This document provides a technical summary of the OpenSky Network REST API integration, mapping the raw API structures to the project's internal types and logic.

## 1. Connectivity & Authentication

The integration uses the OpenSky Network REST API with OAuth2 Client Credentials authentication (as implemented in `OpenSkyClient`).

- **Auth URL:** `https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token`
- **Base API URL:** `https://opensky-network.org/api`
- **Method:** OAuth2 `client_credentials` grant.
- **Token Refresh:** Tokens are cached and refreshed 30 seconds before expiration.

## 2. Core Endpoints

### 2.1 State Vectors (`/states/all`)
Retrieves the current state vectors (live position and status) for aircraft.
- **Method:** `GET`
- **Parameters:**
  - `lamin`, `lomin`, `lamax`, `lomax`: Bounding box for spatial filtering.
  - `icao24`: Filter by one or more ICAO 24-bit addresses.
- **Response:** `OpenSkyStateVectorsResponse` containing an array of `StateVectorTuple`.

### 2.2 Flights (`/flights/arrival`, `/flights/departure`, `/flights/aircraft`)
Retrieves historical flight data. Note: Flights are updated via a batch process at night; data for the current day is generally unavailable.
- **Method:** `GET`
- **Parameters:**
  - `airport` (ICAO code) or `icao24` (Aircraft).
  - `begin`, `end`: Unix timestamps (seconds).
- **Response:** Array of `OpenSkyFlight` objects.

### 2.3 Tracks (`/tracks/all`)
Retrieves the trajectory (path) of a specific aircraft.
- **Method:** `GET`
- **Parameters:**
  - `icao24`: Aircraft address.
  - `time`: Unix timestamp (optional, defaults to latest).
- **Response:** `OpenSkyTrackResponse` containing an array of `TrackPathTuple`.

---

## 3. Data Structure Mappings (Tuples)

OpenSky uses positional arrays (tuples) for performance. These are mapped in `types.ts`.

### 3.1 State Vector Tuple (`StateVectorTuple`)
| Index | Field             | Type               | Description                               |
|:------|:------------------|:-------------------|:------------------------------------------|
| 0     | `icao24`          | `string`           | Unique ICAO 24-bit address (hex).         |
| 1     | `callsign`        | `string \| null`   | 8-character callsign.                     |
| 2     | `origin_country`  | `string`           | Country of origin.                        |
| 3     | `time_position`   | `number \| null`   | Last position update (Unix seconds).      |
| 4     | `last_contact`    | `number`           | Last update in general (Unix seconds).    |
| 5     | `longitude`       | `number \| null`   | WGS-84 longitude (decimal degrees).       |
| 6     | `latitude`        | `number \| null`   | WGS-84 latitude (decimal degrees).        |
| 7     | `baro_altitude`   | `number \| null`   | Barometric altitude (meters).             |
| 8     | `on_ground`       | `boolean`          | True if aircraft is on ground.            |
| 9     | `velocity`        | `number \| null`   | Velocity over ground (m/s).               |
| 10    | `true_track`      | `number \| null`   | True track (decimal degrees, 0° = North). |
| 11    | `vertical_rate`   | `number \| null`   | Vertical rate (m/s, positive = climb).    |
| 12    | `sensors`         | `number[] \| null` | IDs of contributing receivers.            |
| 13    | `geo_altitude`    | `number \| null`   | Geometric altitude (meters).              |
| 14    | `squawk`          | `string \| null`   | Transponder code (Squawk).                |
| 15    | `spi`             | `boolean`          | Special Purpose Indicator flag.           |
| 16    | `position_source` | `number`           | Source (0=ADS-B, 1=Asterix, 2=MLAT).      |
| 17    | `category`        | `number`           | Aircraft category (0-20).                 |

### 3.2 Track Path Tuple (`TrackPathTuple`)
| Index | Field           | Type             | Description                  |
|:------|:----------------|:-----------------|:-----------------------------|
| 0     | `time`          | `number`         | Unix timestamp.              |
| 1     | `latitude`      | `number \| null` | Latitude (decimal degrees).  |
| 2     | `longitude`     | `number \| null` | Longitude (decimal degrees). |
| 3     | `baro_altitude` | `number \| null` | Altitude (meters).           |
| 4     | `true_track`    | `number \| null` | Heading (decimal degrees).   |
| 5     | `on_ground`     | `boolean`        | Ground status.               |

---

## 4. Operational Constraints & Rate Limits

- **Credit System:** OpenSky uses a credit-based system. Registered users have ~1000 requests/day.
- **Resolution:**
  - **Anonymous:** 10s data resolution.
  - **Registered:** 5s data resolution.
- **Obsolescence:** State vectors expire after 15 seconds if no update is received.
- **Batch Processing:** Flights are processed nightly; do not use for real-time arrival/departure monitoring. Use `/states/all` for real-time tracking instead.
- **Units:** All altitudes and rates are in **Meters** (standard aviation often uses feet; conversion may be necessary for display).
