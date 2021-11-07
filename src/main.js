/**
* Copyright 2020 Pieter Benjamin, Naisan Noorassa, Hugh Sun, Ratik Koka
*
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// global connector variable that each method can access.
var cc = DataStudioApp.createCommunityConnector();
var id = 0;
var debug = false;
let UNIQUE_SEPARATOR = "MY_SEPARATOR"; // for joining an array into a string, and parsing that string apart. Using this string because user might have ' ', '/' in their data schemas.

/**
* This method returns the authentication method we are going to use
* for the 3rd-party service. At this time we will use user name and
* password and a URL path to user's server site to authenticate the user. 
* Later we might switch to OAuth 2 method, which is more complex.
*
* Google Data Studio documentation for getAuthType:
* https://developers.google.com/datastudio/connector/reference#getauthtype
*
* @returns {object} An object that contains the AuthType that will
*                   be used by the connector
*/
function getAuthType() {
  return cc.newAuthTypeResponse()
  // PATH_USER_PASS indicate we want to use user + password + a URL path
  // to user's server for authentication
  .setAuthType(cc.AuthType.PATH_USER_PASS)
  .setHelpUrl('https://docs.getodk.org/central-submissions/#connecting-to-submission-data-over-odata')
  .build();
}

/**
* Checks if the 3rd-party service credentials are valid.
* In this case this method will check if the user name +
* password + path user entered are valid.
*
* API reference: https://developers.google.com/datastudio/connector/reference#required_userpass_key_functions
*
* If this method returns true then we call getConfig function and go to the next step
* If this method returns false function setCredentials will be called, and 
* user will be prompted for information to authenticate/re-authenticate
*
* This method is required by user password authentication
*
* @returns {boolean} true if 3rd-party service credentials are valid,
*                    false otherwise.
*/
function isAuthValid() {
  const properties = PropertiesService.getUserProperties();
  var token = properties.getProperty('dscc.token');
  // our authentication is valid if and only if token stored in properties service
  // is not null.
  return token !== null;
}

/**
* given request object which has the user name and password and path,
* store them into properties if they are valid, and return
* some error code as object if credential is not valid.
*
* @param {object} request A JavaScript object containing the data request parameters
* @returns {object} A JavaScript object that contains an error code indicating if the credentials were able to be set successfully.
* "errorCode": string("NONE" | "INVALID_CREDENTIALS")
*/
function setCredentials(request) {
  var isCredentialsValid = validateAndStoreCredentials(request.pathUserPass.username, 
                                                       request.pathUserPass.password, request.pathUserPass.path);
  
  if (!isCredentialsValid) {
    return {
      errorCode: "INVALID_CREDENTIALS"
    };
  } else {
    return {
      errorCode: "NONE"
    };
  }
}

/**
* given the username and password and a path,
* return true if this is a valid combination of username and password,
* by verifying over the path user provided.
* else return false.
*
* additionally, this function will put username, password, path, token
* into properties validation is successful.
*
* @param {string} username Example: "hughsun@uw.edu"
* @param {string} password Example: "123"
* @param {string} path Example: "https://sandbox.central.getodk.org/v1"
* @returns {boolean} whether the username + password + path are correct
*/
function validateAndStoreCredentials(username, password, path) {
  path = parseURL(path)[0];
  var properties = PropertiesService.getUserProperties();
  var token = properties.getProperty('dscc.token');
  if (token !== null) {
    // this means that we already set the token, which means
    // that we could get token from user information, so credential is valid
    return true;
  } else {
    // we haven't fetched token or verify if username and password are right
    // -- fetch a token and verify if it is valid token
    token = getToken(username, password, path);
    if (token === null) {
      // null token means not valid credentials
      return false;
    } else {
      // if we are at here we know user information is right. store them away
      // in properties
      storeCredentials(username, password, path);
      // also store token.
      properties.setProperty('dscc.token', token);
      return true;
    }
  }
}

