// import { DynamoDBActionPerformer } from "./DynamoDBActionPerformer";
// import {
//     ConditionExpression,
//     DynamoDBKey,
//     DynamoDBPutItemMap,
//     DynamoDBPutItemOutput,
//     IDynamoService,
//     Interceptor,
//     PutAllServiceProps,
//     UpdateBody,
//     UpdateReturnAllType,
//     UpdateReturnNoneType,
//     UpdateReturnType,
//     UpdateReturnUpdatedType
// } from "./IDynamoService";
// import { batchWrites } from "./utils/BatchWrites";
// import { createPutBatchWriteRequests } from "./utils/CreateBatchWriteRequests";
// import { interceptObj } from "./utils/InterceptObj";

// export interface DynamoServiceProps {
//     performer: DynamoDBActionPerformer;
// }

// export class AbstractDynamoService implements IDynamoService {

//     private readonly performer: DynamoDBActionPerformer;
//     private readonly putInterceptors: Interceptor<any>[];
//     private readonly updateInterceptors: Interceptor<UpdateBody<any>>[];

//     constructor(props: DynamoServiceProps) {
//         this.performer = this.performer;
//     }

//     addPutInterceptor<T>(interceptor: Interceptor<T>) {
//         if (!interceptor) {
//             throw new Error("Put interceptor can not be undefined.");
//         }
//         this.putInterceptors.push(interceptor);
//     }

//     /**
//      * This adds an interceptor for Update operations.  The object passed to the interceptor is the
//      * Update object that is going to the dynamo server.
//      *
//      * The order in which these are inserted will be the order in which the interceptors will be executed.
//      *
//      * @template T
//      * @param {Interceptor<UpdateBody<T>} interceptor
//      * @memberof DynamoService
//      */
//     addUpdateInterceptor<T>(interceptor: Interceptor<UpdateBody<T>>) {
//         if (!interceptor) {
//             throw new Error("Update interceptor can not be undefined.");
//         }
//         this.updateInterceptors.push(interceptor);
//     }

//     put(TableName: string, obj: DynamoDBPutItemMap): Promise<DynamoDBPutItemOutput>;
//     put(TableName: string, obj: DynamoDBPutItemMap, condition: ConditionExpression): Promise<DynamoDBPutItemOutput>;
//     put(TableName: string, obj: DynamoDBPutItemMap[]): Promise<DynamoDBPutItemMap[]>;
//     put(TableName: string, obj: DynamoDBPutItemMap[], props: PutAllServiceProps): Promise<DynamoDBPutItemMap[]>;
//     put(tableName: string, obj: DynamoDBPutItemMap | DynamoDBPutItemMap[], condition: ConditionExpression | PutAllServiceProps = {}): Promise<DynamoDBPutItemOutput> | Promise<DynamoDBPutItemMap[]> {
//         const putObjs = interceptObj(this.putInterceptors, obj);
//         if (Array.isArray(putObjs)) {
//             return batchWrites({
//                 tableName,
//                 writeRequests: createPutBatchWriteRequests(putObjs),
//                 performer: this.performer,
//                 attempts: (condition as PutAllServiceProps).attempts})
//             .then(unprocessed =>  {
//                 const unProcessedItems: DynamoDBPutItemMap[] = [];
//                 for (let u of unprocessed) {
//                     unProcessedItems.push(u.PutRequest.Item);
//                 }
//                 return unProcessedItems;
//             }) as Promise<DynamoDBPutItemMap[]>;
//         }

//         return this.performer.putSingleItem({
//             TableName: tableName,
//             Item: putObjs,
//             ...condition as ConditionExpression
//         }) as Promise<DynamoDBPutItemOutput>;
//     }

//     update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>): Promise<void>;
//     update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, condition: ConditionExpression): Promise<void>;
//     update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, returns: UpdateReturnNoneType): Promise<void>;
//     update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, condition: ConditionExpression, returns: UpdateReturnNoneType): Promise<void>;
//     update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, returns: UpdateReturnUpdatedType): Promise<Partial<T>>;
//     update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, condition: ConditionExpression, returns: UpdateReturnUpdatedType): Promise<Partial<T>>;
//     update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, returns: UpdateReturnAllType): Promise<T>;
//     update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, condition: ConditionExpression, returns: UpdateReturnAllType): Promise<T>;
//     update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, conditionOrReturns: ConditionExpression | UpdateReturnType = {}, returns: UpdateReturnType = "NONE") {
//         let newUpdate = interceptObj(this.updateInterceptors, update);
//         newUpdate = transferUndefinedToRemove(newUpdate);
//         newUpdate.set = removeUndefinedAndBlanks(newUpdate.set);

//         const updateExpression = getUpdateParameters(newUpdate);
//         const conditionExpression = (typeof conditionOrReturns === "object") ? conditionOrReturns : {};
//         const ReturnValues = (typeof conditionOrReturns === "object") ? returns : conditionOrReturns;

//         const params: DynamoDB.UpdateItemInput = {
//             TableName: table,
//             Key: key,
//             ReturnValues,
//             ...updateExpression
//         };
//         if (objHasAttrs(conditionExpression)) {
//             if (conditionExpression.ConditionExpression) {
//                 params.ConditionExpression = conditionExpression.ConditionExpression;
//             }
//             if (conditionExpression.ExpressionAttributeNames) {
//                 params.ExpressionAttributeNames = { ...params.ExpressionAttributeNames, ...conditionExpression.ExpressionAttributeNames };
//             }
//             if (conditionExpression.ExpressionAttributeValues) {
//                 params.ExpressionAttributeValues = { ...params.ExpressionAttributeValues, ...conditionExpression.ExpressionAttributeValues };
//             }
//         }

//         return this.db.update(params).promise().then((item) => { return item.Attributes as T; }) as Promise<T>;
//     }
// }