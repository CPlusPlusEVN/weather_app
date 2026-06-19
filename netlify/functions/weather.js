// Netlify Function: proxies WeatherAPI.com so the API key stays server-side.
// Runs on Netlify's default Node 18+ runtime, which provides a global fetch().

exports.handler = async (event) => {
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    };
  
    const city = (event.queryStringParameters?.city || "").trim();
  
    // Empty input
    if (!city) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Please enter a city name." }),
      };
    }
  
    // Misconfiguration guard — key missing from the environment
    const apiKey = process.env.WEATHERAPI_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server is not configured correctly." }),
      };
    }
  
    // forecast.json returns current conditions plus a multi-day forecast.
    // days=7 is requested; WeatherAPI returns up to whatever the plan allows
    // (free tier caps at 3), so the UI adapts to however many come back.
    const url =
      "https://api.weatherapi.com/v1/forecast.json" +
      `?key=${apiKey}` +
      `&q=${encodeURIComponent(city)}` +
      "&days=7&aqi=no&alerts=no";
  
    try {
      const upstream = await fetch(url);
  
      let data = null;
      try { data = await upstream.json(); } catch { /* upstream sent non-JSON */ }
  
      if (!upstream.ok) {
        // WeatherAPI returns HTTP 400 with error.code 1006 for an unknown city.
        // Normalize that to a clean 404 from our own endpoint.
        if (data?.error?.code === 1006) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: `Couldn't find a city called "${city}".` }),
          };
        }
  
        // Any other upstream failure (bad key, rate limit, server error, etc.)
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: "Weather service returned an error. Please try again." }),
        };
      }
  
      const loc = data.location;
      const cur = data.current;

      // Map each forecast day to a compact shape the UI can render directly.
      const forecast = (data.forecast?.forecastday || []).map((d) => ({
        date: d.date,
        maxtemp_c: d.day.maxtemp_c,
        maxtemp_f: d.day.maxtemp_f,
        mintemp_c: d.day.mintemp_c,
        mintemp_f: d.day.mintemp_f,
        condition: d.day.condition.text,
        icon: `https:${d.day.condition.icon}`,
        chance_of_rain: d.day.daily_chance_of_rain,
      }));

      const normalized = {
        name: loc.name,
        region: loc.region,
        country: loc.country,
        temp_c: cur.temp_c,
        temp_f: cur.temp_f,
        condition: cur.condition.text,
        // Icon URL is protocol-relative (//cdn...), so prefix with https:
        icon: `https:${cur.condition.icon}`,
        humidity: cur.humidity,
        wind_kph: cur.wind_kph,
        feelslike_c: cur.feelslike_c,
        feelslike_f: cur.feelslike_f,
        is_day: cur.is_day,
        forecast,
      };
  
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(normalized),
      };
    } catch {
      // Network failure reaching WeatherAPI, DNS, timeout, etc.
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Could not reach the weather service. Check your connection and try again.",
        }),
      };
    }
  };