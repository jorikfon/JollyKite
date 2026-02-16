import Foundation

// MARK: - Wind Direction

/// Structured wind direction with degrees, compass label, and rotation.
public struct WindDirection: Codable, Sendable, Hashable {
    /// Direction in degrees (0-360). 0 = North, 90 = East.
    public let degrees: Double

    public init(degrees: Double) {
        // Normalize to 0..<360
        let normalized = degrees.truncatingRemainder(dividingBy: 360)
        self.degrees = normalized < 0 ? normalized + 360 : normalized
    }

    // MARK: - Compass

    /// 8-point compass direction.
    public var compass: CompassPoint {
        CompassPoint.from(degrees: degrees)
    }

    /// Short compass label (e.g., "NE", "SW").
    public var compassLabel: String {
        compass.rawValue
    }

    /// Russian compass label.
    public var compassLabelRu: String {
        compass.labelRu
    }

    /// Arrow character representing wind direction.
    /// Points in the direction the wind is blowing TO (meteorological convention).
    public var arrowSymbol: String {
        compass.arrow
    }

    /// Rotation in degrees for UI arrow transforms.
    /// 0 degrees = pointing up (North), rotates clockwise.
    public var rotationDegrees: Double {
        degrees
    }

    // MARK: - Shore Relationship (Pak Nam Pran specific)

    /// Wind type relative to the Pak Nam Pran shore.
    public var shoreType: ShoreType {
        let dir = Int(degrees)
        if dir >= 225 && dir <= 315 { return .offshore }
        if dir >= 45 && dir <= 135 { return .onshore }
        return .sideshore
    }

    public var isOffshore: Bool { shoreType == .offshore }
    public var isOnshore: Bool { shoreType == .onshore }
    public var isSideshore: Bool { shoreType == .sideshore }
}

// MARK: - Compass Point

public enum CompassPoint: String, Codable, Sendable, Hashable, CaseIterable {
    case N, NE, E, SE, S, SW, W, NW

    public static func from(degrees: Double) -> CompassPoint {
        let normalized = ((degrees.truncatingRemainder(dividingBy: 360)) + 360)
            .truncatingRemainder(dividingBy: 360)

        switch normalized {
        case 337.5..<360, 0..<22.5: return .N
        case 22.5..<67.5: return .NE
        case 67.5..<112.5: return .E
        case 112.5..<157.5: return .SE
        case 157.5..<202.5: return .S
        case 202.5..<247.5: return .SW
        case 247.5..<292.5: return .W
        case 292.5..<337.5: return .NW
        default: return .N
        }
    }

    public var labelRu: String {
        switch self {
        case .N: return "С"
        case .NE: return "СВ"
        case .E: return "В"
        case .SE: return "ЮВ"
        case .S: return "Ю"
        case .SW: return "ЮЗ"
        case .W: return "З"
        case .NW: return "СЗ"
        }
    }

    /// Arrow character representing the direction wind is coming FROM.
    public var arrow: String {
        switch self {
        case .N: return "↓"
        case .NE: return "↙"
        case .E: return "←"
        case .SE: return "↖"
        case .S: return "↑"
        case .SW: return "↗"
        case .W: return "→"
        case .NW: return "↘"
        }
    }
}

// MARK: - Shore Type

public enum ShoreType: String, Codable, Sendable, Hashable {
    case onshore    // 45-135 degrees: wind from sea to land (safe)
    case offshore   // 225-315 degrees: wind from land to sea (dangerous)
    case sideshore  // everything else: wind parallel to beach

    public var label: String {
        switch self {
        case .onshore: return "Onshore"
        case .offshore: return "Offshore"
        case .sideshore: return "Sideshore"
        }
    }

    public var labelRu: String {
        switch self {
        case .onshore: return "Прижим"
        case .offshore: return "Отжим"
        case .sideshore: return "Боковой"
        }
    }

    public var sfSymbol: String {
        switch self {
        case .onshore: return "arrow.right.to.line"
        case .offshore: return "arrow.left.to.line"
        case .sideshore: return "arrow.left.and.right"
        }
    }
}
