import * as Chai from "chai";
import { expandObj } from "../ExpandObj";

const expect = Chai.expect;

describe.only(expandObj.name, () => {
    it("Tests that undefined is handled.", () => {
        expect(expandObj(undefined)).to.be.undefined;
    });

    it("Tests that an primitive is handled.", () => {
        expect(expandObj(5)).to.equal(5);
    });

    it("Tests that it works with an empty object", () => {
        expect(expandObj({})).to.deep.equal({});
    });

    it("Tests that an object is returned as-is", () => {
        expect(expandObj({
            one: {
                two: {
                    three: 5
                }
            }
        })).to.deep.equal({
            one: {
                two: {
                    three: 5
                }
            }
        });
    });

    it("Tests that the object is expanded.", () => {
        expect(expandObj({
            "one.two.three": 5,
            "four.five.six": {
                param1: "Value"
            }
        })).to.deep.equal({
            one: {
                two: {
                    three: 5
                }
            },
            four: {
                five: {
                    six: {
                        param1: "Value"
                    }
                }
            }
        });
    });

    it("Tests that the object is expanded in nested.", () => {
        expect(expandObj({
            "one.two.three": {
                "four.five.six": {
                    param1: "Value"
                }
            },
        })).to.deep.equal({
            one: {
                two: {
                    three: {
                        four: {
                            five: {
                                six: {
                                    param1: "Value"
                                }
                            }
                        }
                    }
                }
            },
        });
    });

    it("Handles arrays", () => {
        expect(expandObj({
            "one.two.three": ["Value1", "Value2"],
        })).to.deep.equal({
            one: {
                two: {
                    three: ["Value1", "Value2"]
                }
            },
        });
    });

    it("Handles nested arrays.", () => {
        expect(expandObj({
            "one.two.three": [{
                "four.five": 5,
            }, {
                "six.seven": 7
            }],
        })).to.deep.equal({
            one: {
                two: {
                    three: [{
                        four: {
                            five: 5
                        }
                    }, {
                        six: {
                            seven: 7
                        }
                    }]
                }
            },
        });
    });
});