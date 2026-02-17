import SwiftUI
import JollyKiteShared

struct WindStatusCardView: View {
    let conditionIcon: String
    let conditionName: String
    let safetySubtitle: String
    let safetyColor: Color
    let trend: WindTrend?
    let trendDescription: String?
    let kiteRecommendation: KiteSizeRecommendation?
    let riderWeight: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Condition row
            HStack(spacing: 8) {
                Text(conditionIcon)
                    .font(.system(size: 36))
                VStack(alignment: .leading, spacing: 2) {
                    Text(conditionName)
                        .font(.title2.bold())
                    Text(safetySubtitle)
                        .font(.subheadline)
                        .foregroundStyle(safetyColor)
                }
            }

            Divider()

            // Trend row
            if let trend, trend.hasData, let trendDescription {
                HStack(spacing: 6) {
                    Image(systemName: trend.sfSymbol)
                        .font(.subheadline.bold())
                    Text(trendDescription)
                        .font(.subheadline)
                }
                .foregroundStyle(trend.swiftUIColor)
            }

            // Direction stability row
            if let trend, let dirStability = trend.directionTrend, dirStability != .insufficientData {
                HStack(spacing: 6) {
                    Image(systemName: dirStability.sfSymbol)
                        .font(.subheadline.bold())
                    Text(dirStability.labelRu)
                        .font(.subheadline)
                }
                .foregroundStyle(dirStability == .stable ? .green : dirStability == .variable ? .yellow : .orange)
            }

            // Kite recommendation row
            if let rec = kiteRecommendation,
               rec.suitability != .tooWeak,
               rec.suitability != .tooStrong {
                HStack(spacing: 6) {
                    Text("🪁")
                        .font(.subheadline)
                    Text(rec.sizeFormatted)
                        .font(.subheadline.bold())
                    Text("—")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(rec.suitability.labelRu)
                        .font(.subheadline)
                        .foregroundStyle(suitabilityColor(rec.suitability))
                    Text("для \(Int(riderWeight)) кг")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private func suitabilityColor(_ suitability: KiteSuitability) -> Color {
        switch suitability {
        case .optimal: return .green
        case .good: return .green.opacity(0.8)
        case .acceptable: return .yellow
        case .tooSmall, .tooLarge: return .orange
        case .tooWeak, .tooStrong: return .red
        }
    }
}
