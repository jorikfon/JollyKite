// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "JollyKiteShared",
    platforms: [
        .iOS(.v17),
        .watchOS(.v10),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "JollyKiteShared",
            targets: ["JollyKiteShared"]
        )
    ],
    targets: [
        .target(
            name: "JollyKiteShared",
            path: "Sources/JollyKiteShared"
        ),
        .testTarget(
            name: "JollyKiteSharedTests",
            dependencies: ["JollyKiteShared"],
            path: "Tests/JollyKiteSharedTests"
        )
    ]
)
