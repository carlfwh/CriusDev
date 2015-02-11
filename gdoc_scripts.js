/*-------------------
Developed by: John Purcell
Contact info
- Twitter: @HLIBindustry
- Blog: eve-prosper.blogspot.com
Purpose:
A suite of API/CREST scraping tools for use in Google sheets for EVE Online data

Legal:
API/CREST is property of CCP hf. 
Code is distributed free-of-charge, and should not be used for commercial gain
Code is open source, but notification is appreciated on any modifications

Developed as part of the CriusDev project: https://github.com/lockefox/CriusDev
*/
var base_CREST_URL = "http://public-crest.eveonline.com/";
var test_CREST_URL = "http://public-crest-sisi.testeveonline.com/";
var base_API_URL = "https://api.eveonline.com/char/AssetList.xml.aspx?";
var jobType ={};

var min_wait = 10;
var max_wait = 500;

JobType = {1:"Manufacturing",
           3:"Researching Time Efficiency",
           4:"Researching Material Efficiency",
           5:"Copying",
           7:"Reverse Engineering",
           8:"Invention"};

var jobType_arr = [];
jobType_arr = ["NOT VALID", "Manufacturing", "NOT VALID", "Researching Time Efficiency", "Researching Material Efficiency", "Copying", "NOT VALID", "Reverse Engineering", "Invention"];

//TODO: verify status values//
var status_arr = [];
status_arr = ["Failed", "Delivered", "Aborted", "GM Aborted", "Inflight Unachored", "Destroyed"];
////	UTILITIES	////
function isInArray(value, array) {
  return array.indexOf(value) > -1;
}

function lshift(data_array, shift_count){//shifts an array left.  DESTRUCTIVE!
  var hold_array = [];
  var filler ="";
  
  var data_copy = data_array;//holds data (destructive operation)
  
  for (var rows=0; rows < data_array.length; rows++){
    hold_array = data_copy[rows];
    for (var cnt=0; cnt < shift_count; cnt++){
      var trash = hold_array.shift();
    }
    data_copy[rows]=hold_array;
  }
  
  return data_copy;
}

function zero_array(array_length){
  var out_array = []
  for (var i=0; i<array_length; i++){
    out_array[i]=0 
  }
  return out_array
}

function date_array(days)
{
  var daterange = [];
  
  var mydate = new Date();
  
  mydate.setDate(mydate.getDate()-1);//API doesn't give TODAY's data
  for (var datestep=0; datestep<days; datestep++)
  {
    var datestr = "";
    var month = mydate.getMonth()+1;
    if (month < 10)
    {
      month = "0"+month;
    }
    var day = mydate.getDate();
    if (day <10)
    {
      day = "0"+day;
    }
    datestr = mydate.getFullYear()+"-"+month+"-"+day+"T00:00:00";
    daterange[datestep] = datestr;
    mydate.setDate(mydate.getDate()-1);
  }
  
  return daterange;
}

function getAllianceID(keyID, vCode, systemList)
{
  parameters = {
    method : "post",
    payload :
    "keyID=" + encodeURIComponent(keyID) +
    "&vCode=" + encodeURIComponent(vCode)
  };
  Utilities.sleep(1000);
  
  var info = ""
  try{//generic query error
    Utilities.sleep(1000);
    var info = UrlFetchApp.fetch("https://api.eveonline.com/account/APIKeyInfo.xml.aspx?",parameters).getContentText();
  }catch (e){
    throw e;
  }
  
  var infoXML = Xml.parse(info,true);
  var KeyOwnerInfo = infoXML.eveapi.result.key.rowset.row.getElements();
  
  var allianceID = Number(KeyOwnerInfo.getAttribute("allianceID").getValue());
  
  return allianceID;
}

function fetchRawAPI(keyID,vCode,API_string,add_args,test_server)
{
  if(add_args)
  {
    var parameters = {
      method : "post",
      payload :
      "keyID=" + encodeURIComponent(keyID) +
      "&vCode=" + encodeURIComponent(vCode) +
      add_args,
      user_agent : "Lockefox @HLIBindustry GDOC scripts",
    };
  }
  else
  {
    var parameters = {
      method : "post",
      payload :
      "keyID=" + encodeURIComponent(keyID) +
      "&vCode=" + encodeURIComponent(vCode),
      user_agent : "Lockefox @HLIBindustry GDOC scripts",
    };
  }
  
  var API_addr = "";
  if(test_server) API_addr = "https://api.testeveonline.com/";
  else API_addr = "https://api.eveonline.com/";
  
  var info = ""
  var ret_arr = []
  try{//generic query error
    Utilities.sleep(1000);
    var info = UrlFetchApp.fetch(API_addr+API_string,parameters).getContentText();
  }catch (e){
    ret_arr.push(e);
    try{
      if(add_args)
      {
        var parameters = {
          method : "post",
          payload :
          "keyID=" + encodeURIComponent(keyID) +
          "&vCode=" + encodeURIComponent(vCode) +
          add_args,
          user_agent : "Lockefox @HLIBindustry GDOC scripts",
          muteHttpExceptions : true
        };
      }
      else
      {
        var parameters = {
          method : "post",
          payload :
          "keyID=" + encodeURIComponent(keyID) +
          "&vCode=" + encodeURIComponent(vCode),
          user_agent : "Lockefox @HLIBindustry GDOC scripts",
          muteHttpExceptions : true
        };
      }
      Utilities.sleep(1000);
      info = UrlFetchApp.fetch(API_addr+API_string,parameters).getContentText()
      ret_arr.push(info)
    }
    catch (er){
      throw er
    }
    return ret_arr
  }
  return info
}

