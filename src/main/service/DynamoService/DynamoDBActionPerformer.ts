import {
    DynamoDBBatchWriteInput,
    DynamoDBBatchWriteOutput,
    DynamoDBPutItemInput,
    DynamoDBPutItemOutput } from "./IDynamoService";

export interface DynamoDBActionPerformer {
    putSingleItem(item: DynamoDBPutItemInput): Promise<DynamoDBPutItemOutput>;

    batchWriteItems(params: DynamoDBBatchWriteInput): Promise<DynamoDBBatchWriteOutput>;
}