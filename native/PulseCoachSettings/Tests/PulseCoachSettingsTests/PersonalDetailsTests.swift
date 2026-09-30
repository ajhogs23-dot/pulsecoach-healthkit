import XCTest
@testable import PulseCoachSettings

final class PersonalDetailsTests: XCTestCase {
    func profile() -> PersonalDetails {
        var value = PersonalDetails()
        value.name = "Sam"; value.age = 35; value.heightCm = 180
        value.weightKg = 80; value.sexForEstimate = .male
        return value
    }
    func testBMIAndCalorieParityWithSharedTypeScriptProfile() {
        var value = profile()
        XCTAssertEqual(value.bmi, 24.7)
        XCTAssertEqual(value.calorieEstimate?.restingCalories, 1755)
        XCTAssertEqual(value.calorieEstimate?.maintenanceCalories, 2720)
        XCTAssertEqual(value.calorieEstimate?.recommendedCalories, 2990)
        value.weightKg = 90
        XCTAssertEqual(value.bmi, 27.8)
        XCTAssertNotEqual(value.calorieEstimate?.recommendedCalories, 2990)
    }
    func testCalorieModeRetainsChosenTarget() {
        var value = profile()
        value.calorieTarget = 2200
        XCTAssertEqual(value.activeCalorieTarget, 2200)
        value.calorieTargetMode = .estimated
        XCTAssertEqual(value.activeCalorieTarget, 2990)
        XCTAssertEqual(value.calorieTarget, 2200)
        value.calorieTargetMode = .selected
        XCTAssertEqual(value.activeCalorieTarget, 2200)
    }
    func testValidationAndWireFormat() throws {
        var value = profile()
        XCTAssertTrue(value.validationErrors.isEmpty)
        value.heightCm = 2; value.calorieTarget = 300
        XCTAssertNotNil(value.validationErrors["heightCm"])
        XCTAssertNotNil(value.validationErrors["calorieTarget"])
        let data = try JSONEncoder().encode(profile())
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(object["sexForEstimate"] as? String, "Male")
        XCTAssertEqual(object["goal"] as? String, "Build strength")
        XCTAssertNil(object["bmi"])
        XCTAssertNil(object["calorieEstimate"])
        XCTAssertEqual(try JSONDecoder().decode(PersonalDetails.self, from: data), profile())
    }
}

@MainActor final class PersonalDetailsStoreTests: XCTestCase {
    func testSaveAndReopenUsingSharedRepository() async {
        let repository = TestRepository()
        let store = PersonalDetailsStore(repository: repository)
        await store.load()
        store.draft.name = "Updated Sam"
        XCTAssertTrue(store.isDirty)
        await store.save()
        XCTAssertFalse(store.isDirty)
        let reopened = PersonalDetailsStore(repository: repository)
        await reopened.load()
        XCTAssertEqual(reopened.draft.name, "Updated Sam")
    }
    func testImperialUnitsDoNotRoundStoredMeasurements() async {
        let store = PersonalDetailsStore(repository: TestRepository())
        await store.load()
        store.units.wrappedValue = .imperial
        XCTAssertEqual(store.preview.heightCm, 180)
        XCTAssertEqual(store.preview.weightKg, 80)
        store.units.wrappedValue = .metric
        XCTAssertEqual(store.preview.weightKg, 80)
    }
    func testInvalidInputAndFailedSaveRemainEditable() async {
        let repository = TestRepository()
        let store = PersonalDetailsStore(repository: repository)
        await store.load()
        store.number(.weightKg).wrappedValue = "invalid"
        await store.save()
        XCTAssertNotNil(store.errors["weightKg"])
        XCTAssertEqual(store.number(.weightKg).wrappedValue, "invalid")
        store.number(.weightKg).wrappedValue = "85"
        repository.failSave = true
        await store.save()
        XCTAssertTrue(store.isDirty)
        XCTAssertEqual(store.preview.weightKg, 85)
        XCTAssertEqual(repository.value.weightKg, 80)
    }
    func testAccountChangeClearsDataAndRejectsSave() async {
        let repository = TestRepository()
        let store = PersonalDetailsStore(repository: repository)
        await store.load()
        repository.authenticatedUserID = "another-user"
        await store.save()
        XCTAssertNil(store.saved)
        XCTAssertEqual(store.draft.name, "")
        XCTAssertEqual(repository.saveCount, 0)
    }
}

@MainActor private final class TestRepository: PersonalDetailsRepository {
    var authenticatedUserID: String? = "test-user"
    var value: PersonalDetails
    var failSave = false
    var saveCount = 0
    init() {
        var initial = PersonalDetails()
        initial.name = "Sam"; initial.age = 35; initial.heightCm = 180
        initial.weightKg = 80; initial.sexForEstimate = .male
        value = initial
    }
    func load() async throws -> PersonalDetails { value }
    func save(_ details: PersonalDetails) async throws -> PersonalDetails {
        if failSave { throw URLError(.notConnectedToInternet) }
        saveCount += 1; value = details; return value
    }
}
