import SwiftUI
import JollyKiteShared

struct ContentView: View {
    @EnvironmentObject private var preferences: PreferencesStore
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Ветер", systemImage: "wind")
                }
                .tag(0)

            ForecastView()
                .tabItem {
                    Label("Прогноз", systemImage: "calendar")
                }
                .tag(1)

            TimelineTabView()
                .tabItem {
                    Label("Графики", systemImage: "chart.xyaxis.line")
                }
                .tag(2)

            MapView()
                .tabItem {
                    Label("Карта", systemImage: "map")
                }
                .tag(3)

            SettingsView()
                .tabItem {
                    Label("Настройки", systemImage: "gearshape")
                }
                .tag(4)
        }
        .tint(AppConstants.Colors.accent)
    }
}
