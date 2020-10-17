/**
 * Copyright 2020 Pieter Benjamin, Rachel Phuong, Hugh Sun
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
 * password to authenticate the user. Later we might switch to 
 * OAuth 2 method, which is more complex.
 * 
 * Google Data Studio documentation for getAuthType:
 * https://developers.google.com/datastudio/connector/reference#getauthtype
 * 
 * @returns {object} An object that contains the AuthType that will 
 *                   be used by the connector
 */
function getAuthType() {
    return cc.newAuthTypeResponse()
        .setAuthType(cc.AuthType.USER_PASS) // indicate we want to use user + 
                                            // password for authentication
        .setHelpUrl('https://www.example.org/connector-auth-help')
        .build();
}

/**
 * Checks if the 3rd-party service credentials are valid.
 * In this case this method will check if the user name +
 * password user entered are valid.
 * 
 * API reference: https://developers.google.com/datastudio/connector/reference#required_userpass_key_functions
 * 
 * If this method returns true then we call getConfig function and go to the next step
 * If this method returns false the user will be prompted for information to 
 * authenticate/re-authenticate. (In this case via username and password)
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
  
    // Logger.log(userName); // for debugging messages.
    // Logger.log(userPassword);
    
    // return true if userName and userPassword are not null and
    // the combination is valid.
    return userName && userPassword && validateCredentials(userName, userPassword);
}

/**
 * given request object which has the user name and password,
 * store them into properties if they are valid, and return
 * some error code as object if credential is not valid.
 * 
 * @param {object} request A JavaScript object containing the data request parameters
 * @returns {object} A JavaScript object that contains an error code indicating if the credentials were able to be set successfully.
 * "errorCode": string("NONE" | "INVALID_CREDENTIALS")
 */
function setCredentials(request) {
    var isCredentialsValid = validateCredentials(request.userPass.username, request.userPass.password);
    
    if (!isCredentialsValid) {
      return {
        errorCode: "INVALID_CREDENTIALS"
      };
    } else {
      storeUsernameAndPassword(request.userPass.username, request.userPass.password);
      return {
        errorCode: "NONE"
      };
    }
  }

/**
 * given the username and password,
 * return true if this is a valid combination of username and password,
 * else return false.
 * 
 * @param {string} username Example: "hughsun@uw.edu" 
 * @param {string} password Example: "123"
 * @returns {boolean} whether the username + password are correct
 */
function validateCredentials(username, password) {
  
    var rawResponse = UrlFetchApp.fetch('https://sandbox.central.getodk.org/v1/projects/124/forms/', {
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
 * This method stores the username and password into the global variable
 * properties which then can be accessed later by other methods through
 * properties object
 * 
 * @param {string} username Example: "hughsun@uw.edu" 
 * @param {string} password Example: "123"
 */
function storeUsernameAndPassword(username, password) {
    PropertiesService
      .getUserProperties()
      .setProperty('dscc.username', username)
      .setProperty('dscc.password', password); // dscc stands for data studio community connector
  };

/**
 * This method clears user credentials for the third-party service.
 * 
 * This method is required by user password authentication
 */
function resetAuth() {
    // PropertiesService is a global variable that keeps the information of
    // the user. In this case we need to remove user name and password
    // from that global variable.
    var properties = PropertiesService.getUserProperties();
    properties.deleteProperty('dscc.username');
    properties.deleteProperty('dscc.password');
}

/**
 * API reference: https://developers.google.com/datastudio/connector/reference#getconfi
 */
function getConfig(request) {
    var config = cc.getConfig();
  
    // this config objected needs to be configured to have some texts or
    // prompts for user to enter.
  
    return config.build();
}

/**
 * 
 */
function getSchema(request) {

}

/**
 * 
 */
function getData(request) {

}