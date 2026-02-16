import SwiftUI
import MapKit
import JollyKiteShared

struct MapView: View {
    @EnvironmentObject private var preferences: PreferencesStore
    @State private var viewModel: MapViewModel?
    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(
                latitude: AppConstants.Location.latitude,
                longitude: AppConstants.Location.longitude
            ),
            span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
        )
    )

    var body: some View {
        NavigationStack {
            Map(position: $cameraPosition) {
                if let vm = viewModel {
                    Annotation(
                        AppConstants.Location.nameRu,
                        coordinate: vm.spotCoordinate,
                        anchor: .center
                    ) {
                        WindArrowAnnotation(
                            degrees: vm.windDirectionDegrees,
                            speedText: vm.windSpeedText,
                            unit: vm.windUnit,
                            safety: vm.safety
                        )
                    }
                }
            }
            .mapStyle(.standard(elevation: .realistic))
            .navigationTitle("Карта")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear {
            if viewModel == nil {
                viewModel = MapViewModel(preferences: preferences)
            }
            viewModel?.onAppear()
        }
    }
}