////	FETCH FUNCS		////
function __fetchCrest_market(region_id,item_id)
{
  var parameters = {
    method : "get",
    user_agent : "Lockefox @HLIBindustry GDOC scripts",
  }
  
  var sleeptime = min_wait + (max_wait - min_wait)*Math.random();
  Utilities.sleep(sleeptime);
  var url = base_CREST_URL+"market/"+region_id+"/types/"+item_id+"/history/"
  var text = UrlFetchApp.fetch(url,parameters);
  var json_obj = JSON.parse(text);
  
  return json_obj;
}

function __fetchSystemIndexes(test_server)
{
  var base_url="";
  
  if(test_server) base_url = test_CREST_URL;
  else base_url = base_CREST_URL;
  //  if(test_server === undefined) base_url = base_CREST_URL; //allow switching between test/live server (for debug)
  //  else base_url = test_CREST_URL;
  //  
  var parameters = {
    method : "get",
    user_agent : "Lockefox @HLIBindustry GDOC scripts",
  }
  var url = base_url+"industry/systems/";
  Utilities.sleep(1000);
  var text = UrlFetchApp.fetch(url,parameters);
  var json_obj = JSON.parse(text);
  
  return json_obj;
}

function __fetchMarketPrices(test_server)
{
  var base_url="";
  
  if(test_server) base_url = test_CREST_URL;
  else base_url = base_CREST_URL;
  //  if(test_server === undefined) base_url = base_CREST_URL; //allow switching between test/live server (for debug)
  //  else base_url = test_CREST_URL;
  //  
  var parameters = {
    method : "get",
    user_agent : "Lockefox @HLIBindustry GDOC scripts",
  }
  var url = base_url+"market/prices/";
  Utilities.sleep(1000);
  var text = UrlFetchApp.fetch(url,parameters);
  var json_obj = JSON.parse(text);
  
  return json_obj;
}

function API_validateKey(keyID, vCode, expected_type, CAK_mask, test_server)
{
  //Takes API info and throws errors if bad
  
  var parameters = {
    method : "post",
    payload :
    "keyID=" + encodeURIComponent(keyID) +
    "&vCode=" + encodeURIComponent(vCode),
    user_agent : "Lockefox @HLIBindustry GDOC scripts",
  };
  
  var API_addr = "";
  if(test_server) API_addr = "https://api.testeveonline.com/";
  else API_addr = "https://api.eveonline.com/";
  
  var info = ""
  try{//generic query error
    Utilities.sleep(1000);
    var info = UrlFetchApp.fetch(API_addr+"account/APIKeyInfo.xml.aspx?",parameters).getContentText();
  }catch (e){
    throw e;
  }
  
  var infoXML = Xml.parse(info,true);
  var accessMask = infoXML.eveapi.result.key.getAttribute("accessmask").getValue();
  var keytype = infoXML.eveapi.result.key.getAttribute("type").getValue();
  
  if (keytype != expected_type){
    throw "Invalid key type:" +  keytype + "Expected: " + expected_type;
  }
  
  if ((Number(accessMask) & CAK_mask) == 0){
    throw "Invalid access mask: " + accessMask + "Expected: " + CAK_mask; 
  }
  //make "EXPIRED" case
}

////	GDOC FUNCS		////

