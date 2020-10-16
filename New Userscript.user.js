// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://s167-fr.ogame.gameforge.com/game/index.php.*$/
// @grant        none
// @exclude     /^(http|https)://s.*\.ogame\.gameforge\.com/feed/.*$/
// @exclude     /^(http|https)://s.*\.ogame\.gameforge\.com/board/.*$/
// @exclude     /^(http|https)://www\.sephiogame\.com/.*$/
// @exclude     /^(http|https)://www.*$/
// @exclude     /^(http|https)://.*ajax=1.*$/
// @include     /^(http|https)://s.*\.ogame\.gameforge\.com/game/index.php.*$/
// @include     /^(http|https)://fr\.ogame\.gameforge\.com/$/
// ==/UserScript==

//Script variables
var MYACTION = "myaction";
var CURRENT_PLANET = "current_planet";
var AVAILABLE = "available";

// Ogame webpages variables
var RESOURCES = ["resources_metal","resources_crystal","resources_deuterium"];
var PLANETS = "planetList";

var PAGE = "page"; //For majority of page, it's ingame...
var RESOURCE_PAGE = "resourceSettings"; // ... But sometime not

var COMPONENT = "component"; //for Ingame pages, additionnal parameter to know the page
var SUPPLIES = "supplies";
var RESEARCH = "research";
var SHIPYARD = "shipyard";
var DEFENSES = "defenses";
var FLEET = "fleetdispatch";

var NUMBERS = "amount"; // Class for defenses/shipyard, with "number" of elements
var LEVEL = "level"; // Class for building/techno, with a level

try{
 var myStorage = localStorage;
}
catch{
    alert("No localStorage available. Enable it or disable script");
    return;
}
/***********************
MAIN Function:
+ Init current page: create buttons
+ do_action: depending on custom button clicked
+ reload: randomly click to a random planet to remain active
***********************/

(function() {
    'use strict';
    init_page(); //Create button & stuff
    checkAttack();
    //refreshData(); //Not in use for now
    do_action(); //do action if any
    var rand = getRandomArbitrary(10000,25000);
    //setTimeout(reload, rand);
})();



/*
*************************************
* 1st level
*************************************
*/
function init_page(){
    clear_screen();
    //add_button("My Empire","1");
    add_button("Refresh Resources",AVAILABLE,"menuImage station");
    add_button("Refresh Production",RESOURCE_PAGE,"menuImage resources");
    add_button("Refresh Shipyard",SHIPYARD,"menuImage shipyard");
    add_button("Refresh Defenses",DEFENSES,"menuImage defense");
    add_required_gt();
    compute_remaining_time();
}

function checkAttack(){
    var div = document.getElementById("attack_alert");
    if(div.className != "tooltip noAttack"){
        //alert("On-going attack");
    }
}
function do_action(){
    //Get all parameters
    var myAction = get_parameter(MYACTION);
    if(myAction == 0){
        return;
    }

    // check for myscript parameter
    switch(myAction){
        case "1":
            myempire_click();
            break;
        default:
            setTimeout(loadData(myAction), 1000);
    }
}

function reload(){
    var planetsList = document.getElementById(PLANETS);
    var rand = getRandomArbitrary(0,planetsList.children.length-1);
    var planet = planetsList.children[rand];;
    var id = planet.id.split('-')[1]
    location.assign(window.location.protocol + "//" + window.location.host + window.location.pathname + "?page=ingame&component=overview&cp=" + id);
}

/*
Not in use for now
But it works...
function refreshData(){
    var page = get_parameter(PAGE);
    var currentPlanet = JSON.parse(myStorage.getItem(getPlanetName()));
    if(currentPlanet == null){
        currentPlanet = {}
    }
    currentPlanet.name = getPlanetName();
    currentPlanet.available = removeName(getResources());
    if(page == RESOURCE_PAGE){
        currentPlanet.prod = removeName(getProduction());
    }
    else{
        switch(get_parameter(COMPONENT)){
            case SHIPYARD:
                currentPlanet.fleet = removeName(getFleet());
                break;
            case DEFENSES:
                currentPlanet.defenses = removeName(getDefense());
                break;
        }
    }
    myStorage.setItem(getPlanetName(), JSON.stringify(currentPlanet));
}
*/


