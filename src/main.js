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
  .setHelpUrl('https://www.example.org/connector-auth-help')
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
  var config = cc.getConfig();
  
  config.newInfo()
  .setId('Request Data')
  .setText('Enter details for the Data you would like to access.');
  
  config.newTextInput()
  .setId('projectId')
  .setName('Enter a Project Id')
  .setHelpText('e.g. 124');
  
  config.newTextInput()
  .setId('xmlFormId')
  .setName('Enter a Form Id')
  .setHelpText('e.g. odata connector scheme');
  
  config.newTextInput()
  .setId('table')
  .setName('Enter a Table Name')
  .setHelpText('e.g. Submissions');
  
  config.newTextInput()
  .setId('$skip')
  .setName('Number of rows to skip (Optional)')
  .setHelpText('e.g. 10');
  
  config.newTextInput()
  .setId('$top')
  .setName('Number of rows to display from the top (Optional)')
  .setHelpText('e.g. 5');
  
  config.newSelectSingle()
  .setId('$count')
  .setName('Display Total Number of Rows')
  .addOption(config.newOptionBuilder().setLabel('True').setValue('true'))
  .addOption(config.newOptionBuilder().setLabel('False').setValue('false'));
  
  config.newSelectSingle()
  .setId('$wkt')
  .setName('Display GeoJSON as Well-Known Text')
  .addOption(config.newOptionBuilder().setLabel('True').setValue('true'))
  .addOption(config.newOptionBuilder().setLabel('False').setValue('false'));
  
  return config.build();
}

function getFields(request) {
  
  if (debug) {
    Logger.log('we are inside of getFields() function.');
    Logger.log('the request parameter to getFields() is:');
    Logger.log(request)
  }
  
  var cc = DataStudioApp.createCommunityConnector();
  var fields = cc.getFields();
  let types = cc.FieldType;

  var json = testSchema(request);
  
  // json: [{"path":"/student_info","name":"student_info","type":"structure","binary":null},
  //        {"path":"/student_info/name","name":"name","type":"string","binary":null},
  //        {"path":"/student_info/age","name":"age","type":"int","binary":null}]
  // an array of objects
  
  for (var i = 0; i < json.length; i++) {
    // json[i] is an object like {"path":"/student_info","name":"student_info","type":"structure","binary":null}

    var ODataType = json[i]['type'];

    // disregard the meta data schema
    if (ODataType === 'structure' ||  json[i]['name'] === 'instanceID') {
      continue;
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
    var url = [
      baseURL,
      '/projects/',
      request.configParams.projectId,
      '/forms/',
      request.configParams.xmlFormId,
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

  return response.map(function(submissions) {
    if (debug) {
      Logger.log('we are inside of responseToRows/response.map function');
      Logger.log('and submissions variable looks like:');
      Logger.log(submissions);
    }
  
    var row = [];
    requestedFields.asArray().forEach(function (field) {
      
      var path = field.getName(); // looks like "student_info/name"
      var arrayOfFields = path.split('/'); // looks like ['student_info', 'name']

      arrayOfFields = handleGeoAccuracyField(arrayOfFields);
      
      var data = submissions;
      var instanceId = submissions['__id'].split(":")[1];
      
      for (const fieldName of arrayOfFields) {
        // this deals with groups: if we have nested groups this for loop
        // will go to the very bottom of the raw data by following each level's group name.
        if (fieldName in data) {
           data = data[fieldName];
        } else {
           // if we are in this branch it means there are no fields of the fieldname
           // in our data -- this will happen when user enters null data, so we
           // just return null.
           return row.push(null);
        }
      }
      data = convertData(data, field.getType(), instanceId); // convert Odata to GDS data.
      return row.push(data);
    });
        
    return { values: row };
  });
}

/**
 * This function returns an array that tells us how to get the accuracy
 * of a geo point from Odata database given the original array,
 * if this array actually represents the accuracy data.
 * 
 * we know this array corresponds to accuracy of a geo point when the last
 * string of input array contains '-accuracy' substring.
 * 
 * If the array is not about accruacy of a geo point, return the array as it is.
 * @param {array} arrayOfFields ['group1', 'group2', 'Location-accuracy']
 * @returns {array} ['group1', 'group2', 'Location', 'properties', 'accuracy']
 */
function handleGeoAccuracyField(arrayOfFields) {
  if (arrayOfFields[arrayOfFields.length - 1].includes('-accuracy')) {
    let index_last_ele = arrayOfFields.length - 1;
    var field = arrayOfFields[index_last_ele] // "Location-accuracy" -> should make it "Location"
    var indexOfAccuracy = field.indexOf('-accuracy');
    field = field.substring(0, indexOfAccuracy);
    arrayOfFields[index_last_ele] = field;
    arrayOfFields.push('properties');
    arrayOfFields.push('accuracy');
    return arrayOfFields;
  } else {
    return arrayOfFields;
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

  return [
    user.getProperty('dscc.path'),
    'projects',
    user.getProperty('projectId'),
    'forms',
    user.getProperty('xmlFormId'),
    user.getProperty('table'),
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
  
  var user = PropertiesService.getUserProperties();
  user.setProperty('projectId', request.configParams.projectId);
  user.setProperty('xmlFormId', request.configParams.xmlFormId);
  user.setProperty('table', request.configParams.table);
  
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
    baseURL,
    '/projects/',
    request.configParams.projectId,
    '/forms/',
    request.configParams.xmlFormId,
    '.svc/',
    request.configParams.table,
    '?%24skip=',
    request.configParams.$skip,
    '&%24top=',
    request.configParams.$top,
    '&%24count=',
    request.configParams.$count,
    '&%24wkt=',
    request.configParams.$wkt
  ];
  
  if (debug) {
    Logger.log('url is');
    Logger.log(url);
  }
  
  var response = UrlFetchApp.fetch(url.join(''), {
    method: 'GET',
    headers: {
      'contentType' : 'application/json',
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
        'contentType' : 'application/json',
        'Authorization': 'Bearer ' + user.getProperty('dscc.token')
      },
      muteHttpExceptions: true
    });
  }
  
  var parsedResponse = JSON.parse(response).value;
  var rows = responseToRows(requestedFields, parsedResponse);
  
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
