import SwiftUI
import JollyKiteShared

struct SafetyBadgeView: View {
    let safety: SafetyLevel
    let shoreType: ShoreType?

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: safety.sfSymbol)
                .font(.title2)
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .background(safety.color, in: Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(safety.labelRu)
                    .font(.headline)
                    .foregroundStyle(safety.color)

                if let shore = shoreType {
                    HStack(spacing: 4) {
                        Image(systemName: shore.sfSymbol)
                            .font(.caption)
                        Text(shore.labelRu)
                            .font(.subheadline)
                    }
                    .foregroundStyle(.secondary)
                }
            }

            Spacer()
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}
