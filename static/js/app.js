const form = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const submitButton = document.getElementById("submitButton");
const statusBox = document.getElementById("status");
const resultCard = document.getElementById("resultCard");

const placeName = document.getElementById("placeName");
const placeMeta = document.getElementById("placeMeta");
const tempValue = document.getElementById("tempValue");
const conditionText = document.getElementById("conditionText");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("windSpeed");
const recordedAt = document.getElementById("recordedAt");
const timezone = document.getElementById("timezone");

const chips = Array.from(document.querySelectorAll(".chip"));

function setStatus(message, kind) {
    statusBox.textContent = message;
    statusBox.classList.remove("info", "success", "error");
    statusBox.classList.add(kind);
}

function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? "Checking..." : "Check Weather";
}

function normalizeNumber(value, digits = 0) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "--";
    }
    return value.toFixed(digits);
}

function renderWeather(data) {
    const locationLine = [data.location.region, data.location.country]
        .filter(Boolean)
        .join(", ");

    placeName.textContent = data.location.name || "Unknown location";
    placeMeta.textContent = `${locationLine} | ${normalizeNumber(data.location.latitude, 2)}, ${normalizeNumber(data.location.longitude, 2)}`;

    tempValue.textContent = `${normalizeNumber(data.current.temperature, 1)}${data.units.temperature}`;
    conditionText.textContent = data.current.condition || "Unknown";
    feelsLike.textContent = `${normalizeNumber(data.current.apparent_temperature, 1)}${data.units.temperature}`;
    humidity.textContent = `${normalizeNumber(data.current.humidity)}${data.units.humidity}`;
    windSpeed.textContent = `${normalizeNumber(data.current.wind_speed, 1)} ${data.units.wind_speed}`;

    recordedAt.textContent = data.current.recorded_at
        ? `Recorded: ${data.current.recorded_at.replace("T", " ")}`
        : "Recorded time unavailable";

    timezone.textContent = data.timezone ? `Timezone: ${data.timezone}` : "Timezone unavailable";

    resultCard.classList.toggle("night", !data.current.is_day);
    resultCard.classList.remove("hidden");
}

async function queryWeather(city) {
    if (!city.trim()) {
        setStatus("Please enter a city name.", "error");
        resultCard.classList.add("hidden");
        return;
    }

    try {
        setLoading(true);
        setStatus("Fetching current weather...", "info");

        const response = await fetch(`/api/weather?city=${encodeURIComponent(city.trim())}`);
        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.error || "Could not fetch weather right now.");
        }

        renderWeather(payload);
        setStatus(`Weather loaded for ${payload.location.name}.`, "success");
    } catch (error) {
        setStatus(error.message || "Unexpected error while loading weather.", "error");
        resultCard.classList.add("hidden");
    } finally {
        setLoading(false);
    }
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    queryWeather(cityInput.value);
});

chips.forEach((chip) => {
    chip.addEventListener("click", () => {
        const city = chip.getAttribute("data-city") || "";
        cityInput.value = city;
        queryWeather(city);
    });
});

setStatus("Search for a Nepal city to see live weather details.", "info");