/**
* given username, password, and a URL base path, this function returns
* the authorization token as a string, if the username and password are
* valid, else function returns null to indicate authentication failed.
* Notice that after this function other API requests need to put this token in the headers
* in order to authenticate. 
* 
* Assumption: path + '/sessions' is the URL that we can send username + password to
* to authenticate.
*
* @param {string} username Example: "udubimpact@gmail.com"
* @param {string} password Example: "impact++2020"
* @param {string} path Example: "https://sandbox.central.getodk.org/v1" (assumes without / in the end)
* @returns {string} returns the token as a string if username + password are valid, else return null. 
*/
function getToken(username, password, path) {
  var bodyOfRequest = {
    'email': username,
    'password': password
  };
  var parametersOfRequest = {
    'method' : 'post',
    'contentType': 'application/json',
    // Convert the JavaScript object to a JSON string.
    // payload represents the body of the request.
    'payload' : JSON.stringify(bodyOfRequest),
    'muteHttpExceptions': true
  };
  // Example path: https://sandbox.central.getodk.org/v1
  // we should actually send request to https://sandbox.central.getodk.org/v1/sessions
  // to validate user credential.
  var rawResponse = UrlFetchApp.fetch(path.concat('/sessions'), parametersOfRequest);
  
  if(rawResponse.getResponseCode() !== 200) {
    // if response code != 200 means verification of username and password
    // failed. return null in this case.
    return null;
  } else {
    // if we are here means verification of username + password is successful
    // return the token contained in the response body.
    var responseBody = rawResponse.getContentText();
    // responseBody is a string, need to make it into a json so we can get the token
    var jsonOfResponse = JSON.parse(responseBody);
    var token = jsonOfResponse['token']
    return token
  }
}

/**
* This method stores the username and password and path into the global variable
* properties which then can be accessed later by other methods through
* properties object
*
* @param {string} username Example: "hughsun@uw.edu"
* @param {string} password Example: "123"
* @param {string} path Example: "https://sandbox.central.getodk.org/v1"
*/
function storeCredentials(username, password, path) {
  // dscc stands for data studio community connector
  PropertiesService
  .getUserProperties()
  .setProperty('dscc.username', username)
  .setProperty('dscc.password', password)
  .setProperty('dscc.path', path);
};

/**
* This method clears user credentials for the third-party service.
* 
*/
function resetAuth() {
  // PropertiesService is a global variable that keeps the information of
  // the user. In this case we need to remove user name and password
  // from that global variable.
  var properties = PropertiesService.getUserProperties();
  properties.deleteAllProperties();
}

/**
* This method set/reset the dscc.token field within the properties object
* by recalling getToken() function. (remember token expires within 24 hours)
* if username and password aren't right, will put a NULL token in the properties.
*
* Assumption: properties have valid dscc.username, dscc.password, dscc.path fields.
*
*/
function setToken() {
  var properties = PropertiesService.getUserProperties();
  var username = properties.getProperty('dscc.username');
  var password = properties.getProperty('dscc.password');
  var path = properties.getProperty('dscc.path');
  var token = getToken(username, password, path);
  properties.setProperty('dscc.token', token);
}

/**
* This method returns the user configurable options for the connector.
*
* Google Data Studio documentation for getAuthType:
* https://developers.google.com/datastudio/connector/reference#getconfig
*
* @param {Object} request A JavaScript object containing the config request parameters.
* @return {object} A JavaScript object representing the config for the given request.
*/
function getConfig(request) {
  var configParams = request.configParams;
  var isFirstRequest = configParams === undefined;
  var isSecondRequest = configParams !== undefined && configParams.table !== undefined;
  var config = cc.getConfig();
  if (isFirstRequest) {
    config.setIsSteppedConfig(true);
  }

  
  config.newInfo()
  .setId('Request Data')
  .setText('Enter the Odata URL for your form (available from Submissions by clicking on Analyze via Odata). It can be the URL for the same form you entered when you first configured the connector or the URL for another form on the same server.');
  
  config.newTextInput()
  .setId('URL')
  .setName('Enter an URL to your data')
  .setHelpText('e.g. https://<your server>/v1/projects/<projectID>/forms/<formID>.svc')
  .setIsDynamic(true);

  if (!isFirstRequest) {    
    var tableOptions = getAvailableTablesFromURL(configParams.URL);
    if (tableOptions.length === 1) {
      var numberOfRows = getNumberOfRowsInTable(configParams.URL, 'Submissions');
      let user = PropertiesService.getUserProperties();
      user.setProperty('table', 'Submissions');
      user.setProperty('totalNumRows', numberOfRows.toString());
      config.newInfo()
      .setId('number of rows')
      .setText('there are ' + numberOfRows + ' rows in this table');
      config.newInfo()
      .setId('time')
      .setText('If you would like, you can limit the number of rows to visualize. If you leave these fields blank, all rows will be included. Note that accessing 50000 rows takes a couple of minutes.');
      config.newTextInput()
      .setId('startingRow')
      .setName('Enter the starting row that you want to access (starting from 0)');
      config.newTextInput()
      .setId('numberOfRowsToAccess')
      .setName('Enter number of rows you want to access (starting from 0)');
      config.setIsSteppedConfig(false);
    } else {
      var table = config.newSelectSingle()
      .setId("table")
      .setName("Table")
      .setIsDynamic(true);
      config.setIsSteppedConfig(true);
      tableOptions.forEach(function(labelAndValue) {
        var tableLabel = labelAndValue[0];
        var tableValue = labelAndValue[1];
        table.addOption(config.newOptionBuilder().setLabel(tableLabel).setValue(tableValue));
      });
    }
  }
  if (isSecondRequest) {
    var numberOfRows = getNumberOfRowsInTable(configParams.URL, configParams.table);
    let user = PropertiesService.getUserProperties();
    user.setProperty('totalNumRows', numberOfRows.toString());
    config.newInfo()
    .setId('number of rows')
    .setText('there are ' + numberOfRows + ' rows in this table');
    config.newInfo()
    .setId('time')
    .setText('If you would like, you can limit the number of rows to visualize. If you leave these fields blank, all rows will be included. Note that accessing 50000 rows takes a couple of minutes.');
    config.newTextInput()
    .setId('startingRow')
    .setName('Enter the starting row that you want to access (starting from 0)');
    config.newTextInput()
    .setId('numberOfRowsToAccess')
    .setName('Enter number of rows you want to access (starting from 0)');
    config.setIsSteppedConfig(false);
  }
  
  return config.build();
}

