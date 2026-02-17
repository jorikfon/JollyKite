import SwiftUI
import JollyKiteShared

struct WindArrowAnnotation: View {
    let degrees: Double
    let speedKnots: Double
    let speedText: String
    let unit: WindUnit
    let safety: SafetyLevel
    let shoreType: ShoreType?

    var body: some View {
        KiterCompassView(
            windDirectionDegrees: degrees,
            speedKnots: speedKnots,
            windUnit: unit,
            safety: safety,
            shoreType: shoreType
        )
    }
}
