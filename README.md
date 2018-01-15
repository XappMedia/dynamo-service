# dynamo-service

A service that allows the user to automatically generate dynamo rules for tables.  It will do data validation on all items for puts and updates.  It also allows extensions and has other utility functions.

# DynamoService

This class is basically a wrapper of a `aws.DynamoDB.DocumentClient`. It provides useful abstractions that make it easier to work with the Dynamo items.

# TableService

A wrapper for `DynamoService` which provides table validation.  You must define a table with a set of rules, and the rules will be validated at each method.

## Examples:

Defining required keys:

```
   const table = {
      "myPrimaryKey": {
         "type": "S" // "S", "N", "L", "M" i.e., the various types of DynamoDB data types.
         primary: true
      },
      "mySortKey": {
         "type": "N",
         sort: true
      },
      "myRequiredKey": {
         "type": "S",
         required: true
      }
   };
   const tableService = new TableService({ "myTableName", new DynamoService(new DynamoDB.DocumentClient(), table);
   
   // This will throw an error because the primary key is missing.
   tableService.put( { "mySortKey": new Date().getTime(), "myRequiredKey": "Hello" })
      .then(() => { console.log("Won't see me."); })
      .catch(() => { console.error("Made a mistake."); });
      
   // This will throw an error because the sort key is missing.
   tableService.put( { "myPrimaryKey": "1234ABCD", "myRequiredKey": new Date().toISOString() })
      .then(() => { console.log("Won't see me."); })
      .catch(() => { console.error("No sort key."); });
      
   // This will succeed because everything exists.
   tableService.put( { "myPrimaryKey": "123ABCD", "mySortKey": new Date().getTime(), "myRequiredKey": "Hello" })
      .then((putObj) => { console.log(putObj); })
      .catch(() => { console.error("An error was throw attempting to input the data, but validation will pass.") })
```

# Utils/DynamoQueryBuilder

A builder class that allows easier to read Dynamo scan and query builders. The output will be a Dynamo object which contains the `ExpressionAttributeNames` and `ExpressionAttributeValues` with either a `FilterExpression` or `ConditionExpression` depending on the type. 

## Examples:

### Scan filter

```
   // Produces a filter expression in which "param1 = 'value1'" and "param2 != 'value3'" and "param3 exists".
   const filter = scan("param1").equals("Value1").and("param2").doesNotEquals("value3").and("param3").exists.query();
   dynamoClient.scan({ TableName: "myTable", ...filter }).promise().then((results) => {
      console.log(results);
   });
```

### Condition filter

```
   // Produces a condition expression in which "param1 does not exist".
   const condition = withCondition("param1").doesNotExist.query();
   dynamoClient.put({ TableName: "myTable", ...condition }).promise().then((results) => {
      console.log(results);
   });
```