// number_string = "123" -> returns true
// number_string = "abc" -> returns false
function isNonNegativeInteger(str) {
    var n = Math.floor(Number(str));
    return n !== Infinity && String(n) === str && n >= 0;
}

function getNumberOfRowsInTable(URL, tableName) {
  var user = PropertiesService.getUserProperties();
  if (debug) {
    Logger.log('URL:' + URL);
    Logger.log('tableName:' + tableName);
  }
  var URLs = [URL, '/', tableName, '?%24top=1&%24count=true'];
  var response;
  try {
    response = UrlFetchApp.fetch(URLs.join(''), {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + user.getProperty('dscc.token')
      },
      muteHttpExceptions: true
    });
  } catch (error) {
    cc.newUserError()
    .setText("something is wrong with the URL")
    .setDebugText("something is wrong with the URL")
    .throwException();
  }
  
  if (response.getResponseCode() !== 200) {
    // this means response is not good, which potentially means token expired.
    // reset property's token to be a new token.
    setToken();
    // get another response based on the new token
    response = UrlFetchApp.fetch(URL, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + user.getProperty('dscc.token')
      },
      muteHttpExceptions: true
    });
  }
  
  var responseJson;
  try {
    responseJson = JSON.parse(response);
  } catch (error) {
    cc.newUserError()
    .setText("bad URL request")
    .setDebugText("bad URL request")
    .throwException();
  }
  return responseJson['@odata.count'];
}

function getAvailableTablesFromURL(URL) {
  // get another response based on the new token
  var user = PropertiesService.getUserProperties();
  var response;
  try {
    response = UrlFetchApp.fetch(URL, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + user.getProperty('dscc.token')
      },
      muteHttpExceptions: true
    });
  } catch (error) {
    cc.newUserError()
    .setText("You have entered an invalid URL.")
    .setDebugText("User has entered an invalid URL. API request to get table names failed.")
    .throwException();
  }
  
  
  if (response.getResponseCode() !== 200) {
    // this means response is not good, which potentially means token expired.
    // reset property's token to be a new token.
    setToken();
    // get another response based on the new token
    response = UrlFetchApp.fetch(URL, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + user.getProperty('dscc.token')
      },
      muteHttpExceptions: true
    });
  }

  if (response.getResponseCode() !== 200) {
    cc.newUserError()
    .setText("You have entered an invalid URL.")
    .setDebugText("User has entered an invalid URL. API request to get table names failed.")
    .throwException();
  }
  
  var responseJson;
  try {
    responseJson = JSON.parse(response);
  } catch (error) {
    cc.newUserError()
    .setText("bad URL request, please enter the correct URL to your data")
    .setDebugText("User has entered an invalid URL. API request to get table names failed.")
    .throwException();
  }
  
  /** json looks like following:
  {
    "@odata.context": "https://sandbox.getodk.cloud/v1/projects/4/forms/groups%20schema.svc/$metadata",
    "value": [{
        "name": "Submissions",
        "kind": "EntitySet",
        "url": "Submissions"
    }]
  }
  **/
  var tables = [];
  var tableNames = [];
  for (const table_info of responseJson['value']) {
    tableNames.push(table_info['name']);
    tables.push([table_info['name'], table_info['name']]);
  }
  user.setProperty('tableNames', tableNames.join(UNIQUE_SEPARATOR));
  return tables;
}

