import { DynamoDB } from "aws-sdk";
import * as Chai from "chai";
import * as SinonChai from "sinon-chai";

import * as DS from "../../main/service/DynamoService";
import * as StubObject from "../StubObject";
import * as TableUtils from "../TableUtils";

Chai.use(SinonChai);
const expect = Chai.expect;

const db: DynamoDB = new DynamoDB({
    endpoint: "http://localhost:8000",
    region: "us-east-1"
});

const client: DynamoDB.DocumentClient = new DynamoDB.DocumentClient({ service: db });

const TableName: string = "DynamoServiceTestTable";

describe("DynamoService", function () {

    this.timeout(10000);

    let service: DS.DynamoService = new DS.DynamoService(client);
    let spyDb: StubObject.SpiedObj & DynamoDB.DocumentClient;

    let testTable: TableUtils.Table;

    before(async () => {
        spyDb = StubObject.spy(client);
        testTable = await TableUtils.createTable(db, TableUtils.defaultTableInput(TableName));
    });

    beforeEach(() => {
        spyDb.reset();
    });

    afterEach(() => {
        spyDb.restore();
    });

    after(async () => {
        await testTable.delete();
    });

    describe("Put", () => {
        it.only("Tests that the put method gives the db the appropriate items.", async () => {
            const Item = { [testTable.PrimaryKey]: "Five", Param1: "One", param2: 2 };
            await service.put(testTable.TableName, Item);
            expect(spyDb.put).to.have.been.calledWithMatch({ TableName, Item });
        });
    });
});