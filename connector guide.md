# Using the Impact++ ODK Central GDS Connector
As of 2/12/2021, our connector is fully functional with both visualizing geographic data on GDS and supporting user viewing their repeat data. Using the following steps, you should be able to get up and running! Feel free to open an issue on this repo if something isn't working, or a comment [here](https://forum.getodk.org/t/create-an-odata-connector-to-use-odk-central-as-data-source-in-google-data-studio/23636/12) if you need help.

Before reading further, please take a moment to consider your privacy concerns and read the blurb below about user data.  

## Preparing the connector for use
We are working to get this connector into Google's public [Connector Gallery](https://datastudio.google.com/data). Until it is approved, you will need to run the connector from your own Google account by accessing the deployment [here](https://datastudio.google.com/datasources/create?connectorId=AKfycbz5hy64bfHz3b92xxIVm6oW59Qh6mBGGZ62x7sjmz8y4vfN4dPZjG27DhH1xmHrkbeAYw)



## Using the connector

1. Have a form which you've uploaded to your instance of ODK Central, as well as some data you'd like to view in Google Data Studio.
2. Create a Central account which has view-only privileges. This step is not strictly necessary, but Google will [use](https://support.google.com/datastudio/answer/9053467?hl=en) your login information, which users may have varying levels of comfort with.
3. Deploy your connector via publish &rarr; deploy from manifest &rarr; Latest Version (head) &rarr; click on the datastudio.google.com link
4. Using the Central account you'd like google to be "aware" of, login to the connector. In the Path text box, please paste the OData URL for your form, as described [here](https://docs.getodk.org/central-submissions/#connecting-to-submission-data-over-odata) (e.g. https://sandbox.getodk.cloud/v1/projects/4/forms/two-repeats.svc)
5. Once you've logged in, there will be a second configuration screen. You will need to copy the URL you entered in the first screen again to the text box in the second screen. Later you can come back to change the URL to another form you want to analyze.
6. Click on NEXT.
7. Now another field should appear that says "Table". (see an example image below)
8. Click on the triangle in the "Table" field and a dropdown menu would appear. Select the repeat/Submissions table you want to access.
9. Click on NEXT.
10. Now you will see the number of rows in this table, and you need to input the starting row and number of rows you want to access. If you have thousands of submissions or less, you can likely pull the full dataset without difficulty. If the number of rows you want to access is around 50,000, it will take a couple minutes to transfer your data and you may want to only pull a subset. (**Note: starting row parameter is 0-indexed. i.e. if you want to access the entire dataset, your start will be 0, and number of rows should be length of dataset.**)
11. Click on CONNECT.
12. Make sure the types of your data are correct. If they are not what you expect, you can manually change them.
13. Create a report and play with your data! Our tutorial ends here as we aren't GDS experts. Happy coding and let us know if you have any feedback!

![second configuration screen example](configuration.png)

## Google Data Studio
We ask that before you use our connector, you take a moment to think about any privacy concerns associated with your data. [GDS](https://developers.google.com/datastudio) is a data visualization tool which is capable of working with any data sources accessible via the internet. There is an [existing ecosystem](https://datastudio.google.com/data) of community connectors, which is where we received our inspiration to create one for ODK Central. When you connect to a data source through a connector, you have to share your credentials for that data source with Google. We recommend creating a Central [Project Viewer](https://docs.getodk.org/central-users/#web-user-roles) specifically to use with GDS.

## Example visualizaing the GEO data
At the Google Data Studio report/exploration page, 
1. Add your geo data field into the *Dimension* column.
2. add another numeric field of your choosing to the *Metric* column.
3. In the chart section of GDS, select "Bubble Map". An map with points on it should appear, like the image below.

![map](map.png)

## How to rename your data source
In the first authentication screen or the second configuration screen, at the top left corner of the screen and you should see the name of your connector displayed as "Untitled Data Source", as shown below. If you hover over that and click on the name, it will give you the chance to rename this data source to something more meaningful, for example "odata-my-form".
![rename data source](rename_data_source.png)

## Converting ODK datatypes to GDS datatypes
Most ODK datatypes have fairly natural GDS equivalents. However, there are some complications when converting certain datatypes, which are documented below.

1. Files attached to ODK submissions (images, videos, pictures, etc.) are represented with a URL that will lead to the file in GDS. Note that because of ODK's authorization requirements, you will be unable to access these files by directly following the link from GDS as GDS doesn't attach the correct headers to the request. However, if you are logged into your ODK account, you will be able to copy and paste the link into a web browser to download the file.
2. ODK's dateTime type is converted to GDS's YEAR_MONTH_DAY_HOUR type, which means that the minutes field is lost.
3. ODK's geopoint type is converted to GDS's LATITUDE_LONGITUDE type. Accuracy field from Odata is added as another numeric column in GDS. Elevation field is lost in GDS.
4. ODK's geoshape and geotrace types are currently converted to a TEXT representation in GDS. This may be changed to a group of associated LATITUDE_LONGITUDE points in the future.

## Performance issues accessing forms with many submissions
There are known performance issues with the connector when accessing upwards of ~50,000 rows of an ODK form. This is caused by overhead related to converting data from the format ODK provides to the format that GDS requires. As a result, requests for over 50,000 rows might take several minutes or fail altogether. To handle this issue, we allow users to specify the max number of rows that they want to access from their dataset, which means that parts of large forms can still be accessed. Users should also consider how requests for many rows of larger forms might impact the performance or bandwidth of the server they are requesting data from.

## For Developers
*Note: Google changes its tools often and you may find that these instructions are out of date. At the time of writing, the [apps script ide](https://workspaceupdates.googleblog.com/2020/12/google-apps-script-ide-better-code-editing.html) had just been updated without including all features needed for GDS connectors, and our guide is designed for what is now called the "legacy" editor. If you need to modify the connector, the specification provided from Google can be found [here](https://developers.google.com/datastudio/connector/build). *  
1. Fork this repository (or get its code in any other way you like)
2. Head to https://www.google.com/script/start/  
3. Click "start scripting" along the top bar
4. Create a new project (along top bar)
5. Copy `main.js` into `code.gs` (along with any changes you have made in your fork)
6. Go to view &rarr; show manifest file &rarr; copy `appscript.json` from our repository
7. change the code however you want. (adding new features, etc)
8. Create a [deployment](https://developers.google.com/datastudio/connector/deploy#create_separate_deployments) - Note that you will need to switch to the legacy editor for this.