/**
 * @param {String} path A URL like https://sandbox.getodk.cloud/v1/projects/4/forms/all-data-except-file-uploads.svc
 * @return {Array} An array of strings that stores information about the path - [base_url, project_id, form_id]
 *                  e.g. ["https://sandbox.getodk.cloud/v1", "4", "all-data-except-file-uploads"]
 */
function parseURL(path) {
  var parts_of_path = path.split("/");
  var length = parts_of_path.length;
  var base_URL = parts_of_path[0] + '//' + parts_of_path.slice(2, parts_of_path.length - 4).join('/');
  var project_id = parts_of_path[length-3];
  var form_id = parts_of_path[length-1].substr(0,parts_of_path[length-1].length - 4);
  return [base_URL, project_id, form_id];
}

function isTableInTableNames(tableNames, table) {
  for (const possibleTableName of tableNames) {
    if (possibleTableName === table) {
      return true;
    }
  }
  return false;
}

function getFields(request) {
  var user = PropertiesService.getUserProperties();
  
  if (debug) {
    Logger.log('we are inside of getFields() function.');
    Logger.log('the request parameter to getFields() is:');
    Logger.log(request)
  }
  
  var cc = DataStudioApp.createCommunityConnector();
  var fields = cc.getFields();
  let types = cc.FieldType;

  var json = testSchema(request);
  // request = {configParams={URL=https://sandbox.getodk.cloud/v1/projects/4/forms/groups%20schema.svc, table=Submissions}}
  var userRequestedTable = user.getProperty('table');
  // json looks like:
  //  [{
  //    "path": "/q1",
  //    "name": "q1",
  //    "type": "string",
  //    "binary": null
  //}, {
  //    "path": "/repeat1",
  //    "name": "repeat1",
  //    "type": "repeat",
  //    "binary": null
  //}, {
  //    "path": "/repeat1/q2",
  //    "name": "q2",
  //    "type": "string",
  //    "binary": null
  
  // add submitterName, submissionDate, and __id fields for submissions
  // add __Submissions-id field for repeats
  if (userRequestedTable === "Submissions") {
    addSubmissionFields(fields);
  } else {
    addRepeatFields(fields, userRequestedTable);
  }

  var tableNames = user.getProperty('tableNames').split(UNIQUE_SEPARATOR);
  // tableNames = [ 'Submissions', 'Submissions/repeat1', 'Submissions/repeat2' ]
  tableNames = tableNames.filter(e => e !== 'Submissions')
  // tableNames = [ 'Submissions/repeat1', 'Submissions/repeat2' ]
  for (var i = 0; i < tableNames.length; i++) {
    tableNames[i] = tableNames[i].substr(12);
  }
  // tableNames = [ 'repeat1', 'repeat2' ]

  for (var i = 0; i < json.length; i++) {
    // json[i] is an object like {"path":"/student_info","name":"student_info","type":"structure","binary":null}

    var ODataType = json[i]['type'];

    // disregard the meta data schema
    if (ODataType === 'structure' ||  json[i]['name'] === 'instanceID' || ODataType === 'repeat') {
      continue;
    }
    
    // we only want the schema for the table user asks for.
    var schemaTableName = json[i]['path'].split('/')[1];
    if (userRequestedTable === 'Submissions') {
      if (isTableInTableNames(tableNames, schemaTableName)) {
        continue;
      }
    } else {
      if (schemaTableName !== userRequestedTable.substr(12)) {
        continue;
      }
    }

    var typesObj = getGDSType(ODataType);
    
    // typesObj: {'conceptType' : 'Dimension'('metric'), 'dataType': 'types.STRING'}
    var conceptType = typesObj['conceptType'];
    var dataType = typesObj['dataType'];
    var nameOfField = json[i]['path'];  // looks like "/student_info/name"
    nameOfField = nameOfField.substring(1, nameOfField.length); // looks like "student_info/name" now
    
    nameOfField = nameOfField.replace(/-/g, "_"); // necessary because we expect field names to have _, not -.
    
    if (conceptType === 'dimension') {
      fields.newDimension()
      .setId(id.toString())
      .setName(nameOfField)
      .setType(dataType);
      if (dataType === types.LATITUDE_LONGITUDE) {
        // we want an extra accuracy column when getting geo data from ODATA.
        id = id + 1;
        fields.newMetric()
        .setId(id.toString())
        .setName(nameOfField + '-accuracy')
        .setType(types.NUMBER);
      }
    } else if (conceptType === 'metric') {
      fields.newMetric()
      .setId(id.toString())
      .setName(nameOfField)
      .setType(dataType);
    }
    id = id + 1;
  }
  
  if (debug) {
    Logger.log('before we exit out of getFields(), fields variable is');
    fields
    .asArray()
    .map(function(field) {
       Logger.log(field.getId());
    });
    Logger.log('exiting out of getFields()');
  }

  return fields;
}

