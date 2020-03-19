Usage
Clone the repository.

Open the Command Prompt and change to the directory where you cloned the project. For instance, if it is cloned in a folder called "extensions" and saved as "vsts-extension-integer-control", you will navigate to the following command line.

 > cd C:\extensions\vsts-extension-integer-control
Run npm install to install required local dependencies.

Run npm install -g grunt to install a global copy of grunt (unless it's already installed).

configure the category value in the vss-extension.json file by : 
    for tfs 2017 "Plan and track"
    for tfs 2019 "Azure Boards"

Run grunt package-dev.

In your browser, navigate to your local instance of TFS, http://YourTFSInstance:8080/tfs.

Go to your personal Marketplace.

Click the Marketplace icon in the upper righthand corner.

Click "Browse local extensions" in the dropdown.

Scroll down and click on the "Manage Extensions" widget.

Click the button "Upload new extension".

Browse to the .vsix file generated when you packaged your extension.

Select the extension, and then click "Open". Click "Upload" when the button activates.

Hover over the extension when it appears in the list, and click "Install".