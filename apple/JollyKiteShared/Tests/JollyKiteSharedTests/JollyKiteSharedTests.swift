import XCTest
@testable import JollyKiteShared

final class JollyKiteSharedTests: XCTestCase {

    // MARK: - Wind Safety

    func testOffshoreIsDanger() {
        let result = WindSafetyService.evaluate(direction: 270, speedKnots: 15)
        XCTAssertEqual(result, .danger)
    }

    func testOnshoreGoodWind() {
        let result = WindSafetyService.evaluate(direction: 90, speedKnots: 15)
        XCTAssertEqual(result, .excellent)
    }

    func testWeakWind() {
        let result = WindSafetyService.evaluate(direction: 90, speedKnots: 3)
        XCTAssertEqual(result, .low)
    }

    func testExtremeSpeedIsDanger() {
        let result = WindSafetyService.evaluate(direction: 90, speedKnots: 35)
        XCTAssertEqual(result, .danger)
    }

    func testSideshoreModerateIsGood() {
        let result = WindSafetyService.evaluate(direction: 180, speedKnots: 12)
        XCTAssertEqual(result, .good)
    }

    // MARK: - Unit Conversion

    func testMphToKnots() {
        let knots = UnitConverter.mphToKnots(10)
        XCTAssertEqual(knots, 8.68976, accuracy: 0.001)
    }

    func testKmhToKnots() {
        let knots = UnitConverter.kmhToKnots(20)
        XCTAssertEqual(knots, 10.79914, accuracy: 0.001)
    }

    func testKnotsToMs() {
        let ms = UnitConverter.knotsToMs(10)
        XCTAssertEqual(ms, 5.14444, accuracy: 0.001)
    }

    func testMsToKnotsRoundTrip() {
        let knots = 15.0
        let ms = UnitConverter.knotsToMs(knots)
        let backToKnots = UnitConverter.msToKnots(ms)
        XCTAssertEqual(backToKnots, knots, accuracy: 0.01)
    }

    // MARK: - Wind Direction

    func testCompassFromDegrees() {
        XCTAssertEqual(CompassPoint.from(degrees: 0), .N)
        XCTAssertEqual(CompassPoint.from(degrees: 45), .NE)
        XCTAssertEqual(CompassPoint.from(degrees: 90), .E)
        XCTAssertEqual(CompassPoint.from(degrees: 180), .S)
        XCTAssertEqual(CompassPoint.from(degrees: 270), .W)
        XCTAssertEqual(CompassPoint.from(degrees: 359), .N)
    }

    func testWindDirectionShoreType() {
        XCTAssertEqual(WindDirection(degrees: 90).shoreType, .onshore)
        XCTAssertEqual(WindDirection(degrees: 270).shoreType, .offshore)
        XCTAssertEqual(WindDirection(degrees: 180).shoreType, .sideshore)
    }

    // MARK: - Kite Size

    func testKiteSizeRecommendation() {
        let rec = KiteSizeService.recommend(
            windSpeedKnots: 15,
            riderWeight: 75,
            boardType: .twintip
        )
        XCTAssertNotNil(rec)
        XCTAssertTrue(KiteSizeService.availableSizes.contains(rec!.size))
    }

    func testKiteSizeTooWeakWind() {
        let rec = KiteSizeService.recommend(
            windSpeedKnots: 3,
            riderWeight: 75,
            boardType: .twintip
        )
        XCTAssertNil(rec)
    }

    func testHydrofoilNeedsLessWind() {
        XCTAssertLessThan(BoardType.hydrofoil.minWind, BoardType.twintip.minWind)
    }

    // MARK: - WindUnit

    func testWindUnitFormat() {
        let formatted = WindUnit.knots.format(15.3)
        XCTAssertEqual(formatted, "15.3 kn")
    }

    func testWindUnitConversion() {
        let ms = WindUnit.metersPerSecond.convert(fromKnots: 10)
        XCTAssertEqual(ms, 5.14444, accuracy: 0.001)
    }

    // MARK: - Working Hours

    func testWorkingHoursTimezone() {
        XCTAssertEqual(WorkingHoursService.bangkokTimezone.identifier, "Asia/Bangkok")
    }
}
