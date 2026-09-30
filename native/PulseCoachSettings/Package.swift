// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PulseCoachSettings",
    platforms: [.iOS(.v16)],
    products: [.library(name: "PulseCoachSettings", targets: ["PulseCoachSettings"])],
    targets: [
        .target(name: "PulseCoachSettings"),
        .testTarget(name: "PulseCoachSettingsTests", dependencies: ["PulseCoachSettings"])
    ]
)
