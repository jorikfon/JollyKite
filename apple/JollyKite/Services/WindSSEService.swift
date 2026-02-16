import Foundation
import JollyKiteShared

@Observable
final class WindSSEService {
    private var sseClient: SSEClient?
    private var streamTask: Task<Void, Never>?

    private(set) var isConnected = false
    private(set) var lastUpdate: WindStreamUpdate?

    var onWindUpdate: ((WindData) -> Void)?
    var onTrendUpdate: ((WindTrend) -> Void)?

    func connect(baseURL: URL) {
        disconnectSync()

        let client = SSEClient(baseURL: baseURL)
        self.sseClient = client
        self.isConnected = true

        streamTask = Task { @MainActor [weak self] in
            for await update in await client.updates() {
                guard !Task.isCancelled else { break }
                self?.lastUpdate = update
                self?.onWindUpdate?(update.data)
                if let trend = update.trend {
                    self?.onTrendUpdate?(trend)
                }
            }
            self?.isConnected = false
        }
    }

    func disconnect() {
        streamTask?.cancel()
        streamTask = nil
        Task {
            await sseClient?.disconnect()
        }
        sseClient = nil
        isConnected = false
    }

    private func disconnectSync() {
        streamTask?.cancel()
        streamTask = nil
        let client = sseClient
        sseClient = nil
        isConnected = false
        Task {
            await client?.disconnect()
        }
    }

    deinit {
        streamTask?.cancel()
    }
}
