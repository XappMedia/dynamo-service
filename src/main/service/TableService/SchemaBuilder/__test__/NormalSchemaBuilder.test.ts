import * as Chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import NormalSchemaBuilder, { NormalSchema, UNKNOWN } from "../NormalSchemaBuilder";

Chai.use(SinonChai);
const expect = Chai.expect;

describe.only("NormalSchemaBuilder", () => {
    buildNormalSchemaTests<NormalSchemaBuilder>({
        schemaBuilder: (key, schema) => new NormalSchemaBuilder(key, {...schema, type: "Anything" })
    });
});

export type PartialSchema<DT> = Pick<NormalSchema<DT>, Exclude<keyof NormalSchema<DT>, "type">>;

export type SchemaBuilder<SB extends NormalSchemaBuilder, DT> = (key: string, schema: PartialSchema<DT>) => SB;

export type TestExtension<SB extends NormalSchemaBuilder, DT> = (schemaBuilder: SchemaBuilder<SB, DT>) => void;

export interface NormalSchemaBuilderTestProps<SB extends NormalSchemaBuilder, DT = unknown> {
    schemaBuilder: SchemaBuilder<SB, DT>;
    valueType?: string;
    updateValidationTests?: TestExtension<SB, DT>;
    makeObjectTests?: TestExtension<SB, DT>;
}

/**
 * This is a testing function that can be used by other classes
 * which inherit from the Normal Schema. This will test the class
 * to ensure that all the validations and make objects still
 * work (i.e. the extending classes are still calling the super.);
 *
 * @export
 * @param {(key: string, schema: NormalSchema, valueType?: string) => NormalSchemaBuilder} schemaBuilder
 */
