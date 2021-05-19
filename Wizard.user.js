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


var CARGO_SIZE = 40000;
var CARGO_NAME = "transporterLarge";

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
var PRODUCTION = "resourceSettings"; // ... But sometime not

var COMPONENT = "component"; //for Ingame pages, additionnal parameter to know the page
var OVERVIEW = "overview";
var SUPPLIES = "supplies";
var RESEARCH = "research";
var SHIPYARD = "shipyard";
var DEFENSES = "defenses";
var FLEET = "fleetdispatch";

var NUMBERS = "amount"; // Class for defenses/shipyard, with "number" of elements
var LEVEL = "level"; // Class for building/techno, with a level

var TO_REMOVE = ["advicebarcomponent","mmonetbar",
                 "pagefoldtarget","siteHeader",
                 "notifyTB","ie_message",
                 "initial_welcome_dialog","commandercomponent"];

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

//Script variables
var MYACTION = "myaction";
var CURRENT_PLANET = "current_planet";
var EXPEDITION = "expedition"
var CONFIG_EXPEDITION = "config_expe";
var REFRESH = "refresh";
var CONFIG_REFRESH = "config_refresh";
var REGROUP = "regroup";
var CONFIG_REGROUP = "config_regroup";
var DISPATCH = "dispatch";
var CONFIG_DISPATCH = "config_dispatch";
var DATA = "data"; //some additional data with conf

try{
    var myStorage = localStorage;
}
catch{
    alert("No localStorage available. Enable it or disable script");
    return;
}


(function() {
    'use strict';
    init();
    do_action(); //do action if any
    compute_remaining_time();
    //setTimeout(reload, getRandomArbitrary(100000,250000));
})();


