import SwiftUI
import JollyKiteShared

struct WindDirectionCompassView: View {
    let degrees: Double
    let label: String

    private let compassSize: CGFloat = 140

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                // Compass ring
                Circle()
                    .stroke(Color.secondary.opacity(0.2), lineWidth: 2)

                // Cardinal markers
                ForEach(["С", "В", "Ю", "З"], id: \.self) { point in
                    let angle = cardinalAngle(for: point)
                    Text(point)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .offset(y: -(compassSize / 2 - 10))
                        .rotationEffect(.degrees(angle))
                }

                // Wind arrow
                Image(systemName: "location.north.fill")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(Color.accentColor)
                    .rotationEffect(.degrees(degrees))
                    .animation(.easeInOut(duration: AppConstants.Intervals.animationDuration), value: degrees)
            }
            .frame(width: compassSize, height: compassSize)

            Text("\(label)  \(Int(degrees))°")
                .font(.system(size: 14, weight: .semibold))
            Text("Направление")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private func cardinalAngle(for point: String) -> Double {
        switch point {
        case "С": return 0
        case "В": return 90
        case "Ю": return 180
        case "З": return 270
        default: return 0
        }
    }
}