/*
*************************************
* 2nd level
*************************************
*/
function add_button(text,id,smallClass){
    var ul = document.getElementById("menuTable");
    var li = document.createElement("li");
    var span = document.createElement("span");
    var a = document.createElement("a");
    var div = document.createElement("div");

    //Small button
    div.className = smallClass;
    a.href = "#" + id;
    a.addEventListener ("click", clip , false);
    a.appendChild(div);
    span = document.createElement("span");
    span.className = "menu_icon";
    span.appendChild(a);
    li.appendChild(span);

    //Big button
    a = document.createElement("a");
    a.className = "menubutton";
    a.href = window.location.protocol + "//" + window.location.host + window.location.pathname + "?page=ingame&component=overview&" + MYACTION + "=" + id;

    span = document.createElement("span");
    span.className = "textlabel";
    span.textContent = text;

    a.appendChild(span);
    li.appendChild(a);
    ul.appendChild(li);
}

function myempire_click(){
    alert("Empire click");
}


function add_required_gt(){
    return;
}

function clear_screen(){
    var elem = ["advicebarcomponent","mmonetbar",
                "pagefoldtarget","siteHeader",
                "notifyTB","ie_message",
                "initial_welcome_dialog","commandercomponent"];
    for(var i=0;i<elem.length;i++){
        try{
            document.getElementById(elem[i]).remove();
        }
        catch{
            //Liklely already removed
        }
    }
}


function loadData(data){
    var current = get_parameter(CURRENT_PLANET);
    var to_do = parseInt(current) + parseInt(1);
    var datas = "";
    var url = window.location.protocol + "//" + window.location.host + window.location.pathname;

    //Create table or get it from local storage
    if(current == 1){
        myStorage.removeItem(data);
    }
    else{
        datas = myStorage.getItem(data);
    }

    //Get data from 1 to x planet
    if(current >= 1){
        var planetData = "";
        switch(data){
            case RESOURCE_PAGE:
                planetData = getProduction();
                break;
            case AVAILABLE:
                planetData = getResources();
                break;
            case SHIPYARD:
                planetData = getFleet();
                break;
            case DEFENSES:
                planetData = getDefense();
                break;
            default:
                alert("Unexpected data to load");
        }
        planetData = planetData;
        datas = datas + planetData + "\n";
        myStorage.setItem(data,datas);
    }


    if(current < getNumberOfPlanets()){
        //Save data before going on next planet
        var path = "";
        switch(data){
            case RESOURCE_PAGE:
                path = "?page=resourceSettings";
                break;
            case AVAILABLE:
                path = "?page=ingame&component=overview";
                break;
            default:
                path = "?page=ingame&component=" + data;
        }
        //Go to planet
        url = url + path
            + "&cp=" + getPlanetID(to_do)
            + "&" + CURRENT_PLANET + "="+ to_do // planet to visit
            + "&" + MYACTION + "=" + data;//Action load ressources
        location.assign(url);
    }
    else{
        if(data == AVAILABLE || data == RESOURCE_PAGE){
            var all = compute_sum(data);
            var total = "Total";
            for(var i = 0; i < all.length;i++){
                total = total + ";" + all[i];
            }
            total = total + "\n";
            datas = total + datas;
            myStorage.setItem(data,datas);
        }
        write_clipdboard(datas,data);
    }
}

function removeName(data){
    return data.replace(getPlanetName()+";","");
}


function compute_remaining_time(){
    const observer = new MutationObserver(mutation => {
        var i=0;
        var cost = get_cost();
        if(cost.length == 0){
            return;
        }
        var type = get_type();
        var prod = get_total(RESOURCE_PAGE);
        var min = Infinity;
        var current_min = 0;
        var current_max = Infinity;
        var max = 0;
        // For Building & Research
        if(type == LEVEL){
            var all_resources =get_total(AVAILABLE);
            var to_do = []
            //Compute remaning resources to get
            for(i=0;i<cost.length;i++){
                to_do.push(cost[i]-all_resources[i]);
            }
            //Compute max hours to get it
            for(i=0;i<to_do.length;i++){
                current_max = to_do[i]/prod[i];
                if(current_max > max){
                    max = current_max;
                }
            }
            if(max == 0){
                return;
            }
            var text_time = convert_time(max);
            var text = get_cost_div().getElementsByTagName('p')[0];
            text.innerHTML = text.innerHTML + " (" + text_time + ")";
            return; //Avoid big Else...
        }

        //For Shipyard & Defenses
        var resources = getResources().split(";");//convert to array
        resources.shift();//remove label
        //Get minimal production possible right now
        for(i=0;i<cost.length;i++){
            current_min = resources[i]/cost[i];
            if(current_min < min){
                min = current_min;
            }
        }
        //Preset value on field
        min = Math.floor(min);
        var field = document.getElementById("build_amount");
        field.value = min;

    });
    var techno_details = document.getElementById("technologydetails_content");
    if(techno_details == null){
        return;
    }
    observer.observe(techno_details, {
        childList: true,
        attributes: false,
        subtree: false,
        characterData: false
    });
}

