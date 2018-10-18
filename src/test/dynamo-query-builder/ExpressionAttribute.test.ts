import * as Chai from "chai";

import * as EA from "../../main/dynamo-query-builder/ExpressionAttribute";

const expect = Chai.expect;

describe("ExpressionAttribute", () => {
    it("Tests that the key created is returned when adding a name.", () => {
        const eaBuilder = new EA.AttributeBuilder();
        expect(eaBuilder.addName("test1")).to.equal("#____n_0");
        expect(eaBuilder.addName("test2")).to.equal("#____n_1");
        expect(eaBuilder.addName("test3")).to.equal("#____n_2");
        expect(eaBuilder.addName("test4")).to.equal("#____n_3");
    });

    it("Tests that the names are added and unique.", () => {
        const eaBuilder = new EA.AttributeBuilder();
        eaBuilder.addName("test1");
        eaBuilder.addName("test2");
        eaBuilder.addName("test3");
        eaBuilder.addName("test4");
        eaBuilder.addName("test5");
        expect(eaBuilder.expression).to.deep.equal({
            ExpressionAttributeNames: {
                "#____n_0": "test1",
                "#____n_1": "test2",
                "#____n_2": "test3",
                "#____n_3": "test4",
                "#____n_4": "test5"
            }
        });
    });

    it("Tests that names which are of nested attributes are split.", () => {
        const eaBuilder = new EA.AttributeBuilder();
        eaBuilder.addName("nested.attribute");
        eaBuilder.addName("attribute.nested");
        expect(eaBuilder.expression).to.deep.equal({
            ExpressionAttributeNames: {
                "#_____n_0": "nested",
                "#_____n_1": "attribute"
            }
        });
    });

    it("Tests that the key created is returned when adding a value.", () => {
        const eaBuilder = new EA.AttributeBuilder();
        expect(eaBuilder.addValue("test1")).to.equal(":____v_0");
        expect(eaBuilder.addValue("test2")).to.equal(":____v_1");
        expect(eaBuilder.addValue("test3")).to.equal(":____v_2");
        expect(eaBuilder.addValue("test4")).to.equal(":____v_3");
    });

    it("Tests that the values are added and unique.", () => {
        const eaBuilder = new EA.AttributeBuilder();
        eaBuilder.addValue("test1");
        eaBuilder.addValue("test2");
        eaBuilder.addValue("test3");
        eaBuilder.addValue("test4");
        eaBuilder.addValue("test5");
        expect(eaBuilder.expression).to.deep.equal({
            ExpressionAttributeValues: {
                ":____v_0": "test1",
                ":____v_1": "test2",
                ":____v_2": "test3",
                ":____v_3": "test4",
                ":____v_4": "test5"
            }
        });
    });

    describe("Merge", () => {
        it("Tests that merged results returns empty with undefined.", () => {
            const eaBuilder = new EA.AttributeBuilder();
            expect(eaBuilder.merge(undefined)).to.deep.equal({
                changedNames: {},
                changedValues: {}
            });
            expect(eaBuilder.expression).to.deep.equal({});
        });

        it("Tests that values are added to the expression.", () => {
            const eaBuilder = new EA.AttributeBuilder();
            const mergedResult = eaBuilder.merge({
                ExpressionAttributeNames: {
                    nParam1: "nValue1",
                    nParam2: "nValue2"
                },
                ExpressionAttributeValues: {
                    vParam1: "vValue1",
                    vParam2: "vValue2"
                }
            });
            expect(mergedResult).to.deep.equal({
                changedNames: {
                    nParam1: "#____n_0",
                    nParam2: "#____n_1"
                },
                changedValues: {
                    vParam1: ":____v_0",
                    vParam2: ":____v_1"
                }
            });
            expect(eaBuilder.expression).to.deep.equal({
                ExpressionAttributeNames: {
                    "#____n_0": "nValue1",
                    "#____n_1": "nValue2"
                },
                ExpressionAttributeValues: {
                    ":____v_0": "vValue1",
                    ":____v_1": "vValue2"
                }
            });
        });

        it("Tests that pre-loaded values are added to the expression.", () => {
            const eaBuilder = new EA.AttributeBuilder();
            eaBuilder.addName("Test1");
            eaBuilder.addName("Test2");
            eaBuilder.addValue("TestValue1");
            eaBuilder.addValue("TestValue2");
            const mergeResult = eaBuilder.merge({
                ExpressionAttributeNames: {
                    nParam1: "nValue1",
                    nParam2: "nValue2"
                },
                ExpressionAttributeValues: {
                    vParam1: "vValue1",
                    vParam2: "vValue2"
                }
            });
            expect(mergeResult).to.deep.equal({
                changedNames: {
                    nParam1: "#____n_2",
                    nParam2: "#____n_3"
                },
                changedValues: {
                    vParam1: ":____v_2",
                    vParam2: ":____v_3"
                }
            });
            expect(eaBuilder.expression).to.deep.equal({
                ExpressionAttributeNames: {
                    "#____n_0": "Test1",
                    "#____n_1": "Test2",
                    "#____n_2": "nValue1",
                    "#____n_3": "nValue2"
                },
                ExpressionAttributeValues: {
                    ":____v_0": "TestValue1",
                    ":____v_1": "TestValue2",
                    ":____v_2": "vValue1",
                    ":____v_3": "vValue2"
                }
            });
        });

        it("Tests that keys with conflicts don't cause issues.", () => {
            const eaBuilder = new EA.AttributeBuilder();
            eaBuilder.addName("Test1");
            eaBuilder.addName("Test2");
            eaBuilder.addValue("TestValue1");
            eaBuilder.addValue("TestValue2");
            const mergeResult = eaBuilder.merge({
                ExpressionAttributeNames: {
                    "#____n_0": "nValue1",
                    "#____n_1": "nValue2"
                },
                ExpressionAttributeValues: {
                    ":____v_0": "vValue1",
                    ":____v_1": "vValue2"
                }
            });
            expect(mergeResult).to.deep.equal({
                changedNames: {
                    "#____n_0": "#____n_2",
                    "#____n_1": "#____n_3"
                },
                changedValues: {
                    ":____v_0": ":____v_2",
                    ":____v_1": ":____v_3"
                }
            });
            expect(eaBuilder.expression).to.deep.equal({
                ExpressionAttributeNames: {
                    "#____n_0": "Test1",
                    "#____n_1": "Test2",
                    "#____n_2": "nValue1",
                    "#____n_3": "nValue2"
                },
                ExpressionAttributeValues: {
                    ":____v_0": "TestValue1",
                    ":____v_1": "TestValue2",
                    ":____v_2": "vValue1",
                    ":____v_3": "vValue2"
                }
            });
        });
    });

    describe.skip("apply", () => {
        it("Tests that an empty string is handled.", () => {
            const builder = new EA.AttributeBuilder();
            builder.addName("Test");
            builder.addValue("Value");
            expect(builder.apply("")).to.equal("");
            expect(builder.apply()).to.equal("");
        });

        it("Tests that items are replaced.", () => {
            const builder = new EA.AttributeBuilder();
            builder.addName("Test");
            builder.addValue("Value");
            expect(builder.apply("Test=Value")).to.equal("#____n_0=:____v_0");
        });

        it("Tests that items are replaced if occurs multiple times.", () => {
            const builder = new EA.AttributeBuilder();
            builder.addName("Test");
            builder.addValue("Value");
            expect(builder.apply("Test=Value OR Test=Value OR Test=Value")).to.equal("#____n_0=:____v_0 OR #____n_0=:____v_0 OR #____n_0=:____v_0");
        });

        it("Tests that case is handled where value and name can be swapped.", () => {
            const builder = new EA.AttributeBuilder();
            builder.addName("Test");
            builder.addName("Value");
            builder.addValue("Test");
            builder.addValue("Value");
            console.log(builder.expression);
            expect(builder.apply("Test=Value AND Value=Test")).to.equal("#____n_0=:____v_0 AND #____n_1=:____v_1");
        });

        it("Tests that name conflicts are handled.", () => {
            const builder = new EA.AttributeBuilder();
            builder.addName("#____n_2");
            builder.addName("#____n_1");
            builder.addName("#____n_0");
            builder.addValue(":____v_2");
            builder.addValue(":____v_1");
            builder.addValue(":____v_0");

            console.log(builder.expression);
            expect(builder.apply("#____n_2=:____v_2 AND #____n_1=:____v_1 AND #____n_0=:____v_0")).to.equal("#____n_0=:____v_0 AND #____n_1=:____v_1 AND #____n_2=:____v_2");
        });
    });
});
