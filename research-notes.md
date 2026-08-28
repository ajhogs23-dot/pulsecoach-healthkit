# Research notes for PulseCoach education tools

## FDA peptide compounding safety

The FDA page “Certain Bulk Drug Substances for Use in Compounding that May Present Significant Safety Risks” states that bulk drug substances used in compounding may present significant safety risks and lists substances under category 2 of its interim policies. The page includes examples of peptide-related entries such as GHRP-2, GHRP-6, ibutamoren mesylate, ipamorelin acetate, and kisspeptin-10, with risks or limited safety information described for particular routes or contexts. The app should therefore present source dates, approval/compounding status, route-specific uncertainty, and a clinician/pharmacist review prompt rather than make goal-based recommendations.

Source: https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks

## NIH dietary-supplement resources

The NIH Office of Dietary Supplements fact-sheet directory describes consumer and health-professional resources covering vitamins, minerals, herbs, botanicals, probiotics, and other ingredients. The directory includes exercise-performance resources and entries such as caffeine, creatine, protein, beta-alanine, citrulline, and whey protein. The app’s supplement research cards should use evidence, safety, recommended-use context, and interaction information, and should distinguish product-label guidance from individualized medical advice.

Source: https://ods.od.nih.gov/factsheets/list-all/

## Food product and nutrition catalog options

Open Food Facts documents a barcode lookup endpoint that can return product fields such as product name and nutrition grades, and it is suitable for an initial barcode-scanning prototype. The app should show whether a product was found, the source, and the completeness/confidence of the returned fields.

Source: https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-off-api/

USDA FoodData Central documents search and food-detail REST endpoints and includes current branded-food data, but requests require a data.gov API key. A production integration should keep that key server-side and use the service for nutrient details and search rather than exposing credentials in the iPhone bundle.

Source: https://fdc.nal.usda.gov/api-guide/
