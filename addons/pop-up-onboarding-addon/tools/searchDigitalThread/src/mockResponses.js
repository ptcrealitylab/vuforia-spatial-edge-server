const MOCK_WINDCHILL = `{
    "contentType": "application/json; charset=utf-8",
    "data": "{\"flowResponse\":[{\"id\":\"OR:wt.part.WTPart:3845102\",\"typeId\":\"WCTYPE|wt.part.WTPart|com.ptc.SystemStructureItems|com.ptc.RootStructureItems|com.ptc.Snowmobile\",\"attributes\":{\"number\":\"100 SNOW\",\"name\":\"SNOWMOBILE MASTER\",\"state\":\"In Planning\",\"version\":\"B.2 (Manufacturing)\"},\"infoPageURL\":\"https://PP-2206141907LQ.portal.ptc.io/Windchill/app/#ptc1/tcomp/infoPage?oid=VR%3Awt.part.WTPart%3A3839141&u8=1\"},{\"id\":\"OR:wt.part.WTPart:1239877\",\"typeId\":\"WCTYPE|wt.part.WTPart|com.ptc.SystemStructureItems|com.ptc.RootStructureItems|com.ptc.Snowmobile\",\"attributes\":{\"number\":\"100 SNOW\",\"name\":\"SNOWMOBILE MASTER\",\"state\":\"Released For Production\",\"version\":\"A.2 (Manufacturing)\"},\"infoPageURL\":\"https://PP-2206141907LQ.portal.ptc.io/Windchill/app/#ptc1/tcomp/infoPage?oid=VR%3Awt.part.WTPart%3A1235566&u8=1\"},{\"id\":\"OR:wt.part.WTPart:1212676\",\"typeId\":\"WCTYPE|wt.part.WTPart|com.ptc.SystemStructureItems|com.ptc.RootStructureItems|com.ptc.Snowmobile\",\"attributes\":{\"number\":\"100 SNOW\",\"name\":\"SNOWMOBILE MASTER\",\"state\":\"Released For Production\",\"version\":\"-.12 (Manufacturing)\"},\"infoPageURL\":\"https://PP-2206141907LQ.portal.ptc.io/Windchill/app/#ptc1/tcomp/infoPage?oid=VR%3Awt.part.WTPart%3A1017416&u8=1\"},{\"id\":\"OR:wt.part.WTPart:211273\",\"typeId\":\"WCTYPE|wt.part.WTPart|com.ptc.SystemStructureItems|com.ptc.RootStructureItems|com.ptc.Snowmobile\",\"attributes\":{\"number\":\"100 SNOW\",\"name\":\"SNOWMOBILE MASTER\",\"state\":\"Released\",\"version\":\"1.2 (Design)\"},\"infoPageURL\":\"https://PP-2206141907LQ.portal.ptc.io/Windchill/app/#ptc1/tcomp/infoPage?oid=VR%3Awt.part.WTPart%3A210601&u8=1\"}]}"
}`;

const MOCK_THINGWORX = `{
    "contentType": "application/json; charset=utf-8",
    "data": "{\"status\":200,\"flowResponse\":[{\"name\":\"SnowmobileTest\",\"description\":\"This is a Thing represents Snowmobile Test\",\"thingTemplate\":\"GenericThing\",\"tags\":[],\"EngineTemp\":34,\"ModelNumber\":\"567GGHIK\",\"SerialNumber\":\"FF-678-56-900\",\"testAttribute\":\"xxcv\"}]}"
}`

const MOCK_SERVICEMAX = `{
    "contentType": "application/json; charset=utf-8",
    "data": "{\"status\":200,\"flowResponse\":{\"Id\":\"a095f000000nUKBAA2\",\"OwnerId\":\"0055f000004eugQAAQ\",\"Name\":\"25C9QBD4A\",\"CurrencyIsoCode\":\"USD\",\"CreatedDate\":\"2021-11-01T18:32:04.000Z\",\"LastModifiedDate\":\"2021-11-01T18:32:04.000Z\",\"City\":\"New York\",\"Country\":\"United States\",\"Date_Installed\":\"2003-05-11\",\"Product_Name\":\"Centrifugal Pump\",\"State\":\"NY\",\"Status\":\"Installed\",\"Street\":\"11 Wall St\",\"Zip\":\"10005\",\"Manufacturer\":\"Universal\"}}"
}`
