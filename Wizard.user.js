// ==UserScript==
// @name         Wizard
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


var CARGO_SIZE = 42055; // 41250 or 8250
var CARGO_NAME = "transporterLarge";//transporterLarge or transporterSmall

/********************************************************
 ********************************************************
 *  DATA Declaration
 * Hardcoded value from the game and some script's values
 ********************************************************
 ********************************************************
 */

// Ogame webpages variables
var RESOURCES = ["resources_metal","resources_crystal","resources_deuterium","resources_darkmatter"];
var COUNT = "countColonies";
var PLANETS = "planetList";

var PAGE = "page"; //For majority of page, it's ingame...
var INGAME = "ingame";
// ... But sometime not
var CHAT = "chat"; //Chat with other players
var MESSAGES = "messages" //message from game
var EMPIRE = "empire"

var COMPONENT = "component"; //for Ingame pages, additionnal parameter to know the page
var OVERVIEW = "overview";
var SUPPLIES = "supplies";
var RESEARCH = "research";
var SHIPYARD = "shipyard";
var DEFENSES = "defenses";
var FLEET = "fleetdispatch";
var PRODUCTION = "resourcesettings"; //resources production

var NUMBERS = "amount"; // Class for defenses/shipyard, with "number" of elements
var LEVEL = "level"; // Class for building/techno, with a level

var TO_REMOVE = ["advicebarcomponent","mmonetbar",
                 "pagefoldtarget","siteHeader",
                 "notifyTB","ie_message",
                 "initial_welcome_dialog","commandercomponent","banner_skyscraper"];

var techno = ["technologies_battle","technologies_civil"];
//Battle fleet
var battle = ["fighterLight","fighterHeavy","cruiser","battleship",
              "interceptor","bomber","destroyer","deathstar",
              "reaper","explorer"]

//Civil fleet
var civil = ["transporterSmall","transporterLarge","colonyShip",
             "recycler","espionageProbe","solarSatellite","resbuggy"];
var defense =["rocketLauncher","laserCannonLight","laserCannonHeavy","gaussCannon","ionCannon","plasmaCannon",
              "shieldDomeSmall","shieldDomeLarge","missileInterceptor","missileInterplanetary"];

var MISSIONS = {attack:"1",
                grouped_attack:"2",
                transport:"3",
                station:"4",
                station_allied:"5",
                spy:"6",
                colo:"7",
                recycle:"8",
                moon_break:"9",
                expedition:"15"};


//Script variables
var MYACTION = "myaction";
var EXPEDITION = "expedition"
var CONFIG_EXPEDITION = "config_expe";
var REFRESH = "refresh";
var CONFIG_REFRESH = "config_refresh";
var REGROUP = "regroup";
var CONFIG_REGROUP = "config_regroup";
var DISPATCH = "dispatch";
var CONFIG_DISPATCH = "config_dispatch";
var ACTIVITY = "activity";
var CONFIG_ACTIVITY = "config_activity";
var DATA = "data"; //some additional data with conf

var FLEET_CONTENT = "fleet_content";

try{
    var myStorage = localStorage;
}
catch{
    alert("No localStorage available. Enable it or disable script");
    return;
}


/*************************
 * MAIN EXECUTION
 *************************/
(function() {
    'use strict';
    init();
    do_action(); //do action if any
    compute_remaining_time();
    if(getUrlParameter(PAGE) !== CHAT)
        do_activity();
})();



/*************************
 * MAIN FUNCTIONS
 *************************/

