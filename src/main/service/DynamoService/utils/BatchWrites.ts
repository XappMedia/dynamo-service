import { exponentialTime } from "../../../utils/Backoff";
import { sleep } from "../../../utils/Sleep";
import { DynamoDBActionPerformer } from "../DynamoDBActionPerformer";
import { DynamoDBBatchWriteInput, DynamoDBBatchWrites, DynamoDBWriteRequest } from "../IDynamoService";

export interface BatchWriteRequestsProps {
    tableName: string;
    performer: Pick<DynamoDBActionPerformer, "batchWriteItems">;
    writeRequests: DynamoDBWriteRequest[];
    attempts?: number;
}

export function batchWrites(props: BatchWriteRequestsProps) {
    const {
        tableName,
        attempts,
        writeRequests,
        performer
    } = props;
    // Dynamo only allows 25 write requests at a time, so we're going to do this 25 at a time.
    const promises: Promise<DynamoDBBatchWrites>[] = [];
    for (let i = 0; i < writeRequests.length; i += 25) {
        const sliced = writeRequests.slice(i, i + 25);
        promises.push(batchWriteUntilCompleteOrRunout({
            input: {
                RequestItems: {
                    [tableName]: sliced
                }
            },
            performer,
            attempts}));
    }

    return Promise.all(promises).then((unprocessedItems) => {
        const unprocessedRequests: DynamoDBWriteRequest[] = [];
        for (let unprocessed of unprocessedItems) {
            const keys = Object.keys(unprocessed);
            if (keys.length > 0) {
                unprocessedRequests.push(...unprocessed[tableName]);
            }
        }
        return unprocessedRequests;
    });
}

export interface BatchWriteUntilCompleteOrRunoutProps {
    input: DynamoDBBatchWriteInput;
    attempts?: number;
    performer: Pick<DynamoDBActionPerformer, "batchWriteItems">;
}

/**
     * This will loop and process all batch write items until they have all been written or until the attempt count has been hit.
     */
export async function batchWriteUntilCompleteOrRunout(props: BatchWriteUntilCompleteOrRunoutProps): Promise<DynamoDBBatchWrites> {
    const {
        input,
        attempts = 15,
        performer
    } = props;
    let count = 0;
    let unprocessed: DynamoDBBatchWrites;
    let writeInput: DynamoDBBatchWriteInput = input;
    console.log("Performing", count, writeInput);
    do {
        const timeToSleep = exponentialTime()(count);
        await sleep(timeToSleep);
        const result = await performer.batchWriteItems(writeInput);
        writeInput = { RequestItems: result.UnprocessedItems };
        unprocessed = result.UnprocessedItems;
    } while (++count < attempts && Object.keys(writeInput.RequestItems).length > 0);
    return unprocessed;
}