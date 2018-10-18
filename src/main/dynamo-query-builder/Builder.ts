export abstract class Builder<BuildObj extends object> {

    constructor() {
    }

    abstract build(): BuildObj;
}