import React, { useEffect, useState } from 'react';
import { fetchWeatherApi } from 'openmeteo';
import { ArrowPathIcon, SunIcon, CloudIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline';

const Weather = ({ forceExpanded = false }) => {
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

  const getWeatherIcon = (rain, precipitation, temperature) => {
    if (rain > 0 || precipitation > 0) {
      return <CloudArrowDownIcon className="h-6 w-6 text-blue-500" />;
    } else if (temperature > 25) {
      return <SunIcon className="h-6 w-6 text-yellow-500" />;
    } else {
      return <CloudIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  const getWeatherCondition = (rain, precipitation, temperature) => {
    if (rain > 0 || precipitation > 0) {
      return 'Showers';
    } else if (temperature > 25) {
      return 'Sunny';
    } else {
      return 'Partly Cloudy';
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

  return (
    <div className="w-full group relative">
      {/* Collapsed View - Current Weather Only (Wide Format) */}
      {!forceExpanded && (
      <div className="bg-white rounded-lg p-2 border flex items-center justify-between group-hover:opacity-0 group-hover:pointer-events-none transition-opacity duration-200 delay-300">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-3">
            {getWeatherIcon(
              next24Hours[0]?.rain || 0,
              next24Hours[0]?.precipitation || 0,
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
      )}

      {/* Expanded View - Full Details (Shown on Hover or forceExpanded) */}
      <div className={`${forceExpanded ? 'opacity-100 pointer-events-auto relative' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto absolute top-0 left-0 right-0 z-10'} transition-opacity duration-200 delay-300 bg-gray-50 rounded-lg p-4 border shadow-lg`}>
        {/* Three-column layout */}
        <div className="grid grid-cols-3 gap-4">
          {/* Current Section */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Current</h3>
            
            {/* Location and Time */}
            <div className="mb-3 text-xs text-gray-500">
              <div>Location: {loc.latitude > 0 ? loc.latitude.toFixed(4) + '°N' : Math.abs(loc.latitude).toFixed(4) + '°S'}, {loc.longitude > 0 ? loc.longitude.toFixed(4) + '°E' : Math.abs(loc.longitude).toFixed(4) + '°W'}</div>
              <div>{formatTime(current.time, loc.timezone)}</div>
        </div>

            {/* Main Temperature Display */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-2">
                {current.is_day && <SunIcon className="h-5 w-5 text-yellow-500 mt-1" />}
          <div>
                  <div className="text-4xl font-bold text-gray-900">
              {current.temperature_2m.toFixed(1)}°C
            </div>
            {current.apparent_temperature !== undefined && (
                    <div className="text-sm text-gray-600 mt-1">
                Feels like {current.apparent_temperature.toFixed(1)}°C
              </div>
            )}
            </div>
          </div>
              <div className="mt-2">
                {getWeatherIcon(current.rain, current.precipitation, current.temperature_2m)}
          </div>
        </div>
        
            {/* Current Conditions */}
            <div className="space-y-1.5 mb-4 text-xs text-gray-700">
            <div>
                <span className="text-gray-500">Humidity:</span> {current.relative_humidity_2m?.toFixed(0)}%
            </div>
              <div>
                <span className="text-gray-500">Wind:</span> {current.wind_speed_10m?.toFixed(1)} km/h
              </div>
              <div>
                <span className="text-gray-500">Precipitation:</span> {current.precipitation?.toFixed(1)}mm
          </div>
        </div>

            {/* Today's Forecast Sub-section */}
        {today && (
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">Today's Forecast</div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900">
                    {today.temperature_2m_max?.toFixed(0)}°/{today.temperature_2m_min?.toFixed(0)}° 
                    <span className="text-xs text-gray-600 ml-1">
                      Feels {today.apparent_temperature_max?.toFixed(0)}/{today.apparent_temperature_min?.toFixed(0)}°
                    </span>
                  </div>
                  <div>
                    {getWeatherIcon(today.rain_sum, today.precipitation_sum, today.temperature_2m_max)}
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>
                    <span className="text-gray-500">Humidity:</span> {current.relative_humidity_2m?.toFixed(0)}%
                  </div>
                  <div>
                    <span className="text-gray-500">Precip:</span> {today.precipitation_sum?.toFixed(1)}mm
                  </div>
                  {today.showers_sum > 0 && (
                    <div>
                      <span className="text-gray-500">Showers:</span> {today.showers_sum.toFixed(1)}mm
                    </div>
                  )}
                  {today.daylight_duration !== undefined && (
                    <div>
                      <span className="text-gray-500">Daylight:</span> {(today.daylight_duration / 3600).toFixed(1)}h
                    </div>
                  )}
                </div>
                  </div>
                )}
              </div>

          {/* Next 24 Hours Section */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Next 24 Hours</h3>
            
            {/* Hourly Grid - Compact layout */}
            <div className="grid grid-cols-4 gap-1.5">
              {next24Hours.slice(0, 24).map((hour, index) => (
                <div key={index} className="flex flex-col items-center text-center p-1">
                  <div className="text-[10px] text-gray-500 mb-0.5 w-full truncate">
                    {formatTime(hour.time, loc.timezone).replace(':00 ', ' ')}
                  </div>
                  <div className="mb-0.5">
                    {getWeatherIcon(hour.rain, hour.precipitation, hour.temperature)}
                  </div>
                  <div className="text-[11px] font-medium text-gray-900 mb-0.5">
                    {hour.temperature.toFixed(1)}°C
                  </div>
                  <div className="text-[10px] text-purple-600 font-medium">
                    {hour.precipitation_probability !== undefined ? Math.round(hour.precipitation_probability) + '%' : '0%'}
              </div>
            </div>
              ))}
          </div>
        </div>
        
          {/* 7-Day Forecast Section */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">7-Day Forecast</h3>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                title="Refresh"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
        </div>

            <div className="space-y-2.5">
          {next7Days.map((day, index) => (
            <div
              key={index}
                  className="border-b border-gray-100 pb-2.5 last:border-b-0 last:pb-0"
            >
                  <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs font-medium text-gray-900">
                    {formatDate(day.time, loc.timezone)}
                  </div>
                    <div className="text-xs font-medium text-gray-900">
                      {day.temperature_2m_max?.toFixed(0)}°/{day.temperature_2m_min?.toFixed(0)}°
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-700">
                      {getWeatherCondition(day.rain_sum, day.precipitation_sum, day.temperature_2m_max)}
                </div>
                    <div className="flex items-center gap-2">
                      {getWeatherIcon(day.rain_sum, day.precipitation_sum, day.temperature_2m_max)}
              </div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    Wind {day.wind_speed_10m_max?.toFixed(0)} km/h
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