// first thing to do, every time
function init(){

    // Check for on-going Attack
    var div = document.getElementById("attack_alert");
    if(div.className.includes(" Attack")){
        play()
    }

    // Clear screen
    for(var i=0;i<TO_REMOVE.length;i++){
        try{
            document.getElementById(TO_REMOVE[i]).remove();
        }
        catch{
            continue;
        }
    }

    //Update Screen
    add_button("Expéditions",EXPEDITION,"menuImage fleet1",CONFIG_EXPEDITION);
    add_button("Regrouper",REGROUP,"menuImage fleet1",CONFIG_REGROUP);
    add_button("Disperse",DISPATCH,"menuImage fleet1",CONFIG_DISPATCH);
    add_button("Recharger",REFRESH,"menuImage station",CONFIG_REFRESH);
    if(getItem(ACTIVITY))
        add_button("Activité",ACTIVITY,"menuImage shipyard  ",CONFIG_ACTIVITY,true);
    else
        add_button("Activité",ACTIVITY,"menuImage shipyard  ",CONFIG_ACTIVITY);

    var current = getPlanetData();
    var data = getItem(current.id)

    if(data === null)
        data = current;
    else{
        data.name = current.name;
        data.coords = current.coords;
    }

    //Depending on current page, do stuff
    data.resources = getResources();
    get_fleet_content();


    switch(getUrlParameter(COMPONENT)){
        case PRODUCTION:
            data[PRODUCTION] = getProduction();
            break;
        case SHIPYARD:
            //Retrieve fleet of the planet
            data[SHIPYARD] = getFleet();
            break;
        case DEFENSES:
            //Retrieve defenses of the planet
            data[DEFENSES] = getDefense();
            break;
        case FLEET:
            //add button for some preset
            break;
        default:
            break;
    }

    setItem(current.id,data)

}


/* prepare_action
* triggered by the click on script's button
*/
function prepare_action(event){
    var tag = event.currentTarget.toString().split("#")[1];
    var links = getPlanetLinks();
    var urls = [];
    var prep = [];

    get_fleet_content();
    //Run the appropriate preparation
    switch(tag){
        case REFRESH:
            prep = prepare_refresh(links,urls);
            break;
        case EXPEDITION:
            prep = prepare_expedition(links,urls);
            break;
        case REGROUP:
            prep = prepare_regroup(links,urls);
            break;
        case DISPATCH:
            prep = prepare_dispatch(links,urls);
            break;
        case ACTIVITY:
            set_activity();
            return;
        case CONFIG_ACTIVITY:
            config_activity();
            break;
        case CONFIG_REFRESH:
            config_refresh();
            break;
        case CONFIG_EXPEDITION:
            config_expedition();
            break;
        case CONFIG_DISPATCH:
            config_dispatch();
            break;
    }

    /* If preparation is OK
     * prep[0] contains URLS where to go
     * prep[1] can contain DATA for the action
     */
    if(prep.length > 0 && prep[0].length > 0){
        var url = prep[0].shift()
        setItem(MYACTION,tag);
        setItem(tag,prep[0]);
        if(prep[1] !== undefined)
            setItem(DATA,prep[1]);
        location.assign(url)
    }

}

/* do_action
* run by default
* execute the action if MYACTION is set on local storage
*/
function do_action(){

    var action = getItem(MYACTION);
    if(action === undefined || action === null)
        return;

    var urls = getItem(action);
    var do_return = true;

    switch(action){
        case EXPEDITION:
            do_return = do_expedition();
            break;
        case REGROUP:
            do_return = do_regroup();
            break;
        case REFRESH:
            do_return = do_refresh();
            break;
        case DISPATCH:
            do_return = do_dispatch();
            break;
    }

    //If action requires a manual action
    // Like sending fleet, just quit here
    if(do_return)
        return;

    if(urls == undefined && urls == null){
        myStorage.removeItem(MYACTION);
        myStorage.removeItem(DATA);
    }
    else{
        var url = urls.shift();
        // set back the list without the value
        if(urls.length > 0)
            setItem(action, urls);
        else
            myStorage.removeItem(action);
        // Go to the URL
        location.assign(url);
    }

}





/*************************
 * EXPEDITION
 *************************/
function prepare_expedition(links,urls){
    var size = prompt("Combien d'expédition?","10");
    for(var i=0;i<size;i++){
        //position 16
        // 20 ship, 4000GT and max éclaireur
        urls.push(createUrl(FLEET,"cp="+links[0][i]+"&position=16&mission=15&am218=100&am203=2000&am219=1000"))
    }
    return [urls,undefined];
}

function do_expedition(){
    if(getUrlParameter("position")==0)
        return false;

    document.getElementById("continueToFleet2").click();
    //Send manually
    return true;

}

function config_expedition(){

}
/*************************
 * REGROUP
 *************************/
