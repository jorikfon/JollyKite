import Foundation
import SwiftUI
import MapKit
import JollyKiteShared

@Observable
final class MapViewModel {
    private(set) var windData: WindData?
    private(set) var safety: SafetyLevel = .low

    let spotCoordinate = CLLocationCoordinate2D(
        latitude: AppConstants.Location.latitude,
        longitude: AppConstants.Location.longitude
    )

    var cameraPosition: MapCameraPosition {
        .region(MKCoordinateRegion(
            center: spotCoordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
        ))
    }

    private let preferences: PreferencesStore
    private var dataService: WindDataService?

    init(preferences: PreferencesStore) {
        self.preferences = preferences
    }

    func onAppear() {
        let client = preferences.makeAPIClient()
        self.dataService = WindDataService(apiClient: client)
        Task { await loadWind() }
    }

    func refresh() async {
        await loadWind()
    }

    private func loadWind() async {
        guard let dataService else { return }
        do {
            let wind = try await dataService.currentWind()
            await MainActor.run {
                self.windData = wind
                self.safety = WindSafetyService.evaluate(windData: wind)
            }
        } catch {
            // Silently fail — map still shows location
        }
    }

    var windUnit: WindUnit { preferences.windUnit }

    var windSpeedText: String {
        guard let windData else { return "" }
        return windData.speed(in: preferences.windUnit).oneDecimal
    }

    var windDirectionDegrees: Double {
        windData?.direction.degrees ?? 0
    }
}
