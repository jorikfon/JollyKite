import Foundation

// MARK: - SSE Client

/// Server-Sent Events client for real-time wind updates.
/// Connects to GET /api/wind/stream.
public actor SSEClient {
    private let baseURL: URL
    private let decoder: JSONDecoder
    private var task: Task<Void, Never>?
    private nonisolated let sseTimeout: TimeInterval
    private nonisolated let reconnectDelay: TimeInterval

    public init(
        baseURL: URL,
        sseTimeout: TimeInterval = 30,
        reconnectDelay: TimeInterval = 5
    ) {
        // Ensure trailing slash so relative paths resolve correctly
        let urlString = baseURL.absoluteString
        self.baseURL = urlString.hasSuffix("/") ? baseURL : URL(string: urlString + "/")!
        self.sseTimeout = sseTimeout
        self.reconnectDelay = reconnectDelay

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)
            if let date = ISO8601DateFormatter.withFractionalSeconds.date(from: string) {
                return date
            }
            if let date = ISO8601DateFormatter.standard.date(from: string) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date: \(string)"
            )
        }
        self.decoder = decoder
    }

    /// Returns an AsyncStream of wind updates.
    /// Automatically reconnects on disconnection with exponential backoff.
    public func updates() -> AsyncStream<WindStreamUpdate> {
        AsyncStream { continuation in
            let streamTask = Task { [weak self] in
                guard let self else {
                    continuation.finish()
                    return
                }

                var consecutiveFailures = 0

                while !Task.isCancelled {
                    do {
                        try await self.streamEvents(continuation: continuation)
                        consecutiveFailures = 0
                    } catch {
                        if Task.isCancelled { break }
                        consecutiveFailures += 1
                        let delay = min(
                            self.reconnectDelay * pow(2, Double(consecutiveFailures - 1)),
                            60
                        )
                        try? await Task.sleep(for: .seconds(delay))
                    }
                }

                continuation.finish()
            }

            continuation.onTermination = { _ in
                streamTask.cancel()
            }

            Task { [weak self] in await self?.setTask(streamTask) }
        }
    }

    /// Stop listening for updates.
    public func disconnect() {
        task?.cancel()
        task = nil
    }

    // MARK: - Private

    private func setTask(_ newTask: Task<Void, Never>) {
        self.task = newTask
    }

    private func streamEvents(continuation: AsyncStream<WindStreamUpdate>.Continuation) async throws {
        guard let url = URL(string: "wind/stream", relativeTo: baseURL) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.timeoutInterval = sseTimeout

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = sseTimeout
        config.timeoutIntervalForResource = 300 // 5 minutes max
        let session = URLSession(configuration: config)

        let (bytes, response) = try await session.bytes(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverUnavailable
        }

        var buffer = ""

        for try await byte in bytes {
            let char = Character(UnicodeScalar(byte))
            buffer.append(char)

            // SSE messages end with double newline
            if buffer.hasSuffix("\n\n") {
                if let update = parseSSEMessage(buffer) {
                    continuation.yield(update)
                }
                buffer = ""
            }
        }

        throw APIError.sseDisconnected
    }

    private nonisolated func parseSSEMessage(_ raw: String) -> WindStreamUpdate? {
        // SSE format: "data: {json}\n\n" or ": comment\n\n"
        let lines = raw.split(separator: "\n", omittingEmptySubsequences: false)

        for line in lines {
            let lineStr = String(line)
            if lineStr.hasPrefix("data: ") {
                let jsonString = String(lineStr.dropFirst(6))
                guard let data = jsonString.data(using: .utf8) else { continue }
                return try? decoder.decode(WindStreamUpdate.self, from: data)
            }
        }

        return nil // Comment or heartbeat
    }
}
