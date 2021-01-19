# Using the Impact++ ODK Central GDS Connector
As of 11/17/20, our connector appears to be functional with the exception of repeats (an issue on our roadmap). Using the following steps, you should be able to get up and running! Feel free to open an issue on this repo if something isn't working, or a comment [here](https://forum.getodk.org/t/create-an-odata-connector-to-use-odk-central-as-data-source-in-google-data-studio/23636/12) if you need help.

Before reading further, please take a moment to consider your privacy concerns and read the blurb below about user data.  

## Editing the connector
*Note: these steps may be out of date. If you encounter any issues, the specification provided from Google can be found [here](https://developers.google.com/datastudio/connector/build)*  
1. Fork this repository (or edit it in any other way you like)
2. Head to https://www.google.com/script/start/  
3. Click "start scripting" along the top bar
4. Create a new project (along top bar)
5. Copy `main.js` into `code.gs` (along with your changes)
6. Go to view &rarr; show manifest file &rarr; copy `appscript.json`
7. Save &rarr; publish &rarr; deploy from manifest &rarr; click on the datastudio.google.com link
3. Using (see below)

## Using the connector

1. Have a form which you've uploaded to your instance of ODK Central, as well as some data you'd like to view in Google Data Studio.
2. Create an account which has view-only privileges. This step is not strictly necessary, but Google will [use](https://support.google.com/datastudio/answer/9053467?hl=en) your login information, which users may have varying levels of comfort with.
3. Using your form ID and the account you'd like google to be "aware" of, login to our connector [here](https://datastudio.google.com/u/0/datasources/create?connectorId=AKfycbwlLqb1ZWaB0mPpdfG8o-JhKv6BnPubbqL-VLg9cfA). Note that the url you input at login is *NOT* for your form, but for wherever your instance of ODK Central is hosted (for example: https://sandbox.central.getodk.org/v1)
4. Fill out info for your form (minimal example below)
5. Play with your data! Our tutorial ends here as we aren't GDS experts. Happy coding and let us know if you have any feedback!

![minimal form](https://github.com/UDub-Impact/OData-Connector/blob/master/form.PNG)

## Google Data Studio
We ask that before you use our connector, you take a moment to think about any privacy concerns associated with your data. [GDS](https://developers.google.com/datastudio) is a data visualization tool which is capable of working with any data sources accessible via the internet. There is an [existing ecosystem](https://datastudio.google.com/data) of community connectors, which is where we received our inspiration to create one for ODK central. It is important to note that since it will travel over the internet *your data will be "seen" (likely in encrypted form) by many networks and routers along the way*. HTTPS is, of course, very powerful and enables use of the internet for transmission extremely sensitive user information. However each use case is different, and we can't decide for you whether your security concerns are met.

## Converting ODK datatypes to GDS datatypes
Most ODK datatypes have fairly natural GDS equivalents. However, there are some complications when converting certain datatypes, which are documented below.

1. Files attached to ODK submissions (images, videos, pictures, etc.) are represented with a URL that will lead to the file in GDS. Note that because of ODK's authorization requirements, you will be unable to access these files by directly following the link from GDS as GDS doesn't attach the correct headers to the request. However, if you are logged into your ODK account, you will be able to copy and paste the link into a web browser to download the file.
2. ODK's dateTime type is converted to GDS's YEAR_MONTH_DAY_HOUR type, which means that the minutes field is lost.
3. ODK's geopoint type is converted to GDS's LATITUDE_LONGITUDE type, which means that accuracy and elevation fields are lost.
4. ODK's geoshape and geotrace types are currently converted to a TEXT representation in GDS. This may be changed to a group of associated LATITUDE_LONGITUDE points in the future.