function getPOS(keyID, vCode, header_bool, verbose_bool, test_server)
{
  var can_Locations = true;
  var can_POSDetails= true;
  
  
  try{
    var can_Locations = true;
    API_validateKey(keyID, vCode, "Corporation", 16777216, test_server);
  }catch(err){
    can_Locations = false;
  }
  
  try{
    var can_POSDetails= true;
    API_validateKey(keyID, vCode, "Corporation", 131072, test_server);
  }catch(err){
    can_POSDetails = false;
  }
  
  try{
    API_validateKey(keyID, vCode, "Corporation", 524288, test_server);
  }catch(err){
    return err;
  }
  
  //var allianceID = getAllianceID(keyID, vCode);
  
  parameters = {
    method : "post",
    payload :
    "keyID=" + encodeURIComponent(keyID) +
    "&vCode=" + encodeURIComponent(vCode),
    user_agent : "Lockefox @HLIBindustry GDOC scripts",
  };
  Utilities.sleep(1000);
  var API_addr = "";
  var call_mod = "";
  
  //switch call for test/live server
  if(test_server) API_addr = "https://api.testeveonline.com/";
  else API_addr = "https://api.eveonline.com/";
  
  var api_query = API_addr+"corp/StarbaseList.xml.aspx?"//keyID="+keyID+"&vCode="+vCode;
  var POS_api = UrlFetchApp.fetch(api_query, parameters).getContentText();
  var POSXML = Xml.parse(POS_api,true);
  var POSList = POSXML.eveapi.result.rowset.getElements("row");
  
  //var standings_owner = POSList[0].getAttribute("standingOwnerID");
  var return_array = [];
  
  if(header_bool)
  {
    var header = []
    
    if (verbose_bool)	header.push("itemID");
    if (can_Locations)	header.push("towerName");
    if (verbose_bool)	header.push("typeID");
    header.push("typeName");
    if (verbose_bool)	header.push("solarSystemID");
    header.push("solarSystemName");
    if (verbose_bool)	header.push("moonID");
    header.push("Location");
    header.push("Status");
    if (verbose_bool)	header.push("stateTimestamp");
    if (verbose_bool)	header.push("onlineTimestamp");
    if (verbose_bool)	header.push("standingOwnerID");
    if (verbose_bool)	header.push("standingOwner");
    if (can_POSDetails)	header.push("fuelRemaining");
    if (can_POSDetails)	header.push("chartersRemaining");
    if (can_POSDetails)	header.push("strontiumRemaining");
    if (can_POSDetails)	header.push("fuelTimeHours");
    if (can_POSDetails)	header.push("strontTimeHours");
    
    return_array.push(header);
  }
  
  var towerIDs = [];
  var towerName_conv = {};
  
  if(can_Locations || can_POSDetails)
  {//get a towerID list
    for (var towerNum = 0; towerNum < POSList.length; towerNum++)
    {
      towerIDs.push(POSList[towerNum].getAttribute("itemid").getValue());
    }
    
    if(can_Locations && (POSList.length > 0))
    towerName_conv = getLocations(keyID, vCode, towerIDs.join(), test_server);
  }
  
  
  for(var towerNum = 0; towerNum < POSList.length; towerNum++)
  {
    var tower_line = [];
    
    var towerID   = POSList[towerNum].getAttribute("itemid").getValue();
    var towerName = "";
    if(can_Locations)
      towerName = towerName_conv[towerID];
    
    var towerTypeID = POSList[towerNum].getAttribute("typeid").getValue();
    
    var solarSystemID = POSList[towerNum].getAttribute("locationid").getValue();
    var moonID = POSList[towerNum].getAttribute("moonid").getValue();
    var solarSystemLookup = UrlFetchApp.fetch("https://www.fuzzwork.co.uk/api/mapdata.php?itemid="+moonID+"&format=xml").getContentText();
    var SS_XML = Xml.parse(solarSystemLookup,true);
    
    var solarSystemName = SS_XML.eveapi.row.getElements("solarsystemname")[0].getText()
    var moonName = SS_XML.eveapi.row.getElements("itemname")[0].getText();
    
    
    var fuel_remain = 0;
    var chrt_remain = 0;
    var strt_remain = 0;
    var fuel_time_h = 0;
    var strt_time_h = 0;
    if(can_POSDetails)
    {
      parameters = {
        method : "post",
        payload :
        "keyID=" + encodeURIComponent(keyID) +
        "&vCode=" + encodeURIComponent(vCode) +
        "&itemID=" + encodeURIComponent(towerID),
        user_agent : "Lockefox @HLIBindustry GDOC scripts",
      };
      
      api_query = API_addr+"corp/StarbaseDetail.xml.aspx?";
      var det_api = UrlFetchApp.fetch(api_query, parameters).getContentText();
      var detXML = Xml.parse(det_api,true);
      var detList = detXML.eveapi.result.rowset.getElements("row"); 
      
      for(var invRow = 0; invRow < detList.length; invRow++)
      {
        var contents_id = detList[invRow].getAttribute("typeid").getValue();
        var quantity    = Number(detList[invRow].getAttribute("quantity").getValue());
        if		(contents_id == stront)
          strt_remain = quantity;
        else if (charters.indexOf(contents_id) > -1)
          chrt_remain = quantity;
        else if (fuelBlocks.indexOf(contents_id) > -1)
          fuel_remain = quantity;
      }
      
      var fuel_hours = Math.floor(fuel_remain/(fuel_perhour_conv[towerTypeID]));
      
      fuel_time_h = fuel_hours;
      strt_time_h = Math.floor(strt_remain/(stront_perhour_conv[towerTypeID]))
      /*--TODO: DO SOV lookup and charter Fuel Math--*/	
    }
    
    if (verbose_bool)	tower_line.push(Number(towerID));
    if (can_Locations)	tower_line.push(       towerName);
    if (verbose_bool)	tower_line.push(Number(towerTypeID));
    tower_line.push(       POS_typeID_conv[towerTypeID]);
    if (verbose_bool)	tower_line.push(Number(solarSystemID));
    tower_line.push(       solarSystemName);
    if (verbose_bool)	tower_line.push(Number(moonID));
    tower_line.push(       moonName);
    tower_line.push(       POS_status[Number(POSList[towerNum].getAttribute("state").getValue())]);
    if (verbose_bool)	tower_line.push(       POSList[towerNum].getAttribute("statetimestamp"));
    if (verbose_bool)	tower_line.push(       POSList[towerNum].getAttribute("onlinetimestamp"));
    if (verbose_bool)	tower_line.push(       POSList[towerNum].getAttribute("standingownerid"));
    if (verbose_bool)	tower_line.push(       POSList[towerNum].getAttribute("standingownerid"));
    if (can_POSDetails)	tower_line.push(       fuel_remain);
    if (can_POSDetails)	tower_line.push(       chrt_remain);
    if (can_POSDetails)	tower_line.push(       strt_remain);
    if (can_POSDetails)	tower_line.push(       fuel_time_h);
    if (can_POSDetails)	tower_line.push(       strt_time_h);
    
    return_array.push(tower_line);
  }
  
  return return_array;
  
}

