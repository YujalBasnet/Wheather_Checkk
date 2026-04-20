from flask import Flask, jsonify, render_template, request
from flask.typing import ResponseReturnValue
import requests
from requests.exceptions import RequestException

app = Flask(__name__)

WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def get_location(city: str) -> dict | None:
    geocode_url = "https://geocoding-api.open-meteo.com/v1/search"
    response = requests.get(
        geocode_url,
        params={
            "name": city,
            "count": 1,
            "countryCode": "NP",
            "language": "en",
            "format": "json",
        },
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    results = data.get("results")
    if not results:
        return None
    return results[0]


def get_weather(latitude: float, longitude: float) -> tuple[dict, dict, str]:
    weather_url = "https://api.open-meteo.com/v1/forecast"
    response = requests.get(
        weather_url,
        params={
            "latitude": latitude,
            "longitude": longitude,
            "current": (
                "temperature_2m,apparent_temperature,relative_humidity_2m,"
                "wind_speed_10m,weather_code,is_day"
            ),
            "timezone": "auto",
        },
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    return data.get("current", {}), data.get("current_units", {}), data.get("timezone", "")


@app.get("/")
def index() -> str:
    return render_template("index.html")


@app.get("/api/weather")
def weather() -> ResponseReturnValue:
    city = request.args.get("city", "").strip()
    if not city:
        return jsonify({"error": "Please enter a city name."}), 400

    try:
        location = get_location(city)
        if location is None:
            return jsonify({"error": "City not found in Nepal. Try a Nepal city name."}), 404

        if location.get("country_code") != "NP":
            return jsonify({"error": "Only Nepal cities are supported."}), 400

        current, units, timezone = get_weather(location["latitude"], location["longitude"])
        weather_code_raw = current.get("weather_code")
        weather_code = weather_code_raw if isinstance(weather_code_raw, int) else -1

        payload = {
            "location": {
                "name": location.get("name"),
                "country": location.get("country"),
                "region": location.get("admin1"),
                "latitude": location.get("latitude"),
                "longitude": location.get("longitude"),
            },
            "current": {
                "temperature": current.get("temperature_2m"),
                "apparent_temperature": current.get("apparent_temperature"),
                "humidity": current.get("relative_humidity_2m"),
                "wind_speed": current.get("wind_speed_10m"),
                "is_day": bool(current.get("is_day", 1)),
                "condition": WEATHER_CODES.get(weather_code, "Unknown conditions"),
                "recorded_at": current.get("time"),
            },
            "units": {
                "temperature": units.get("temperature_2m", "C"),
                "wind_speed": units.get("wind_speed_10m", "km/h"),
                "humidity": units.get("relative_humidity_2m", "%"),
            },
            "timezone": timezone,
        }
        return jsonify(payload)
    except RequestException:
        return jsonify({"error": "Weather service is unavailable right now. Please retry."}), 502
    except Exception:
        return jsonify({"error": "Unexpected server error. Please try again."}), 500


if __name__ == "__main__":
    app.run(debug=True)
