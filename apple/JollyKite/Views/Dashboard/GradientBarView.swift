import SwiftUI
import JollyKiteShared

struct GradientBarView: View {
    let speed: Double

    private let maxSpeed = AppConstants.WindThresholds.maxGauge
    private let segments: [(range: ClosedRange<Double>, color: Color, label: String)] = [
        (0...5, .blue.opacity(0.5), "Штиль"),
        (5...12, .green, "Лёгкий"),
        (12...20, .yellow, "Хороший"),
        (20...30, .orange, "Сильный"),
        (30...40, .red, "Опасно"),
    ]

    private var normalizedPosition: Double {
        min(speed / maxSpeed, 1.0)
    }

    var body: some View {
        VStack(spacing: 4) {
            GeometryReader { geometry in
                let width = geometry.size.width
                ZStack(alignment: .leading) {
                    // Gradient bar
                    HStack(spacing: 0) {
                        ForEach(segments.indices, id: \.self) { index in
                            let seg = segments[index]
                            let segWidth = (seg.range.upperBound - seg.range.lowerBound) / maxSpeed
                            Rectangle()
                                .fill(seg.color)
                                .frame(width: width * segWidth)
                        }
                    }
                    .clipShape(Capsule())
                    .frame(height: 8)

                    // Indicator
                    Circle()
                        .fill(.white)
                        .frame(width: 14, height: 14)
                        .shadow(radius: 2)
                        .offset(x: width * normalizedPosition - 7)
                        .animation(.easeInOut(duration: AppConstants.Intervals.animationDuration), value: speed)
                }
            }
            .frame(height: 14)

            // Labels
            HStack {
                ForEach(segments, id: \.label) { seg in
                    Text(seg.label)
                        .font(.system(size: 9))
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.horizontal, 4)
    }
}
