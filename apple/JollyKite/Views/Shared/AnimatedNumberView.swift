import SwiftUI

struct AnimatedNumberView: View {
    let value: Double
    let format: String

    @State private var displayValue: Double = 0

    var body: some View {
        Text(String(format: format, displayValue))
            .contentTransition(.numericText(value: displayValue))
            .onChange(of: value) { _, newValue in
                withAnimation(.easeInOut(duration: AppConstants.Intervals.animationDuration)) {
                    displayValue = newValue
                }
            }
            .onAppear {
                displayValue = value
            }
    }
}