function compute_sum(Storage){
   var datas = myStorage.getItem(Storage);
   var datas_array = datas.split("\n");
   datas_array.pop(); //last line is empty
   var sum = [0,0,0];
    for(var i = 0;i < datas_array.length;i++){
        var detail = datas_array[i].split(";");
        sum[0] += parseInt(detail[1]);
        sum[1] += parseInt(detail[2]);
        sum[2] += parseInt(detail[3]);
    }
    return sum;
}
function get_total(Storage){
    var datas = myStorage.getItem(Storage).split("\n")[0]; //Get total line
    datas = datas.split(";"); //Convert to array
    datas.shift(); //Remove label
    return datas;
}

function clip(event){
    var tag = event.currentTarget.toString().split("#");
    tag.shift();//Remove URL...
    var datas = myStorage.getItem(tag);
    write_clipdboard(datas,tag);
}

/*
*************************************
* Utilities
*************************************
*/
function getRandomArbitrary(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

function get_parameter(parameter){
	var params = [];
	var parser = document.createElement('a');
	parser.href = window.location;
	var query = parser.search.substring(1);
	var vars = query.split('&');
    if(vars.length <1){
        return "0"; //No parameter at all
    }
    for(var i = 0; i < vars.length;i++){
        var param = vars[i].split('=');
        if(param[0] == parameter){
            return param[1];
        }
    }
    return "0"; //Not my parameter
}

function write_clipdboard(data,data_name){
    navigator.clipboard.writeText(data).then(function() {
        alert(data_name + " on clipboard.\n");
    }, function() {
        alert("Fails to write " + data_name + " on clipboard");
    });
}

function getChildByClass(parent,className){
    for (var i = 0; i < parent.childNodes.length; i++) {
        if (parent.childNodes[i].className == className) {
            return parent.childNodes[i];
            break;
        }
    }
    return null;
}

function removeDot(data){
    return data.replace(/\./g,"");
}

function convert_time(hours){
    var time = "";
    if(hours > 24){
        time = time + Math.floor(hours / 24) + "J ";
        hours = hours % 24;
    }
    var min = hours * 60;
    if(min > 60){
        time = time + Math.floor(min/60) + "h ";
        min = min % 60;
    }
    time = time + Math.floor(min) + "m";
    return time;
}
/*
*************************************
* Ogame Pages parsing
*************************************
*/
function getNumberOfPlanets(){
    var planetsList = document.getElementById(PLANETS);
    return planetsList.children.length;
}
function getPlanetID(number){
    var planetsList = document.getElementById(PLANETS);
    var planet = planetsList.children[number-1];
    var id = planet.id.split('-')[1];
    return id;
}

function getPlanetName(){
    var planetsList = document.getElementById(PLANETS);
    var planet = getChildByClass(planetsList,"smallplanet smaller hightlightPlanet ");
    var a = getChildByClass(planet,"planetlink active tooltipRight tooltipClose js_hideTipOnMobile");
    var planetName = getChildByClass(a,"planet-name ");
    var name = planetName.textContent;
    return name;
}

function getResources(){
    var name = getPlanetName();
    var resources = name;
    for(var i=0;i <RESOURCES.length;i++){
        var quantity = document.getElementById(RESOURCES[i]).textContent;
        resources = resources + ";" + quantity;
    }
    return removeDot(resources);
}

function getProduction(){
    var name = getPlanetName();
    var prod = name;

    var tbody = document.getElementById("factor").parentNode.parentNode;
    //Get summary line
    var tsummary = getChildByClass(tbody,"summary ");

    var text = tsummary.textContent.split("\n");
    for(var i=0;i<text.length;i++){
        text[i] = text[i].trim().replace(/\./g,"");
        //Skip spaces & label "Total par heure"
        if(text[i] != "" && text[i][0] != "T"){
            prod = prod + ";" + text[i];
        }
    }
    return removeDot(prod);
}
function getFleet(){
    var div = null;
    var ul = null;
    var li = null;
    var techno = ["technologies_battle","technologies_civil"];
    //Battle fleet
    var battle = ["technology fighterLight  hasDetails tooltip js_hideTipOnMobile",
                  "technology fighterHeavy  hasDetails tooltip js_hideTipOnMobile",
                  "technology cruiser  hasDetails tooltip js_hideTipOnMobile",
                  "technology battleship  hasDetails tooltip js_hideTipOnMobile",
                  "technology interceptor  hasDetails tooltip js_hideTipOnMobile",
                  "technology bomber  hasDetails tooltip js_hideTipOnMobile",
                  "technology destroyer  hasDetails tooltip js_hideTipOnMobile",
                  "technology deathstar  hasDetails tooltip js_hideTipOnMobile",
                  "technology reaper  hasDetails tooltip js_hideTipOnMobile",
                  "technology explorer  hasDetails tooltip js_hideTipOnMobile"]

    //Civil fleet
    var civil = ["technology transporterSmall  hasDetails tooltip js_hideTipOnMobile",
                 "technology transporterLarge  hasDetails tooltip js_hideTipOnMobile",
                 "technology colonyShip  hasDetails tooltip js_hideTipOnMobile",
                 "technology recycler  hasDetails tooltip js_hideTipOnMobile",
                 "technology espionageProbe  hasDetails tooltip js_hideTipOnMobile",
                 "technology solarSatellite  hasDetails tooltip js_hideTipOnMobile",
                 "technology resbuggy  hasDetails tooltip js_hideTipOnMobile"];


    var fleet = [battle,civil];
    var name = getPlanetName();
    var myFleet = name;
    for(var i=0;i<techno.length;i++){
        div = document.getElementById(techno[i]);
        ul = getChildByClass(div,"icons");
        for(var j=0;j<fleet[i].length;j++){
            li = getChildByClass(ul,fleet[i][j]);
            if(li.textContent.split("s").length > 1){
                myFleet = myFleet + ";" + li.textContent.split("s")[1];
            }
            else{
                myFleet = myFleet + ";" + li.textContent;
            }
        }
    }
    return removeDot(myFleet);
}

function getDefense(){
    var div = document.getElementById("technologies");
    var ul = getChildByClass(div,"icons");
    var li = null;
    var defense =["technology rocketLauncher  hasDetails tooltip js_hideTipOnMobile",
                  "technology laserCannonLight  hasDetails tooltip js_hideTipOnMobile",
                  "technology laserCannonHeavy  hasDetails tooltip js_hideTipOnMobile",
                  "technology gaussCannon  hasDetails tooltip js_hideTipOnMobile",
                  "technology ionCannon  hasDetails tooltip js_hideTipOnMobile",
                  "technology plasmaCannon  hasDetails tooltip js_hideTipOnMobile",
                  "technology shieldDomeSmall  hasDetails tooltip js_hideTipOnMobile",
                  "technology shieldDomeLarge  hasDetails tooltip js_hideTipOnMobile",
                  "technology missileInterceptor  hasDetails tooltip js_hideTipOnMobile",
                  "technology missileInterplanetary  hasDetails tooltip js_hideTipOnMobile"];

    var name = getPlanetName();
    var myDef = name;
    for(var i=0;i<defense.length;i++){
        li = getChildByClass(ul,defense[i]);
        if(li.textContent.split("s").length > 1){
            myDef = myDef + ";" + li.textContent.split("s")[1];
        }
        else{
            myDef = myDef + ";" + li.textContent;
        }
    }
    return removeDot(myDef);
}

function get_cost(){
        var cost = [];
        var costs = get_cost_div();
        if(costs == null){
            return cost; //change is detected twice, only the 2nd one is interesting
        }
        var list = costs.getElementsByTagName("UL")[0];
        var li = list.getElementsByTagName("LI");
        for(var i = 0; i < li.length;i++){
            cost.push(li[i].getAttribute("data-value"));
        }
        return cost;
}
function get_cost_div(){
    var costs = null;
    var details = document.getElementById("technologydetails")
    if(details == null){
        return costs; //change is detected twice, only the 2nd one is interesting
    }
    var content = getChildByClass(details,"content");
    var info = getChildByClass(content,"information");
    costs = getChildByClass(info,"costs");
    return costs
}

function get_type(){
        var details = document.getElementById("technologydetails")
        if(details == null){
            return; //change is detected twice, only the 2nd one is interesting
        }
        var content = getChildByClass(details,"content");
        var info = getChildByClass(content,"information");
        var type = getChildByClass(info,"level");
        if(type == null){
            type = NUMBERS
        }
        else{
            type = LEVEL
        }
        return type;
}