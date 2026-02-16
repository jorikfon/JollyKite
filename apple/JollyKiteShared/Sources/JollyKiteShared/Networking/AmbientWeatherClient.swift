import Foundation

// MARK: - Ambient Weather Client

/// Direct client for the Ambient Weather Network API (public, no auth).
/// Used as fallback when the backend is unavailable.
public final class AmbientWeatherClient: Sendable {
    private let session: URLSession
    private let slug: String

    public init(
        slug: String = "e63ff0d2119b8c024b5aad24cc59a504",
        session: URLSession? = nil
    ) {
        self.slug = slug

        if let session {
            self.session = session
        } else {
            let config = URLSessionConfiguration.default
            config.timeoutIntervalForRequest = 10
            self.session = URLSession(configuration: config)
        }
    }

    /// Fetch current wind data directly from Ambient Weather.
    public func fetchCurrentWind() async throws -> WindData {
        guard let url = URL(string: "https://lightning.ambientweather.net/devices?public.slug=\(slug)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Mozilla/5.0", forHTTPHeaderField: "User-Agent")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverUnavailable
        }

        let apiResponse = try JSONDecoder().decode(AmbientWeatherResponse.self, from: data)

        guard let device = apiResponse.data.first,
              let lastData = device.lastData else {
            throw APIError.noData
        }

        return convertToWindData(lastData)
    }

    // MARK: - Private

    private func convertToWindData(_ raw: AmbientLastData) -> WindData {
        let timestamp: Date
        if let dateutc = raw.dateutc {
            timestamp = Date(timeIntervalSince1970: dateutc / 1000)
        } else {
            timestamp = Date()
        }

        return WindData(
            timestamp: timestamp,
            windSpeedKnots: UnitConverter.mphToKnots(raw.windspeedmph ?? 0),
            windGustKnots: UnitConverter.mphToKnots(raw.windgustmph ?? 0),
            maxGustKnots: UnitConverter.mphToKnots(raw.maxdailygust ?? 0),
            windDir: raw.winddir ?? 0,
            windDirAvg: raw.winddirAvg10m,
            temperature: raw.tempf,
            humidity: raw.humidity,
            pressure: raw.baromrelin
        )
    }
}

// MARK: - Ambient Weather Response DTOs

struct AmbientWeatherResponse: Decodable {
    let data: [AmbientDevice]
}

struct AmbientDevice: Decodable {
    let lastData: AmbientLastData?
}

struct AmbientLastData: Decodable {
    let dateutc: Double?
    let windspeedmph: Double?
    let windgustmph: Double?
    let maxdailygust: Double?
    let winddir: Int?
    let winddirAvg10m: Int?
    let tempf: Double?
    let humidity: Double?
    let baromrelin: Double?

    enum CodingKeys: String, CodingKey {
        case dateutc
        case windspeedmph
        case windgustmph
        case maxdailygust
        case winddir
        case winddirAvg10m = "winddir_avg10m"
        case tempf
        case humidity
        case baromrelin
    }
}
