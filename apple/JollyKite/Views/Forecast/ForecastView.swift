import SwiftUI
import JollyKiteShared

struct ForecastView: View {
    @EnvironmentObject private var preferences: PreferencesStore
    @State private var viewModel: ForecastViewModel?

    var body: some View {
        NavigationStack {
            Group {
                if let vm = viewModel {
                    forecastContent(vm)
                } else {
                    LoadingStateView(message: "Загрузка...")
                }
            }
            .navigationTitle("Прогноз")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear {
            if viewModel == nil {
                viewModel = ForecastViewModel(preferences: preferences)
            }
            viewModel?.onAppear()
        }
    }

    @ViewBuilder
    private func forecastContent(_ vm: ForecastViewModel) -> some View {
        if vm.isLoading {
            LoadingStateView(message: "Загрузка прогноза...")
        } else if let error = vm.error {
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
                    if let best = vm.bestCondition {
                        bestConditionBanner(best, unit: vm.windUnit)
                    }

                    ForEach(Array(vm.dayGroups.enumerated()), id: \.offset) { _, dayEntries in
                        if let first = dayEntries.first {
                            ForecastDayCardView(
                                date: first.date,
                                entries: dayEntries,
                                unit: vm.windUnit
                            )
                        }
                    }
                }
                .padding()
            }
            .refreshable {
                await vm.refresh()
            }
        }
    }

    private func bestConditionBanner(_ entry: WindForecastEntry, unit: WindUnit) -> some View {
        HStack {
            Image(systemName: "star.fill")
                .foregroundStyle(.yellow)
            VStack(alignment: .leading, spacing: 2) {
                Text("Лучшее время")
                    .font(.subheadline.bold())
                Text("\(entry.date.bangkokShortDateString) в \(entry.time):00 — \(entry.speed(in: unit).oneDecimal) \(unit.shortLabel)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding()
        .background(.green.opacity(0.15), in: RoundedRectangle(cornerRadius: 12))
    }
}
