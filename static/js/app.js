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
const localClock = document.getElementById("localClock");
const localDate = document.getElementById("localDate");
const locationClock = document.getElementById("locationClock");
const locationDate = document.getElementById("locationDate");
const locationClockLabel = document.getElementById("locationClockLabel");
const conditionSummary = document.getElementById("conditionSummary");
const syncStatus = document.getElementById("syncStatus");

const chips = Array.from(document.querySelectorAll(".chip"));

const localTimeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
});
const localDateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
});

let locationTimeFormatter = null;
let locationDateFormatter = null;
let clockTimer = null;

function setStatus(message, kind) {
    statusBox.textContent = message;
    statusBox.classList.remove("info", "success", "error");
    statusBox.classList.add(kind);
}

function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? "Checking..." : "Check Weather";
    if (syncStatus) {
        if (isLoading) {
            syncStatus.textContent = "Syncing...";
        }
    }
}

function normalizeNumber(value, digits = 0) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "--";
    }
    return value.toFixed(digits);
}

function formatWith(formatter, date) {
    if (!formatter) {
        return "--";
    }
    try {
        return formatter.format(date);
    } catch (error) {
        return "--";
    }
}

function updateClocks() {
    const now = new Date();
    if (localClock) {
        localClock.textContent = formatWith(localTimeFormatter, now);
    }
    if (localDate) {
        localDate.textContent = formatWith(localDateFormatter, now);
    }
    if (locationClock) {
        locationClock.textContent = locationTimeFormatter
            ? formatWith(locationTimeFormatter, now)
            : "--:--:--";
    }
    if (locationDate) {
        locationDate.textContent = locationDateFormatter
            ? formatWith(locationDateFormatter, now)
            : "Search a city";
    }
}

function setLocationTimeZone(timeZone, cityName) {
    locationTimeFormatter = null;
    locationDateFormatter = null;

    if (locationClockLabel) {
        locationClockLabel.textContent = cityName ? `City time (${cityName})` : "City time";
    }

    if (!timeZone) {
        updateClocks();
        return;
    }

    try {
        locationTimeFormatter = new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone,
        });
        locationDateFormatter = new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            month: "short",
            day: "2-digit",
            timeZone,
        });
    } catch (error) {
        locationTimeFormatter = null;
        locationDateFormatter = null;
    }

    updateClocks();
}

function startClock() {
    updateClocks();
    if (!clockTimer) {
        clockTimer = setInterval(updateClocks, 1000);
    }
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

    const temperatureUnit = data.units.temperature || "C";
    const humidityUnit = data.units.humidity || "%";
    const windUnit = data.units.wind_speed || "km/h";
    const summaryPieces = [
        data.current.condition || "Unknown conditions",
        `Feels like ${normalizeNumber(data.current.apparent_temperature, 1)}${temperatureUnit}`,
        `Humidity ${normalizeNumber(data.current.humidity)}${humidityUnit}`,
        `Wind ${normalizeNumber(data.current.wind_speed, 1)} ${windUnit}`,
    ];
    if (conditionSummary) {
        conditionSummary.textContent = summaryPieces.join(" | ");
    }

    if (syncStatus) {
        syncStatus.textContent = `Synced ${formatWith(localTimeFormatter, new Date())}`;
    }

    setLocationTimeZone(data.timezone, data.location.name);
    document.body.classList.toggle("is-night", !data.current.is_day);

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
        if (syncStatus) {
            syncStatus.textContent = "Sync failed";
        }
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

startClock();
setStatus("Search for a Nepal city to see live weather details.", "info");
