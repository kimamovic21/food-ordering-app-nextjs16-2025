export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface WeatherData {
  condition: 'clear' | 'rain' | 'snow' | 'storm';
  temperature: number;
  windSpeed: number;
}

export interface FeeBreakdown {
  baseFee: number;
  weatherAdjustment: number;
  totalAdjustment: number;
  totalFee: number;
  weather?: WeatherData;
}

/**
 * Calculate delivery fee based on weather conditions
 * Uses free APIs: Open-Meteo (weather)
 * No API keys required
 */
export async function calculateDeliveryFee(
  deliveryLocation: LocationData,
  baseDeliveryFee: number = 5
): Promise<FeeBreakdown> {
  const weather = await getWeather(deliveryLocation.latitude, deliveryLocation.longitude);

  const weatherAdjustment = calculateWeatherAdjustment(weather);
  const totalAdjustment = weatherAdjustment;

  return {
    baseFee: baseDeliveryFee,
    weatherAdjustment,
    totalAdjustment,
    totalFee: baseDeliveryFee + totalAdjustment,
    weather,
  };
}

/**
 * Calculate weather surcharge based on conditions
 */
function calculateWeatherAdjustment(weather: WeatherData): number {
  let adjustment = 0;

  switch (weather.condition) {
    case 'rain':
      adjustment += 2; // +$2 for rain
      break;
    case 'snow':
      adjustment += 4; // +$4 for snow
      break;
    case 'storm':
      adjustment += 6; // +$6 for storms
      break;
  }

  // Wind speed surcharge (kph)
  if (weather.windSpeed > 30) adjustment += 2;

  return adjustment;
}

/**
 * Fetch weather from Open-Meteo API
 * Free, no API key required, no rate limits
 */
async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m,wind_speed_10m&timezone=auto`,
      { next: { revalidate: 600 } } // Cache for 10 minutes
    );

    if (!response.ok) {
      console.warn(`Weather API error: ${response.status}`);
      return { condition: 'clear', temperature: 20, windSpeed: 0 };
    }

    const data = await response.json();
    const current = data.current;

    return {
      condition: mapWMOCode(current.weather_code),
      temperature: current.temperature_2m,
      windSpeed: current.wind_speed_10m,
    };
  } catch (error) {
    console.error('Failed to fetch weather:', error);
    return { condition: 'clear', temperature: 20, windSpeed: 0 };
  }
}

/**
 * Map WMO Weather Interpretation Codes to conditions
 * Reference: https://www.open-meteo.com/en/docs
 */
function mapWMOCode(code: number): WeatherData['condition'] {
  // Clear or Mostly Clear
  if (code === 0 || code === 1) return 'clear';
  // Partly Cloudy
  if (code === 2 || code === 3) return 'clear';
  // Foggy
  if (code === 45 || code === 48) return 'clear';
  // Drizzle or Rain
  if (code >= 51 && code <= 67) return 'rain';
  // Snow
  if (code >= 71 && code <= 77) return 'snow';
  // Rain Showers
  if (code >= 80 && code <= 82) return 'rain';
  // Snow Showers
  if (code >= 85 && code <= 86) return 'snow';
  // Thunderstorm
  if (code >= 80 && code <= 99) return 'storm';

  return 'clear';
}

/**
 * Get human-readable description of fee breakdown
 */
export function getFeeDescription(breakdown: FeeBreakdown): string {
  const parts = [`Base: $${breakdown.baseFee.toFixed(2)}`];

  if (breakdown.weatherAdjustment > 0) {
    parts.push(
      `Weather (${breakdown.weather?.condition}): +$${breakdown.weatherAdjustment.toFixed(2)}`
    );
  }

  parts.push(`Total: $${breakdown.totalFee.toFixed(2)}`);

  return parts.join(' | ');
}