function prepare_regroup(links,urls){
    var data = getPlanetData();
    var regroup = {};
    var pass = true;
    regroup.coords = data.coords.split(":");
    for(var i = 0;i<RESOURCES.length-1;i++){
        if (confirm("Regrouper le "+ RESOURCES[i] + "?")){
            regroup[RESOURCES[i]] = true;
            pass = false;
        }
        else
            regroup[RESOURCES[i]] = false;
    }

    if(pass)
        return [urls,undefined];

    for(i=0;i<links[0].length;i++){
        if(data.id.split("-")[1] == links[0][i])
            continue;

        urls.push(createUrl(FLEET,"cp="+links[0][i]+"&galaxy="+ regroup.coords[0]+"&system="+regroup.coords[1] + "&position=" + regroup.coords[2] +"&type="+ data.type +"&mission=3"))
    }
    return [urls,regroup];
}

function do_regroup(){

    var data = getItem(DATA);

    if(getUrlParameter("position")==0){
        return false;
    }

    var resources = getResources();
    var total = 0;
    for(var i = 0;i<RESOURCES.length-1;i++){
        if(data[RESOURCES[i]] == true)
            total += parseInt(resources[RESOURCES[i]]);
    }

    var input = document.getElementsByName(CARGO_NAME);
    write_field(input[0],get_number_cargo(total,1))
    if(!is_transport_ok())
        return;
    document.getElementById("continueToFleet2").click();

    if(data[RESOURCES[0]] == true)
        document.getElementById("selectMaxMetal").click()

    if(data[RESOURCES[1]] == true)
        document.getElementById("selectMaxCrystal").click()

    if(data[RESOURCES[2]] == true)
        document.getElementById("selectMaxDeuterium").click()


    //Send manually
    return true;
}

function config_regroup(){

}
/*************************
 * DISPATCH
 *************************/
function prepare_dispatch(links,urls){

    var data = getPlanetData();
    var resources = getResources();
    var dispatch = [];
    var cargo_number = 0;
    var total = get_total("resources");
    var pass = true;
    for(var i = 0;i<RESOURCES.length-1;i++){
        if (confirm("Eparpiller le "+ RESOURCES[i] + "?")){
            dispatch[RESOURCES[i]] = true;
            pass = false;
        }
        else
            dispatch[RESOURCES[i]] = false;
    }
    if(pass)
        return [urls,undefined];

    for(i=0;i<links[0].length;i++){
        if(data.id.split("-")[1] == links[0][i])
            continue;

        var current = {};
        var target = getItem("1-"+links[0][i]);
        var total_planet = 0;
        var amount = 0
        for(var j = 0;j<RESOURCES.length-1;j++){
            if(dispatch[RESOURCES[j]])
                amount = Math.ceil((parseInt(total[j]) / links[0].length) - target.resources[RESOURCES[j]]);
            else
                amount = 0

            current[RESOURCES[j]] = amount;
            total_planet += amount
        }
        var coords = target.coords.split(":");
        dispatch.push(current);
        urls.push(createUrl(FLEET,"&cp="+ data.id.split("-")[1] + "&galaxy="+ coords[0]+"&system="+coords[1] + "&position=" + coords[2] +"&type="+ data.type +"&mission=" + MISSIONS.transport + "&am203="+get_number_cargo(total_planet,0)))
    }
    return [urls,dispatch];
}
function do_dispatch(){
    if(getUrlParameter("position")==0)
        return false;

    if(!is_transport_ok())
        return false;
    //document.getElementById("fleet2").removeAttribute("style");
    document.getElementById("continueToFleet2").click();
    setTimeout( function() {
       // document.getElementById("continueToFleet3").click();

        //Fill resources
        // Inside setTimeout so the page is "refresh" after click
      //  setTimeout( function() {
            var data = getItem(DATA);
            var dispatch = data.shift();
            write_field(document.getElementById("metal"),dispatch[RESOURCES[0]])
            write_field(document.getElementById("crystal"),dispatch[RESOURCES[1]])
            write_field(document.getElementById("deuterium"),dispatch[RESOURCES[2]])
            setItem(DATA, data);
       // }, 500);
    }, 500);

    //Send manually
    return true;


}

function config_dispatch(){

}
/*************************
 * REFRESH
 *************************/
function prepare_refresh(links,urls){

    // Create URL for planet refresh
    for(var i=0;i<links[0].length;i++){
        urls.push(createUrl(PRODUCTION,"cp="+links[0][i]))
        //     urls.push(createUrl(SHIPYARD,"cp="+links[0][i]))
        //     urls.push(createUrl(DEFENSES,"cp="+links[0][i]))
    }
    // Create URL for moon refresh
    for(i=0;i<links[1].length;i++){
        //       urls.push(createUrl(SHIPYARD,"cp="+links[1][i]))
        //       urls.push(createUrl(DEFENSES,"cp="+links[1][i]))
    }

    if(confirm("Le chargement va naviguer sur " + urls.length + " URLs."))
        return [urls,undefined];
    else
        return [[],undefined];
}