/**
* Adds submitterName, submissionDate, reviewState, and __id fields.
* Represented as "__system/submitterName", "__system/reviewState",  and "__system/submissionDate"
* Prefixing "__system" so that responseToRows correctly navigates JSON to find data
*/
function addSubmissionFields(fields) {
  var typesObj = getGDSType("string");
  fields.newDimension()
    .setId(id.toString())
    .setName("__system/submitterName")
    .setType(typesObj['dataType']);
  id++;

  fields.newDimension()
    .setId(id.toString())
    .setName("__system/reviewState")
    .setType(typesObj['dataType']);
  id++;

  fields.newDimension()
    .setId(id.toString())
    .setName("__id")
    .setType(typesObj['dataType']);
  id++;

  typesObj = getGDSType("dateTime");
  fields.newDimension()
    .setId(id.toString())
    .setName("__system/submissionDate")
    .setType(typesObj['dataType']);
  id++;
}

/**
* Adds "{repeat name}/__Submissions-id" field
 * This should help users associate repeat data with Submissions data
 * Prefixing "{repeat name}" so that responseToRows correctly navigates JSON to find data
*/
function addRepeatFields(fields, table) {
  table = table.split(".").slice(1).join("/");
  var typesObj = getGDSType("string");
  fields.newDimension()
    .setId(id.toString())
    .setName(table + "/__Submissions-id")
    .setType(typesObj['dataType']);
  id++;
}

/**
* This method returns an object that has two fields that indicate the Google
* data studio concept type and data type of this type from Odata passed in
* as a parameter.
*
* documentaion of data types from odata world: https://getodk.github.io/xforms-spec/#data-types
* documentation of data types for Google data studio: https://developers.google.com/datastudio/connector/reference#field
*
* if this type from Odata is currently unrecognized or doesn't have
* a correspondence in google data studio, the default is to return
* {'conceptType': 'dimension', 'dataType': types.TEXT}
*
* @param {String} OdataType a string that represents a type in odata. Example: "int", "string"
* @return {object} example: {'conceptType': 'dimension'/'metric', 'dataType': types.BOOLEAN}
*/
function getGDSType(OdataType) {
  var types = cc.FieldType;
  
  switch (OdataType) {
    case "int":
      return {'conceptType': 'metric', 'dataType': types.NUMBER};
    case "string":
      return {'conceptType': 'dimension', 'dataType': types.TEXT};
    case "boolean":
      return {'conceptType': 'metric', 'dataType': types.BOOLEAN};
    case "decimal":
      return {'conceptType': 'metric', 'dataType': types.NUMBER};
    case "date":
      // GDS format: "20170317"
      // Odata format: "2017-03-17"
      // need conversion later when parsing data.
      return {'conceptType': 'dimension', 'dataType': types.YEAR_MONTH_DAY};
    case "time":
      // odata format: "12-00 (noon)"
      // no corresponding data type in GDS. GDS has hours and minutes as separate data types
      // storing time as text for now to avoid losing any data
      return {'conceptType': 'dimension', 'dataType': types.TEXT};
    case "dateTime":
      return {'conceptType': 'dimension', 'dataType': types.YEAR_MONTH_DAY_HOUR};
    case "geopoint":
      // odata: Space-separated list latitude (decimal degrees), longitude (decimal degrees),
      //        altitude (decimal meters) and accuracy (decimal meters)
      // GDS: "51.5074, -0.1278"
      return {'conceptType': 'dimension', 'dataType': types.LATITUDE_LONGITUDE};
    case "geotrace":
      // no good representation in GDS
      return {'conceptType': 'dimension', 'dataType': types.TEXT};
    case "geoshape":
      // no good representation in GDS
      return {'conceptType': 'dimension', 'dataType': types.TEXT};
    case "binary":
      // odata: URI pointing to binary file.
      return {'conceptType': 'dimension', 'dataType': types.URL};
    case "barcode":
      return {'conceptType': 'dimension', 'dataType': types.TEXT};
    case "intent":
      return {'conceptType': 'dimension', 'dataType': types.TEXT};
  }
  
  return {'conceptType': 'dimension', 'dataType': types.TEXT};
}

