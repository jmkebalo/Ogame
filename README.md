# Ogame
A script for Ogame
Mainly "Miner" (at least for now)

## Installation
It requires Chrome & Tamper Monkey
Firefox was tested but the function to use the clipboard wasn't working...

Then, just add the script on Tamper Monkey page.

For the 1st time, you should refresh at least production & resources.

## Functions
* Cleaner
It removes elements from the webpage, including the Ogame advertisement (and offer) and officer tag
It can be removed by removing the line 70 (`clear_screen()` on init_page)

* Compiler
4 buttons are added to compile data about the Empire... I use an Excel file to do more advanced computation for now...
For all planets:
+ Resources available & total
+ Production & total (hourly)
+ Fleet
+ Defenses

It navigates through all webpages, then add data to the clipboard.

* Calculator
+ For defenses/shipyard, it computes the number of elements that can be built with available resources on the planet

+ For Building/Researches, it computes the time before it's possible to run based on available resources and production of all planets

To come:
+ For defenses/Shipyard, it computes how many elements can be built with ALL available resources
+ For fleet, it computes how many transporters are required to move all resources

* Alert
For now, nothing... It just detect that an attack is coming for you.
To come: likely a sound

* Refresh
Auto refresh is disabled for now.
You can activate it by remove "//" on main function
> `//setTimeout(reload, rand);
`

## How It Works?
The scripts uses the datastorage of the Browser. It means no data is sent to anyone AND if you change your browser, you won't have the datas like production before using the script again

* Main function
The core function is the 1st one:
It init the page (cleans, add buttons, some computation)
Check for incoming attacks
do the requested action if any
reload if requires

* 1st & 2nd level
functionalities in deep

* utilities
some functions used everywhere, for url, numbers, clipboard, ...

* parsers
function that parses webpages
Likely ones that need updates in case of Ogame updates
