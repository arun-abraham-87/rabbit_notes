import React, { useEffect, useState } from 'react';
import { fetchWeatherApi } from 'openmeteo';
import { ArrowPathIcon, SunIcon, CloudIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline';

const Weather = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [location, setLocation] = useState({
    latitude: -37.6007,
    longitude: 145.0956,
    timezone: 'Australia/Sydney',
  });

  const params = {
    latitude: location.latitude,
    longitude: location.longitude,
    daily: ['sunrise', 'sunset', 'rain_sum', 'wind_speed_10m_max', 'wind_gusts_10m_max', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'apparent_temperature_max', 'apparent_temperature_min', 'daylight_duration', 'showers_sum'],
    hourly: ['temperature_2m', 'rain', 'precipitation_probability', 'precipitation', 'showers', 'apparent_temperature'],
    current: ['temperature_2m', 'precipitation', 'rain', 'is_day', 'showers', 'apparent_temperature', 'relative_humidity_2m', 'wind_speed_10m'],
    timezone: location.timezone,
  };

  const url = 'https://api.open-meteo.com/v1/forecast';

  const fetchWeather = async () => {
    try {
      setError('');
      const responses = await fetchWeatherApi(url, params);

      // Process first location
      const response = responses[0];

      // Attributes for timezone and location
      const latitude = response.latitude();
      const longitude = response.longitude();
      const elevation = response.elevation();
      const timezone = response.timezone();
      const timezoneAbbreviation = response.timezoneAbbreviation();
      const utcOffsetSeconds = response.utcOffsetSeconds();

      const current = response.current();
      const hourly = response.hourly();
      const daily = response.daily();

      // Define Int64 variables so they can be processed accordingly
      // Daily variables order: sunrise, sunset, rain_sum, wind_speed_10m_max, wind_gusts_10m_max, temperature_2m_max, temperature_2m_min, precipitation_sum, apparent_temperature_max, apparent_temperature_min, daylight_duration, showers_sum
      const sunrise = daily.variables(0);
      const sunset = daily.variables(1);

      // Note: The order of weather variables in the URL query and the indices below need to match!
      const processedData = {
        location: {
          latitude,
          longitude,
          elevation,
          timezone,
          timezoneAbbreviation,
          utcOffsetSeconds,
        },
        current: {
          // Current variables order: temperature_2m, precipitation, rain, is_day, showers, apparent_temperature, relative_humidity_2m, wind_speed_10m
          time: new Date(Number(current.time()) * 1000),
          temperature_2m: current.variables(0).value(),
          precipitation: current.variables(1).value(),
          rain: current.variables(2).value(),
          is_day: current.variables(3).value(),
          showers: current.variables(4).value(),
          apparent_temperature: current.variables(5).value(),
          relative_humidity_2m: current.variables(6).value(),
          wind_speed_10m: current.variables(7).value(),
        },
        hourly: {
          // Hourly variables order: temperature_2m, rain, precipitation_probability, precipitation, showers, apparent_temperature
          time: Array.from(
            { length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() },
            (_, i) => new Date((Number(hourly.time()) + i * hourly.interval()) * 1000)
          ),
          temperature_2m: hourly.variables(0).valuesArray(),
          rain: hourly.variables(1).valuesArray(),
          precipitation_probability: hourly.variables(2).valuesArray(),
          precipitation: hourly.variables(3).valuesArray(),
          showers: hourly.variables(4).valuesArray(),
          apparent_temperature: hourly.variables(5).valuesArray(),
        },
        daily: {
          time: Array.from(
            { length: (Number(daily.timeEnd()) - Number(daily.time())) / daily.interval() },
            (_, i) => new Date((Number(daily.time()) + i * daily.interval()) * 1000)
          ),
          // Map Int64 values to according structure
          sunrise: [...Array(sunrise.valuesInt64Length())].map(
            (_, i) => new Date(Number(sunrise.valuesInt64(i)) * 1000)
          ),
          // Map Int64 values to according structure
          sunset: [...Array(sunset.valuesInt64Length())].map(
            (_, i) => new Date(Number(sunset.valuesInt64(i)) * 1000)
          ),
          rain_sum: daily.variables(2).valuesArray(),
          wind_speed_10m_max: daily.variables(3).valuesArray(),
          wind_gusts_10m_max: daily.variables(4).valuesArray(),
          temperature_2m_max: daily.variables(5).valuesArray(),
          temperature_2m_min: daily.variables(6).valuesArray(),
          precipitation_sum: daily.variables(7).valuesArray(),
          apparent_temperature_max: daily.variables(8).valuesArray(),
          apparent_temperature_min: daily.variables(9).valuesArray(),
          daylight_duration: daily.variables(10).valuesArray(),
          showers_sum: daily.variables(11).valuesArray(),
        },
      };

      setWeatherData(processedData);
    } catch (err) {
      console.error('Error fetching weather:', err);
      setError('Failed to fetch weather data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchWeather();
  };

  const formatTime = (date, timezone = 'Australia/Sydney') => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    }).format(date);
  };

  const formatDate = (date, timezone = 'Australia/Sydney') => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: timezone,
    }).format(date);
  };

  const getWeatherIcon = (rain, temperature) => {
    if (rain > 0) {
      return <CloudArrowDownIcon className="h-5 w-5 text-blue-500" />;
    } else if (temperature > 25) {
      return <SunIcon className="h-5 w-5 text-yellow-500" />;
    } else {
      return <CloudIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-md bg-gray-100 shadow-md w-fit">
        <div className="flex items-center justify-center h-16">
          <div className="text-gray-500 text-sm">Loading weather...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 border border-red-200 shadow-md">
        <div className="flex items-center justify-between">
          <div className="text-red-600 text-sm">{error}</div>
          <button
            onClick={handleRefresh}
            className="ml-2 p-1 text-red-600 hover:text-red-800"
            title="Retry"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  if (!weatherData) {
    return null;
  }

  const { current, hourly, daily, location: loc } = weatherData;

  // Get next 24 hours of hourly data
  const next24Hours = hourly.time
    .map((time, index) => ({
      time,
      temperature: hourly.temperature_2m[index],
      rain: hourly.rain[index],
      precipitation_probability: hourly.precipitation_probability[index],
      precipitation: hourly.precipitation[index],
      showers: hourly.showers[index],
      apparent_temperature: hourly.apparent_temperature[index],
    }))
    .slice(0, 24);

  // Get next 7 days of daily data
  const next7Days = daily.time
    .map((time, index) => ({
      time,
      sunrise: daily.sunrise[index],
      sunset: daily.sunset[index],
      rain_sum: daily.rain_sum[index],
      precipitation_sum: daily.precipitation_sum[index],
      temperature_2m_max: daily.temperature_2m_max[index],
      temperature_2m_min: daily.temperature_2m_min[index],
      apparent_temperature_max: daily.apparent_temperature_max[index],
      apparent_temperature_min: daily.apparent_temperature_min[index],
      wind_speed_10m_max: daily.wind_speed_10m_max[index],
      wind_gusts_10m_max: daily.wind_gusts_10m_max[index],
      daylight_duration: daily.daylight_duration[index],
      showers_sum: daily.showers_sum[index],
    }))
    .slice(0, 7);

  // Get today's data (first day)
  const today = next7Days[0] || null;
  
  // Calculate today's max precipitation probability from hourly data
  const todayMaxPrecipitationProbability = today ? Math.max(
    ...next24Hours
      .filter(hour => {
        const hourDate = new Date(hour.time);
        const todayDate = new Date(today.time);
        return hourDate.toDateString() === todayDate.toDateString();
      })
      .map(hour => hour.precipitation_probability || 0)
  ) : 0;

  return (
    <div className="w-full group relative">
      {/* Collapsed View - Current Weather Only (Wide Format) */}
      <div className="bg-white rounded-lg p-2 border flex items-center justify-between group-hover:opacity-0 group-hover:pointer-events-none transition-opacity duration-200 delay-300">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-3">
            {getWeatherIcon(
              next24Hours[0]?.rain || 0,
              current.temperature_2m
            )}
            <div>
              <div className="text-xl font-bold text-gray-900">
                {current.temperature_2m.toFixed(1)}°C
              </div>
              {current.apparent_temperature !== undefined && (
                <div className="text-xs text-gray-600">
                  Feels like {current.apparent_temperature.toFixed(1)}°C
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div>
              <span className="text-gray-500">Humidity:</span> {current.relative_humidity_2m?.toFixed(0)}%
            </div>
            <div>
              <span className="text-gray-500">Wind:</span> {current.wind_speed_10m?.toFixed(1)} km/h
            </div>
            {current.precipitation > 0 && (
              <div className="text-blue-600">
                <span className="text-gray-500">Precip:</span> {current.precipitation.toFixed(1)}mm
              </div>
            )}
            {today && today.temperature_2m_max !== undefined && today.temperature_2m_min !== undefined && (
              <div>
                <span className="text-gray-500">Today:</span> {today.temperature_2m_max.toFixed(0)}°/{today.temperature_2m_min.toFixed(0)}°
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          title="Refresh"
        >
          <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Expanded View - Full Details (Shown on Hover) */}
      <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 delay-300 absolute top-0 left-0 right-0 z-10 bg-white rounded-lg p-2 border shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <div>
            <p className="text-xs text-gray-500">
              {loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Three boxes side by side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-stretch">
        {/* Current Weather */}
        <div className="bg-white rounded-lg p-2 border flex flex-col">
        <div className="flex items-center justify-between mb-1.5">
          <div>
            <div className="text-xs text-gray-500">Current</div>
            <div className="text-2xl font-bold text-gray-900">
              {current.temperature_2m.toFixed(1)}°C
            </div>
            {current.apparent_temperature !== undefined && (
              <div className="text-xs text-gray-600 mt-0.5">
                Feels like {current.apparent_temperature.toFixed(1)}°C
              </div>
            )}
            <div className="text-xs text-gray-500 mt-0.5">
              {formatTime(current.time, loc.timezone)} {current.is_day ? '☀️' : '🌙'}
            </div>
          </div>
          <div>
            {getWeatherIcon(
              next24Hours[0]?.rain || 0,
              current.temperature_2m
            )}
          </div>
        </div>
        
        {/* Current Weather Details */}
        <div className="border-t pt-1.5 mt-1.5 space-y-1">
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div>
              <span className="text-gray-500">Apparent:</span>
              <span className="ml-1 font-medium">{current.apparent_temperature?.toFixed(1)}°C</span>
            </div>
            <div>
              <span className="text-gray-500">Humidity:</span>
              <span className="ml-1 font-medium">{current.relative_humidity_2m?.toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-gray-500">Wind:</span>
              <span className="ml-1 font-medium">{current.wind_speed_10m?.toFixed(1)} km/h</span>
            </div>
            <div>
              <span className="text-gray-500">Precip:</span>
              <span className="ml-1 font-medium text-blue-600">{current.precipitation?.toFixed(1)}mm</span>
            </div>
            {current.rain > 0 && (
              <div>
                <span className="text-gray-500">Rain:</span>
                <span className="ml-1 font-medium text-blue-600">{current.rain.toFixed(1)}mm</span>
              </div>
            )}
            {current.showers > 0 && (
              <div>
                <span className="text-gray-500">Showers:</span>
                <span className="ml-1 font-medium text-blue-600">{current.showers.toFixed(1)}mm</span>
              </div>
            )}
          </div>
        </div>

        {today && (
          <div className="border-t pt-1.5 mt-1.5">
            <div className="text-xs text-gray-500 mb-1">Today</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {today.temperature_2m_max !== undefined && today.temperature_2m_min !== undefined && (
                    <div className="text-xs text-gray-700">
                      <span className="font-semibold">{today.temperature_2m_max.toFixed(0)}°</span>
                      <span className="text-gray-500">/</span>
                      <span className="font-semibold">{today.temperature_2m_min.toFixed(0)}°</span>
                    </div>
                  )}
                  {today.apparent_temperature_max !== undefined && today.apparent_temperature_min !== undefined && (
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold">Feels {today.apparent_temperature_max.toFixed(0)}°</span>
                      <span className="text-gray-500">/</span>
                      <span className="font-semibold">{today.apparent_temperature_min.toFixed(0)}°</span>
                    </div>
                  )}
                </div>
                {todayMaxPrecipitationProbability > 0 && (
                  <div className="text-xs text-purple-600">
                    <span className="font-semibold">{todayMaxPrecipitationProbability}%</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {(today.precipitation_sum > 0 || today.rain_sum > 0) && (
                  <div className="text-blue-600">
                    💧 Precip: {(today.precipitation_sum || today.rain_sum).toFixed(1)}mm
                  </div>
                )}
                {today.showers_sum > 0 && (
                  <div className="text-blue-600">
                    🌧️ Showers: {today.showers_sum.toFixed(1)}mm
                  </div>
                )}
                {today.daylight_duration !== undefined && (
                  <div className="text-gray-600">
                    ☀️ Daylight: {(today.daylight_duration / 3600).toFixed(1)}h
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Hourly Forecast (Next 12 hours) */}
        <div className="bg-white rounded-lg p-2 border flex flex-col">
        <h4 className="text-xs font-semibold text-gray-700 mb-1.5">Next 12 Hours</h4>
        
        {/* Column Headers */}
        <div className="mb-1 pb-1 border-b text-xs font-semibold text-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-12">Time</div>
              <div className="w-8">Icon</div>
              <div>Temp</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-purple-600 w-8 text-center">Prob%</div>
              <div className="text-gray-500 w-8 text-center">Feels</div>
              <div className="text-blue-600 w-10 text-center">Precip</div>
              <div className="text-blue-600 w-10 text-center">Rain</div>
              <div className="text-blue-600 w-10 text-center">Shower</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-1 flex-1 overflow-y-auto">
          {next24Hours.slice(0, 12).map((hour, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-1 border-b last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-12 text-xs text-gray-500">
                  {formatTime(hour.time, loc.timezone)}
                </div>
                <div className="w-8">
                  {getWeatherIcon(hour.rain, hour.temperature)}
                </div>
                <div className="text-xs font-medium text-gray-900">
                  {hour.temperature.toFixed(1)}°C
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="text-purple-600 w-8 text-center">
                  {hour.precipitation_probability !== undefined ? hour.precipitation_probability : '-'}
                </div>
                <div className="text-gray-500 w-8 text-center">
                  {hour.apparent_temperature !== undefined ? hour.apparent_temperature.toFixed(0) + '°' : '-'}
                </div>
                <div className="text-blue-600 w-10 text-center">
                  {hour.precipitation > 0 ? hour.precipitation.toFixed(1) : '-'}
                </div>
                <div className="text-blue-600 w-10 text-center">
                  {hour.rain > 0 ? '🌧️' + hour.rain.toFixed(1) : '-'}
                </div>
                <div className="text-blue-600 w-10 text-center">
                  {hour.showers > 0 ? '💧' + hour.showers.toFixed(1) : '-'}
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>

        {/* Daily Forecast (Next 7 days) */}
        <div className="bg-white rounded-lg p-2 border flex flex-col">
        <h4 className="text-xs font-semibold text-gray-700 mb-1.5">7-Day Forecast</h4>
        <div className="space-y-1 flex-1 overflow-y-auto">
          {next7Days.map((day, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-1 border-b last:border-b-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <div className="text-xs font-medium text-gray-900">
                    {formatDate(day.time, loc.timezone)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {day.temperature_2m_max !== undefined && day.temperature_2m_min !== undefined && (
                      <span>
                        {day.temperature_2m_max.toFixed(0)}°/{day.temperature_2m_min.toFixed(0)}°
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  ☀️ {formatTime(day.sunrise, loc.timezone)} • 🌙 {formatTime(day.sunset, loc.timezone)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {(day.precipitation_sum > 0 || day.rain_sum > 0) && (
                  <div className="text-blue-600" title="Precipitation">
                    💧 {(day.precipitation_sum || day.rain_sum).toFixed(1)}mm
                  </div>
                )}
                {day.showers_sum > 0 && (
                  <div className="text-blue-600" title="Showers">
                    🌧️ {day.showers_sum.toFixed(1)}mm
                  </div>
                )}
                <div className="text-gray-600" title="Wind speed">
                  💨 {day.wind_speed_10m_max.toFixed(1)} km/h
                </div>
                {day.wind_gusts_10m_max > day.wind_speed_10m_max && (
                  <div className="text-gray-500" title="Wind gusts">
                    💨💨 {day.wind_gusts_10m_max.toFixed(1)} km/h
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Weather;