function do_refresh(){
    // Just return false
    return false;
}
function config_refresh(){
    get_total(PRODUCTION,true);
    get_total("resources",true);
}

/*************************
 * ACTIVITY
 *************************/
function set_activity(){
    if(getItem(ACTIVITY))
        setItem(ACTIVITY,false)
    else
        setItem(ACTIVITY,true)
    location.reload();
}

function do_activity(){
    if(getItem(ACTIVITY)){
        var config_activity = getItem(CONFIG_ACTIVITY)
        if(config_activity ===null)
            setTimeout(reload, getRandomArbitrary(10000,25000));
        else
            setTimeout(reload, getRandomArbitrary(config_activity.min,config_activity.max));
    }
}

// Just randomly go somewhere inside your empire
function reload(){

    var config_activity = getItem(CONFIG_ACTIVITY)
    var links = getPlanetLinks();
    var planetsList = [];
    if(config_activity !==null){
        if(config_activity.planet)
            planetsList = planetsList.concat(links[0])

        if(config_activity.moon)
            planetsList = planetsList.concat(links[1])
    }
    if(planetsList.length == 0)
        planetsList = links[0]

    var rand = getRandomArbitrary(0,planetsList.length-1);
    var planet = planetsList[rand];
    location.assign(createUrl(OVERVIEW,"cp="+planet));
}

function config_activity(){
    var config_activity = {};
    config_activity.planet = confirm("Générer de l'activité sur les planètes?")
    config_activity.moon = confirm("Générer de l'activité sur les lunes?")

    config_activity.min = prompt("Délai minimum? (en seconde)","10") * 1000
    config_activity.max = prompt("Délai maximum? (en seconde)","25") * 1000
    setItem(CONFIG_ACTIVITY,config_activity)
}

/*************************
 * URL/HTML Writers
 *************************/
function createUrl(component,other){
    return window.location.protocol + "//" + window.location.host + window.location.pathname + "?page=" + INGAME + "&component=" + component + "&" + other;

}

function add_button(text,id,smallClass,idSmall,activate){
    var ul = document.getElementById("menuTable");
    var li = document.createElement("li");
    var span = document.createElement("span");
    var a = document.createElement("a");
    var div = document.createElement("div");

    //Small button
    div.className = smallClass;
    a.href = "#" + idSmall;
    a.addEventListener ("click", prepare_action , false);
    a.appendChild(div);
    span = document.createElement("span");
    span.className = "menu_icon";
    span.appendChild(a);
    li.appendChild(span);

    //Big button
    a = document.createElement("a");
    if(activate)
        a.className = "menubutton  selected";
    else
        a.className = "menubutton";
    a.href = "#" + id;
    a.addEventListener ("click", prepare_action , false);

    span = document.createElement("span");
    span.className = "textlabel";
    span.textContent = text;

    a.appendChild(span);
    li.appendChild(a);
    ul.appendChild(li);
}


function write_field(field,data){
    if (data === 0){
        return
    }
    field.focus(); //Focus on the field
    field.value = data.toString(); //set value
    document.activeElement.blur(); //remove focus to save the value
    //TODO: how to save value? blur doesn't work, emulate keystroke neither...

}


/*************************
 * URL/HTML Parsers
 *************************/

