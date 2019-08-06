/**
 * Copyright 2019 XAPPmedia
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { expectToHaveErrors, expectToHaveNoErrors } from "../../__test__/ValidatorTestUtils";
import * as Validator from "../IsOnlyRequiredAttributesValidator2";

describe("isOnlyRequiredAttributesValidator", () => {
    describe(Validator.isOnlyRequiredAttributesObjectValidator.name, () => {
        it("Throws no errors are thrown if the requirement is not true.", () => {
            const validator = Validator.isOnlyRequiredAttributesObjectValidator();
            const errors = validator("Test", { type: "M" }, {
                "Should": "Not",
                "Throw": "An",
                "Error": "here"
            });
            expectToHaveNoErrors(errors);
        });

        it("Throws errors are thrown if the requires is true.", () => {
            const validator = Validator.isOnlyRequiredAttributesObjectValidator();
            const errors = validator("Test", {
                type: "M",
                onlyAllowDefinedAttributes: true,
                attributes: {
                    "Allowed": {
                        type: "S"
                    }
                }
            }, {
                "Should": "Abolutely",
                "Throw": "An",
                "Error": "here",
                "Allowed": "Except for this one"
            });
            expectToHaveErrors(errors, "Map attribute \"Test\" has forbidden keys \"Should, Throw, Error\".");
        });

        it("Throws no errors if the object is undefined.", () => {
            const validator = Validator.isOnlyRequiredAttributesObjectValidator();
            const errors = validator("Test", {
                type: "M",
                onlyAllowDefinedAttributes: true,
                attributes: {
                    "Allowed": {
                        type: "S"
                    }
                }
            }, undefined);
            expectToHaveNoErrors(errors);
        });

        it("Throws no errors if the attributes key is undefined.", () => {
            const validator = Validator.isOnlyRequiredAttributesObjectValidator();
            const errors = validator("Test", {
                type: "M",
                onlyAllowDefinedAttributes: true,
                attributes: undefined
            }, {
                "Should": "Not",
                "Throw": "An",
                "Error": "here"
            });
            expectToHaveNoErrors(errors);
        });
    });

    describe(Validator.isOnlyRequiredAttributesUpdateObjectValidator.name, () => {
        it("Throws no errors are thrown if the requirement is not true.", () => {
            const validator = Validator.isOnlyRequiredAttributesUpdateObjectValidator();
            const errors = validator("Test", { type: "M" }, {
                set: {
                    "Test": {
                        "Should": "Not",
                        "Throw": "An",
                        "Error": "here"
                    }
                }
            });
            expectToHaveNoErrors(errors);
        });

        it("Throws errors are thrown if the requires is true.", () => {
            const validator = Validator.isOnlyRequiredAttributesUpdateObjectValidator();
            const errors = validator("Test", {
                type: "M",
                onlyAllowDefinedAttributes: true,
                attributes: {
                    "Allowed": {
                        type: "S"
                    }
                }
            }, {
                set: {
                    "Test": {
                        "Should": "Abolutely",
                        "Throw": "An",
                        "Error": "here",
                        "Allowed": "Except for this one",
                    }
                }
            });
            expectToHaveErrors(errors, "Map attribute \"Test\" has forbidden keys \"Should, Throw, Error\".");
        });

        it("Throws no errors if the set does not have the key.", () => {
            const validator = Validator.isOnlyRequiredAttributesUpdateObjectValidator();
            const errors = validator("Test", {
                type: "M",
                onlyAllowDefinedAttributes: true,
                attributes: {
                    "Allowed": {
                        type: "S"
                    }
                }
            }, {
                set: {
                    "SomethingElse": {
                        "Should": "Abolutely",
                        "Throw": "An",
                        "Error": "here",
                        "Allowed": "Except for this one",
                    }
                }
            });
            expectToHaveNoErrors(errors);
        });

        it("Throws no errors if the object does not have a set.", () => {
            const validator = Validator.isOnlyRequiredAttributesUpdateObjectValidator();
            const errors = validator("Test", {
                type: "M",
                onlyAllowDefinedAttributes: true,
                attributes: {
                    "Allowed": {
                        type: "S"
                    }
                }
            }, {
                remove: ["Should", "Be", "Okay"],
                append: [{ "To": "Have", "This": "here" }]
            });
            expectToHaveNoErrors(errors);
        });
    });
});