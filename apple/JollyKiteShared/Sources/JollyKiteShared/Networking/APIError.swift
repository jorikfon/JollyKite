import Foundation

// MARK: - API Error

/// Errors from the JollyKite networking layer.
public enum APIError: Error, Sendable, LocalizedError {
    case invalidURL
    case networkError(underlying: Error)
    case httpError(statusCode: Int, body: String?)
    case decodingError(underlying: Error)
    case noData
    case timeout
    case serverUnavailable
    case sseDisconnected
    case cancelled

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .networkError(let underlying):
            return "Network error: \(underlying.localizedDescription)"
        case .httpError(let code, _):
            return "Server returned HTTP \(code)"
        case .decodingError(let underlying):
            return "Failed to decode response: \(underlying.localizedDescription)"
        case .noData:
            return "No data available"
        case .timeout:
            return "Request timed out"
        case .serverUnavailable:
            return "Server unavailable"
        case .sseDisconnected:
            return "SSE stream disconnected"
        case .cancelled:
            return "Request was cancelled"
        }
    }

    /// Whether this error might be resolved by retrying.
    public var isRetryable: Bool {
        switch self {
        case .networkError, .timeout, .serverUnavailable, .sseDisconnected:
            return true
        case .httpError(let code, _):
            return code >= 500 || code == 429
        case .invalidURL, .decodingError, .noData, .cancelled:
            return false
        }
    }
}