function getFacilities(keyID, vCode, header_bool, verbose_bool, test_server)
{
  /////Check if key can do the ID->name conversion/////
  
  try{
    var can_Locations = true;
    API_validateKey(keyID, vCode, "Corporation", 16777216, test_server);
  }catch(err){
    can_Locations = false;
  }
  
  try{
    API_validateKey(keyID, vCode, "Corporation", 2, test_server);//foxfour says says accessMask corp/facilities = /corp/assets
  }catch(err){
    return err;
  }
  
  ////SET UP ADDRESS CALL////	
  parameters = {
    method : "post",
    payload :
    "keyID=" + encodeURIComponent(keyID) +
    "&vCode=" + encodeURIComponent(vCode),
    user_agent : "Lockefox @HLIBindustry GDOC scripts",
  };
  Utilities.sleep(1000);
  var API_addr = "";
  var call_mod = "";
  
  
  //switch call for test/live server
  if(test_server) API_addr = "https://api.testeveonline.com/";
  else API_addr = "https://api.eveonline.com/";
  
  var api_query = API_addr+"corp/Facilities.xml.aspx?"//keyID="+keyID+"&vCode="+vCode;
  var fac_api = UrlFetchApp.fetch(api_query, parameters).getContentText();
  var facXML = Xml.parse(fac_api,true);
  var facList = facXML.eveapi.result.rowset.getElements("row");
  
  var return_array = [];
  
  if(header_bool)
  {
    var header = []
    
    if (verbose_bool)	header.push("facilityID");
    if (can_Locations)	header.push("facilityName");
    if (verbose_bool)	header.push("typeID");
    header.push("typeName");
    if (verbose_bool)	header.push("solarSystemID");
    header.push("solarSystemName");
    if (verbose_bool)	header.push("regionID");
    header.push("regionName");
    if (verbose_bool)	header.push("starbaseModifier");
    header.push("tax");
    
    /*--TODO: publish facility bonuses?--*/
    return_array.push(header);
  }
  
  var facName_conv = {};
  
  if(can_Locations)
  {//process whole list, and pull names all at once.
    var ID_list = [];
    for (var rowNum = 0; rowNum < facList.length; rowNum++)
    {//get all facility id's
      //ID_list = ID_list+facList[rowNum].getAttribute("facilityid").getValue()+",";
      ID_list.push(facList[rowNum].getAttribute("facilityid").getValue());
    }
    if (facList.length > 0)
      facName_conv = getLocations(keyID, vCode, ID_list.join(), test_server);
  }
  
  for (var rowNum = 0; rowNum < facList.length; rowNum++)
  {
    var fac_line = [];
    
    var facID = facList[rowNum].getAttribute("facilityid").getValue();
    var facName = facName_conv[facID];
    
    if (verbose_bool)	fac_line.push(Number(facID));
    if (can_Locations)	fac_line.push(       facName);
    if (verbose_bool)	fac_line.push(Number(facList[rowNum].getAttribute("typeid").getValue()));
    fac_line.push(       facList[rowNum].getAttribute("typename").getValue());
    if (verbose_bool)	fac_line.push(Number(facList[rowNum].getAttribute("solarsystemid").getValue()));
    fac_line.push(       facList[rowNum].getAttribute("solarsystemname").getValue());
    if (verbose_bool)	fac_line.push(Number(facList[rowNum].getAttribute("regionid").getValue()));
    fac_line.push(       facList[rowNum].getAttribute("regionname").getValue());
    if (verbose_bool)	fac_line.push(Number(facList[rowNum].getAttribute("starbasemodifier").getValue()));
    fac_line.push(Number(facList[rowNum].getAttribute("tax").getValue()));
    
    /*--TODO: publish facility bonuses?--*/
    return_array.push(fac_line);
  }
  return return_array;
}

function getLocations(keyID, vCode, csv_ID_list, test_server)
{
  var id_to_name = {};
  
  try{
    API_validateKey(keyID, vCode, "Corporation", 16777216, test_server);
  }catch(badkey){
    throw badkey;
  }
  
  parameters = {
    method : "post",
    payload :
    "keyID=" + encodeURIComponent(keyID) +
    "&vCode=" + encodeURIComponent(vCode) +
    "&IDs=" + encodeURIComponent(csv_ID_list),
    user_agent : "Lockefox @HLIBindustry GDOC scripts",
  };
  Utilities.sleep(1000);
  var API_addr="";
  if(test_server) API_addr = "https://api.testeveonline.com/";
  else API_addr = "https://api.eveonline.com/";
  
  var name_query = API_addr+"corp/Locations.xml.aspx?";
  var name_api = UrlFetchApp.fetch(name_query, parameters).getContentText();;
  var nameXML = Xml.parse(name_api,true);
  
  var nameList = nameXML.eveapi.result.rowset.getElements("row");
  
  for (var itemNum = 0; itemNum < nameList.length; itemNum ++)
  {
    var itemID   = nameList[itemNum].getAttribute("itemid").getValue();
    var itemName = nameList[itemNum].getAttribute("itemname").getValue();
    
    //NOTE: itemID is a string!!
    id_to_name[itemID] = itemName;
  }
  
  return id_to_name;
}

function getLocation (keyID, vCode, itemID, test_server)
{
  var locations_obj = {};
  locations_obj = getLocations(keyID, vCode, itemID, test_server);
  return locations_obj[itemID];
}

