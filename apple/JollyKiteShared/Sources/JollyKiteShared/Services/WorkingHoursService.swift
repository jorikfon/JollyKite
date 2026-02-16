import Foundation

// MARK: - Working Hours Service

/// Checks whether the current time is within kitesurfing hours (6:00-19:00 Bangkok time).
/// Used for determining update frequency and display logic.
public enum WorkingHoursService {

    /// Bangkok timezone (UTC+7).
    public static let bangkokTimezone = TimeZone(identifier: "Asia/Bangkok")!

    /// Start of kiting day (6:00 AM Bangkok).
    public static let startHour = 6

    /// End of kiting day (7:00 PM Bangkok).
    public static let endHour = 19

    /// Whether the given date falls within kiting hours in Bangkok timezone.
    public static func isWithinWorkingHours(_ date: Date = Date()) -> Bool {
        var calendar = Calendar.current
        calendar.timeZone = bangkokTimezone
        let hour = calendar.component(.hour, from: date)
        return hour >= startHour && hour < endHour
    }

    /// Current hour in Bangkok timezone.
    public static func currentBangkokHour(_ date: Date = Date()) -> Int {
        var calendar = Calendar.current
        calendar.timeZone = bangkokTimezone
        return calendar.component(.hour, from: date)
    }

    /// Current date string in Bangkok timezone (YYYY-MM-DD).
    public static func bangkokDateString(_ date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = bangkokTimezone
        return formatter.string(from: date)
    }

    /// Time until working hours start (nil if already within working hours).
    public static func timeUntilStart(_ date: Date = Date()) -> TimeInterval? {
        var calendar = Calendar.current
        calendar.timeZone = bangkokTimezone
        let hour = calendar.component(.hour, from: date)

        if hour >= startHour && hour < endHour {
            return nil // Already within working hours
        }

        // Calculate next start time
        var components = calendar.dateComponents([.year, .month, .day], from: date)
        components.hour = startHour
        components.minute = 0
        components.second = 0

        if hour >= endHour {
            // After working hours - next start is tomorrow
            guard let tomorrow = calendar.date(byAdding: .day, value: 1, to: date) else { return nil }
            components = calendar.dateComponents([.year, .month, .day], from: tomorrow)
            components.hour = startHour
            components.minute = 0
            components.second = 0
        }

        guard let nextStart = calendar.date(from: components) else { return nil }
        return nextStart.timeIntervalSince(date)
    }

    /// Recommended update interval based on time of day.
    /// More frequent during kiting hours, less frequent at night.
    public static var recommendedUpdateInterval: TimeInterval {
        if isWithinWorkingHours() {
            return 30 // 30 seconds during kiting hours
        } else {
            return 300 // 5 minutes outside kiting hours
        }
    }
}
