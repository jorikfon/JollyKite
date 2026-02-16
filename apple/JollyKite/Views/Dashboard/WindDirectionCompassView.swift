import SwiftUI
import JollyKiteShared

struct WindDirectionCompassView: View {
    let degrees: Double
    let label: String

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                // Compass ring
                Circle()
                    .stroke(Color.secondary.opacity(0.2), lineWidth: 2)

                // Cardinal markers
                ForEach(["С", "В", "Ю", "З"], id: \.self) { point in
                    let angle = cardinalAngle(for: point)
                    Text(point)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.secondary)
                        .offset(y: -60)
                        .rotationEffect(.degrees(-angle))
                        .rotationEffect(.degrees(angle))
                }

                // Wind arrow
                Image(systemName: "location.north.fill")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(Color.accentColor)
                    .rotationEffect(.degrees(degrees))
                    .animation(.easeInOut(duration: AppConstants.Intervals.animationDuration), value: degrees)

                VStack(spacing: 0) {
                    Spacer()
                    Text(label)
                        .font(.system(size: 14, weight: .semibold))
                    Text("\(Int(degrees))°")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .padding(.bottom, 4)
            }

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
