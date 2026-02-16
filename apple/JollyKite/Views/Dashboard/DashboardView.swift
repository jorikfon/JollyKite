import SwiftUI
import JollyKiteShared

struct DashboardView: View {
    @EnvironmentObject private var preferences: PreferencesStore
    @State private var viewModel: DashboardViewModel?

    var body: some View {
        NavigationStack {
            Group {
                if let vm = viewModel {
                    dashboardContent(vm)
                } else {
                    LoadingStateView(message: "Загрузка...")
                }
            }
            .navigationTitle("JollyKite")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear {
            if viewModel == nil {
                let vm = DashboardViewModel(preferences: preferences)
                self.viewModel = vm
            }
            viewModel?.onAppear()
        }
        .onDisappear {
            viewModel?.onDisappear()
        }
    }

    @ViewBuilder
    private func dashboardContent(_ vm: DashboardViewModel) -> some View {
        if vm.isLoading {
            LoadingStateView(message: "Загрузка данных ветра...")
        } else if let error = vm.error, vm.windData == nil {
            ContentUnavailableView {
                Label("Ошибка", systemImage: "exclamationmark.triangle")
            } description: {
                Text(error)
            } actions: {
                Button("Повторить") {
                    Task { await vm.refresh() }
                }
            }
        } else {
            ScrollView {
                VStack(spacing: 16) {
                    SafetyBadgeView(
                        safety: vm.safety,
                        shoreType: vm.windData?.direction.shoreType
                    )

                    HStack(spacing: 16) {
                        WindSpeedGaugeView(
                            speed: vm.windData?.windSpeedKnots ?? 0,
                            unit: vm.windUnit
                        )
                        WindDirectionCompassView(
                            degrees: vm.directionDegrees,
                            label: vm.directionText
                        )
                    }
                    .frame(height: 180)

                    GradientBarView(speed: vm.windData?.windSpeedKnots ?? 0)

                    WindDetailsCardView(
                        windData: vm.windData,
                        trend: vm.trend,
                        unit: vm.windUnit
                    )

                    if let rec = vm.kiteRecommendation {
                        KiteSizeSliderView(
                            recommendation: rec,
                            windSpeed: vm.windData?.windSpeedKnots ?? 0
                        )
                    }

                    if let timestamp = vm.windData?.timestamp {
                        Text("Обновлено: \(timestamp.relativeString)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
            }
            .refreshable {
                await vm.refresh()
            }
        }
    }
}