// first thing to do, every time
function init(){

    // Check for on-going Attack
    var div = document.getElementById("attack_alert");
    if(div.className != "tooltip noAttack"){
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

    var current = getPlanetData();
    var data = myStorage.getItem(current.id)

    if(data === null)
        data = current;
    else{
        data = JSON.parse(data);
        data.name = current.name;
        data.coords = current.coords;
    }

    //Depending on current page, do stuff
    data.resources = getResources();
    switch(getUrlParameter(PAGE)){
        case PRODUCTION:
            //On production tab
            // Retrieve production of the planet
            data[PRODUCTION] = getProduction();
            break;
        case INGAME:
            switch(getUrlParameter(COMPONENT)){
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
            break;
        default:
            break;
    }
    myStorage.setItem(current.id,JSON.stringify(data))
}

// if any action remaining, just go
function do_action(){

    var action = myStorage.getItem(MYACTION);
    if(action === undefined || action === null)
        return;

    var urls = myStorage.getItem(action);
    if(urls !== undefined && urls !== null)
        urls = urls.split(",");

    // Get URL from the list to do
    var url = undefined;
    if(action == EXPEDITION){
        if(getUrlParameter("position")==0){
            if(urls !== undefined && urls !== null)
                url = urls.shift();
        }
        else{
            document.getElementById("continueToFleet2").click();
            document.getElementById("continueToFleet3").click();
            //Send manually
            return;
        }
    }

    if(action == REGROUP){
        var data = JSON.parse(myStorage.getItem(DATA));
        if(getUrlParameter("position")==0){
            if(urls !== undefined && urls !== null)
                url = urls.shift();
        }
        else{
            var resources = getResources();
            var total = 0;
            for(var i = 0;i<RESOURCES.length-1;i++){
                if(data[RESOURCES[i]] == true)
                    total += parseInt(resources[RESOURCES[i]]);
            }

            var input = document.getElementsByName(CARGO_NAME);
            write_field(input[0],get_number_cargo(total,5))
            if(!is_transport_ok())
                return;
            document.getElementById("continueToFleet2").click();
            document.getElementById("continueToFleet3").click();

            if(data[RESOURCES[0]] == true)
                document.getElementById("selectMaxMetal").click()

            if(data[RESOURCES[1]] == true)
                document.getElementById("selectMaxCrystal").click()

            if(data[RESOURCES[2]] == true)
                document.getElementById("selectMaxDeuterium").click()

            //Send manually
            return;
        }
    }

    if(action == DISPATCH){
        data = JSON.parse(myStorage.getItem(DATA));
        if(getUrlParameter("position")==0){
            if(urls !== undefined && urls !== null)
                url = urls.shift();
        }
        else{
            if(!is_transport_ok())
                return;

            document.getElementById("continueToFleet2").click();
            document.getElementById("continueToFleet3").click();

            //Fill resources
            var dispatch = data.shift();
            if(dispatch[RESOURCES[0]] > 0)
                document.getElementById("selectMaxMetal").click()

            if(dispatch[RESOURCES[1]] > 0)
                document.getElementById("selectMaxCrystal").click()

            if(dispatch[RESOURCES[2]] > 0 )
                document.getElementById("selectMaxDeuterium").click()

            //write_field(document.getElementById("metal"),dispatch[RESOURCES[0]])
            //write_field(document.getElementById("crystal"),dispatch[RESOURCES[1]])
            //write_field(document.getElementById("deuterium"),dispatch[RESOURCES[2]])
            myStorage.setItem(DATA, JSON.stringify(data));

            //Send manually
            return;
        }
    }
    if(action == REFRESH){
        if(urls !== undefined && urls !== null)
            url = urls.shift();
    }

    if(urls === undefined || urls === null){
        myStorage.removeItem(MYACTION);
        myStorage.removeItem(DATA);
    }

    // Go to the URL
    if(url !==undefined){
        // set back the list without the value
        if(urls.length > 0)
            myStorage.setItem(action, urls);
        else
            myStorage.removeItem(action);
        location.assign(url);
    }
}

// Just randomly go somewhere inside your empire
function reload(){
    var links = getPlanetLinks();
    var planetsList = links[0].concat(links[1])
    var rand = getRandomArbitrary(0,planetsList.length-1);
    var planet = planetsList[rand];
    location.assign(createUrl(INGAME,OVERVIEW,"cp="+planet));
}



function prepare_action(event){
    var tag = event.currentTarget.toString().split("#");
    tag.shift();//Remove URL...
    var links = getPlanetLinks();
    var urls = [];
    if(tag == REFRESH){
        // Create URL for planet refresh
        for(var i=0;i<links[0].length;i++){
            urls.push(createUrl(PRODUCTION,undefined,"cp="+links[0][i]))
            urls.push(createUrl(INGAME,SHIPYARD,"cp="+links[0][i]))
            urls.push(createUrl(INGAME,DEFENSES,"cp="+links[0][i]))
        }
        // Create URL for moon refresh
        for(i=0;i<links[1].length;i++){
            urls.push(createUrl(INGAME,SHIPYARD,"cp="+links[1][i]))
            urls.push(createUrl(INGAME,DEFENSES,"cp="+links[1][i]))
        }
        if(confirm("Le chargement va naviguer sur " + urls.length + " URLs.")){
            var url = urls.shift()
            myStorage.setItem(MYACTION, REFRESH);
            myStorage.setItem(REFRESH, urls);
            location.assign(url)
        }
        return;
    }
    if(tag == EXPEDITION){
        var size = prompt("Combien d'expédition?","10");
        for(i=0;i<size;i++){
            //position 16
            // 20 ship, 4000GT and max éclaireur
            urls.push(createUrl(INGAME,FLEET,"cp="+links[0][i]+"&position=16&am207=20&am213=20&am211=20&am215=20&am218=20&am203=4000&am219=5000"))
        }
        url = urls.shift()
        myStorage.setItem(MYACTION, EXPEDITION);
        myStorage.setItem(EXPEDITION, urls);
        location.assign(url)
        return;
    }

    if(tag == REGROUP){
        var data = getPlanetData();
        var regroup = {};
        var pass = true;
        regroup.coords = data.coords.split(":");
        for(i = 0;i<RESOURCES.length-1;i++){
            if (confirm("Regrouper le "+ RESOURCES[i] + "?")){
                regroup[RESOURCES[i]] = true;
                pass = false;
            }
            else
                regroup[RESOURCES[i]] = false;
        }
        if(pass)
            return;
        for(i=0;i<links[0].length;i++){
            if(data.id.split("-")[1] == links[0][i])
                continue;

            urls.push(createUrl(INGAME,FLEET,"cp="+links[0][i]+"&galaxy="+ regroup.coords[0]+"&system="+regroup.coords[1] + "&position=" + regroup.coords[2] +"&type="+ data.type +"&mission=3"))
        }
        url = urls.shift()
        myStorage.setItem(MYACTION, REGROUP);
        myStorage.setItem(REGROUP, urls);
        myStorage.setItem(DATA, JSON.stringify(regroup));
        location.assign(url)
        return;
    }
    if(tag == DISPATCH){
        data = getPlanetData();
        var resources = getResources();
        var dispatch = [];
        var cargo_number = 0;
        var total = get_total("resources");
        pass = true;
        for(i = 0;i<RESOURCES.length-1;i++){
            if (confirm("Eparpiller le "+ RESOURCES[i] + "?")){
                dispatch[RESOURCES[i]] = true;
                pass = false;
            }
            else
                dispatch[RESOURCES[i]] = false;
        }
        if(pass)
            return;

        for(i=0;i<links[0].length;i++){
            if(data.id.split("-")[1] == links[0][i])
                continue;

            var current = {};
            var target = JSON.parse(myStorage.getItem("1-"+links[0][i]));
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
            urls.push(createUrl(INGAME,FLEET,"&galaxy="+ coords[0]+"&system="+coords[1] + "&position=" + coords[2] +"&type="+ data.type +"&mission=3&am203="+get_number_cargo(total_planet,0)))
        }
        url = urls.shift()
        myStorage.setItem(MYACTION, DISPATCH);
        myStorage.setItem(DISPATCH, urls);
        myStorage.setItem(DATA, JSON.stringify(dispatch));
        location.assign(url)
        return;
    }

    if(tag == CONFIG_REFRESH){
        get_total(PRODUCTION,true);
        get_total("resources",true);
        return;
    }
    if(tag == CONFIG_EXPEDITION){
        alert("Configuration en cours de travaux");
        return;
    }
    if(tag == CONFIG_DISPATCH){
        alert("Configuration en cours de travaux");
        return;
    }
}


/*************************
 * URL/HTML Writers
 *************************/
function createUrl(page,component,other){
    if(component === undefined)
        return window.location.protocol + "//" + window.location.host + window.location.pathname + "?page=" + page + "&" + other;
    return window.location.protocol + "//" + window.location.host + window.location.pathname + "?page=" + page + "&component=" + component + "&" + other;

}

function add_button(text,id,smallClass,idSmall){
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
    field.focus(); //Focus on the field
    field.value = data; //set value
    document.activeElement.blur(); //remove focus to save the value
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
    var type = 0
    if(planet){
        type = 1;
    }
    else{
        planet = getChildByClass(planetsList,"hightlightMoon");
        type = 3;
    }
    var a = getChildByClass(planet,"planetlink");
    var planetName = getChildByClass(a,"planet-name");
    var planetKoords = getChildByClass(a,"planet-koords");

    data.id = type + "-" + planet.id.split("-")[1];
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
        var quantity = document.getElementById(RESOURCES[i]).textContent;
        result[RESOURCES[i]] = removeDot(quantity)
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
        field.setAttribute("placeholder", min);
        document.activeElement.blur();
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
        var planet = JSON.parse(myStorage.getItem("1-"+links[0][i]));
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
    var total = "Total;" + metal + ";" + crystal + ";" + deut + "\n"+ available;
    if(pin){
        write_clipdboard(total,data)
    }
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