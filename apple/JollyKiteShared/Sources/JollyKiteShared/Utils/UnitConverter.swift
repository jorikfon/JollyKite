import Foundation

// MARK: - Unit Converter

/// Centralized wind speed unit conversions.
/// All conversion factors match the existing config.js values.
public enum UnitConverter {

    // MARK: - Conversion Factors

    /// MPH to m/s: 0.44704
    public static let mphToMsFactor: Double = 0.44704

    /// MPH to knots: 0.868976 (Ambient Weather uses MPH)
    public static let mphToKnotsFactor: Double = 0.868976

    /// m/s to knots: 1.94384
    public static let msToKnotsFactor: Double = 1.94384

    /// knots to m/s: 0.514444
    public static let knotsToMsFactor: Double = 0.514444

    /// km/h to knots: 0.539957 (Open-Meteo uses km/h)
    public static let kmhToKnotsFactor: Double = 0.539957

    // MARK: - Conversions

    /// Miles per hour to knots (for Ambient Weather API data).
    public static func mphToKnots(_ mph: Double) -> Double {
        mph * mphToKnotsFactor
    }

    /// Kilometers per hour to knots (for Open-Meteo API data).
    public static func kmhToKnots(_ kmh: Double) -> Double {
        kmh * kmhToKnotsFactor
    }

    /// Knots to meters per second.
    public static func knotsToMs(_ knots: Double) -> Double {
        knots * knotsToMsFactor
    }

    /// Meters per second to knots.
    public static func msToKnots(_ ms: Double) -> Double {
        ms * msToKnotsFactor
    }

    /// Miles per hour to meters per second.
    public static func mphToMs(_ mph: Double) -> Double {
        mph * mphToMsFactor
    }

    /// Fahrenheit to Celsius.
    public static func fahrenheitToCelsius(_ f: Double) -> Double {
        (f - 32) * 5 / 9
    }

    /// Celsius to Fahrenheit.
    public static func celsiusToFahrenheit(_ c: Double) -> Double {
        c * 9 / 5 + 32
    }
}
