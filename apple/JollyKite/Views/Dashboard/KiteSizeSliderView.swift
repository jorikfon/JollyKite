import SwiftUI
import JollyKiteShared

struct KiteSizeSliderView: View {
    let recommendation: KiteSizeRecommendation
    let windSpeed: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "flag.fill")
                    .foregroundStyle(suitabilityColor)
                Text("Рекомендация кайта")
                    .font(.headline)
                Spacer()
            }

            HStack(alignment: .firstTextBaseline) {
                Text(recommendation.sizeFormatted)
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundStyle(suitabilityColor)

                VStack(alignment: .leading, spacing: 2) {
                    Text(recommendation.suitability.labelRu)
                        .font(.subheadline)
                        .foregroundStyle(suitabilityColor)
                    Text("для \(recommendation.recommendedWeight) кг")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Available sizes
            HStack(spacing: 6) {
                ForEach(AppConstants.KiteSizes.available, id: \.self) { size in
                    let isOptimal = size == recommendation.size
                    Text(size.noDecimal)
                        .font(.caption2.bold())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(isOptimal ? suitabilityColor : Color.secondary.opacity(0.15))
                        .foregroundStyle(isOptimal ? .white : .primary)
                        .clipShape(Capsule())
                }
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private var suitabilityColor: Color {
        switch recommendation.suitability {
        case .optimal: return .green
        case .good: return .blue
        case .acceptable: return .yellow
        case .tooSmall, .tooLarge: return .orange
        case .tooWeak, .tooStrong: return .red
        }
    }
}
