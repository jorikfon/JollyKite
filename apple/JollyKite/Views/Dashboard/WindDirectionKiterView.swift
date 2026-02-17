import SwiftUI
import JollyKiteShared

struct WindDirectionKiterView: View {
    let degrees: Double
    let label: String
    let safety: SafetyLevel
    let shoreType: ShoreType?

    private let size: CGFloat = 140

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                // Reference ring
                Circle()
                    .stroke(Color.secondary.opacity(0.15), lineWidth: 1.5)

                // Wind arrow (points FROM where wind comes)
                WindArrowShape()
                    .fill(safety.color)
                    .frame(width: size, height: size)
                    .rotationEffect(.degrees(degrees))
                    .shadow(color: safety.color.opacity(0.4), radius: 4)
                    .animation(.easeInOut(duration: AppConstants.Intervals.animationDuration), value: degrees)

                // Kiter icon
                Text("\u{1FA81}")
                    .font(.system(size: 36))
            }
            .frame(width: size, height: size)

            // Direction label
            Text("\(label)  \(Int(degrees))\u{00B0}")
                .font(.system(size: 14, weight: .semibold))

            // Shore type
            if let shoreType {
                Text(shoreType.labelRu)
                    .font(.caption2)
                    .foregroundStyle(safety.color)
            } else {
                Text("Направление")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Arrow Shape

/// A thick arrow pointing upward (north). Rotate to match wind direction.
private struct WindArrowShape: Shape {
    func path(in rect: CGRect) -> Path {
        let cx = rect.midX
        let cy = rect.midY
        let radius = min(rect.width, rect.height) / 2

        // Arrow dimensions relative to radius
        let tipY = cy - radius + 8          // arrow tip near edge
        let baseY = cy - radius * 0.2       // arrow base near center
        let halfWidth: CGFloat = 10         // half-width of the shaft
        let headHalfWidth: CGFloat = 18     // half-width of the arrowhead

        var path = Path()

        // Arrowhead tip
        path.move(to: CGPoint(x: cx, y: tipY))
        // Right side of head
        path.addLine(to: CGPoint(x: cx + headHalfWidth, y: tipY + 26))
        // Right notch into shaft
        path.addLine(to: CGPoint(x: cx + halfWidth, y: tipY + 20))
        // Right shaft down
        path.addLine(to: CGPoint(x: cx + halfWidth, y: baseY))
        // Round bottom
        path.addQuadCurve(
            to: CGPoint(x: cx - halfWidth, y: baseY),
            control: CGPoint(x: cx, y: baseY + 6)
        )
        // Left shaft up
        path.addLine(to: CGPoint(x: cx - halfWidth, y: tipY + 20))
        // Left notch into head
        path.addLine(to: CGPoint(x: cx - headHalfWidth, y: tipY + 26))
        // Back to tip
        path.closeSubpath()

        return path
    }
}
