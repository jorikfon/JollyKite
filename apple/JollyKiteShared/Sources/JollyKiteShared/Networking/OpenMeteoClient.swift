import Foundation

// MARK: - Open-Meteo Client

/// Direct client for the Open-Meteo API (no auth required).
/// Used as fallback when the backend is unavailable.
public final class OpenMeteoClient: Sendable {
    private let session: URLSession
    private let decoder: JSONDecoder
    private let latitude: Double
    private let longitude: Double
    private let timezone: String

    public init(
        latitude: Double = 12.346596,
        longitude: Double = 99.998179,
        timezone: String = "Asia/Bangkok",
        session: URLSession? = nil
    ) {
        self.latitude = latitude
        self.longitude = longitude
        self.timezone = timezone

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder = decoder

        if let session {
            self.session = session
        } else {
            let config = URLSessionConfiguration.default
            config.timeoutIntervalForRequest = 10
            self.session = URLSession(configuration: config)
        }
    }

    // MARK: - Wind Forecast

    /// Fetch 3-day wind forecast directly from Open-Meteo.
    public func fetchWindForecast(days: Int = 3) async throws -> [WindForecastEntry] {
        var components = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        components.queryItems = [
            URLQueryItem(name: "latitude", value: String(latitude)),
            URLQueryItem(name: "longitude", value: String(longitude)),
            URLQueryItem(name: "hourly", value: "wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability"),
            URLQueryItem(name: "timezone", value: timezone),
            URLQueryItem(name: "forecast_days", value: String(days))
        ]

        guard let url = components.url else { throw APIError.invalidURL }

        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverUnavailable
        }

        let apiResponse = try decoder.decode(OpenMeteoWindResponse.self, from: data)
        return convertToForecastEntries(apiResponse, startHour: 6, endHour: 19)
    }

    // MARK: - Marine Forecast

    /// Fetch wave forecast from Open-Meteo Marine API.
    public func fetchMarineForecast(days: Int = 3) async throws -> [WaveData] {
        var components = URLComponents(string: "https://marine-api.open-meteo.com/v1/marine")!
        components.queryItems = [
            URLQueryItem(name: "latitude", value: String(latitude)),
            URLQueryItem(name: "longitude", value: String(longitude)),
            URLQueryItem(name: "hourly", value: "wave_height,wave_direction,wave_period"),
            URLQueryItem(name: "timezone", value: timezone),
            URLQueryItem(name: "forecast_days", value: String(days))
        ]

        guard let url = components.url else { throw APIError.invalidURL }

        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverUnavailable
        }

        let apiResponse = try decoder.decode(OpenMeteoMarineResponse.self, from: data)
        return convertToWaveData(apiResponse)
    }

    // MARK: - Private Conversions

    private func convertToForecastEntries(
        _ response: OpenMeteoWindResponse,
        startHour: Int,
        endHour: Int
    ) -> [WindForecastEntry] {
        let hourly = response.hourly
        let isoFormatter = ISO8601DateFormatter.standard

        return zip(hourly.time.indices, hourly.time).compactMap { index, timeString in
            guard let date = isoFormatter.date(from: timeString + ":00")
                    ?? DateFormatter.openMeteo.date(from: timeString) else {
                return nil
            }

            let calendar = Calendar.current
            var bangkokCalendar = calendar
            bangkokCalendar.timeZone = TimeZone(identifier: "Asia/Bangkok")!
            let hour = bangkokCalendar.component(.hour, from: date)

            guard hour >= startHour && hour <= endHour else { return nil }

            let speedKnots = UnitConverter.kmhToKnots(hourly.windSpeed10m[index])
            let gustKnots = UnitConverter.kmhToKnots(hourly.windGusts10m[index])

            return WindForecastEntry(
                date: date,
                time: hour,
                speed: (speedKnots * 10).rounded() / 10,
                direction: Int(hourly.windDirection10m[index]),
                gust: (gustKnots * 10).rounded() / 10,
                precipitationProbability: index < (hourly.precipitationProbability?.count ?? 0)
                    ? Int(hourly.precipitationProbability?[index] ?? 0)
                    : nil
            )
        }
    }

    private func convertToWaveData(_ response: OpenMeteoMarineResponse) -> [WaveData] {
        let hourly = response.hourly
        return hourly.waveHeight.indices.compactMap { index in
            guard index < hourly.waveDirection.count,
                  index < hourly.wavePeriod.count else { return nil }
            return WaveData(
                height: hourly.waveHeight[index],
                direction: Int(hourly.waveDirection[index]),
                period: hourly.wavePeriod[index]
            )
        }
    }
}

// MARK: - Open-Meteo Response DTOs

struct OpenMeteoWindResponse: Decodable {
    let hourly: HourlyWind

    struct HourlyWind: Decodable {
        let time: [String]
        let windSpeed10m: [Double]
        let windDirection10m: [Double]
        let windGusts10m: [Double]
        let precipitationProbability: [Double]?
    }
}

struct OpenMeteoMarineResponse: Decodable {
    let hourly: HourlyMarine

    struct HourlyMarine: Decodable {
        let time: [String]
        let waveHeight: [Double]
        let waveDirection: [Double]
        let wavePeriod: [Double]
    }
}

// MARK: - Date Formatter

extension DateFormatter {
    /// Open-Meteo returns dates like "2025-01-15T08:00" (no seconds, no Z).
    static let openMeteo: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm"
        formatter.timeZone = TimeZone(identifier: "Asia/Bangkok")
        return formatter
    }()
}
