import * as Chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import NormalSchemaBuilder, { NormalSchema, UNKNOWN } from "../NormalSchemaBuilder";

Chai.use(SinonChai);
const expect = Chai.expect;

describe(NormalSchemaBuilder.name, () => {
    buildNormalSchemaTests<NormalSchemaBuilder>({
        schemaBuilder: (key, schema) => new NormalSchemaBuilder(key, {...schema, type: "Anything" }),
    });
});

export type PartialSchema<DT> = Pick<NormalSchema<DT>, Exclude<keyof NormalSchema<DT>, "type">>;

export type SchemaBuilder<SB extends NormalSchemaBuilder, DT> = (key: string, schema: PartialSchema<DT>) => SB;

export type TestExtension<SB extends NormalSchemaBuilder, DT> = (schemaBuilder: SchemaBuilder<SB, DT>) => void;

export interface NormalSchemaBuilderTestProps<SB extends NormalSchemaBuilder, DT = unknown> {
    schemaBuilder: SchemaBuilder<SB, DT>;
    /**
     * The type that the object is supposed to be.
     *
     * @type {string}
     * @memberof NormalSchemaBuilderTestProps
     */
    valueType?: string;
    /**
     * Additional tests to run under the "Object Validation" section.
     *
     * @type {TestExtension<SB, DT>}
     * @memberof NormalSchemaBuilderTestProps
     */
    validationTests?: TestExtension<SB, DT>;
    /**
     * Additional tests to run under the "Update Object Validation" section.
     *
     * @type {TestExtension<SB, DT>}
     * @memberof NormalSchemaBuilderTestProps
     */
    updateValidationTests?: TestExtension<SB, DT>;
    /**
     * Additional tests to run under the "Convert object to schema" section.
     *
     * @type {TestExtension<SB, DT>}
     * @memberof NormalSchemaBuilderTestProps
     */
    convertToSchemaTests?: TestExtension<SB, DT>;
    /**
     * Additional tests to run under the "Convert update object to schema" section.
     *
     * @type {TestExtension<SB, DT>}
     * @memberof NormalSchemaBuilderTestProps
     */
    convertUpdateToSchemaTests?: TestExtension<SB, DT>;
    /**
     * Additional tests to run under the "Convert From Schema" section.
     *
     * @type {TestExtension<SB, DT>}
     * @memberof NormalSchemaBuilderTestProps
     */
    convertFromSchemaTests?: TestExtension<SB, DT>;
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
// tslint:disable:no-null-keyword
export function buildNormalSchemaTests<SB extends NormalSchemaBuilder = NormalSchemaBuilder, DT = unknown>(props: NormalSchemaBuilderTestProps<SB, DT>) {
    const {
        schemaBuilder,
        valueType } = props;

    describe(NormalSchemaBuilder.prototype.validateObjectAgainstSchema.name, () => {

        it("Tests that an error is thrown if the object contains an undefined item for a required item.", () => {
            const schema = schemaBuilder("Test", { required: true });
            checkForErrors(
                () => schema.validateObjectAgainstSchema({ "Test": undefined }),
                [`Key "Test" is required but is not defined.`]);
        });

        const { validationTests } = props;

        if (validationTests) {
            validationTests(schemaBuilder);
        }
    });

    describe(NormalSchemaBuilder.prototype.validateUpdateObjectAgainstSchema.name, () => {

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
                [`Key "Test" is required and can not be removed.`]);
        });

        it("Tests that an error is thrown if the set object contains an undefined item for a required item.", () => {
            const schema = schemaBuilder("Test", { required: true });
            checkForErrors(
                () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": undefined } }),
                [`Key "Test" is required and can not be removed.`]);
        });