function getUrlParameter(parameter,url){
    var params = [];
    var parser = document.createElement('a');
    if(url)
        parser.href = url
    else
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

function getPlanetData(){
    var planetsList = document.getElementById(PLANETS);
    var planet = getChildByClass(planetsList,"hightlightPlanet");
    var data = {}

    if(planet){
        data.type = 1;
    }
    else{
        planet = getChildByClass(planetsList,"hightlightMoon");
        data.type = 3;
    }
    var a = getChildByClass(planet,"planetlink");
    var planetName = getChildByClass(a,"planet-name");
    var planetKoords = getChildByClass(a,"planet-koords");

    data.id = data.type + "-" + planet.id.split("-")[1];
    data.name = planetName.textContent;
    data.coords = planetKoords.textContent.substring(1).split("]")[0];

    return data;
}

function getPlanetLinks(){
    var planetsList = document.getElementById(PLANETS);
    var cpPlanets = [];
    var cpMoons = [];
    for(var i=0;i<planetsList.childNodes.length;i++){
        if( planetsList.childNodes[i].className === undefined)
            continue

        var planet = planetsList.childNodes[i].childNodes
        for(var j=0;j < planet.length;j++){
            if(planet[j] === undefined ||
               planet[j].href === undefined)
                continue
            if(planet[j].className.includes("constructionIcon"))
                continue
            if(planet[j].className.includes("planetlink"))
                cpPlanets.push(getUrlParameter("cp",planet[j].href))
            if(planet[j].className.includes("moonlink"))
                cpMoons.push(getUrlParameter("cp",planet[j].href))
        }
    }
    return [cpPlanets,cpMoons];
}


function getResources(){
    var result = {};
    for(var i=0;i <RESOURCES.length;i++){
        var quantity = document.getElementById(RESOURCES[i]).getAttribute("data-raw");
        result[RESOURCES[i]] = quantity
    }

    return result;
}

function getProduction(){
    var prod = [];

    var tbody = document.getElementById("factor").parentNode.parentNode;
    //Get summary line
    var tsummary = getChildByClass(tbody,"summary ");

    var text = tsummary.textContent.split("\n");
    for(var i=0;i<text.length;i++){
        text[i] = text[i].trim().replace(/\./g,"");
        //Skip spaces & label "Total par heure"
        if(text[i] != "" && text[i][0] != "T"){
            prod.push(removeDot(text[i]));
        }
    }

    var result = {};
    for(i=0;i<RESOURCES.length;i++){
        result[RESOURCES[i]] = prod.shift();
    }
    return result;
}

function getFleet(){
    var div = null;
    var ul = null;
    var li = null;


    var fleet = [battle,civil];
    var myFleet = {};
    for(var i=0;i<techno.length;i++){
        div = document.getElementById(techno[i]);
        ul = getChildByClass(div,"icons");
        for(var j=0;j<fleet[i].length;j++){
            li = getChildByClass(ul,fleet[i][j]);
            if(li === null)
                continue;
            if(li.textContent.split("s").length > 1){
                myFleet[fleet[i][j]] = removeDot(li.textContent.split("s")[1]);
            }
            else{
                myFleet[fleet[i][j]] = removeDot(li.textContent);
            }
        }
    }
    return myFleet;
}

function getDefense(){
    var div = document.getElementById("technologies");
    var ul = getChildByClass(div,"icons");
    var li = null;

    var myDef = {};
    for(var i=0;i<defense.length;i++){
        li = getChildByClass(ul,defense[i]);
        if(li.textContent.split("s").length > 1){
            myDef[defense[i]] = removeDot(li.textContent.split("s")[1]);
        }
        else{
            myDef[defense[i]] = removeDot(li.textContent);
        }
    }
    return myDef;
}


function compute_remaining_time(){
    const observer = new MutationObserver(mutation => {
        var i=0;
        var cost = get_cost();
        if(cost.length == 0){
            return;
        }
        var type = get_type();
        var prod = get_total(PRODUCTION);
        var min = Infinity;
        var current_min = 0;
        var current_max = Infinity;
        var max = 0;
        // For Building & Research
        if(type == LEVEL){
            var all_resources = get_total("resources");
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

/* Old, where Empire was not set free
        //For Shipyard & Defenses
        var resources = getResources();
        //Get minimal production possible right now
        for(i=0;i<cost.length;i++){
            current_min = resources[RESOURCES[i]]/cost[i];
            if(current_min < min){
                min = current_min;
            }
        }
        //Preset value on field
        min = Math.floor(min);
        var field = document.getElementById("build_amount");
        field.setAttribute("placeholder", min);
        document.activeElement.blur();
        */
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

function is_transport_ok(){
    return !document.getElementsByName(CARGO_NAME)[0].disabled;
}

function get_fleet_content(){
    var fleetEvents = document.getElementById("eventContent");
    var metal = 0;
    var cristal = 0;
    var deut = 0;

    if (fleetEvents === null){
        return
    }

    var fleets = fleetEvents.getElementsByClassName("eventFleet"); // Sélection des lignes de la flotte

    for(var i = 0;i<fleets.length;i++){
        var reserve = null;
        var fleet = fleets[i];
        var returning = fleet.getAttribute("data-return-flight");
        switch(fleet.getAttribute("data-mission-type")){
            case MISSIONS.transport:
                //In case of transport
                //get data once
                //break;
                //Just fall down to the next case
            case MISSIONS.station:
                //get data from the only event
                if(returning != "true"){
                   // reserve = getChildByClass(fleet,"icon_movement_reserve");
                    reserve = fleet.getElementsByClassName("icon_movement")[0]
                }
                break;
            case MISSIONS.expedition:
                //get data from return of the fleet
                //break;
                //Just fall down to the next case
            case MISSIONS.recycle:
                //get data from return of the fleet
                if(returning == "true")
               //     reserve = getChildByClass(fleet,"icon_movement_reserve");
                    reserve = fleet.getElementsByClassName("icon_movement_reserve")[0]
                break;
        }
        if(reserve == null)
            continue;
        // Some ugly process of the pop-up
        // which is a HTML as text
        var pop = reserve.getElementsByClassName("tooltip")[0].getAttribute("data-tooltip-title");
        if(pop.includes("Métal")){
            var values = pop.split('class="value">')
            metal += parse_value_from_fleet(values[values.length-4])
            cristal += parse_value_from_fleet(values[values.length-3])
            deut += parse_value_from_fleet(values[values.length-2])
        }
    }
    var fleet_content = {}
    fleet_content[RESOURCES[0]] = metal;
    fleet_content[RESOURCES[1]] = cristal;
    fleet_content[RESOURCES[2]] = deut;
    setItem(FLEET_CONTENT,fleet_content)
}

/*************************
 * Utilities
 *************************/
function getRandomArbitrary(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

function play() {
    var audio = new Audio('https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3');
    audio.play();
}


function removeDot(data){
    return data.replace(/\./g,"");
}


function getChildByClass(parent,className){
    for (var i = 0; i < parent.childNodes.length; i++) {
        if (parent.childNodes[i].className !== undefined &&
            parent.childNodes[i].className.includes(className)) {
            return parent.childNodes[i];
            break;
        }
    }
    return null;
}

function get_total(data,pin){
    var links = getPlanetLinks();
    var metal = 0;
    var crystal = 0;
    var deut = 0;
    var available = "";
    for(var i=0;i<links[0].length;i++){
        var planet = getItem("1-"+links[0][i]);
        var info = planet[data];
        if(available == "")
            available = planet.name;
        else
            available = available + planet.name

        available = available + ";" + info[RESOURCES[0]] + ";" + info[RESOURCES[1]] +";" + info[RESOURCES[2]] +"\n"
        metal += parseInt(info[RESOURCES[0]]);
        crystal += parseInt(info[RESOURCES[1]]);
        deut += parseInt(info[RESOURCES[2]]);
    }
    //Add fleet content to the Total of owned resources
    if(data == "resources"){
        var fleet_content = getItem(FLEET_CONTENT)
        available = available + "Flotte;" + fleet_content[RESOURCES[0]] + ";" + fleet_content[RESOURCES[1]] +";" + fleet_content[RESOURCES[2]] +"\n"
        metal += parseInt(fleet_content[RESOURCES[0]]);
        crystal += parseInt(fleet_content[RESOURCES[1]]);
        deut += parseInt(fleet_content[RESOURCES[2]]);
    }
    //Total
    if(pin){
        write_clipdboard(available,data)
    }
    var total = "Total;" + metal + ";" + crystal + ";" + deut + "\n"+ available;
    return [metal,crystal,deut];
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

function get_number_cargo(amount,marge){
    return Math.ceil(amount/CARGO_SIZE)+marge;
}

function write_clipdboard(data,data_name){
    navigator.clipboard.writeText(data).then(function() {
        alert(data_name + " on clipboard.\n");
    }, function() {
        alert("Fails to write " + data_name + " on clipboard");
    });
}

function getItem(item){
    return JSON.parse(myStorage.getItem(item));
}
function setItem(item,data){
    myStorage.setItem(item,JSON.stringify(data));
}

function parse_value_from_fleet(text){
    if(text == undefined)
        return 0;
    return parseInt(text.split("<")[0].replaceAll(".",""));
}
