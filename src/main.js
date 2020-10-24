/**
 * Copyright 2020 Pieter Benjamin, Rachel Phuong, Hugh Sun, Ratik Koka
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

 // global connector variable that each method can access.
var cc = DataStudioApp.createCommunityConnector();

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
    var userName = properties.getProperty('dscc.username');
    var userPassword = properties.getProperty('dscc.password');
    var path = properties.getProperty('path');

    // Logger.log(userName); // for debugging messages.
    // Logger.log(userPassword);

    // return true if userName and userPassword and path are not null and
    // the combination is valid.
    return userName && userPassword && path && validateCredentials(userName, userPassword, path);
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
    var isCredentialsValid = validateCredentials(request.pathUserPass.username, 
      request.pathUserPass.password, request.pathUserPass.path);

    if (!isCredentialsValid) {
      return {
        errorCode: "INVALID_CREDENTIALS"
      };
    } else {
      storeCredentials(request.pathUserPass.username, 
        request.pathUserPass.password, request.pathUserPass.path);
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
 * @param {string} username Example: "hughsun@uw.edu"
 * @param {string} password Example: "123"
 * @param {string} path Example: "https://sandbox.central.getodk.org/v1/projects/124/forms/"
 * @returns {boolean} whether the username + password + path are correct
 */
function validateCredentials(username, password, path) {

    var rawResponse = UrlFetchApp.fetch(path, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(username + ':' + password)
      },
      muteHttpExceptions: true
    });
    // if response code == 200 means verification of username and password
    // succeeded.
    return rawResponse.getResponseCode() === 200;
  }

/**
 * This method stores the username and password and path into the global variable
 * properties which then can be accessed later by other methods through
 * properties object
 *
 * @param {string} username Example: "hughsun@uw.edu"
 * @param {string} password Example: "123"
 * @param {string} path Example: "https://sandbox.central.getodk.org/v1/projects/124/forms/"
 */
function storeCredentials(username, password, path) {
    PropertiesService
      .getUserProperties()
      .setProperty('dscc.username', username)
      .setProperty('dscc.password', password)
      .setProperty('path', path); // dscc stands for data studio community connector
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
    properties.deleteProperty('dscc.username');
    properties.deleteProperty('dscc.password');
    properties.deleteProperty('path');
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
    var cc = DataStudioApp.createCommunityConnector();
    var fields = cc.getFields();
    var types = cc.FieldType;
    var aggregations = cc.AggregationType;
    
    fields.newDimension()
    .setId('student_name')
    .setType(types.TEXT);

    fields.newMetric()
    .setId('student_age')
    .setType(types.NUMBER);

    fields.newMetric()
    .setId('student_school_year')
    .setType(types.TEXT);

    fields.newDimension()
    .setId('submissionDate')
    .setType(types.YEAR_MONTH_DAY);

    return fields;
}

/**
 *
 */
function getSchema(request) {
    var fields = getFields(request).build();
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
  return response.map(function(submissions) {
    var row = [];
    requestedFields.asArray().forEach(function (field) {
      switch (field.getId()) {
        case 'student_name':
          return row.push(submissions.student_name);
        case 'student_age':
          return row.push(submissions.student_age);
        case 'student_school_year':
          return row.push(submissions.student_school_year);
        case 'submissionDate':
          return row.push(submissions.__system.submissionDate)
        default:
          return row.push('');
      }
    });
    return { values: row };
  });
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

  var user = PropertiesService.getUserProperties();

  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  var requestedFields = getFields().forIds(requestedFieldIds);

  var url = [
    'https://sandbox.central.getodk.org/v1/projects/',
    request.configParams.projectId,
    '/forms/',
    request.configParams.xmlFormId,
    '.svc/',
    request.configParams.table
  ];

  var response = UrlFetchApp.fetch(url.join(''), {
      method: 'GET',
      headers: {
        'contentType' : 'application/json',
        'Authorization': 'Basic ' + Utilities.base64Encode(user.getProperty('dscc.username') + ':' + user.getProperty('dscc.password'))
      },
      muteHttpExceptions: true
  });
  
  var parsedResponse = JSON.parse(response).value;
  var rows = responseToRows(requestedFields, parsedResponse);
  
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