function testSchema(request) {
  var user = PropertiesService.getUserProperties();
  var baseURL = user.getProperty('dscc.path');  // example: 'https://sandbox.central.getodk.org/v1'
  
  if (debug) {
    Logger.log('we are inside of testSchema() function!');
    Logger.log('request parameter is');
    Logger.log(request);
  }

  if (request === undefined) {
    // this means that we are calling getFields() within the getData() function.
    var url = [
      baseURL,
      '/projects/',
      user.getProperty('projectId'),
      '/forms/',
      user.getProperty('xmlFormId'),
      '/fields'
    ];
  } else {
    var path_infos = parseURL(request.configParams.URL);
    var projectId = path_infos[1];
    var formId = path_infos[2];
    
    var url = [
      baseURL,
      '/projects/',
      projectId,
      '/forms/',
      formId,
      '/fields'
    ];
  }

  var response = UrlFetchApp.fetch(url.join(''), {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + user.getProperty('dscc.token')
    },
    muteHttpExceptions: true
  });
   
  if (response.getResponseCode() !== 200) {
    // this means response is not good, which means token expired.
    // reset property's token to be a new token.
    setToken();
    // get another response based on the new token
    response = UrlFetchApp.fetch(url.join(''), {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + user.getProperty('dscc.token')
      },
      muteHttpExceptions: true
    });
  }
  
  if (response.getResponseCode() !== 200) {
    // if we still can't get the right response, after resetting token,
    // means user enter the wrong configuration parameters. Maybe they typed
    // the wrong form name, etc, throw an exception.
    cc.newUserError()
    .setText("You have entered the wrong combination of project ID, form ID, and table Name. Please re-enter the correct information.")
    .setDebugText("User has entered the wrong project ID, form ID, and Table Name. API request of schema failed.")
    .throwException();
  }

  if (debug) {
    Logger.log('we are in testSchema()');
    Logger.log('response from API enpoints that requests schema looks like');
    Logger.log(response);
    Logger.log('exiting out of testSchema()');
  }
  
  var json = JSON.parse(response);
  return json;
}

/**
*
*/
function getSchema(request) {
  if (debug) {
    Logger.log('we are in getSchema(), with request parameter of:');
    Logger.log(request);
  }
  
  var user = PropertiesService.getUserProperties();
  if (request !== undefined) {
    if (request.configParams.table !== undefined) {
      user.setProperty('table', request.configParams.table);
    }
    if (request.configParams.numberOfRowsToAccess === undefined && request.configParams.startingRow === undefined) {
      // if user hasn't entered any information about rows, default to access all rows.
      let totalNumOfRows = user.getProperty('totalNumRows');
      user.setProperty('numberOfRowsToAccess', totalNumOfRows);
      user.setProperty('startingRow', 0);
    } else if (!isNonNegativeInteger(request.configParams.numberOfRowsToAccess) || !isNonNegativeInteger(request.configParams.startingRow)) {
      cc.newUserError()
      .setText("please enter a non negative integer in the number of rows / starting row text box")
      .setDebugText("user didn't enter non negative integers in the number of rows / starting row text box")
      .throwException();
    } else {
      user.setProperty('numberOfRowsToAccess', request.configParams.numberOfRowsToAccess);
      user.setProperty('startingRow', request.configParams.startingRow);
    }
  }
  
  var fieldsBeforeBuilding = getFields(request);
  var fields = fieldsBeforeBuilding.build();
  
  if (debug) {
    Logger.log('before we exit out of getSchema(), fields is:');
    Logger.log(fields);
  }
  
  return { schema: fields };
}

