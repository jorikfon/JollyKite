import Foundation

// MARK: - Date Bangkok Extensions

extension Date {
    /// Bangkok timezone.
    public static let bangkokTimezone = TimeZone(identifier: "Asia/Bangkok")!

    /// Hour component in Bangkok timezone.
    public var bangkokHour: Int {
        var calendar = Calendar.current
        calendar.timeZone = Date.bangkokTimezone
        return calendar.component(.hour, from: self)
    }

    /// Formatted time string in Bangkok timezone (HH:mm).
    public var bangkokTimeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        formatter.timeZone = Date.bangkokTimezone
        return formatter.string(from: self)
    }

    /// Formatted date string in Bangkok timezone (d MMM).
    public var bangkokShortDateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d MMM"
        formatter.timeZone = Date.bangkokTimezone
        return formatter.string(from: self)
    }

    /// Relative time description (e.g., "2 min ago", "just now").
    public var relativeString: String {
        let interval = Date().timeIntervalSince(self)

        if interval < 60 {
            return "just now"
        } else if interval < 3600 {
            let minutes = Int(interval / 60)
            return "\(minutes) min ago"
        } else if interval < 86400 {
            let hours = Int(interval / 3600)
            return "\(hours)h ago"
        } else {
            let days = Int(interval / 86400)
            return "\(days)d ago"
        }
    }

    /// Whether this date is today in Bangkok timezone.
    public var isTodayInBangkok: Bool {
        var calendar = Calendar.current
        calendar.timeZone = Date.bangkokTimezone
        return calendar.isDateInToday(self)
    }
}
