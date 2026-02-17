import SwiftUI
import JollyKiteShared

struct WindArrowAnnotation: View {
    let degrees: Double
    let speedKnots: Double
    let speedText: String
    let unit: WindUnit
    let safety: SafetyLevel
    let shoreType: ShoreType?
    let mapHeading: Double

    var body: some View {
        KiterCompassView(
            windDirectionDegrees: degrees,
            speedKnots: speedKnots,
            windUnit: unit,
            safety: safety,
            shoreType: shoreType
        )
        .rotationEffect(.degrees(-mapHeading))
    }
}