/**
* This method transforms parsed data and filters for requested fields.
* 
* @param {Object} requestedFields A JavaScript object that contains fields requested by the User.
* @param {JSON} response JSON that contains the response from the ODK API.
* @returns {Object} A JavaScript object that contains the rows of a table.
*/
function responseToRows(requestedFields, response) {
  if (debug) {
    Logger.log('we are in responseToRows() function');
    Logger.log('requestedFields parameter is:');
    requestedFields
    .asArray()
    .map(function(field) {
      Logger.log(field.getId());
    });
    Logger.log('response parameter is');
    Logger.log(response);
  }

  requestedFields = requestedFields.asArray();
  let user = PropertiesService.getUserProperties();
  let isSubmissions = user.getProperty('table') === "Submissions";

  return response.map(function(submissions) {
    if (debug) {
      Logger.log('we are inside of responseToRows/response.map function');
      Logger.log('and submissions variable looks like:');
      Logger.log(submissions);
    }

    // the instanceId is named differently for repeat tables than for the submission table
    let instanceID;
    if (isSubmissions) {
      instanceID = submissions['__id'].split(":")[1];
    } else {
      instanceID = submissions['__Submissions-id'].split(":")[1];
    }

    let row = [];
    requestedFields.forEach(function(field) {

      let fieldPath = field.getName(); // looks like "student_info/name"
      if (debug) {
        Logger.log('we are inside of requestedFields.forEach(function (field)');
        Logger.log('and path = ');
        Logger.log(path);
      }
      let splitPath = fieldPath.split('/'); // looks like ['student_info', 'name'], or ['repeat1', 'q2'] (for repeat)

      // if this is from repeat data, need to trim the first element.
      if (!isSubmissions) {
        splitPath.shift();
      }

      handleGeoAccuracyField(splitPath);
      let fieldData = submissions;

      for (const fieldName of splitPath) {
        // this deals with groups: if we have nested groups this for loop
        // will go to the very bottom of the raw data by following each level's group name.
        if (fieldData !== null && fieldName in fieldData) {
           fieldData = fieldData[fieldName];
        } else {
          // if we are in this branch it means there are no fields of the fieldname
          // in our data -- this will happen when user enters null data, so we
          // just return null.
          return row.push(null);
        }
      }

      fieldData = convertData(fieldData, field.getType(), instanceID); // convert Odata to GDS data.
      row.push(fieldData);
    });

    return { values: row };
  });
}

/**
 * This function adjusts the passed array to tell us how to get the
 * accuracy of a geo point from Odata database given the original array,
 * if this array actually represents the accuracy data.
 * 
 * we know this array corresponds to accuracy of a geo point when the last
 * string of input array contains '-accuracy' substring.
 * 
 * If the array is not about accuracy of a geo point, it is not adjusted.
 * @param {array} splitPath ['group1', 'group2', 'Location-accuracy']
 * @returns {array} ['group1', 'group2', 'Location', 'properties', 'accuracy']
 */
function handleGeoAccuracyField(splitPath) {
  let i = splitPath.length - 1;
  if (splitPath[i].includes('-accuracy')) {
    splitPath[i] = splitPath[i].slice(0, -9); // remove "-accuracy"
    splitPath.push('properties');
    splitPath.push('accuracy');
  }
}

/**
* This method makes adjustments to resolve mismatches between ODK datatypes and Google Data datatypes
* instanceId only necessary for generating URLs 
*/
function convertData(data, type, instanceId = "") {
  if (data === null) {
    return null;
  }

  var types = cc.FieldType;
  
  switch (type) {
    case types.URL:
      data = constructFileURL(data, instanceId);
      break;
    case types.YEAR_MONTH_DAY_HOUR:
      // ODK dateTime type
      // Currently loses minutes field from ODK type -- alternatively we could convert to string
      data = data.replace(/[-T]/g, "").split(":")[0];
      break;
    case types.YEAR_MONTH_DAY:
      // ODK date type
      data = data.replace(/-/g, "");
      break;
    case types.LATITUDE_LONGITUDE:
      // data = {coordinates=[-122.335575, 47.655831, 0.0], properties={accuracy=0.0}, type=Point}
      // need .reverse() here because OData returns (Longitude, Latitude), and GDS expects
      // (Latitude, Longitude)
      data = data['coordinates'].slice(0, 2).reverse().join(', '); // "47.655831, -122.335575"
      break;
    case types.TEXT:
      // handles other non-text datatypes that don't have a good gds equivalent
      // eg. geoshape, geotrace
      if (data !== null && typeof data === "object" && "type" in data) {
        data = JSON.stringify(data);
      }
      break;
  }

  return data;
}

