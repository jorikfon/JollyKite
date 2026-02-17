import SwiftUI
import JollyKiteShared

struct KiterCompassView: View {
    let windDirectionDegrees: Double
    let speedKnots: Double
    let windUnit: WindUnit
    let safety: SafetyLevel
    let shoreType: ShoreType?

    private let compassSize: CGFloat = 180
    private let ringInset: CGFloat = 16
    private let arrowSize: CGFloat = 28

    /// Downwind direction: where the kiter gets pulled TO
    private var downwindDegrees: Double {
        windDirectionDegrees + 180
    }

    private var ringRadius: CGFloat {
        (compassSize - ringInset * 2) / 2
    }

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                // 1. Wind window — 3 layered arcs (green → yellow → red)
                PullZoneArc(centerAngle: downwindDegrees, spanDegrees: 160)
                    .fill(Color.green.opacity(0.25))
                    .frame(width: compassSize - ringInset * 2, height: compassSize - ringInset * 2)
                    .animation(.easeInOut(duration: AppConstants.Intervals.animationDuration), value: downwindDegrees)

                PullZoneArc(centerAngle: downwindDegrees, spanDegrees: 80)
                    .fill(Color.yellow.opacity(0.35))
                    .frame(width: compassSize - ringInset * 2, height: compassSize - ringInset * 2)
                    .animation(.easeInOut(duration: AppConstants.Intervals.animationDuration), value: downwindDegrees)

                PullZoneArc(centerAngle: downwindDegrees, spanDegrees: 40)
                    .fill(Color.red.opacity(0.45))
                    .frame(width: compassSize - ringInset * 2, height: compassSize - ringInset * 2)
                    .animation(.easeInOut(duration: AppConstants.Intervals.animationDuration), value: downwindDegrees)

                // 2. Wind axis dashed line
                WindAxisLine()
                    .stroke(safety.color.opacity(0.3), style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
                    .frame(width: compassSize - ringInset * 2, height: compassSize - ringInset * 2)
                    .rotationEffect(.degrees(windDirectionDegrees))
                    .animation(.easeInOut(duration: AppConstants.Intervals.animationDuration), value: windDirectionDegrees)

                // 3. Compass ring
                Circle()
                    .stroke(Color.secondary.opacity(0.3), lineWidth: 1.5)
                    .frame(width: compassSize - ringInset * 2, height: compassSize - ringInset * 2)

                // 4. Cardinal labels
                cardinalLabels

                // 5. Kiter image
                Image("Kiter")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 50, height: 50)

                // 6. Pull arrow on ring edge
                PullArrowShape()
                    .fill(safety.color)
                    .frame(width: arrowSize, height: arrowSize)
                    .shadow(color: safety.color.opacity(0.7), radius: 2)
                    .shadow(color: safety.color.opacity(0.3), radius: 8)
                    .offset(y: -ringRadius)
                    .rotationEffect(.degrees(downwindDegrees))
                    .animation(.easeInOut(duration: AppConstants.Intervals.animationDuration), value: downwindDegrees)
            }
            .frame(width: compassSize, height: compassSize)

            // Speed + shore type capsule
            infoCapsule
        }
    }

    // MARK: - Cardinal Labels

    private var cardinalLabels: some View {
        let labels: [(String, Double)] = [
            ("С", 0), ("В", 90), ("Ю", 180), ("З", 270)
        ]
        return ZStack {
            ForEach(labels, id: \.1) { label, angle in
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .offset(y: -(compassSize / 2 - 6))
                    .rotationEffect(.degrees(angle))
            }
        }
    }

    // MARK: - Info Capsule

    private var infoCapsule: some View {
        let displaySpeed = windUnit.convert(fromKnots: speedKnots).oneDecimal
        return VStack(spacing: 1) {
            Text("\(displaySpeed) \(windUnit.shortLabelRu)")
                .font(.caption.bold())
            if let shoreType {
                Text(shoreType.labelRu)
                    .font(.caption2)
                    .foregroundStyle(safety.color)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(.ultraThinMaterial, in: Capsule())
    }
}

// MARK: - Pull Zone Arc

/// A filled arc centered on a given angle with a specified span.
private struct PullZoneArc: Shape {
    var centerAngle: Double
    var spanDegrees: Double

    var animatableData: Double {
        get { centerAngle }
        set { centerAngle = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let radius = min(rect.width, rect.height) / 2
        let center = CGPoint(x: rect.midX, y: rect.midY)
        // SwiftUI angles: 0° = right (3 o'clock), clockwise
        // Our centerAngle: 0° = north, clockwise
        // Offset by -90 to convert from compass to SwiftUI angle space
        let start = centerAngle - spanDegrees / 2 - 90
        let end = centerAngle + spanDegrees / 2 - 90

        var path = Path()
        path.move(to: center)
        path.addArc(center: center, radius: radius, startAngle: .degrees(start), endAngle: .degrees(end), clockwise: false)
        path.closeSubpath()
        return path
    }
}

// MARK: - Wind Axis Line

/// A dashed vertical line through the center, rotated to wind direction.
private struct WindAxisLine: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: 0))
        path.addLine(to: CGPoint(x: rect.midX, y: rect.height))
        return path
    }
}

// MARK: - Pull Arrow Shape

/// Thick arrow pointing upward. Positioned on ring edge and rotated to downwind direction.
private struct PullArrowShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let h = rect.height
        let cx = w / 2

        var path = Path()
        // Arrowhead tip at top center
        path.move(to: CGPoint(x: cx, y: 0))
        // Right side of head
        path.addLine(to: CGPoint(x: w, y: h * 0.5))
        // Right notch
        path.addLine(to: CGPoint(x: cx + w * 0.15, y: h * 0.38))
        // Right shaft
        path.addLine(to: CGPoint(x: cx + w * 0.15, y: h))
        // Left shaft
        path.addLine(to: CGPoint(x: cx - w * 0.15, y: h))
        // Left notch
        path.addLine(to: CGPoint(x: cx - w * 0.15, y: h * 0.38))
        // Left side of head
        path.addLine(to: CGPoint(x: 0, y: h * 0.5))
        path.closeSubpath()

        return path
    }
}
