import SwiftUI
import JollyKiteShared

struct TimelineTabView: View {
    @EnvironmentObject private var preferences: PreferencesStore
    @State private var viewModel: TimelineViewModel?
    @State private var selectedSegment = 0

    var body: some View {
        NavigationStack {
            Group {
                if let vm = viewModel {
                    timelineContent(vm)
                } else {
                    LoadingStateView(message: "Загрузка...")
                }
            }
            .navigationTitle("Графики")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear {
            if viewModel == nil {
                viewModel = TimelineViewModel(preferences: preferences)
            }
            viewModel?.onAppear()
        }
    }

    @ViewBuilder
    private func timelineContent(_ vm: TimelineViewModel) -> some View {
        if vm.isLoading {
            LoadingStateView(message: "Загрузка графиков...")
        } else {
            VStack(spacing: 0) {
                Picker("Период", selection: $selectedSegment) {
                    Text("Сегодня").tag(0)
                    Text("Неделя").tag(1)
                }
                .pickerStyle(.segmented)
                .padding()

                TabView(selection: $selectedSegment) {
                    ScrollView {
                        TodayTimelineChartView(
                            history: vm.todayEntries,
                            forecast: vm.forecastEntries,
                            currentHour: vm.currentHour,
                            unit: vm.windUnit
                        )
                        .padding()
                    }
                    .tag(0)

                    ScrollView {
                        WeekHistoryChartView(
                            days: vm.weekHistory,
                            unit: vm.windUnit
                        )
                        .padding()
                    }
                    .tag(1)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .refreshable {
                await vm.refresh()
            }
        }
    }
}
