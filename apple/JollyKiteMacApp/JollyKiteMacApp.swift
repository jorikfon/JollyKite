import SwiftUI

@main
struct JollyKiteMacApp: App {
    var body: some Scene {
        WindowGroup {
            VStack(spacing: 16) {
                Image(systemName: "wind")
                    .font(.system(size: 48))
                    .foregroundStyle(.blue)

                Text("JollyKite")
                    .font(.largeTitle)
                    .bold()

                Text("Добавьте виджет на рабочий стол:")
                    .font(.title3)

                VStack(alignment: .leading, spacing: 8) {
                    Label("Правый клик на рабочем столе", systemImage: "1.circle")
                    Label("Выберите «Редактировать виджеты»", systemImage: "2.circle")
                    Label("Найдите JollyKite и добавьте", systemImage: "3.circle")
                }
                .font(.body)
                .padding()
                .background(.quaternary, in: RoundedRectangle(cornerRadius: 12))
            }
            .padding(40)
            .frame(minWidth: 360, minHeight: 300)
        }
        .windowResizability(.contentSize)
    }
}
