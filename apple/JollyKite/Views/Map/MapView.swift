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
    @State private var mapHeading: Double = 0

    var body: some View {
        NavigationStack {
            Map(position: $cameraPosition) {
                if let vm = viewModel {
                    Annotation(
                        AppConstants.Location.nameRu,
                        coordinate: vm.annotationCoordinate,
                        anchor: .center
                    ) {
                        WindArrowAnnotation(
                            degrees: vm.windDirectionDegrees,
                            speedKnots: vm.windSpeedKnots,
                            speedText: vm.windSpeedText,
                            unit: vm.windUnit,
                            safety: vm.safety,
                            shoreType: vm.shoreType,
                            mapHeading: mapHeading
                        )
                    }
                }
            }
            .onMapCameraChange(frequency: .continuous) { context in
                mapHeading = context.camera.heading
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
