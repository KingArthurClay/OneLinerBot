// Our Twitter library
const Twit = require('twit');
//file system library
const fs = require('fs');
//Language processing library
const nlp = require('compromise');

// We need to include our configuration file
var T = new Twit(require('./config.js'));

//Include our file of one-liners
var oneLiners = JSON.parse(fs.readFileSync('one_liners.json'));

// This is the URL of a search for the latest tweets on the '#mediaarts' hashtag.
var mediaArtsSearch = {q: "#mediaarts", count: 10, result_type: "recent"}; 

//Original Tweet we're going to Quote Tweet;
var ogTweet;

//Tweet tweet we've decided to RT
var tweetText = "Testy text to test with. Let the testing commence!";

//The selected one-liner
var oneLiner = {};

function getRandomInt(max) {
	return Math.floor(Math.random() * Math.floor(max));
}

function quoteToText(game, line) {
	var replacables = " Replacables: ";
	for (var i = 0; i < line.replacables.length; i++) {
		replacables += line.replacables[i].position + ", " + line.replacables[i].type + "; ";
	}
	return "Game: " + game.game + " Character: " + game.character + " Quote: " + line.quote + replacables;
}

function pickOneLiner() {
	console.log(oneLiners);

	var tweetJuice = nlp(tweetText);

	var attemptedQuotes = new Map();

	var quoteFound = false;
	while (!quoteFound) {
		//Keep track of all the quotes we've attempted to use, should stop this from looping infinitely;
		var game = oneLiners.games[getRandomInt(Object.values(oneLiners).length)];
		var line = game.quotes[getRandomInt(game.quotes.length)];

		console.log("Picked: ", quoteToText(game, line));

		attemptedQuotes.set(quoteToText(game, line), true);

		var numOfType = new Map();
		//TODO: Actual testing here
		for (var i = 0; i < line.replacables.length; i++) {
			if (numOfType.get(line.replacables[i].type) != undefined) {
				numOfType.set(line.replacables[i].type, numOfType.get(line.replacables[i].type) + 1);
			} else {
				numOfType.set(line.replacables[i].type, 1);
			}
		}

		quoteFound = true;
		for (let [key, value] of numOfType) {
			if (tweetJuice.match("#" + key).length < value) {
				quoteFound = false;
				console.log("Rejected: ", line, ", missing ", value - tweetJuice.match("#" + key).length, " ", key, "s");
				break;
			}
		}

		oneLiner.game = game;
		oneLiner.line = line;
	}

	console.log("Used: ", quoteToText(game, line));
}

// This function finds the latest tweet with the #mediaarts hashtag, and retweets it.
function retweetLatest() {
	T.get('search/tweets', mediaArtsSearch, function (error, data) {
	  // log out any errors and responses
	  console.log(error, data);
	  // If our search request to the server had no errors...
	  if (!error) {
	  	// ...then we grab the ID of the tweet we want to retweet...
		var retweetId = data.statuses[0].id_str;
		// ...and then we tell Twitter we want to retweet it!
		T.post('statuses/retweet/' + retweetId, { }, function (error, response) {
			if (response) {
				console.log('Success! Check your bot, it should have retweeted something.')
			}
			// If there was an error with our Twitter call, we print it out here.
			if (error) {
				console.log('There was an error with Twitter:', error);
			}
		})
	  }
	  // However, if our original search request had an error, we want to print it out here.
	  else {
	  	console.log('There was an error with your hashtag search:', error);
	  }
	});
}

function testFunction() {
	console.log("Test");
	pickOneLiner();
}

// Run test function immediately, then end the program.
testFunction();
// ...and then every hour after that. Time here is in milliseconds, so
// 1000 ms = 1 second, 1 sec * 60 = 1 min, 1 min * 60 = 1 hour --> 1000 * 60 * 60
//setInterval(retweetLatest, 1000 * 60 * 60);