export function buildNormalSchemaTests<SB extends NormalSchemaBuilder = NormalSchemaBuilder, DT = unknown>(props: NormalSchemaBuilderTestProps<SB, DT>) {
    const { schemaBuilder, valueType, makeObjectTests, updateValidationTests } = props;
    describe("Update validation", () => {
        it("Tests that an error is thrown if the set object contains a constant item.", () => {
            const schema = schemaBuilder("Test", { constant: true });
            checkForErrors(
                () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": "New" } }),
                [`Key "Test" is constant and can not be modified.`]);
        });

        it("Tests that an error is thrown if the set object contains a primary item.", () => {
            const schema = schemaBuilder("Test", { primary: true });
            checkForErrors(
                () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": "New" } }),
                [`Key "Test" is constant and can not be modified.`]);
        });

        it("Tests that an error is thrown if the set object contains a sort item.", () => {
            const schema = schemaBuilder("Test", { sort: true });
            checkForErrors(
                () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": "New" } }),
                [`Key "Test" is constant and can not be modified.`]);
        });

        it("Tests that an error is thrown if the append object contains a constant item.", () => {
            const schema = schemaBuilder("Test", { constant: true });
            checkForErrors(
                () => schema.validateUpdateObjectAgainstSchema({ append: { "Test": "New" } }),
                [`Key "Test" is constant and can not be modified.`]);
        });

        it("Tests that an error is thrown if the remove object contains a constant item.", () => {
            const schema = schemaBuilder("Test", { constant: true });
            checkForErrors(
                () => schema.validateUpdateObjectAgainstSchema({ remove: ["Test"] }),
                [`Key "Test" is constant and can not be modified.`]);
        });

        it("Tests that no error is thrown if the item is not constant.", () => {
            const schema = schemaBuilder("Test", { });
            checkForErrors(
                () => schema.validateUpdateObjectAgainstSchema({ remove: ["Test"] }),
                []);
        });

        it("Tests that an error is thrown if removing a required item.", () => {
            const schema = schemaBuilder("Test", { required: true });
            checkForErrors(
                () => schema.validateUpdateObjectAgainstSchema({ remove: ["Test"] }),
                [`Key "Test" is required but it is being removed.`]);
        });

        it("Tests that an error is thrown if the set object contains an undefined item for a required item.", () => {
            const schema = schemaBuilder("Test", { required: true });
            checkForErrors(
                () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": undefined } }),
                [`Key "Test" is required but it is being removed.`]);
        });

        describe("Testing value type.", () => {
            const schema = schemaBuilder("Test", { });

            it("Tests that the schema has a value type.", () => {
                expect(schema.valueType, "No value type was supplied. It must be defined or of type UNKNOWN constant.").to.exist;
            });

            if (valueType) {
                it("Tests that the schema value type is the same as the provided value type.", () => {
                    expect(schema.valueType).to.equal(valueType);
                });
            }

            if (schema.valueType) {
                if (schema.valueType === UNKNOWN) {
                    it("Tests that no error is thrown if the type was not specified (implying it can truly be anything).", () => {
                        const schema = schemaBuilder("Test", { });
                        checkForErrors(
                            () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": 4 } }),
                            []
                        );
                    });
                } else {
                    it("Tests that an error is thrown if the user is attempting to change the type.", () => {
                        // The test Value must be something other than the type that it is supposed to be.
                        const testValue = (valueType === "number") ? "testString" : 4;
                        checkForErrors(
                            () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": testValue } }),
                            [`Key "Test" is expected to be of type ${valueType} but got ${typeof testValue}.`]
                        );
                    });
                }
            }
        });

        if (updateValidationTests) {
            updateValidationTests(schemaBuilder);
        }
    });

    describe("convertObjectToSchema", () => {
        it("Tests that a processor processes it in order.", () => {
            const p1 = Sinon.stub().callsFake((item) => item);
            const p2 = Sinon.stub().callsFake((item) => item);
            const schema = schemaBuilder("Test", { process: [p1, p2] as any });
            // There's no validation so it doesn't really matter what we throw in here.
            schema.convertObjectToSchema({
                "Test": "Value"
            });
            expect(p1).to.have.been.calledWith("Value");
            expect(p2).to.have.been.calledWith("Value");
            expect(p1).to.have.been.calledBefore(p2);
        });

        it("Tests that the processors worked.", () => {
            const p1 = Sinon.stub().callsFake((item) => item + "-1");
            const p2 = Sinon.stub().callsFake((item) => item + "-2");
            const schema = schemaBuilder("Test", { process: [p1, p2] as any });
            // There's no validation so it doesn't really matter what we throw in here.
            const obj = schema.convertObjectToSchema({
                "Test": "OldValue"
            });
            expect(obj).to.deep.equal({
                "Test": "OldValue-1-2"
            });
        });

        if (makeObjectTests) {
            makeObjectTests(schemaBuilder);
        }
    });

    describe("convertUpdateObjectToSchema", () => {
        it("Tests that the processors are called with the set object.", () => {
            const p1 = Sinon.stub().callsFake((item) => item);
            const p2 = Sinon.stub().callsFake((item) => item);
            const schema = schemaBuilder("Test", { process: [p1, p2] as any });
            // There's no validation so it doesn't really matter what we throw in here.
            schema.convertUpdateObjectToSchema({
                set: {
                    "Test": "Value"
                }
            });
            expect(p1).to.have.been.calledWith("Value");
            expect(p2).to.have.been.calledWith("Value");
            expect(p1).to.have.been.calledBefore(p2);
        });

        it("Tests that the processors worked.", () => {
            const p1 = Sinon.stub().callsFake((item) => item + "-1");
            const p2 = Sinon.stub().callsFake((item) => item + "-2");
            const schema = schemaBuilder("Test", { process: [p1, p2] as any });
            // There's no validation so it doesn't really matter what we throw in here.
            const obj = schema.convertUpdateObjectToSchema({
                set: {
                    "Test": "OldValue"
                }
            });
            expect(obj).to.deep.equal({
                set: {
                    "Test": "OldValue-1-2"
                }
            });
        });
    });
}

export function checkForErrors(callback: () => string[], expectedErrors: string[] = []) {
    const errors = callback();
    if (expectedErrors.length > 0) {
        expect(errors).to.contain.members(expectedErrors);
    } else {
        expect(errors).to.have.length(0);
    }
}