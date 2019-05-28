// import { DynamoDB } from "aws-sdk";
// import { DynamoService } from "../DynamoService";
// import { TableSchema } from "../KeySchema";

// export interface DynamoObject {
//     [key: string]: DynamoDB.DocumentClient.AttributeValue;
// }

// export interface Props<T extends DynamoObject> {
//     schema: TableSchema<T>;
//     service: DynamoService;
// }

// export class NuTableService<T extends DynamoObject> {
//     private readonly schema: TableSchema<T>;
//     private readonly service: DynamoService;

//     constructor(props: Props<T>) {
//         if (!props) {
//             throw new Error("No props provided for NutTableService");
//         }
//         const { schema, service } = props;

//         this.schema = schema;
//         this.service = service;
//     }
// }