        it("Tests that no error is thrown if the set object does *not* contain a required item.", () => {
            const schema = schemaBuilder("Test", { required: true });
            checkForErrors(
                () => schema.validateUpdateObjectAgainstSchema({ set: { "SomethingElse": undefined } }),
                []);
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
                    it("Tests that an error is thrown if the user is attempting to set the wrong type.", () => {
                        const testValue = (valueType === "number") ? "testString" : 4;
                        checkForErrors(
                            () => schema.validateObjectAgainstSchema({ "Test": testValue }),
                            [`Key "Test" is expected to be of type ${valueType} but got ${typeof testValue}.`]
                        );
                    });

                    it("Tests that an error is not thrown if the user is attempting to set the object and undefined.", () => {
                        const testValue = undefined as string;
                        checkForErrors(
                            () => schema.validateObjectAgainstSchema({ "Test": testValue }),
                            []
                        );
                    });

                    it("Tests that an error is thrown if the user is attempting to change the type.", () => {
                        // The test Value must be something other than the type that it is supposed to be.
                        const testValue = (valueType === "number") ? "testString" : 4;
                        checkForErrors(
                            () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": testValue } }),
                            [`Key "Test" is expected to be of type ${valueType} but got ${typeof testValue}.`]
                        );
                    });

                    it("Tests that no error is thrown if the object is undefined.", () => {
                        const testValue = undefined as string;
                        checkForErrors(
                            () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": testValue } }),
                            []
                        );
                    });
                }
            }
        });

        const { updateValidationTests } = props;

        if (updateValidationTests) {
            updateValidationTests(schemaBuilder);
        }
    });

    describe(NormalSchemaBuilder.prototype.convertObjectFromSchema.name, () => {
        it("Tests that the object is ignored if the key doesn't exist in it.", () => {
            const c1 = {
                toObj: Sinon.stub().callsFake((item) =>  item),
                fromObj: Sinon.stub().callsFake((item) => (item != null) ? item + "-1" : item)
            };
            const schema = schemaBuilder("Test", { process: c1 });
            const item = schema.convertObjectFromSchema({
                "NotTheItem": "Value",
                "AlsoNotTheItem": "Value2"
            });

            expect(item).to.deep.equal({
                "NotTheItem": "Value",
                "AlsoNotTheItem": "Value2"
            });
        });

        it("Tests that the item is converted.", () => {
            const c1 = {
                toObj: Sinon.stub().callsFake((item) => item),
                fromObj: Sinon.stub().callsFake((item) => (item != null) ? item + "-1" : item)
            };
            const c2 = {
                toObj: Sinon.stub().callsFake((item) => item),
                fromObj: Sinon.stub().callsFake((item) => (item != null) ? item + "-2" : item)
            };
            // Throwing this in to ensure no crashes.
            const c3 = {
                toObj: Sinon.stub().callsFake((item) => item),
            };
            const schema = schemaBuilder("Test", { process: [c1, c2, c3] });
            const item = schema.convertObjectFromSchema({
                "Test": "Value"
            });
            expect(c1.fromObj).to.have.been.calledWith("Value");
            expect(c2.fromObj).to.have.been.calledWith("Value-1");
            expect(c1.fromObj).to.have.been.calledBefore(c2.fromObj);
            expect(item["Test"]).to.not.equal("Value");
        });

        const { convertFromSchemaTests } = props;
        if (convertFromSchemaTests) {
            convertFromSchemaTests(schemaBuilder);
        }
    });

    describe(NormalSchemaBuilder.prototype.convertObjectToSchema.name, () => {
        it("Tests that the object is ignored if the key is not in it.", () => {
            const p1 = Sinon.stub().callsFake((item) => (item != null) ? item + "-1" : item);
            const p2 = Sinon.stub().callsFake((item) => (item != null) ? item + "-2" : item);
            const schema = schemaBuilder("Test", { process: [p1, p2] });
            // There's no validation so it doesn't really matter what we throw in here.
            const obj = schema.convertObjectToSchema({
                "NotTheKeyWeWant": "OldValue",
                "AlsoNotTheKeyWeWant": "OldValue2"
            });

            expect(obj).to.deep.equal({
                "NotTheKeyWeWant": "OldValue",
                "AlsoNotTheKeyWeWant": "OldValue2"
            });
        });

        it("Tests that the processors worked.", () => {
            const p1 = Sinon.stub().callsFake((item) => (item != null) ? item + "-1" : item);
            const p2 = Sinon.stub().callsFake((item) => (item != null) ? item + "-2" : item);
            const schema = schemaBuilder("Test", { process: [p1, p2] });
            // There's no validation so it doesn't really matter what we throw in here.
            const obj = schema.convertObjectToSchema({
                "Test": "OldValue"
            });
            expect(p1).to.have.been.calledOnce;
            expect(p2).to.have.been.calledOnce;
            expect(p1).to.have.been.calledBefore(p2);
            expect(p1).to.have.been.calledWith("OldValue");
            expect(p2).to.have.been.calledWith("OldValue-1");
            expect(obj["Test"]).to.not.equal("OldValue");
        });

        const { convertToSchemaTests: makeObjectTests } = props;

        if (makeObjectTests) {
            makeObjectTests(schemaBuilder);
        }
    });

    describe(NormalSchemaBuilder.prototype.convertUpdateObjectToSchema.name, () => {
        it("Tests that the processors worked.", () => {
            const p1 = Sinon.stub().callsFake((item) => (item != null) ? item + "-1" : item);
            const p2 = Sinon.stub().callsFake((item) => (item != null) ? item + "-2" : item);
            const schema = schemaBuilder("Test", { process: [p1, p2] as any });
            // There's no validation so it doesn't really matter what we throw in here.
            const obj = schema.convertUpdateObjectToSchema({
                set: {
                    "Test": "OldValue",
                    "AnotherTest": "OldValue"
                }
            });
            expect(p1).to.have.been.calledOnce;
            expect(p2).to.have.been.calledOnce;
            expect(p1).to.have.been.calledWith("OldValue");
            expect(p2).to.have.been.calledWith("OldValue-1");
            expect(p1).to.have.been.calledBefore(p2);
            expect(obj.set["Test"]).to.not.equal("OldValue");
            expect(obj.set["AnotherTest"]).to.equal("OldValue");
        });

        const { convertUpdateToSchemaTests: makeUpdateObjectTests } = props;

        if (makeUpdateObjectTests) {
            makeUpdateObjectTests(schemaBuilder);
        }
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