function getIndustryJobs(keyID, vCode, header_bool, verbose_bool, test_server)
{
  try{
    var can_Locations = true;
    API_validateKey(keyID, vCode, "Corporation", 16777216, test_server);
  }catch(err){
    can_Locations = false;
  }
  
  var personal_or_corp = 0;	//0=personal, 1=corp
  try{
    API_validateKey(keyID, vCode, "Character", 128, test_server);
  }catch(err){
    personal_or_corp = 1;
    try{
      API_validateKey(keyID, vCode, "Corporation", 128, test_server);
    }catch(badkey){
      return badkey;
    }
  }
  ////SET UP ADDRESS CALL////	
  parameters = {
    method : "post",
    payload :
    "keyID=" + encodeURIComponent(keyID) +
    "&vCode=" + encodeURIComponent(vCode),
    user_agent : "Lockefox @HLIBindustry GDOC scripts",
  };
  Utilities.sleep(1000);
  var API_addr = "";
  var call_mod = "";
  
  //switch call for personal/corp
  if (personal_or_corp == 0) call_mod = "char";
  else call_mod = "corp";
  
  //switch call for test/live server
  if(test_server) API_addr = "https://api.testeveonline.com/";
  else API_addr = "https://api.eveonline.com/";
  
  var api_query = API_addr+call_mod+"/IndustryJobs.xml.aspx?"//keyID="+keyID+"&vCode="+vCode;
  var job_api = UrlFetchApp.fetch(api_query, parameters).getContentText();;
  var jobXML = Xml.parse(job_api,true);
  
  var jobList = jobXML.eveapi.result.rowset.getElements("row");
  
  var return_array = [];
  if(header_bool)
  {
    var header = []
    if (verbose_bool)	header.push("jobID");
    if (verbose_bool)	header.push("installerID");
    header.push("installerName");
    if (verbose_bool)	header.push("facilityID");
    header.push("facilityName");
    if (verbose_bool)	header.push("solarSystemID");
    header.push("solarSystemName");
    if (verbose_bool)	header.push("stationID");
    header.push("stationName");
    if (verbose_bool)	header.push("activityID");
    header.push("activity");
    if (verbose_bool)	header.push("blueprintID");	
    header.push("blueprintTypeID");
    header.push("blueprintTypeName");
    if (verbose_bool)	header.push("blueprintLocationID");						
    if (verbose_bool)	header.push("outputLocationID");
    header.push("runs");
    header.push("cost");
    header.push("teamID");
    if (verbose_bool)	header.push("licensedRuns");	
    if (verbose_bool)	header.push("probability");	
    if (verbose_bool)	header.push("productTypeName");
    header.push("status");
    header.push("timeInSeconds");
    header.push("startDate");
    header.push("endDate");
    if (verbose_bool)	header.push("pauseDate");
    if (verbose_bool)	header.push("completedDate");
    if (verbose_bool)	header.push("completedCharacterID");	
    
    return_array.push(header);
  }
  
  var location_lookup = {};
  for (var jobNum = 0; jobNum < jobList.length; jobNum++)
  {
    job_line = [];
    
    var activityID   = Number(jobList[jobNum].getAttribute("activityid").getValue());	
    var activityName = "";
    try{
      activityName = jobType_arr[activityID];
    }catch (err){
      activityName = "UKN ACTIVITYID";
    }
    
    var facilityID = jobList[jobNum].getAttribute("facilityid").getValue();
    var stationID  = jobList[jobNum].getAttribute("stationid").getValue();
    
    var facilityName = "";
    var stationName  = "";
    
    if (facilityID in location_lookup)
      facilityName = location_lookup[facilityID]
      else
      {
        var facilityName_lookup = "";
        try{
          var NPCfac_lookup = UrlFetchApp.fetch("https://www.fuzzwork.co.uk/api/mapdata.php?itemid="+facilityID+"&format=xml").getContentText();
          var NPCfacXML = Xml.parse(NPCfac_lookup,true);
          
          facilityName_lookup = NPCfacXML.eveapi.row.getElements("itemname")[0].getText();
        }catch (err1){
          //Value wasn't an NPC space
          //THIS PROBABLY WON'T WORK FOR OUTPOSTS
          if(can_Locations)
          {
            facilityName_lookup = getLocation(keyID, vCode, facilityID, test_server);
          }
          else
          {//BLANK rather than spam
            facilityName_lookup = ""
          }
        }
        location_lookup[facilityID] = facilityName_lookup;
        facilityName = facilityName_lookup;
      }		
    
    if (stationID in location_lookup)
      stationName = location_lookup[stationID]
      else
      {
        var stationID_lookup = "";
        try{
          var NPCfac_lookup = UrlFetchApp.fetch("https://www.fuzzwork.co.uk/api/mapdata.php?itemid="+stationID+"&format=xml").getContentText();
          var NPCfacXML = Xml.parse(NPCfac_lookup,true);
          
          stationID_lookup = NPCfacXML.eveapi.row.getElements("itemname")[0].getText();
        }catch (err1){
          //Value wasn't an NPC space
          //THIS PROBABLY WON'T WORK FOR OUTPOSTS
          if(can_Locations)
          {
            stationID_lookup = getLocation(keyID, vCode, stationID, test_server);
          }
          else
          {//BLANK rather than spam
            stationID_lookup = "NO LOOKUP"
          }
          
          
          
        }
        location_lookup[stationID] = stationID_lookup;
        stationName = stationID_lookup;
      }
    
    //no smart casing, lower case only for attribute ID's//
    if (verbose_bool)	job_line.push(Number(jobList[jobNum].getAttribute("jobid").getValue()));
    if (verbose_bool)	job_line.push(Number(jobList[jobNum].getAttribute("installerid").getValue()));
    job_line.push(		 jobList[jobNum].getAttribute("installername").getValue());
    if (verbose_bool)	job_line.push(Number(facilityID));
    job_line.push(		 facilityName);
    if (verbose_bool)	job_line.push(Number(jobList[jobNum].getAttribute("solarsystemid").getValue()));
    job_line.push(		 jobList[jobNum].getAttribute("solarsystemname").getValue());
    if (verbose_bool)	job_line.push(Number(stationID));
    job_line.push(		 stationName);
    /*------------*/
    if (verbose_bool)	job_line.push(Number(activityID));				
    job_line.push(activityName);
    /*------------*/					
    if (verbose_bool)	job_line.push(Number(jobList[jobNum].getAttribute("blueprintid").getValue()));
    job_line.push(Number(jobList[jobNum].getAttribute("blueprinttypeid").getValue()));
    job_line.push(		 jobList[jobNum].getAttribute("blueprinttypename").getValue());
    if (verbose_bool)	job_line.push(Number(jobList[jobNum].getAttribute("blueprintlocationid").getValue()));						
    if (verbose_bool)	job_line.push(Number(jobList[jobNum].getAttribute("outputlocationid").getValue()));
    job_line.push(Number(jobList[jobNum].getAttribute("runs").getValue()));
    job_line.push(Number(jobList[jobNum].getAttribute("cost").getValue()));
    job_line.push(Number(jobList[jobNum].getAttribute("teamid").getValue()));
    if (verbose_bool)	job_line.push(Number(jobList[jobNum].getAttribute("licensedruns").getValue()));	
    if (verbose_bool)	job_line.push(Number(jobList[jobNum].getAttribute("probability").getValue()));	
    if (verbose_bool)	job_line.push(		 jobList[jobNum].getAttribute("producttypename").getValue());
    /*TODO ID->STR*/	job_line.push(Number(jobList[jobNum].getAttribute("status").getValue()));
    job_line.push(Number(jobList[jobNum].getAttribute("timeinseconds").getValue()));
    job_line.push(		 jobList[jobNum].getAttribute("startdate").getValue());
    job_line.push(		 jobList[jobNum].getAttribute("enddate").getValue());
    if (verbose_bool)	job_line.push(		 jobList[jobNum].getAttribute("pausedate").getValue());
    if (verbose_bool)	job_line.push(		 jobList[jobNum].getAttribute("completeddate").getValue());
    if (verbose_bool)	job_line.push(Number(jobList[jobNum].getAttribute("completedcharacterid").getValue()));	
    
    return_array.push(job_line);
  }
  
  return return_array;
}

