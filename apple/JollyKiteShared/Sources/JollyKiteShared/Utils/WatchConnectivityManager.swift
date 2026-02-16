import Foundation
#if canImport(WatchConnectivity)
import WatchConnectivity

// MARK: - Watch Connectivity Message Types

/// Message types for iPhone <-> Watch communication.
public enum WatchMessageType: String, Codable, Sendable {
    case windUpdate          // iPhone -> Watch: new wind data
    case forecastUpdate      // iPhone -> Watch: new forecast
    case trendUpdate         // iPhone -> Watch: new trend data
    case requestUpdate       // Watch -> iPhone: request fresh data
    case preferencesChanged  // Bidirectional: user changed settings
    case kiteSizeUpdate      // iPhone -> Watch: kite recommendation changed
}

/// Structure for Watch communication messages.
public struct WatchMessage: Codable, Sendable {
    public let type: WatchMessageType
    public let payload: Data?
    public let timestamp: Date

    public init(type: WatchMessageType, payload: Data? = nil, timestamp: Date = Date()) {
        self.type = type
        self.payload = payload
        self.timestamp = timestamp
    }

    /// Create a message with an encodable payload.
    public static func with<T: Encodable>(type: WatchMessageType, payload: T) -> WatchMessage? {
        guard let data = try? JSONEncoder.shared.encode(payload) else { return nil }
        return WatchMessage(type: type, payload: data)
    }

    /// Decode the payload to a specific type.
    public func decode<T: Decodable>(_ type: T.Type) -> T? {
        guard let payload else { return nil }
        return try? JSONDecoder.shared.decode(type, from: payload)
    }

    /// Convert to dictionary for WCSession message transfer.
    public func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [
            "type": type.rawValue,
            "timestamp": timestamp.timeIntervalSince1970
        ]
        if let payload {
            dict["payload"] = payload
        }
        return dict
    }

    /// Create from WCSession dictionary.
    public static func from(dictionary: [String: Any]) -> WatchMessage? {
        guard let typeString = dictionary["type"] as? String,
              let type = WatchMessageType(rawValue: typeString),
              let timestamp = dictionary["timestamp"] as? TimeInterval else {
            return nil
        }
        let payload = dictionary["payload"] as? Data
        return WatchMessage(type: type, payload: payload, timestamp: Date(timeIntervalSince1970: timestamp))
    }
}

// MARK: - Application Context

/// Shared application context for WCSession.updateApplicationContext.
/// This is the primary way to sync state between iPhone and Watch.
public struct WatchApplicationContext: Codable, Sendable {
    public let windData: WindData?
    public let trend: WindTrend?
    public let safetyLevel: SafetyLevel?
    public let kiteSize: Double?
    public let windUnit: WindUnit
    public let lastUpdate: Date

    public init(
        windData: WindData?,
        trend: WindTrend?,
        safetyLevel: SafetyLevel?,
        kiteSize: Double?,
        windUnit: WindUnit,
        lastUpdate: Date = Date()
    ) {
        self.windData = windData
        self.trend = trend
        self.safetyLevel = safetyLevel
        self.kiteSize = kiteSize
        self.windUnit = windUnit
        self.lastUpdate = lastUpdate
    }

    /// Convert to dictionary for WCSession.
    public func toDictionary() -> [String: Any] {
        guard let data = try? JSONEncoder.shared.encode(self) else { return [:] }
        return ["context": data]
    }

    /// Create from WCSession dictionary.
    public static func from(dictionary: [String: Any]) -> WatchApplicationContext? {
        guard let data = dictionary["context"] as? Data else { return nil }
        return try? JSONDecoder.shared.decode(WatchApplicationContext.self, from: data)
    }
}

// MARK: - Watch Connectivity Manager

/// WCSession wrapper for iPhone <-> Watch data transfer.
/// Use on both iPhone and Watch sides.
public final class WatchConnectivityManager: NSObject, ObservableObject, @unchecked Sendable {
    public static let shared = WatchConnectivityManager()

    @Published public private(set) var isReachable = false
    @Published public private(set) var lastReceivedContext: WatchApplicationContext?

    public var onMessage: ((WatchMessage) -> Void)?
    public var onContextUpdate: ((WatchApplicationContext) -> Void)?

    private override init() {
        super.init()
    }

    /// Activate WCSession. Call early in app lifecycle.
    public func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    /// Send a message to the counterpart (requires reachability).
    public func send(_ message: WatchMessage) {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(message.toDictionary(), replyHandler: nil)
    }

    /// Update application context (queued, delivered when counterpart wakes).
    public func updateContext(_ context: WatchApplicationContext) {
        try? WCSession.default.updateApplicationContext(context.toDictionary())
    }

    /// Transfer user info (guaranteed delivery, queued).
    public func transferUserInfo(_ message: WatchMessage) {
        WCSession.default.transferUserInfo(message.toDictionary())
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {
    public func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
    }

    public func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
    }

    public func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        guard let watchMessage = WatchMessage.from(dictionary: message) else { return }
        DispatchQueue.main.async {
            self.onMessage?(watchMessage)
        }
    }

    public func session(
        _ session: WCSession,
        didReceiveApplicationContext applicationContext: [String: Any]
    ) {
        guard let context = WatchApplicationContext.from(dictionary: applicationContext) else { return }
        DispatchQueue.main.async {
            self.lastReceivedContext = context
            self.onContextUpdate?(context)
        }
    }

    public func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        guard let watchMessage = WatchMessage.from(dictionary: userInfo) else { return }
        DispatchQueue.main.async {
            self.onMessage?(watchMessage)
        }
    }

    #if os(iOS)
    public func sessionDidBecomeInactive(_ session: WCSession) {}
    public func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
    #endif
}

#endif
