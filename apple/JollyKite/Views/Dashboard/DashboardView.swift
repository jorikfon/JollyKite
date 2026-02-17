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
                    WindHeroCardView(
                        speedKnots: vm.windData?.windSpeedKnots ?? 0,
                        directionText: vm.directionText,
                        gustKnots: vm.windData?.windGustKnots,
                        maxGustKnots: vm.windData?.maxGustKnots,
                        windUnit: vm.windUnit
                    )

                    WindStatusCardView(
                        conditionIcon: vm.conditionIcon,
                        conditionName: vm.conditionNameRu,
                        safetySubtitle: vm.safetySubtitleRu,
                        safetyColor: vm.safety.color,
                        trend: vm.trend,
                        trendDescription: vm.trendDescriptionRu,
                        kiteRecommendation: vm.kiteRecommendation,
                        riderWeight: preferences.riderWeight
                    )

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