function getAvgVolume(days,item_id,region_id)
{
  var market_obj = {};
  market_obj = __fetchCrest_market(region_id,item_id);
  
  var date_range = [];
  date_range = date_array(days);
  
  var volumes = 0;
  for (var index = 0; index < market_obj["items"].length; index ++)
  {
    var API_date = market_obj["items"][index]["date"];
    for (var indx2 = 0; indx2 < date_range.length; indx2++)
    {
      if (date_range[indx2] == API_date)
      {
        volumes += market_obj["items"][index]["volume"];
        break;        
      }
    }
    
  }
  
  return volumes/days;
}

function group_getAvgVolume(days,item_id_list,region_id)
{
  var return_list = [];
  var item_list = new Array();
  item_id_list.forEach (function(row){
    row.forEach (function(cell){
      if(typeof(cell) === 'number'){
        item_list.push(cell);
      }
    });
  });
  var cleanTypeIds = new Array();
  cleanTypeIds = item_list.filter(function(v,i,a) {
    return a.indexOf(v)===i;
  });
  
  for (var index=0; index < cleanTypeIds.length; index++)
  {
    var avgVol = getAvgVolume(days,cleanTypeIds[index],region_id)
    return_list.push(avgVol)
    //Utilities.sleep(100)
  }
  
  return return_list
}

function getVolumes(days,item_id,region_id)
{
  var market_obj = {};
  market_obj = __fetchCrest_market(region_id,item_id);
  
  var date_range = [];
  date_range = date_array(days);
  
  var volumes = [];
  for (var index = 0; index < market_obj["items"].length; index ++)
  {
    var API_date = market_obj["items"][index]["date"];
    for (var indx2 = 0; indx2 < date_range.length; indx2++)
    {
      if (date_range[indx2] == API_date)
      {
        volumes.push(market_obj["items"][index]["volume"]);
        break;        
      }
    }
    
  }
  
  return volumes;
}

function group_getAvgPrices(days,item_id_list,region_id,reverse_bool)
{
  var return_list	=[]
  var item_list = new Array();
  item_id_list.forEach (function(row){
    row.forEach (function(cell){
      if(typeof(cell) === 'number'){
        item_list.push(cell);
      }
    });
  });
  var cleanTypeIds = new Array();
  cleanTypeIds = item_list.filter(function(v,i,a) {
    return a.indexOf(v)===i;
  });
  for(var index=0; index < cleanTypeIds.length; index++)
  {
    var tmp_list = getAvgPrices(days,cleanTypeIds[index],region_id,reverse_bool)
    return_list.push(tmp_list)
    //Utilities.sleep(100)
  }
  return return_list
}

function getAvgPrices(days,item_id,region_id,reverse_bool)
{
  var market_obj = {};
  market_obj = __fetchCrest_market(region_id,item_id);
  
  var date_range = [];
  date_range = date_array(days);
  
  var prices = [];
  for (var index = 0; index < market_obj["items"].length; index ++)
  {
    var API_date = market_obj["items"][index]["date"];
    for (var indx2 = 0; indx2 < date_range.length; indx2++)
    {
      if (date_range[indx2] == API_date)
      {
        prices.push(market_obj["items"][index]["avgPrice"]);
        break;        
      }
    }
    
  }
  
  if (reverse_bool)
  {
    var rev_prices = [];
    for (var index = prices.length; index > 0; index --)
    {
      rev_prices.push(prices[index-1]);
    }
    
    prices = rev_prices;
  }
  return prices;
}

function AllItemPrices(header_bool, test_server)
{
  var market_prices_obj = {};
  
  market_prices_obj = __fetchMarketPrices(test_server);
  var return_array = [];
  
  if (header_bool)
  {
    var header = [];
    header = ["TypeName","TypeID","adjustedPrice","averagePrice"];
    return_array.push(header);
  }
  
  for (var index = 0; index < market_prices_obj["items"].length; index ++)
  { 
    priceLine = []
    priceLine.push(market_prices_obj["items"][index]["type"]["name"]);
    priceLine.push(Number(market_prices_obj["items"][index]["type"]["id"]));
    priceLine.push(Number(market_prices_obj["items"][index]["adjustedPrice"]));
    priceLine.push(Number(market_prices_obj["items"][index]["averagePrice"]));
    
    return_array.push(priceLine);
  }
  
  return return_array;
}

function AllSystemIndexes(header_bool, test_server)
{
  var system_index_obj = {};
  
  system_index_obj = __fetchSystemIndexes(test_server);
  var return_array = [];
  
  if (header_bool)
  {
    var header = [];
    header = ["SolarSystemName","SolarSystemID","Manufacturing","Copying","Invention","MaterialResearch","TimeResearch","ReverseEngineering"];
    return_array.push(header);
  }
  for (var index = 0; index < system_index_obj["items"].length; index ++)
  {
    var solarSystemName = system_index_obj["items"][index]["solarSystem"]["name"];
    var solarSystemID = Number(system_index_obj["items"][index]["solarSystem"]["id"]);
    
    var manufacturing	= 0;
    var copying 		= 0;
    var invention		= 0;
    var ME				= 0;
    var TE				= 0;
    var reverseEng		= 0;
    
    for (var cost_index = 0; cost_index < system_index_obj["items"][index]["systemCostIndices"].length; cost_index++)
    {
      
      var activityID = Number(system_index_obj["items"][index]["systemCostIndices"][cost_index]["activityID"]);
      var costIndex  = Number(system_index_obj["items"][index]["systemCostIndices"][cost_index]["costIndex"]);
      
      /*--Could replace with a costIndicies[activityID]=costIndex--*/
      if		(1 == activityID)
      {//Manufacturing
        manufacturing = costIndex;
      }
      else if (3 == activityID)
      {//Time Efficiency Research
        TE = costIndex;
      }
      else if (4 == activityID)
      {//Material Efficiency Research
        ME = costIndex;
      }
      else if (5 == activityID)
      {//Material Efficiency Research
        copying = costIndex;
      }
      else if (7 == activityID)
      {//Reverse Engineering
        reverseEng = costIndex;
      }
      else if (8 == activityID)
      {//Invention
        invention = costIndex;
      }
    }
    
    var systemLine = [];
    systemLine.push(solarSystemName);
    systemLine.push(solarSystemID);
    systemLine.push(manufacturing);
    systemLine.push(copying);
    systemLine.push(invention);
    systemLine.push(ME);
    systemLine.push(TE);
    systemLine.push(reverseEng);
    return_array.push(systemLine);
  }
  return return_array;
}

