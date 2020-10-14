/**
 * Copyright 2020 Pieter Benjamin, Rachel Phuong, Hugh Sun
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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
    var cc = DataStudioApp.createCommunityConnector();
    return cc.newAuthTypeResponse()
        .setAuthType(cc.AuthType.USER_PASS)
        .setHelpUrl('https://www.example.org/connector-auth-help')
        .build();
}

/**
 * Checks if the 3rd-party service credentials are valid.
 * In this case this method will check if the user name +
 * password user entered are valid.
 * 
 * If this method returns true it is expected that calls to getData 
 * and getSchema will be authorized. 
 * If this method returns false the user will likely be notified that auth has expired 
 * and they will be asked to reauthorize.
 * 
 * @returns {boolean} true if 3rd-party service credentials are valid, 
 *                    false otherwise. 
 */
function isAuthValid() {
    
}

/**
 * This method clears user credentials for the third-party service.
 */
function resetAuth() {

}

/**
 * 
 */
function getConfig(request) {

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