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

//Text of tweet we've decided to RT
var tweetText = "Testy text to test with. Let the testing commence!";

//New one-liner to RT;
var newTweetText = "Error: No new one-liner created.";

//The text of our tweet run through the compromise library
var tweetJuice;

//The selected one-liner
var oneLiner = {};

//Helper method for picking one liner
function getRandomInt(max) {
	return Math.floor(Math.random() * Math.floor(max));
}

//Helper method for debuging outputs and tracking previously attempted quotes
function quoteToText(game, line) {
	var replacables = " Replacables: ";
	for (var i = 0; i < line.replacables.length; i++) {
		replacables += line.replacables[i].position + ", " + line.replacables[i].type + "; ";
	}
	return "Game: " + game.game + " Character: " + game.character + " Quote: " + line.quote + replacables;
}

function pickOneLiner(verbose) {
	if (verbose) {
		console.log("oneLiners: " + oneLiners);
	}

	tweetJuice = nlp(tweetText);

	var attemptedQuotes = new Map();

	var quoteFound = false;
	while (!quoteFound) {
		//Keep track of all the quotes we've attempted to use, should stop this from looping infinitely;
		var game = oneLiners.games[getRandomInt(Object.values(oneLiners).length)];
		var line;
		do {
			line = game.quotes[getRandomInt(game.quotes.length)];
		} while (attemptedQuotes.get(quoteToText(game, line)) == true);

		if (verbose) {
			console.log("Picked: ", quoteToText(game, line));
		}

		attemptedQuotes.set(quoteToText(game, line), true);

		var numOfType = new Map();
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

	if (verbose) {
		console.log("Used: ", quoteToText(oneLiner.game, oneLiner.line));
	}
}

function generateOneLiner(verbose) {
	var quote = oneLiner.line.quote.split(" ");
	var usedWords = new Set();

	for (var i = 0; i < oneLiner.line.replacables.length; i++) {
		var wordToUse = {"type" : "#"+oneLiner.line.replacables[i].type, "position" : getRandomInt(tweetJuice.match("#" + oneLiner.line.replacables[i].type).length)};
		while (usedWords.has(wordToUse.type + wordToUse.position)) {
			if (verbose) {
				console.log("Rejected word " + wordToUse.type + ", " + wordToUse.position);
			}
			wordToUse.position = getRandomInt(tweetJuice.match("#" + oneLiner.line.replacables[i].type).length);
		}
		usedWords.add(wordToUse.type + wordToUse.position);

		//Check to see if the last character in the string is punctation, and retain it if it is
		var punctuation = quote[oneLiner.line.replacables[i].position].charAt(quote[oneLiner.line.replacables[i].position].length - 1).match(/\W/);

		quote[oneLiner.line.replacables[i].position] = tweetJuice.match("#" + oneLiner.line.replacables[i].type).eq(wordToUse.position).text() + ((punctuation != null) ? punctuation : "");
	}

	newTweetText = "";
	for (var i = 0; i < quote.length; i++) {
		newTweetText += quote[i] + " ";
	}
	newTweetText += "- " + oneLiner.game.character + ", " + oneLiner.game.game;
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
	pickOneLiner(false);
	console.log(quoteToText(oneLiner.game, oneLiner.line));
	generateOneLiner(false);
	console.log(newTweetText);
}

// Run test function immediately, then end the program.
testFunction();
// ...and then every hour after that. Time here is in milliseconds, so
// 1000 ms = 1 second, 1 sec * 60 = 1 min, 1 min * 60 = 1 hour --> 1000 * 60 * 60
//setInterval(retweetLatest, 1000 * 60 * 60);