function fetch_EC_prices(priceIDs,locationID,header_keys,header_bool,cachebuster){
  //Shamelessly stolen from https://github.com/fuzzysteve/eve-googledocs-script/blob/master/EveCentralPrices.gs
  //updated to suit average needs
  if (typeof locationID == 'undefined'){
    locationID=30000142;
  }
  if (typeof priceIDs == 'undefined'){
    throw 'need typeids';
  }
  if (typeof cachebuster == 'undefined'){
    cachebuster=1;
  }
  if (typeof header_bool == 'undefined'){
    header_bool=false;
  }
  if (typeof header_keys == 'undefined'){
    header_keys="typeid,buy_volume,buy_avg,buy_max,buy_min,buy_stddev,buy_median,buy_percentile,sell_volume,sell_avg,sell_max,sell_min,sell_stddev,sell_median,sell_percentile";
  }
  
  //BUILD HEADER//
  var header = [];
  var requested_header = header_keys.split(',');
  var typeid = false;
  var buy_volume, buy_avg, buy_max, buy_min, buy_stddev, buy_median, buy_percentile;
  var sell_volume, sell_avg, sell_max, sell_min, sell_stddev, sell_median, sell_percentile;
  
  buy_volume = buy_avg = buy_max = buy_min = buy_stddev = buy_median = buy_percentile = false;
  sell_volume = sell_avg = sell_max = sell_min = sell_stddev = sell_median = sell_percentile = false;
  //done badly to assure known order.  Rather than screwing with indexOf
  if (isInArray("typeid",requested_header)){
    header.push("typeid");
    typeid = true;
  };
  if (isInArray("buy_volume",requested_header)){
    header.push("buy_volume");
    buy_volume = true;
  };
  if (isInArray("buy_avg",requested_header)){
    header.push("buy_avg");
    buy_avg = true;
  };
  if (isInArray("buy_max",requested_header)){
    header.push("buy_max");
    buy_max = true;
  };
  if (isInArray("buy_min",requested_header)){
    header.push("buy_min");
    buy_min = true;
  };
  if (isInArray("buy_stddev",requested_header)){
    header.push("buy_stddev");
    buy_stddev = true;
  };
  if (isInArray("buy_median",requested_header)){
    header.push("buy_median");
    buy_median = true;
  };
  if (isInArray("buy_percentile",requested_header)){
    header.push("buy_percentile");
    buy_percentile = true;
  };
  if (isInArray("sell_volume",requested_header)){
    header.push("sell_volume");
    sell_volume = true;
  };
  if (isInArray("sell_avg",requested_header)){
    header.push("sell_avg");
    sell_avg = true;
  };
  if (isInArray("sell_max",requested_header)){
    header.push("sell_max");
    sell_max = true;
  };
  if (isInArray("sell_min",requested_header)){
    header.push("sell_min");
    sell_min = true;
  };
  if (isInArray("sell_stddev",requested_header)){
    header.push("sell_stddev");
    sell_stddev = true;
  };
  if (isInArray("sell_median",requested_header)){
    header.push("sell_median");
    sell_median = true;
  };
  if (isInArray("sell_percentile",requested_header)){
    header.push("sell_percentile");
    sell_percentile = true;
  };  
  //***---***//
  
  var location_key = '';
  var locationID_str = String(locationID);
  var locationType = Number(locationID_str.charAt(0));
  if(locationType == 1){
    location_key = '&regionlimit=';
  }
  else if (locationType == 3){
    location_key = '&usesystem=';
  }
  else if (locationType == 6){
    location_key = '&usestation=';
  }
  else{
    throw 'unsupported locationID';
  }
  
  var prices = new Array();
  var dirtyTypeIds = new Array();
  var cleanTypeIds = new Array();
  var url="http://api.eve-central.com/api/marketstat?cachebuster="+cachebuster+location_key+locationID+"&typeid=";
  priceIDs.forEach (function (row) {
    row.forEach ( function (cell) {
      if (typeof(cell) === 'number' ) {
        dirtyTypeIds.push(cell);
      }
    });
  });
  cleanTypeIds = dirtyTypeIds.filter(function(v,i,a) {
    return a.indexOf(v)===i;
  });
  var parameters = {method : "post", payload : ""};
  
  var o,j,temparray,chunk = 100;
  if(header_bool)
    prices.push(header);
  
  for (o=0,j=cleanTypeIds.length; o < j; o+=chunk) {
    temparray = cleanTypeIds.slice(o,o+chunk);
    var xmlFeed = UrlFetchApp.fetch(url+temparray.join("&typeid="), parameters).getContentText();
    var xml = XmlService.parse(xmlFeed);
    if(xml) {
      var rows=xml.getRootElement().getChild("marketstat").getChildren("type");
      for(var i = 0; i < rows.length; i++) {
        var price = [];
        if(typeid)
          price.push(parseInt(rows[i].getAttribute("id").getValue()));
        
        if(buy_volume)
          price.push(parseInt(rows[i].getChild("buy").getChild("volume").getValue()));
        if(buy_avg)
          price.push(parseFloat(rows[i].getChild("buy").getChild("avg").getValue()));
        if(buy_max)
          price.push(parseFloat(rows[i].getChild("buy").getChild("max").getValue()));
        if(buy_min)
          price.push(parseFloat(rows[i].getChild("buy").getChild("min").getValue()));
        if(buy_stddev)
          price.push(parseFloat(rows[i].getChild("buy").getChild("stddev").getValue()));
        if(buy_median)
          price.push(parseFloat(rows[i].getChild("buy").getChild("median").getValue()));
        if(buy_percentile)
          price.push(parseFloat(rows[i].getChild("buy").getChild("percentile").getValue()));
        
        if(sell_volume)
          price.push(parseInt(rows[i].getChild("sell").getChild("volume").getValue()));
        if(sell_avg)
          price.push(parseFloat(rows[i].getChild("sell").getChild("avg").getValue()));
        if(sell_max)
          price.push(parseFloat(rows[i].getChild("sell").getChild("max").getValue()));
        if(sell_min)
          price.push(parseFloat(rows[i].getChild("sell").getChild("min").getValue()));
        if(sell_stddev)
          price.push(parseFloat(rows[i].getChild("sell").getChild("stddev").getValue()));
        if(sell_median)
          price.push(parseFloat(rows[i].getChild("sell").getChild("median").getValue()));
        if(sell_percentile)
          price.push(parseFloat(rows[i].getChild("sell").getChild("percentile").getValue()));
        
        prices.push(price);       
      }
    }
  }
  return prices;
}

