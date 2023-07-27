
export const runPlugin = async ({latitude, longitude}: {latitude: number, longitude: number}) => {
  const resp: any = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&appid=${process.env.weather_api_key}&units=metric`).then(res => res.json());
  delete resp.minutely;
  delete resp.hourly;
  return {
    lat: resp.lat,
    lon: resp.lon,
    timezone: resp.timezone,
    timezone_offset: resp.timezone_offset,
    current: {
      dt: resp.current.dt,
      sunrise: resp.current.sunrise,
      sunset: resp.current.sunset,
      temp: resp.current.temp + "°C",
      feels_like: resp.current.feels_like + "°C",
      pressure: resp.current.pressure + "hPa",
      humidity: resp.current.humidity + "%",
      dew_point: resp.current.dew_point + "°C",
      uvi: resp.current.uvi,
      clouds: resp.current.clouds + "%",
      visibility: resp.current.visibility + "m",
      wind_speed: resp.current.wind_speed + "m/s",
      wind_deg: resp.current.wind_deg + "°",
      weather: resp.current.weather
    }
  };
}

export default {
  id: 'weather',
  name: 'Weather',
  description: 'Provides weather forecast based on location. Includes temperature, precipitation, cloud cover, wind and much more.',
  parameters: {
    latitude: {
      type: 'decimal',
      description: 'Latitude of the location to get weather forecast for.'
    },
    longitude: {
      type: 'decimal',
      description: 'Longitude of the location to get weather forecast for.'
    }
  },
  run: runPlugin
}