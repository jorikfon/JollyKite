import SwiftUI
import JollyKiteShared

struct SettingsView: View {
    @EnvironmentObject private var preferences: PreferencesStore
    @Environment(PushNotificationService.self) private var pushService
    @State private var viewModel: SettingsViewModel?

    var body: some View {
        NavigationStack {
            Group {
                if let vm = viewModel {
                    settingsForm(vm)
                } else {
                    ProgressView()
                }
            }
            .navigationTitle("Настройки")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear {
            if viewModel == nil {
                viewModel = SettingsViewModel(preferences: preferences)
            }
        }
    }

    private func settingsForm(_ vm: SettingsViewModel) -> some View {
        Form {
            Section("Единицы измерения") {
                Picker("Скорость ветра", selection: Binding(
                    get: { vm.windUnit },
                    set: { vm.windUnit = $0 }
                )) {
                    ForEach(WindUnit.allCases, id: \.self) { unit in
                        Text(unit.label).tag(unit)
                    }
                }
            }

            Section("Райдер") {
                HStack {
                    Text("Вес")
                    Spacer()
                    Text("\(Int(vm.riderWeight)) кг")
                        .foregroundStyle(.secondary)
                }
                Slider(
                    value: Binding(
                        get: { vm.riderWeight },
                        set: { vm.riderWeight = $0 }
                    ),
                    in: 40...120,
                    step: 1
                )

                Picker("Доска", selection: Binding(
                    get: { vm.boardType },
                    set: { vm.boardType = $0 }
                )) {
                    ForEach(BoardType.allCases, id: \.self) { board in
                        Label(board.label, systemImage: board.sfSymbol).tag(board)
                    }
                }
            }

            Section {
                Toggle("Уведомления о ветре", isOn: Binding(
                    get: { vm.notificationsEnabled },
                    set: { newValue in
                        vm.notificationsEnabled = newValue
                        Task {
                            if newValue {
                                await pushService.requestPermission()
                                // Revert if not authorized
                                if !pushService.isAuthorized {
                                    vm.notificationsEnabled = false
                                }
                            } else {
                                await pushService.unregisterFromServer()
                            }
                        }
                    }
                ))

                if vm.notificationsEnabled {
                    HStack {
                        Image(systemName: pushService.isAuthorized ? "checkmark.circle.fill" : "exclamationmark.circle")
                            .foregroundStyle(pushService.isAuthorized ? .green : .orange)
                        Text(pushService.isAuthorized ? "Уведомления активны" : "Требуется разрешение")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            } header: {
                Text("Уведомления")
            } footer: {
                Text("Получайте уведомление когда ветер стабильно держится выше 10 узлов в течение 20 минут")
            }

            Section("Обратная связь") {
                Toggle("Тактильная отдача", isOn: Binding(
                    get: { vm.hapticFeedback },
                    set: { vm.hapticFeedback = $0 }
                ))
            }

            Section("Сервер") {
                TextField("URL сервера", text: Binding(
                    get: { vm.serverURLString },
                    set: { vm.serverURLString = $0 }
                ))
                .keyboardType(.URL)
                .textContentType(.URL)
                .autocapitalization(.none)
            }

            Section {
                HStack {
                    Text("Версия")
                    Spacer()
                    Text(vm.appVersion)
                        .foregroundStyle(.secondary)
                }
                HStack {
                    Text("Локация")
                    Spacer()
                    Text(AppConstants.Location.nameRu)
                        .foregroundStyle(.secondary)
                }
            } header: {
                Text("О приложении")
            } footer: {
                Text("JollyKite — ветер для кайтсёрферов Пак Нам Пран")
            }
        }
    }
}