var fuel_perhour_conv = {
  "12235":40,
  "12236":40,
  "16213":40,
  "16214":40,
  "20059":20,
  "20060":10,
  "20061":20,
  "20062":10,
  "20063":20,
  "20064":10,
  "20065":20,
  "20066":10,
  "27530":36,
  "27532":32,
  "27533":36,
  "27535":32,
  "27536":36,
  "27538":32,
  "27539":36,
  "27540":32,
  "27589":18,
  "27591":16,
  "27592": 9,
  "27594": 8,
  "27595":18,
  "27597":16,
  "27598": 9,
  "27600": 8,
  "27601":18,
  "27603":16,
  "27604": 9,
  "27606": 8,
  "27607":18,
  "27609":16,
  "27610": 9,
  "27612": 8,
  "27780":36,
  "27782":18,
  "27784": 9,
  "27786":32,
  "27788":16,
  "27790": 8
};
var stront_perhour_conv = {
  "12235":400,
  "12236":400,
  "16213":400,
  "16214":400,
  "20059":200,
  "20060":100,
  "20061":200,
  "20062":100,
  "20063":200,
  "20064":100,
  "20065":200,
  "20066":100,
  "27530":400,
  "27532":400,
  "27533":400,
  "27535":400,
  "27536":400,
  "27538":400,
  "27539":400,
  "27540":400,
  "27589":200,
  "27591":200,
  "27592":100,
  "27594":100,
  "27595":200,
  "27597":200,
  "27598":100,
  "27600":100,
  "27601":200,
  "27603":200,
  "27604":100,
  "27606":100,
  "27607":200,
  "27609":200,
  "27610":100,
  "27612":100,
  "27780":400,
  "27782":200,
  "27784":100,
  "27786":400,
  "27788":200,
  "27790":100
};
var POS_typeID_conv = {
  "12235":"Amarr Control Tower",
  "12236":"Gallente Control Tower",
  "16213":"Caldari Control Tower",
  "16214":"Minmatar Control Tower",
  "20059":"Amarr Control Tower Medium",
  "20060":"Amarr Control Tower Small",
  "20061":"Caldari Control Tower Medium",
  "20062":"Caldari Control Tower Small",
  "20063":"Gallente Control Tower Medium",
  "20064":"Gallente Control Tower Small",
  "20065":"Minmatar Control Tower Medium",
  "20066":"Minmatar Control Tower Small",
  "27530":"Blood Control Tower",
  "27532":"Dark Blood Control Tower",
  "27533":"Guristas Control Tower",
  "27535":"Dread Guristas Control Tower",
  "27536":"Serpentis Control Tower",
  "27538":"Shadow Control Tower",
  "27539":"Angel Control Tower",
  "27540":"Domination Control Tower",
  "27589":"Blood Control Tower Medium",
  "27591":"Dark Blood Control Tower Medium",
  "27592":"Blood Control Tower Small",
  "27594":"Dark Blood Control Tower Small",
  "27595":"Guristas Control Tower Medium",
  "27597":"Dread Guristas Control Tower Medium",
  "27598":"Guristas Control Tower Small",
  "27600":"Dread Guristas Control Tower Small",
  "27601":"Serpentis Control Tower Medium",
  "27603":"Shadow Control Tower Medium",
  "27604":"Serpentis Control Tower Small",
  "27606":"Shadow Control Tower Small",
  "27607":"Angel Control Tower Medium",
  "27609":"Domination Control Tower Medium",
  "27610":"Angel Control Tower Small",
  "27612":"Domination Control Tower Small",
  "27780":"Sansha Control Tower",
  "27782":"Sansha Control Tower Medium",
  "27784":"Sansha Control Tower Small",
  "27786":"True Sansha Control Tower",
  "27788":"True Sansha Control Tower Medium",
  "27790":"True Sansha Control Tower Small"
};
var POS_status = [
  "Unanchored",
  "Anchored - Offline",
  "Onlining",
  "Reinforced",
  "Online"
];

var fuelBlocks = [
  "4051",
  "4246",
  "4247",
  "4312"
];
var charters = [
  "24592",
  "24593",
  "24594",
  "24595",
  "24596",
  "24597"
];
var stront = 16275;