function constructFileURL(fileName, instanceID) {
  var user = PropertiesService.getUserProperties();
  // Update media path to new version which now allows users to download media collected in forms in GDS 
  // Media path follows form: https://DOMAIN/#/dl/projects/PROJECTID/forms/FORMID/submissions/INSTANCEID/attachments/FILENAME
  // Example: https://my.odk.server/#/dl/projects/1/forms/forest_survey/submissions/uuid:20bcee82-4a22-4381-a6aa-f926fc85fb22/attachments/my.file.mp3
  
  // If dscc.path has multiple '/v1' in it, this will fail
  var mediaPath = user.getProperty('dscc.path').split("/v1")[0] + "/#/dl";
  return [
    mediaPath,
    'projects',
    user.getProperty('projectId'),
    'forms',
    user.getProperty('xmlFormId'),
    'Submissions',
    'uuid%3A' + instanceID,
    'attachments',
    fileName,
  ].join('/');
}

/**
* This method returns the tabular data for the given request.
* 
* Google Data Studio documentation for getData:
* https://developers.google.com/datastudio/connector/reference#getdata
* 
* @param {Object} request A JavaScript object containing the data request parameters.
* @return {Object} A JavaScript object that contains the schema and data for the given request.
*/
function getData(request) {
  if (debug) {
    Logger.log('we are in getData() function.');
    Logger.log('request parameter within getData() is:');
    Logger.log(request);
  }
  
  var path_infos = parseURL(request.configParams.URL);
  var projectId = path_infos[1];
  var formId = path_infos[2];
  var table = request.configParams.table;
  if (table === undefined) {
    table = 'Submissions';
  }

  var user = PropertiesService.getUserProperties();
  user.setProperty('projectId', projectId);
  user.setProperty('xmlFormId', formId);
  user.setProperty('table', table);
  
  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });

  var requestedFields = getFields().forIds(requestedFieldIds);
  if (debug) {
    Logger.log('requestedFields are');
    requestedFields
    .asArray()
    .map(function(field) {
      Logger.log(field.getId());
    });
  }
  
  var baseURL = user.getProperty('dscc.path');  // example: 'https://sandbox.central.getodk.org/v1'
  
  var url = [
    request.configParams.URL,
    '/',
    table
  ].join('');
  
  if (debug) {
    Logger.log('url is');
    Logger.log(url);
  }
  
  // For some larger forms, UrlFetchApp seems to truncate the JSON returned to us by ODK
  // To handle this, we use the $skip and $top parameters in our request(s) to grab data in chunks.
  var mergedJSON = [];
  var parsedJSON;
  var numberOfRowsToAccess = user.getProperty('numberOfRowsToAccess');
  var startingRow = user.getProperty('startingRow');
  
  skip = parseInt(startingRow);
  top = parseInt(numberOfRowsToAccess);
  request_params = {
    method: 'GET',
    headers: {
      'contentType' : 'application/json',
      'Authorization': 'Bearer ' + user.getProperty('dscc.token')
    },
    muteHttpExceptions: true
  }

  do {
    var formatted_url = url + "?%24skip=" + skip + "&%24top=" + top;
    var response = UrlFetchApp.fetch(formatted_url, request_params);

    if (response.getResponseCode() !== 200) {
      // this means response is not good, which means token expired.
      // reset property's token to be a new token.
      setToken();
      // get another response based on the new token
      response = UrlFetchApp.fetch(formatted_url, request_params);
    }

    parsedJSON = JSON.parse(response.getContentText()).value;
    mergedJSON.push(...parsedJSON);

    skip += 50000;
    top -= 50000;
  } while(parsedJSON.length != 0 && top > 0);

  rows = responseToRows(requestedFields, mergedJSON);

  if (debug) {
    Logger.log('before we exit getData(), rows are:');
    Logger.log(rows);
  }

  return {
    schema: requestedFields.build(),
    rows: rows
  };
}

/**
* This method checks if the user is an admin of the connector.
* This function is used to enable/disable debug features.
* 
* Google Data Studio documentation for getData:
* https://developers.google.com/datastudio/connector/reference#isadminuser
* 
* @return {boolean} Return true if the user is an admin of the connector.
* If the function is omitted or returns false, then the user will not be considered an admin.
*/
function isAdminUser() {
  return true;
}
