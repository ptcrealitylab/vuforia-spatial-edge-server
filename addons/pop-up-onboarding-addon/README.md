# pop-up-onboarding-addon
When compiling the vuforia-spatial-toolbox-ios app with this addon, the UI of the app will change to a simplified
onboarding flow that provides an easy way to scan an area target, share the space, and add four types of tools to
the space.

## Contents

`content_scripts/`, `content_resources/`, and `content_styles/` together modify the userinterface for the portrait mode Pop-up Metaverse app.

`tools/communication/` adds the conversation app to the system.

`tools/searchDigitalThread/` and `interfaces/digitalThread/` together add the search tool to the system.

## Communication Tool

The communication tool lets you write messages in a spatially-contextualized digital note. Each note becomes a message thread. You can @mention other users by name, with support for push notifications partially developed (but not deployed at time of writing). You can also attach photos and videos to the chat thread. The chat will automatically open when you spatially approach it. It mimics some "envelope" functionality (opening and closing and minimizing into a 2D icon), but is not implemented as an envelope at this time.

## Search Tool

The search tool was originally developed in the repo: https://github.com/ptcrealitylab/SpatialSearch, but may not be up-to-date in that location anymore. It provides a search bar that you can type into, which will query PTC backend systems to retrieve relevant digital twin information from a variety of connected systems. When you drop the tool into the space, a search bar will appear and allow you to traverse the nested search tree to select a document. It then minimizes into an icon (implemented as an envelope), and tapping on it again will attempt to open the document with the correct content viewer. It supports PDFs, as well as proof-of-concept for a template-based approach that will render a JSON response into a "knowledge card" to make that data easily digestable.

The search tool requires the `digitalThread` interface in order to avoid CORS restrictions for the REST requests that it makes. Be sure to **turn on the digitalThread interface at localhost:8080**. You must also **add the environment variables** described in the section below.

You can test and develop the UI for the searchDigitalThread tool at `localhost:8083`. This will use the index.html file in interfaces/digitalThread. 

To ensure that the tool is up-to-date with any changes made in the interface, copy over any changes from interfaces/digitalThread/index.html to tools/searchDigitalThread/index.html.

### Offline Mode Installation Instructions (March 2023 Update)
The search tool now contains a digitalThread hardware interface, which you can enable at localhost:8080 and toggle on
Offline Mode if you want to develop a demo with a set of local files. When you do so, the search results will be
populated from your `Documents/spatialToolbox/.identity/digitalThread/database` directory. Add a directory in here for
each machine name to pop up in the initial results. Within each machine, add a directory for each application (e.g.
windchill, thingworx) to pop up in the next level of nested results. Finally, within each application directory, add any
PDFs or images that you would like to appear in the final level of search results. The PDFs will be rendered with the
https://github.com/mozilla/pdf.js/releases/tag/v3.4.120 library – download the pdfjs-3.4.120-dist.zip, and copy the
`build` and `web` directories from it into the `pop-up-onboarding-addon/interfaces/digitalThread/public/pdfjs` directory.

### Adding Environment Variables

To make api calls with the searchDigitalThread tool, create a .env file in the `interfaces/digitalThread` directory
and add the following code:

```
    API_BASE_URL="base url for api calls"
    SEARCH_KEY="search key"
    AUTOCOMPLETE_KEY="autocomplete key"
```

Ask the Reality Lab team for the correct values for the .env file.
