import SwiftUI
import JollyKiteShared

struct WindHeroCardView: View {
    let speedKnots: Double
    let directionText: String
    let gustKnots: Double?
    let maxGustKnots: Double?
    let windUnit: WindUnit

    private var speedConverted: Double {
        windUnit.convert(fromKnots: speedKnots)
    }

    var body: some View {
        VStack(spacing: 16) {
            // Top row: speed + direction
            HStack(alignment: .top) {
                // Speed
                VStack(alignment: .leading, spacing: 2) {
                    AnimatedNumberView(value: speedConverted, format: "%.1f")
                        .font(.system(size: 52, weight: .bold, design: .rounded))
                    Text(windUnit.shortLabelRu)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Direction
                VStack(alignment: .trailing, spacing: 2) {
                    Text(directionText)
                        .font(.system(size: 52, weight: .bold, design: .rounded))
                    Text("Направление")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            // Gradient bar
            GradientBarView(speed: speedKnots)

            // Bottom row: gusts
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Порывы")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text(gustKnots.map { windUnit.convert(fromKnots: $0).oneDecimal } ?? "--")
                            .font(.title3.bold())
                        Text(windUnit.shortLabelRu)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("Макс сегодня")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text(maxGustKnots.map { windUnit.convert(fromKnots: $0).oneDecimal } ?? "--")
                            .font(.title3.bold())
                        Text(windUnit.shortLabelRu)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}
